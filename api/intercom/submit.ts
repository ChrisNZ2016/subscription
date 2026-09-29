/**
 * Vercel Serverless Function: /api/intercom/submit
 *
 * Intercom Canvas Kit "submit" URL for the RecurPay subscriptions card. Verifies
 * X-Body-Signature over the raw body, then routes on component_id:
 *
 *   refresh | back | cancel  -> rebuild the subscription card
 *   show_all                 -> rebuild with every subscription
 *   order:{id}               -> confirmation screen (after ownership/eligibility/guard checks)
 *   confirm_order:{id}       -> re-check everything, take the order lock, RecurPay renew
 *   anything else            -> error card
 *
 * "Create order now" charges a real card and cannot be undone. See
 * docs/intercom-subscription-panel.md (sections 5 to 7) and api/lib/order-lock.ts.
 *
 * Env:
 *   INTERCOM_CANVAS_CLIENT_SECRET  client secret of the Intercom Developer Hub app
 *   INTERCOM_ACCESS_TOKEN          adds the internal audit note to the conversation
 *   RECURPAY_ACCESS_TOKEN, RECURPAY_API_BASE
 *   RECURPAY_ADMIN_URL_TEMPLATE    optional
 *   KV_REST_API_URL, KV_REST_API_TOKEN  Upstash lock store (orders are refused without it)
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomNonce } from '../lib/addon-token.js';
import { readAdmin, readContact, readConversationId, type CanvasResponse } from '../lib/intercom-canvas.js';
import { readVerifiedCanvasBody } from '../lib/intercom-request.js';
import { addConversationNote } from '../lib/intercom-rest.js';
import { acquireOrderLock, isLockConfigured, lockExpiryNote } from '../lib/order-lock.js';
import { emailDomain, loadSubscriptionCard } from '../lib/panel-cards.js';
import {
  getSubscription,
  renewSubscription,
  RecurpayError,
  type RecurpayOrder,
  type RecurpaySubscription,
} from '../lib/recurpay.js';
import {
  buildConfirmCard,
  buildErrorCard,
  buildOrderBlockedCard,
  buildOrderFailedCard,
  buildOrderResultCard,
  formatMoney,
  formatNzDate,
  orderEligibility,
  parseComponentId,
  recentOrderGuard,
} from '../lib/subscription-panel.js';

const SHOPIFY_ORDER_URL = 'https://admin.shopify.com/store/little-green-dog/orders/';

const LOCK_NOT_CONFIGURED =
  "Instant orders aren't switched on yet: the order lock store isn't configured.";

type Admin = { id?: string; name?: string };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function normaliseEmail(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined;
  const t = v.trim().toLowerCase();
  return t === '' ? undefined : t;
}

function readStoredData(body: Record<string, unknown>): Record<string, unknown> {
  if (isRecord(body.stored_data)) return body.stored_data;
  const current = body.current_canvas;
  if (isRecord(current) && isRecord(current.stored_data)) return current.stored_data;
  return {};
}

function ownsSubscription(sub: RecurpaySubscription, contactEmail: string | undefined): boolean {
  const owner = normaliseEmail(sub.subscriber?.email);
  const contact = normaliseEmail(contactEmail);
  return owner !== undefined && contact !== undefined && owner === contact;
}

/** Returns a blocked card when the subscription cannot have an order created, else undefined. */
function blockReason(
  sub: RecurpaySubscription,
  contactEmail: string | undefined,
  now: Date,
): CanvasResponse | undefined {
  if (!ownsSubscription(sub, contactEmail)) {
    return buildOrderBlockedCard("This subscription doesn't belong to this contact.");
  }
  const eligibility = orderEligibility(sub, now);
  if (!eligibility.eligible) {
    return buildOrderBlockedCard(eligibility.reason ?? "This subscription can't have an order created.");
  }
  const recent = recentOrderGuard(sub, now);
  if (recent) {
    return buildOrderBlockedCard(`An order was already created for this subscription at ${recent}.`);
  }
  return undefined;
}

/** Audit note on the conversation. Never throws and never changes the response. */
async function auditNote(
  conversationId: string | undefined,
  admin: Admin,
  text: string,
): Promise<void> {
  if (!conversationId || !admin.id) {
    console.warn('Intercom submit: no conversation or admin id, skipping audit note');
    return;
  }
  try {
    await addConversationNote(conversationId, admin.id, text);
  } catch (err) {
    console.error('Intercom audit note failed:', err instanceof Error ? err.message : String(err));
  }
}

