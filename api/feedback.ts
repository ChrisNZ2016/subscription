/**
 * Vercel Serverless Function — /api/feedback
 *
 * Stores keep-going / get-feedback form submissions (Klaviyo + Mixpanel) and
 * opens an Intercom inbox conversation as the customer. Duplicate payloads
 * with the same submission id reply on the existing thread.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { submitFeedback } from './lib/submit-feedback.js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const result = await submitFeedback(req.body);
  if (!result.ok) {
    res.status(result.status).json({ error: result.error });
    return;
  }
  res.status(200).json({ ok: true });
}
