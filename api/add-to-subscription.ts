/**
 * Vercel Serverless Function — /api/add-to-subscription
 *
 * One-click add-on for Recurpay subscriptions. Email/SMS links hit a pretty
 * URL (`/add-to-subscription/...`) which Vercel rewrites here.
 *
 * GET  verifies the signed token (or campaign sid+sig) and shows a confirm
 *      page. Does not call Recurpay's write API — email scanners prefetch GET.
 * POST applies the add via PUT .../subscriptions/{id}/lines.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  campaignIsExpired,
  getCampaign,
  type AddonCampaign,
} from './lib/addon-campaigns.js';
import { renderAddonPage, type AddonPageStatus } from './lib/addon-page.js';
import {
  addSubscriptionLine,
  campaignAlreadyAdded,
  getSubscription,
  isAddableStatus,
  nonceAlreadyUsed,
  RecurpayError,
  variantAlreadyOnSubscription,
  type RecurpaySubscription,
} from './lib/recurpay.js';
import {
  campaignNonce,
  readSignedToken,
  signPayload,
  verifySubscriptionSig,
  type AddonTokenPayload,
} from './lib/addon-token.js';

function queryParam(req: VercelRequest, key: string): string | undefined {
  const value = req.query[key];
  if (Array.isArray(value)) return value[0];
  return typeof value === 'string' ? value : undefined;
}

function html(res: VercelResponse, status: number, body: string): void {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'private, no-store');
  res.status(status).send(body);
}

function page(
  res: VercelResponse,
  httpStatus: number,
  status: AddonPageStatus,
  extras: Omit<Parameters<typeof renderAddonPage>[0], 'status'> = {},
): void {
  html(res, httpStatus, renderAddonPage({ ...extras, status }));
}

function postedToken(req: VercelRequest): string | undefined {
  const body = req.body as { t?: unknown } | undefined;
  return typeof body?.t === 'string' ? body.t : undefined;
}

function resolveFromRequest(req: VercelRequest):
  | { payload: AddonTokenPayload; campaign: AddonCampaign | null }
  | { error: AddonPageStatus } {
  const rawToken = queryParam(req, 't') || postedToken(req);
  if (rawToken) {
    const read = readSignedToken(rawToken);
    if (!read) return { error: 'invalid' };
    if (read.expired) return { error: 'expired' };
    const campaign = read.payload.c ? getCampaign(read.payload.c) : null;
    if (campaign && campaignIsExpired(campaign)) return { error: 'expired' };
    return { payload: read.payload, campaign };
  }

  const slug = queryParam(req, 'campaign');
  const sidRaw = queryParam(req, 'sid');
  const sig = queryParam(req, 'sig');
  if (!slug || !sidRaw || !sig) return { error: 'invalid' };

  const campaign = getCampaign(slug);
  if (!campaign) return { error: 'invalid' };
  if (campaignIsExpired(campaign)) return { error: 'expired' };

  const sid = Number(sidRaw);
  if (!Number.isInteger(sid) || sid <= 0) return { error: 'invalid' };
  if (!verifySubscriptionSig(sid, sig)) return { error: 'invalid' };

  const payload: AddonTokenPayload = {
    sid,
    vid: campaign.variantId,
    exp: Math.floor(Date.now() / 1000) + 2 * 60 * 60,
    n: campaignNonce(campaign.slug, sid),
    q: campaign.quantity,
    o: campaign.isOnetime,
    c: campaign.slug,
  };
  return { payload, campaign };
}

function alreadyAdded(sub: RecurpaySubscription, payload: AddonTokenPayload): boolean {
  if (nonceAlreadyUsed(sub, payload.n)) return true;
  if (payload.c && campaignAlreadyAdded(sub, payload.c)) return true;
  if (variantAlreadyOnSubscription(sub, payload.vid)) return true;
  return false;
}

function displayLabel(
  payload: AddonTokenPayload,
  campaign: AddonCampaign | null,
  sub: RecurpaySubscription | null,
): string {
  if (campaign?.label) return campaign.label;
  const match = (sub?.line_items ?? []).find((l) => Number(l.variant_id) === payload.vid);
  return match?.title || match?.name || 'this add-on';
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  let resolved: ReturnType<typeof resolveFromRequest>;
  try {
    resolved = resolveFromRequest(req);
  } catch (err) {
    console.error('Addon link config error:', err);
    page(res, 500, 'error');
    return;
  }

  if ('error' in resolved) {
    const http = resolved.error === 'expired' ? 410 : 400;
    page(res, http, resolved.error);
    return;
  }

  const { payload, campaign } = resolved;

  let sub: RecurpaySubscription;
  try {
    sub = await getSubscription(payload.sid);
  } catch (err) {
    if (err instanceof RecurpayError && (err.status === 404 || err.status === 400)) {
      page(res, 404, 'invalid');
      return;
    }
    console.error('Recurpay get subscription failed:', err);
    page(res, 500, 'error');
    return;
  }

  const extras = {
    label: displayLabel(payload, campaign, sub),
    isOnetime: payload.o,
    firstName: sub.subscriber?.first_name,
    nextBillingAt: sub.next_billing_at ?? null,
  };

  if (!isAddableStatus(sub.status)) {
    page(res, 409, 'inactive', extras);
    return;
  }

  if (alreadyAdded(sub, payload)) {
    page(res, 200, 'already', extras);
    return;
  }

  if (req.method === 'GET') {
    page(res, 200, 'confirm', { ...extras, token: signPayload(payload) });
    return;
  }

  try {
    await addSubscriptionLine({
      subscriptionId: payload.sid,
      variantId: payload.vid,
      quantity: payload.q,
      isOnetime: payload.o,
      nonce: payload.n,
      campaign: payload.c,
    });
  } catch (err) {
    console.error('Recurpay add line failed:', err);
    page(res, 500, 'error', extras);
    return;
  }

  console.log(
    `Addon added: sub ${payload.sid} variant ${payload.vid} campaign ${payload.c ?? 'none'}`,
  );
  page(res, 200, 'success', extras);
}