async function confirmOrder(args: {
  subscriptionId: number;
  stored: Record<string, unknown>;
  contactEmail: string | undefined;
  conversationId: string | undefined;
  admin: Admin;
}): Promise<CanvasResponse> {
  const { subscriptionId: id, stored, contactEmail, conversationId, admin } = args;

  if (String(stored.subscription_id) !== String(id)) {
    return buildOrderBlockedCard('Something changed. Please start again.');
  }

  // Fail closed: without the lock store we cannot guarantee a single order.
  if (!isLockConfigured()) return buildOrderBlockedCard(LOCK_NOT_CONFIGURED);

  const sub = await getSubscription(id);
  const blocked = blockReason(sub, contactEmail, new Date());
  if (blocked) return blocked;

  let acquired: boolean;
  try {
    acquired = await acquireOrderLock(id);
  } catch (err) {
    // Cannot prove exclusivity, so no order.
    console.error('Order lock failed:', err instanceof Error ? err.message : String(err));
    return buildOrderBlockedCard("Couldn't check the order lock, so no order was created. Try again shortly.");
  }
  if (!acquired) {
    return buildOrderBlockedCard(
      `An order for this subscription is already being processed or was just created. ${lockExpiryNote()}`,
    );
  }

  const who = admin.name ?? 'A teammate';

  let order: RecurpayOrder | undefined;
  let renewed: RecurpaySubscription | undefined;
  try {
    const result = await renewSubscription(id);
    order = result.order;
    renewed = result.subscription;
  } catch (err) {
    const message =
      err instanceof RecurpayError
        ? err.message || "RecurPay couldn't create the order."
        : "RecurPay couldn't create the order. Press Refresh to check whether it went through.";
    console.error(
      `RecurPay renew failed for subscription ${id}:`,
      err instanceof Error ? err.message : String(err),
    );
    // Deliberately no automatic retry and no lock release: the outcome may be unknown.
    await auditNote(
      conversationId,
      admin,
      `${who} tried to create an instant order for RecurPay subscription ${id} from Intercom; RecurPay said: ${message}`,
    );
    return buildOrderFailedCard(message);
  }

  // The order exists from here on: nothing below may turn into a failure card.
  let latest: RecurpaySubscription = renewed ?? sub;
  try {
    latest = await getSubscription(id);
  } catch (err) {
    console.error(
      `Post-order re-fetch failed for subscription ${id}:`,
      err instanceof Error ? err.message : String(err),
    );
  }

  const orderLabel = order?.name ?? (order?.id ? String(order.id) : 'unknown');
  await auditNote(
    conversationId,
    admin,
    `${who} created instant order ${orderLabel} (${formatMoney(order?.total_price) ?? 'amount unknown'}) for RecurPay subscription ${id} from Intercom. Next order: ${formatNzDate(latest.next_billing_at) ?? 'unknown'}.`,
  );

  return buildOrderResultCard({
    order: order ?? { id: '' },
    sub: latest,
    shopifyOrderUrl: order?.id ? `${SHOPIFY_ORDER_URL}${order.id}` : undefined,
  });
}

async function route(body: Record<string, unknown>): Promise<CanvasResponse> {
  const componentId = typeof body.component_id === 'string' ? body.component_id : undefined;
  const stored = readStoredData(body);
  const storedEmail = typeof stored.contact_email === 'string' ? stored.contact_email : undefined;
  const contactEmail = readContact(body).email ?? storedEmail;
  const { kind, subscriptionId } = parseComponentId(componentId);

  switch (kind) {
    case 'refresh':
    case 'back':
    case 'cancel':
      return loadSubscriptionCard(contactEmail, { showAll: false });
    case 'show_all':
      return loadSubscriptionCard(contactEmail, { showAll: true });
    case 'order': {
      if (subscriptionId === undefined) break;
      const now = new Date();
      const sub = await getSubscription(subscriptionId);
      const blocked = blockReason(sub, contactEmail, now);
      if (blocked) return blocked;
      return buildConfirmCard({ sub, email: contactEmail ?? '', now, nonce: randomNonce() });
    }
    case 'confirm_order': {
      if (subscriptionId === undefined) break;
      return confirmOrder({
        subscriptionId,
        stored,
        contactEmail,
        conversationId: readConversationId(body),
        admin: readAdmin(body),
      });
    }
    default:
      break;
  }
  return buildErrorCard("That button didn't do anything. Try Refresh.");
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Raw body first: never touch req.body in this handler.
  const verified = await readVerifiedCanvasBody(req);
  if (!verified.ok) {
    if (verified.status === 401) console.warn('Intercom submit: signature verification failed');
    res.status(verified.status).json({ error: verified.error });
    return;
  }

  try {
    res.status(200).json(await route(verified.body));
  } catch (err) {
    const email = readContact(verified.body).email;
    console.error(
      `Intercom submit failed${email ? ` (email domain ${emailDomain(email)})` : ''}:`,
      err instanceof Error ? err.message : String(err),
    );
    res.status(200).json(buildErrorCard("Something went wrong talking to RecurPay. Press Refresh and check before trying again."));
  }
}
