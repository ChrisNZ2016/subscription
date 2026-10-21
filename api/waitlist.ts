/**
 * Vercel Serverless Function — /api/waitlist
 *
 * Records an Australian waitlist signup from the sold-out page: Klaviyo list
 * subscription, Mixpanel event, and a Meta CAPI CompleteRegistration.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { submitWaitlist } from './lib/submit-waitlist.js';

function clientIp(req: VercelRequest): string | undefined {
  const forwarded = req.headers['x-forwarded-for'];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return raw?.split(',')[0].trim() || undefined;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const result = await submitWaitlist(req.body, {
    clientIp: clientIp(req),
    userAgent: req.headers['user-agent'],
  });
  if (!result.ok) {
    res.status(result.status).json({ error: result.error });
    return;
  }
  res.status(200).json({ ok: true });
}
