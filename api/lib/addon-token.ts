import crypto from 'crypto';

export interface AddonTokenPayload {
  /** Recurpay subscription id */
  sid: number;
  /** Shopify variant id to add */
  vid: number;
  /** Expiry, unix seconds */
  exp: number;
  /** Single-use nonce (campaign links use a stable `c:slug:sid` value) */
  n: string;
  /** Quantity */
  q: number;
  /** Recurpay `is_onetime` — true = this delivery only */
  o: boolean;
  /** Campaign slug, when the link came from a named campaign */
  c?: string;
}

const TOKEN_PREFIX = 'v1';

function signingSecret(): string {
  const secret = process.env.LINK_SIGNING_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('LINK_SIGNING_SECRET is missing or too short (min 16 chars)');
  }
  return secret;
}

function hmac(data: string): string {
  return crypto.createHmac('sha256', signingSecret()).update(data).digest('base64url');
}

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function signPayload(payload: AddonTokenPayload): string {
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = hmac(`${TOKEN_PREFIX}.${body}`);
  return `${TOKEN_PREFIX}.${body}.${sig}`;
}

export function readSignedToken(
  token: string,
): { payload: AddonTokenPayload; expired: boolean } | null {
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== TOKEN_PREFIX) return null;
  const [prefix, body, sig] = parts;
  if (!body || !sig) return null;
  const expected = hmac(`${prefix}.${body}`);
  if (!timingSafeEqual(sig, expected)) return null;

  let raw: AddonTokenPayload;
  try {
    raw = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as AddonTokenPayload;
  } catch {
    return null;
  }

  if (
    typeof raw.sid !== 'number' ||
    typeof raw.vid !== 'number' ||
    typeof raw.exp !== 'number' ||
    typeof raw.n !== 'string' ||
    raw.n.length === 0
  ) {
    return null;
  }

  const payload: AddonTokenPayload = {
    sid: raw.sid,
    vid: raw.vid,
    exp: raw.exp,
    n: raw.n,
    q: typeof raw.q === 'number' && raw.q > 0 ? raw.q : 1,
    o: Boolean(raw.o),
    c: typeof raw.c === 'string' ? raw.c : undefined,
  };
  return { payload, expired: payload.exp * 1000 < Date.now() };
}

export function verifyToken(token: string): AddonTokenPayload | null {
  const read = readSignedToken(token);
  if (!read || read.expired) return null;
  return read.payload;
}

/** Durable per-subscription signature for Klaviyo profile properties. */
export function signSubscriptionId(subscriptionId: number): string {
  return hmac(`v1:sid:${subscriptionId}`);
}

export function verifySubscriptionSig(subscriptionId: number, sig: string): boolean {
  if (!sig) return false;
  return timingSafeEqual(signSubscriptionId(subscriptionId), sig);
}

export function randomNonce(): string {
  return crypto.randomBytes(16).toString('base64url');
}

export function campaignNonce(slug: string, subscriptionId: number): string {
  return `c:${slug}:${subscriptionId}`;
}

export function mintToken(input: {
  subscriptionId: number;
  variantId: number;
  quantity?: number;
  isOnetime?: boolean;
  campaign?: string;
  ttlDays?: number;
  nonce?: string;
}): { token: string; payload: AddonTokenPayload } {
  const ttlDays = input.ttlDays && input.ttlDays > 0 ? input.ttlDays : 7;
  const payload: AddonTokenPayload = {
    sid: input.subscriptionId,
    vid: input.variantId,
    exp: Math.floor(Date.now() / 1000) + ttlDays * 24 * 60 * 60,
    n: input.nonce ?? randomNonce(),
    q: input.quantity && input.quantity > 0 ? input.quantity : 1,
    o: Boolean(input.isOnetime),
    c: input.campaign,
  };
  return { token: signPayload(payload), payload };
}
