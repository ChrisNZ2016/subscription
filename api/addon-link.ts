/**
 * Vercel Serverless Function — /api/addon-link
 *
 * Internal minting endpoint. Creates signed one-click URLs for a Recurpay
 * subscription + campaign (or raw variant). Protected by ADDON_LINK_SECRET.
 *
 * Klaviyo flow webhook: POST with header `X-Addon-Link-Secret` and JSON
 * `{ "email": "{{ person.email }}", "campaign": "poop-bags-120" }`. If KLAVIYO_API_KEY is
 * set, the durable `sid`/`sig` (and campaign URL) are written onto the profile
 * so the following email can use merge tags.
 */

import crypto from 'crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  campaignIsExpired,
  campaignUrl,
  getCampaign,
  tokenUrl,
} from './lib/addon-campaigns.js';
import { writeKlaviyoAddonLink } from './lib/klaviyo-addon.js';
import {
  findActiveSubscriptionByEmail,
  getSubscription,
  isAddableStatus,
  RecurpayError,
} from './lib/recurpay.js';
import { mintToken, signSubscriptionId } from './lib/addon-token.js';

interface MintBody {
  email?: string;
  subscriptionId?: number | string;
  campaign?: string;
  variantId?: number | string;
  quantity?: number | string;
  isOnetime?: boolean;
  ttlDays?: number | string;
  writeKlaviyo?: boolean;
}

function headerToken(req: VercelRequest): string {
  const raw = req.headers['x-addon-link-secret'];
  return Array.isArray(raw) ? raw[0] : raw || '';
}

function asId(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const expected = process.env.ADDON_LINK_SECRET;
  if (!expected || expected.length < 16) {
    console.error('ADDON_LINK_SECRET is missing or too short');
    res.status(500).json({ error: 'Server misconfiguration' });
    return;
  }

  const provided = headerToken(req);
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const body = (req.body ?? {}) as MintBody;
  const campaignSlug = typeof body.campaign === 'string' ? body.campaign.trim() : '';
  const campaign = campaignSlug ? getCampaign(campaignSlug) : null;
  if (campaignSlug && !campaign) {
    res.status(400).json({ error: `Unknown campaign '${campaignSlug}'` });
    return;
  }
  if (campaign && campaignIsExpired(campaign)) {
    res.status(410).json({ error: `Campaign '${campaign.slug}' has expired` });
    return;
  }

  const variantId = campaign?.variantId ?? asId(body.variantId);
  if (!variantId) {
    res.status(400).json({ error: 'campaign or variantId is required' });
    return;
  }

  let subscriptionId = asId(body.subscriptionId);
  let email = typeof body.email === 'string' ? body.email.trim() : '';

  try {
    if (!subscriptionId) {
      if (!email) {
        res.status(400).json({ error: 'email or subscriptionId is required' });
        return;
      }
      const found = await findActiveSubscriptionByEmail(email);
      if (!found) {
        res.status(404).json({ error: 'No active Recurpay subscription for that email' });
        return;
      }
      subscriptionId = found.id;
      email = found.subscriber?.email || email;
    } else {
      const sub = await getSubscription(subscriptionId);
      if (!isAddableStatus(sub.status)) {
        res.status(409).json({ error: `Subscription is ${sub.status}` });
        return;
      }
      email = email || sub.subscriber?.email || '';
    }
  } catch (err) {
    if (err instanceof RecurpayError && err.status === 404) {
      res.status(404).json({ error: 'Subscription not found' });
      return;
    }
    console.error('Addon-link Recurpay lookup failed:', err);
    res.status(500).json({ error: 'Failed to look up subscription' });
    return;
  }

  const quantity = campaign?.quantity ?? asId(body.quantity) ?? 1;
  const isOnetime = campaign ? campaign.isOnetime : Boolean(body.isOnetime);
  const ttlDays = campaign?.ttlDays ?? asId(body.ttlDays) ?? 7;

  const { token, payload } = mintToken({
    subscriptionId,
    variantId,
    quantity,
    isOnetime,
    campaign: campaign?.slug,
    ttlDays,
  });

  const sig = signSubscriptionId(subscriptionId);
  const url = tokenUrl(token);
  const durableUrl = campaign ? campaignUrl(campaign.slug, subscriptionId, sig) : null;

  const shouldWriteKlaviyo = body.writeKlaviyo !== false;
  if (shouldWriteKlaviyo && email && process.env.KLAVIYO_API_KEY) {
    try {
      await writeKlaviyoAddonLink({
        email,
        subscriptionId,
        sig,
        tokenUrl: url,
      });
    } catch (err) {
      console.error('Klaviyo profile update failed:', err);
    }
  }

  res.status(200).json({
    url,
    campaignUrl: durableUrl,
    subscriptionId,
    variantId,
    campaign: campaign?.slug ?? null,
    expiresAt: new Date(payload.exp * 1000).toISOString(),
    recurpay_subscription_id: subscriptionId,
    recurpay_link_sig: sig,
  });
}
