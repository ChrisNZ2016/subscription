/**
 * Distributed lock that stops one RecurPay subscription getting two instant orders
 * from concurrent requests (see docs/intercom-subscription-panel.md, section 7).
 *
 * Why it exists: RecurPay's renew endpoint has no idempotency key and only updates
 * last_billing_at once the order is done. Intercom may retry a submit after about
 * 15 seconds while the first renew is still running, so the last_billing_at check
 * alone cannot stop a second charge. An atomic SET NX in Upstash Redis can.
 *
 * Release policy (deliberate): the lock is NEVER released.
 *   - After a successful order, the 15-minute TTL is a second double-order guard
 *     that sits alongside the last_billing_at check.
 *   - After a failed renew we cannot know whether RecurPay charged the card before
 *     the error came back (timeouts especially), so releasing could allow a real
 *     double charge. A failed attempt can be retried once the TTL expires, and the
 *     blocked card tells the teammate when (lockExpiryNote()).
 *
 * Fail closed: when the store is not configured the confirm step refuses to create
 * an order. Callers must check isLockConfigured() first.
 *
 * Env (names set by the Upstash / Vercel KV integration):
 *   KV_REST_API_URL
 *   KV_REST_API_TOKEN
 */

const LOCK_TTL_SECONDS = 900;

function readConfig(): { url: string; token: string } | undefined {
  const url = process.env.KV_REST_API_URL?.trim();
  const token = process.env.KV_REST_API_TOKEN?.trim();
  if (!url || !token) return undefined;
  return { url, token };
}

export function isLockConfigured(): boolean {
  return readConfig() !== undefined;
}

/** Shown on the blocked card. Keep in step with the default TTL (900s = 15 minutes). */
export function lockExpiryNote(): string {
  return 'Try again in 15 minutes.';
}

/**
 * Atomically claims the lock for a subscription. Returns true only when this call
 * created the key (Upstash replies "OK"); false when it is already held.
 * Throws when the store is unconfigured, unreachable, or replies with an error.
 */
export async function acquireOrderLock(
  subscriptionId: number,
  ttlSeconds: number = LOCK_TTL_SECONDS,
): Promise<boolean> {
  const config = readConfig();
  if (!config) throw new Error('Order lock store is not configured');

  const res = await fetch(config.url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([
      'SET',
      `instant-order:${subscriptionId}`,
      new Date().toISOString(),
      'NX',
      'EX',
      String(ttlSeconds),
    ]),
  });

  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`Order lock store ${res.status}: ${raw.slice(0, 200)}`);
  }

  let json: { result?: unknown; error?: unknown };
  try {
    json = JSON.parse(raw) as { result?: unknown; error?: unknown };
  } catch {
    throw new Error(`Order lock store returned invalid JSON: ${raw.slice(0, 200)}`);
  }
  if (json.error) {
    throw new Error(`Order lock store error: ${String(json.error).slice(0, 200)}`);
  }
  return json.result === 'OK';
}
