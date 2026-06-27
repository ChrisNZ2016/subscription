/**
 * Vercel Serverless Function — /api/webhooks/subscription-contracts-create
 *
 * Listens for Shopify's `subscription_contracts/create` webhook (which fires
 * once the contract exists, after the order — no race with async creation),
 * verifies the HMAC signature, then swaps any sample-subscribe contract's line
 * from the sample variant to the real kibble-pack bag at the discounted price,
 * so renewals ship the correct SKU.
 *
 * Native Shopify only — no RecurPay API (avoids the non-suppressible customer
 * email). See docs/sample-to-subscription-mvp.md.
 *
 * Required environment variables:
 *   SHOPIFY_WEBHOOK_SECRET   — signing secret for this webhook
 *   SHOPIFY_CLIENT_ID/SECRET — Dev Dashboard app (client_credentials → admin token)
 *   SHOPIFY_SHOP             — e.g. little-green-dog.myshopify.com
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { processSampleSubscribeContract } from '../lib/sample-subscribe.js';

interface ContractWebhookPayload {
  admin_graphql_api_id?: string; // gid://shopify/SubscriptionContract/...
  id?: number;
  origin_order_id?: number | null;
  status?: string;
}

function verifyShopifyWebhook(rawBody: Buffer, hmacHeader: string, secret: string): boolean {
  const digest = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');
  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmacHeader));
  } catch {
    return false;
  }
}

async function getRawBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('Missing SHOPIFY_WEBHOOK_SECRET');
    res.status(500).json({ error: 'Server misconfiguration' });
    return;
  }

  const rawBody = await getRawBody(req);
  const hmacHeader = (req.headers['x-shopify-hmac-sha256'] as string) || '';
  if (!verifyShopifyWebhook(rawBody, hmacHeader, webhookSecret)) {
    console.warn('Subscription contract webhook HMAC verification failed');
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  let payload: ContractWebhookPayload;
  try {
    payload = JSON.parse(rawBody.toString()) as ContractWebhookPayload;
  } catch {
    res.status(400).json({ error: 'Invalid JSON' });
    return;
  }

  const contractGid =
    payload.admin_graphql_api_id ??
    (payload.id ? `gid://shopify/SubscriptionContract/${payload.id}` : null);

  if (!contractGid) {
    // Nothing actionable; ack so Shopify doesn't retry.
    res.status(200).json({ ok: true, skipped: 'no contract id' });
    return;
  }

  try {
    const result = await processSampleSubscribeContract({
      contractGid,
      originOrderId: payload.origin_order_id ?? null,
    });
    if (!result.skipped) {
      console.log(
        `Sample-subscribe swap done: contract ${result.contractId} → variant ${result.realVariantId}`,
      );
    }
  } catch (err) {
    // Log and still 200 so Shopify doesn't hammer retries on a logic error;
    // failures are surfaced in logs for manual follow-up during the MVP test.
    console.error(`Sample-subscribe contract handling failed for ${contractGid}:`, err);
  }

  res.status(200).json({ ok: true });
}
