/**
 * Vercel Serverless Function: GET /api/fin/subscriptions?email=...
 *
 * Read-only RecurPay lookup for the Intercom Fin data connector. Returns the
 * contact's subscriptions in plain terms Fin can quote: status, items,
 * frequency, next order date, estimated next total, and why a subscription is
 * halted. No addresses or payment details are returned.
 *
 * Configure the connector to send the contact's email from Intercom's contact
 * attribute, not from anything the customer types, so Fin can only look up the
 * person it is talking to.
 *
 * Env:
 *   FIN_CONNECTOR_TOKEN  shared secret; Intercom sends it as "Authorization: Bearer <token>"
 *   RECURPAY_ACCESS_TOKEN, RECURPAY_API_BASE (see api/lib/recurpay.ts)
 */
import { timingSafeEqual } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { emailDomain } from '../lib/panel-cards.js';
import { listSubscriptionsByEmail, type RecurpaySubscription } from '../lib/recurpay.js';
import {
  estimatedTotal,
  formatMoney,
  formatNzDate,
  frequencyLabel,
  isPrepaid,
  lineUnitPricing,
  sortSubscriptions,
} from '../lib/subscription-panel.js';

const MANAGE_URL = 'https://little-green-dog.recurpay.com/account/login';
const MAX_SUBSCRIPTIONS = 5;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const STATUS_HELP: Record<string, string> = {
  active: 'Active. Orders are sent automatically on the schedule below.',
  paused: 'Paused. No orders are sent until the customer resumes it.',
  halted:
    'Halted. RecurPay stopped it, usually because a payment failed. The customer needs to update their card in their account, then it restarts.',
  cancelled: 'Cancelled. No further orders will be sent.',
};

function authorised(req: VercelRequest): boolean {
  const expected = process.env.FIN_CONNECTOR_TOKEN?.trim();
  if (!expected) return false;
  const header = req.headers.authorization ?? '';
  const received = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function describe(sub: RecurpaySubscription) {
  const status = String(sub.status ?? '').trim().toLowerCase();
  const items = (sub.line_items ?? []).map((li) => ({
    name: [li.title ?? li.name, li.variant_title].filter(Boolean).join(' - '),
    quantity: Number(li.quantity) || 1,
    price_each: formatMoney(lineUnitPricing(li, sub).unit),
    one_time_only: li.is_onetime === true,
  }));
  const isActive = status === 'active';
  return {
    subscription_id: sub.id,
    status,
    status_explained: STATUS_HELP[status] ?? `Status is "${status}".`,
    items,
    delivery_frequency: frequencyLabel(sub),
    prepaid: isPrepaid(sub),
    next_order_date: isActive ? formatNzDate(sub.next_billing_at, { weekday: false }) : undefined,
    next_order_skipped: isActive ? sub.is_skipped === true : undefined,
    estimated_next_order_total: isActive ? formatMoney(estimatedTotal(sub)) : undefined,
    last_order_date: formatNzDate(sub.last_billing_at, { weekday: false }),
    orders_so_far: sub.orders_count ?? undefined,
    started: formatNzDate(sub.subscribed_at, { weekday: false }),
    halted_reason: status === 'halted' ? sub.halted_reason ?? undefined : undefined,
    cancelled_on: status === 'cancelled' ? formatNzDate(sub.cancelled_at, { weekday: false }) : undefined,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }
  if (!authorised(req)) {
    res.status(401).json({ error: 'unauthorised' });
    return;
  }

  const raw = req.query.email;
  const email = (Array.isArray(raw) ? raw[0] : raw)?.trim().toLowerCase() ?? '';
  if (!EMAIL_PATTERN.test(email)) {
    res.status(400).json({ error: 'email_required' });
    return;
  }

  try {
    // Only the contact's own subscriptions, in case RecurPay's email filter matches loosely.
    const all = sortSubscriptions(
      (await listSubscriptionsByEmail(email)).filter(
        (sub) => sub.subscriber?.email?.trim().toLowerCase() === email,
      ),
    );
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({
      email,
      has_subscription: all.length > 0,
      subscription_count: all.length,
      manage_subscription_url: MANAGE_URL,
      subscriptions: all.slice(0, MAX_SUBSCRIPTIONS).map(describe),
    });
  } catch (err) {
    console.error(
      `Fin RecurPay lookup failed (email domain ${emailDomain(email)}):`,
      err instanceof Error ? err.message : String(err),
    );
    res.status(502).json({ error: 'recurpay_unavailable' });
  }
}
