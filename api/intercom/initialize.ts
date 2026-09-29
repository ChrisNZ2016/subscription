/**
 * Vercel Serverless Function: /api/intercom/initialize
 *
 * Intercom Canvas Kit "initialize" URL for the RecurPay subscriptions card in the
 * conversation Details panel. Verifies X-Body-Signature over the raw body, looks up
 * the contact's RecurPay subscriptions by email and returns the card.
 * See docs/intercom-subscription-panel.md.
 *
 * Env:
 *   INTERCOM_CANVAS_CLIENT_SECRET  client secret of the Intercom Developer Hub app
 *   RECURPAY_ACCESS_TOKEN, RECURPAY_API_BASE
 *   RECURPAY_ADMIN_URL_TEMPLATE    optional, e.g. https://.../subscriptions/{id}
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { readContact } from '../lib/intercom-canvas.js';
import { readVerifiedCanvasBody } from '../lib/intercom-request.js';
import { loadSubscriptionCard } from '../lib/panel-cards.js';
import { buildErrorCard } from '../lib/subscription-panel.js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Raw body first: never touch req.body in this handler.
  const verified = await readVerifiedCanvasBody(req);
  if (!verified.ok) {
    if (verified.status === 401) console.warn('Intercom initialize: signature verification failed');
    res.status(verified.status).json({ error: verified.error });
    return;
  }

  try {
    const { email } = readContact(verified.body);
    res.status(200).json(await loadSubscriptionCard(email));
  } catch (err) {
    console.error('Intercom initialize failed:', err instanceof Error ? err.message : String(err));
    res.status(200).json(buildErrorCard('Something went wrong loading RecurPay. Try again.'));
  }
}
