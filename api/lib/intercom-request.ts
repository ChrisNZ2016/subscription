/**
 * Shared request handling for the Intercom Canvas endpoints
 * (/api/intercom/initialize and /api/intercom/submit).
 *
 * Reads the RAW body via getRawBody (never req.body, whose lazy parser would consume
 * the stream), verifies X-Body-Signature, then parses JSON.
 *
 * Env: INTERCOM_CANVAS_CLIENT_SECRET
 */
import type { VercelRequest } from '@vercel/node';
import { verifyIntercomSignature } from './intercom-canvas.js';
import { getRawBody } from './raw-body.js';

export type VerifiedBody =
  | { ok: true; body: Record<string, unknown> }
  | { ok: false; status: 400 | 401; error: string };

export async function readVerifiedCanvasBody(req: VercelRequest): Promise<VerifiedBody> {
  const raw = await getRawBody(req);
  const header = req.headers['x-body-signature'];
  const signature = typeof header === 'string' ? header : undefined;
  if (!verifyIntercomSignature(raw, signature, process.env.INTERCOM_CANVAS_CLIENT_SECRET)) {
    return { ok: false, status: 401, error: 'invalid signature' };
  }
  try {
    const parsed: unknown = JSON.parse(raw.toString('utf8'));
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return { ok: false, status: 400, error: 'invalid body' };
    }
    return { ok: true, body: parsed as Record<string, unknown> };
  } catch {
    return { ok: false, status: 400, error: 'invalid json' };
  }
}
