/**
 * Shared raw request body reader for signed webhooks and Intercom Canvas requests.
 * HMAC signatures are computed over the exact bytes sent, so read this before any
 * JSON parsing.
 */
import type { VercelRequest } from '@vercel/node';

/** Reads the raw request body as a Buffer (required for HMAC verification). */
export async function getRawBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
