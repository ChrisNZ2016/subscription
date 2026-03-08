/**
 * Vercel Serverless Function — /api/webhooks/orders-create
 *
 * Listens for Shopify's orders/create webhook, verifies the HMAC signature,
 * then fires a "Purchase Completed (Server)" event to Mixpanel via the
 * Node.js SDK (not affected by ad-blockers).
 *
 * Required environment variables (set in Vercel dashboard):
 *   MIXPANEL_TOKEN          — Mixpanel project token
 *   SHOPIFY_WEBHOOK_SECRET  — The signing secret from the Shopify webhook row
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import Mixpanel from 'mixpanel';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ShopifyLineItem {
  id: number;
  title: string;
  quantity: number;
  price: string;
  sku: string | null;
  product_id: number | null;
  variant_id: number | null;
}

interface ShopifyNoteAttribute {
  name: string;
  value: string;
}

interface ShopifyOrder {
  id: number;
  order_number: number;
  email: string | null;
  total_price: string;
  subtotal_price: string;
  total_tax: string;
  currency: string;
  financial_status: string;
  line_items: ShopifyLineItem[];
  note_attributes: ShopifyNoteAttribute[];
  created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Verifies the Shopify webhook HMAC-SHA256 signature.
 * Returns true only when the request genuinely originated from Shopify.
 */
function verifyShopifyWebhook(
  rawBody: Buffer,
  hmacHeader: string,
  secret: string,
): boolean {
  const digest = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('base64');
  // Use timingSafeEqual to prevent timing attacks
  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmacHeader));
  } catch {
    return false;
  }
}

/** Reads the raw request body as a Buffer (required for HMAC verification). */
async function getRawBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  // Only accept POST requests
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET;
  const mixpanelToken = process.env.MIXPANEL_TOKEN;

  if (!webhookSecret || !mixpanelToken) {
    console.error('Missing required environment variables');
    res.status(500).json({ error: 'Server misconfiguration' });
    return;
  }

  // Read the raw body before any JSON parsing (needed for HMAC)
  const rawBody = await getRawBody(req);

  // Verify the Shopify HMAC signature
  const hmacHeader = (req.headers['x-shopify-hmac-sha256'] as string) || '';
  if (!verifyShopifyWebhook(rawBody, hmacHeader, webhookSecret)) {
    console.warn('Webhook HMAC verification failed');
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // Parse order payload
  let order: ShopifyOrder;
  try {
    order = JSON.parse(rawBody.toString()) as ShopifyOrder;
  } catch {
    res.status(400).json({ error: 'Invalid JSON' });
    return;
  }

  // Extract the Mixpanel distinct_id we embedded as a cart attribute
  // (cart attributes become note_attributes on the order)
  const mpAttr = order.note_attributes.find((a) => a.name === '_mp_distinct_id');
  const distinctId = mpAttr?.value ?? `shopify-order-${order.id}`;

  // Initialise Mixpanel server-side client
  const mp = Mixpanel.init(mixpanelToken);

  const lineItems = order.line_items.map((item) => ({
    product_id: item.product_id,
    variant_id: item.variant_id,
    title: item.title,
    quantity: item.quantity,
    price: parseFloat(item.price),
    sku: item.sku,
  }));

  const revenue = parseFloat(order.total_price);

  // Fire the server-side purchase event
  mp.track('Purchase Completed (Server)', {
    distinct_id: distinctId,

    // Revenue
    revenue,
    currency: order.currency,
    subtotal: parseFloat(order.subtotal_price),
    tax: parseFloat(order.total_tax),

    // Order identifiers
    order_id: order.id,
    order_number: order.order_number,
    financial_status: order.financial_status,

    // Items
    item_count: order.line_items.length,
    line_items: lineItems,

    // Attribution
    source: 'shopify_webhook',

    // Suppress the server's own IP from Mixpanel's geo-lookup
    $ip: 0,

    // Use the order creation time as the event time
    time: new Date(order.created_at),
  });

  // Update the Mixpanel People profile with lifetime revenue
  mp.people.increment(distinctId, {
    'Lifetime Revenue': revenue,
    'Total Orders': 1,
  });

  mp.people.set(distinctId, {
    $email: order.email ?? undefined,
    'Last Order Date': new Date(order.created_at),
    'Last Order Value': revenue,
  });

  res.status(200).json({ ok: true });
}
