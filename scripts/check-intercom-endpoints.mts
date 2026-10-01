/**
 * Offline check for api/intercom/initialize.ts and api/intercom/submit.ts.
 * Not a test framework: run with `npx tsx scripts/check-intercom-endpoints.mts`.
 *
 * globalThis.fetch is replaced with an in-memory stub that routes RecurPay, Upstash and
 * Intercom URLs. Any other URL throws, so a live call is impossible. Exits non-zero on
 * the first failed assertion.
 */
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { Readable } from 'node:stream';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const SECRET = 'test-client-secret-not-real';
const RP_BASE = 'https://recurpay.invalid/admin/api/2024-07';
const KV_URL = 'https://kv.invalid';
const INTERCOM_HOST = 'https://api.intercom.io';

process.env.INTERCOM_CANVAS_CLIENT_SECRET = SECRET;
process.env.RECURPAY_API_BASE = RP_BASE;
process.env.RECURPAY_ACCESS_TOKEN = 'rcpat_fake_token';
process.env.INTERCOM_ACCESS_TOKEN = 'intercom-fake-token-0123456789';
process.env.RECURPAY_ADMIN_URL_TEMPLATE = 'https://recurpay.invalid/subscriptions/{id}';
process.env.KV_REST_API_URL = KV_URL;
process.env.KV_REST_API_TOKEN = 'kv-fake-token';

const { default: initialize } = await import('../api/intercom/initialize.js');
const { default: submit } = await import('../api/intercom/submit.js');
const { RecurpayError } = await import('../api/lib/recurpay.js');

// ---------------------------------------------------------------------------
// In-memory world + fetch stub
// ---------------------------------------------------------------------------

type Sub = Record<string, unknown> & { id: number; status: string; subscriber: { email: string } };
type Call = { method: string; url: string; body?: unknown };

const MIN = 60_000;
const DAY = 24 * 60 * MIN;

function makeSub(id: number, email: string, status: string, extra: Record<string, unknown> = {}): Sub {
  return {
    id,
    status,
    subscriber: { email },
    delivery_policy: { frequency: 2, interval: 'months' },
    billing_policy: { frequency: 2, interval: 'months' },
    // price is the FULL retail price; the 25% subscriber discount is in pricing_polices (pays $99.00).
    line_items: [
      {
        id: 1,
        title: 'Kibble 6kg',
        quantity: 1,
        price: 132,
        pricing_polices: [{ discount: { type: 'percentage', value: 25, currency: 'NZD' } }],
      },
    ],
    delivery_method: { title: 'Standard', price: 0 },
    payment_method: { gateway: 'Shopify Payments' },
    orders_count: 3,
    last_billing_at: new Date(Date.now() - 30 * DAY).toISOString(),
    next_billing_at: new Date(Date.now() + 30 * DAY).toISOString(),
    subscribed_at: '2026-01-19T00:00:00Z',
    ...extra,
  };
}

const world = {
  subs: new Map<number, Sub>(),
  locks: new Set<string>(),
  calls: [] as Call[],
  notes: [] as Array<{ path: string; body: Record<string, unknown> }>,
  listFails: false,
  renewCount: 0,
  renewFails: undefined as undefined | { status: number; message: string },
  renewUpdatesBilling: true,
};

function resetWorld(): void {
  world.subs.clear();
  world.locks.clear();
  world.calls.length = 0;
  world.notes.length = 0;
  world.listFails = false;
  world.renewCount = 0;
  world.renewFails = undefined;
  world.renewUpdatesBilling = true;
  process.env.KV_REST_API_URL = KV_URL;
  process.env.KV_REST_API_TOKEN = 'kv-fake-token';
  for (const s of [
    makeSub(41, 'jane@example.com', 'active'),
    makeSub(40, 'jane@example.com', 'cancelled', { cancelled_at: '2026-03-01T00:00:00Z' }),
    makeSub(42, 'jane@example.com', 'paused'),
    makeSub(43, 'other@example.com', 'active'),
  ]) {
    world.subs.set(s.id, s);
  }
}

function jsonResponse(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const method = (init?.method ?? 'GET').toUpperCase();
  const bodyText = typeof init?.body === 'string' ? init.body : undefined;
  const body: unknown = bodyText ? JSON.parse(bodyText) : undefined;
  world.calls.push({ method, url, body });

  if (url.startsWith(RP_BASE)) {
    const u = new URL(url);
    const path = u.pathname.slice(new URL(RP_BASE).pathname.length);
    if (method === 'GET' && path === '/subscriptions') {
      if (world.listFails) return jsonResponse(500, { success: false, message: 'RecurPay is down' });
      const email = (u.searchParams.get('email') ?? '').toLowerCase();
      const list = [...world.subs.values()].filter((s) => s.subscriber.email.toLowerCase() === email);
      return jsonResponse(200, { success: true, data: { subscriptions: list }, page_info: { has_next_page: false } });
    }
    const one = /^\/subscriptions\/(\d+)$/.exec(path);
    if (method === 'GET' && one) {
      const sub = world.subs.get(Number(one[1]));
      if (!sub) return jsonResponse(404, { success: false, message: 'Not found' });
      return jsonResponse(200, { success: true, data: { subscription: sub } });
    }
    const renew = /^\/subscriptions\/(\d+)\/renew$/.exec(path);
    if (method === 'PUT' && renew) {
      world.renewCount++;
      await sleep(25); // keeps concurrent requests genuinely overlapping
      if (world.renewFails) {
        return jsonResponse(world.renewFails.status, { success: false, message: world.renewFails.message });
      }
      const sub = world.subs.get(Number(renew[1]));
      if (!sub) return jsonResponse(404, { success: false, message: 'Not found' });
      if (world.renewUpdatesBilling) {
        sub.last_billing_at = new Date().toISOString();
        sub.next_billing_at = new Date(Date.now() + 60 * DAY).toISOString();
      }
      return jsonResponse(200, {
        success: true,
        data: {
          subscription: sub,
          order: { id: 5551234, name: '#LGD6801', financial_status: 'paid', total_price: '99.00' },
        },
      });
    }
  }

  if (url === KV_URL && method === 'POST') {
    const cmd = body as string[];
    assert.equal(cmd[0], 'SET');
    assert.equal(cmd[3], 'NX');
    assert.equal(cmd[4], 'EX');
    assert.equal(cmd[5], '900');
    if (world.locks.has(cmd[1])) return jsonResponse(200, { result: null });
    world.locks.add(cmd[1]);
    return jsonResponse(200, { result: 'OK' });
  }

  if (url.startsWith(INTERCOM_HOST) && method === 'POST' && url.endsWith('/reply')) {
    world.notes.push({ path: url.slice(INTERCOM_HOST.length), body: body as Record<string, unknown> });
    return jsonResponse(200, { type: 'conversation' });
  }

  throw new Error(`Unexpected network call in check harness: ${method} ${url}`);
}) as typeof fetch;

const kvCalls = () => world.calls.filter((c) => c.url === KV_URL);
const recurpayCalls = () => world.calls.filter((c) => c.url.startsWith(RP_BASE));

// ---------------------------------------------------------------------------
// Request / response mocks
// ---------------------------------------------------------------------------

type Result = { status: number; body: unknown };

function sign(raw: string, secret = SECRET): string {
  return createHmac('sha256', secret).update(raw).digest('hex');
}

async function call(
  handler: (req: VercelRequest, res: VercelResponse) => Promise<void>,
  opts: { method?: string; payload?: unknown; signature?: string | null; raw?: string } = {},
): Promise<Result> {
  const raw = opts.raw ?? JSON.stringify(opts.payload ?? {});
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (opts.signature !== null) headers['x-body-signature'] = opts.signature ?? sign(raw);
  const req = Object.assign(Readable.from([Buffer.from(raw)]), {
    method: opts.method ?? 'POST',
    headers,
  }) as unknown as VercelRequest;
  // Guard the hard rule: handlers must never read req.body.
  Object.defineProperty(req, 'body', {
    get() {
      throw new Error('handler touched req.body');
    },
  });

  const out: Result = { status: 0, body: undefined };
  const res = {
    setHeader() {
      return res;
    },
    status(code: number) {
      out.status = code;
      return res;
    },
    json(b: unknown) {
      out.body = b;
      return res;
    },
  } as unknown as VercelResponse;

  const saved = { error: console.error, warn: console.warn };
  console.error = () => {};
  console.warn = () => {};
  try {
    await handler(req, res);
  } finally {
    console.error = saved.error;
    console.warn = saved.warn;
  }
  return out;
}

const contactJane = { email: 'jane@example.com', name: 'Jane' };
const admin = { id: '99', name: 'Chris' };
const conversation = { id: '215476147059073' };

function submitPayload(componentId: string, extra: Record<string, unknown> = {}) {
  return { component_id: componentId, contact: contactJane, admin, conversation, ...extra };
}

type Component = { type: string; id?: string; text?: string; style?: string; items?: Array<{ field: string; value: string }>; action?: { type: string; url?: string } };
type Canvas = { canvas: { content: { components: Component[] }; stored_data?: Record<string, unknown> } };

const components = (r: Result) => (r.body as Canvas).canvas.content.components;
const buttonIds = (r: Result) => components(r).filter((c) => c.type === 'button').map((c) => c.id);
const allText = (r: Result) => JSON.stringify(r.body);
const stored = (r: Result) => (r.body as Canvas).canvas.stored_data;

const confirmPayload = (id: number, storedData: Record<string, unknown> = { subscription_id: id, contact_email: 'jane@example.com', nonce: 'n' }) =>
  submitPayload(`confirm_order:${id}`, { stored_data: storedData });

// ---------------------------------------------------------------------------
// Cases
// ---------------------------------------------------------------------------

let passed = 0;
async function check(name: string, fn: () => Promise<void>): Promise<void> {
  resetWorld();
  try {
    await fn();
  } catch (err) {
    console.error(`FAIL ${name}`);
    throw err;
  }
  passed++;
  console.log(`ok   ${name}`);
}

await check('a. bad or missing signature -> 401 and no network calls', async () => {
  for (const handler of [initialize, submit]) {
    const raw = JSON.stringify(submitPayload('refresh'));
    const bad = await call(handler, { raw, signature: 'a'.repeat(64) });
    assert.equal(bad.status, 401);
    assert.deepEqual(bad.body, { error: 'invalid signature' });
    const missing = await call(handler, { raw, signature: null });
    assert.equal(missing.status, 401);
    const wrongSecret = await call(handler, { raw, signature: sign(raw, 'some-other-secret') });
    assert.equal(wrongSecret.status, 401);
    const tampered = await call(handler, { raw: raw + ' ', signature: sign(raw) });
    assert.equal(tampered.status, 401);
    const wrongMethod = await call(handler, { method: 'GET' });
    assert.equal(wrongMethod.status, 405);
  }
  assert.equal(world.calls.length, 0, 'fetch must never be called');
});

await check('b1. no email -> no-email card', async () => {
  const r = await call(initialize, { payload: { contact: { name: 'No Email' }, admin, conversation } });
  assert.equal(r.status, 200);
  assert.match(allText(r), /No email on this contact/);
  assert.equal(world.calls.length, 0);
});

await check('b2. RecurPay error -> error card with 200', async () => {
  world.listFails = true;
  const r = await call(initialize, { payload: { contact: contactJane, admin, conversation } });
  assert.equal(r.status, 200);
  assert.match(allText(r), /Couldn't reach RecurPay just now\./);
  assert.deepEqual(buttonIds(r), ['refresh']);
});

await check('c. card lists subscriptions, order button only on the active one', async () => {
  const r = await call(initialize, { payload: { contact: contactJane, admin, conversation } });
  assert.equal(r.status, 200);
  const ids = buttonIds(r);
  assert.deepEqual(ids.filter((id) => id?.startsWith('order:')), ['order:41']);
  assert.ok(ids.includes('open:41') && ids.includes('open:42'));
  assert.ok(ids.includes('show_all'), 'cancelled subscription collapsed behind show_all');
  assert.equal(stored(r)?.contact_email, 'jane@example.com');
  // price is full retail ($132.00); the card shows what the subscriber pays
  assert.match(allText(r), /Kibble 6kg × 1, \$99\.00 \(25% off \$132\.00\)/);
  assert.match(allText(r), /\$99\.00, free delivery/);
  assert.match(allText(r), /25% subscriber discount/);

  const all = await call(submit, { payload: submitPayload('show_all') });
  assert.deepEqual(buttonIds(all).filter((id) => id?.startsWith('order:')), ['order:41']);
  assert.ok(!buttonIds(all).includes('show_all'));
  assert.match(allText(all), /Cancelled/);

  // refresh / back / cancel all rebuild the card
  for (const id of ['refresh', 'back', 'cancel']) {
    const rr = await call(submit, { payload: submitPayload(id) });
    assert.ok(buttonIds(rr).includes('order:41'), id);
  }
  // contact without a subscription
  const none = await call(initialize, { payload: { contact: { email: 'nobody@example.com' }, admin, conversation } });
  assert.match(allText(none), /No RecurPay subscription for nobody@example\.com/);
});

await check('d. order:N -> confirm card carrying stored_data.subscription_id', async () => {
  const r = await call(submit, {
    payload: submitPayload('order:41', { contact: { email: ' Jane@Example.com ' } }),
  });
  assert.equal(r.status, 200);
  assert.ok(buttonIds(r).includes('confirm_order:41'));
  assert.match(allText(r), /Create an order now\?/);
  assert.match(allText(r), /Estimated total/);
  assert.match(allText(r), /\$99\.00/);
  assert.doesNotMatch(allText(r), /\$132\.00/, 'confirm screen must not show the full retail price');
  assert.equal(stored(r)?.subscription_id, 41);
  assert.equal(typeof stored(r)?.nonce, 'string');
  assert.equal(world.renewCount, 0);
  assert.equal(kvCalls().length, 0, 'confirm screen must not take the lock');
  // unknown component
  const unk = await call(submit, { payload: submitPayload('nonsense:1') });
  assert.match(allText(unk), /That button didn't do anything/);
});

await check('e. confirm_order with mismatched stored_data -> blocked, renew NOT called', async () => {
  const mismatch = await call(submit, { payload: confirmPayload(41, { subscription_id: 99, contact_email: 'jane@example.com' }) });
  assert.match(allText(mismatch), /Something changed\. Please start again\./);
  const missing = await call(submit, { payload: submitPayload('confirm_order:41') });
  assert.match(allText(missing), /Something changed\. Please start again\./);
  assert.equal(world.renewCount, 0);
  assert.equal(kvCalls().length, 0);
});

await check('f. lock store not configured -> blocked (fail closed), renew NOT called', async () => {
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  const r = await call(submit, { payload: confirmPayload(41) });
  assert.equal(r.status, 200);
  assert.match(allText(r), /Instant orders aren't switched on yet: the order lock store isn't configured\./);
  assert.equal(world.renewCount, 0);
  assert.equal(kvCalls().length, 0);
  // the card and confirm screen still work
  assert.ok(buttonIds(await call(initialize, { payload: { contact: contactJane } })).includes('order:41'));
  assert.ok(buttonIds(await call(submit, { payload: submitPayload('order:41') })).includes('confirm_order:41'));
});

await check('g. happy path -> renew once, result card, one Intercom note', async () => {
  const r = await call(submit, { payload: confirmPayload(41) });
  assert.equal(r.status, 200);
  assert.equal(world.renewCount, 1);
  assert.match(allText(r), /Order created/);
  assert.match(allText(r), /#LGD6801/);
  assert.match(allText(r), /\$99\.00/);
  const shopify = components(r).find((c) => c.id === 'shopify');
  assert.equal(shopify?.action?.url, 'https://admin.shopify.com/store/little-green-dog/orders/5551234');
  assert.equal(world.notes.length, 1);
  assert.equal(world.notes[0].path, `/conversations/${conversation.id}/reply`);
  assert.equal(world.notes[0].body.message_type, 'note');
  assert.equal(world.notes[0].body.admin_id, '99');
  const noteBody = String(world.notes[0].body.body);
  assert.match(noteBody, /Chris created instant order #LGD6801 \(\$99\.00\) for RecurPay subscription 41 from Intercom\. Next order: /);
  assert.equal(world.locks.has('instant-order:41'), true, 'lock is not released');
  // repeat on the same subscription: last_billing_at is now fresh, so the guard trips
  const again = await call(submit, { payload: confirmPayload(41) });
  assert.match(allText(again), /An order was already created for this subscription at /);
  assert.equal(world.renewCount, 1);
  assert.equal(world.notes.length, 1);
});

await check('h. duplicate / concurrent confirm (lock held) -> blocked, renew once in total', async () => {
  world.renewUpdatesBilling = false; // RecurPay lag: last_billing_at not yet updated
  const [r1, r2] = await Promise.all([
    call(submit, { payload: confirmPayload(41) }),
    call(submit, { payload: confirmPayload(41) }),
  ]);
  const texts = [allText(r1), allText(r2)];
  assert.equal(texts.filter((t) => t.includes('Order created')).length, 1);
  assert.equal(
    texts.filter((t) => t.includes('already being processed or was just created. Try again in 15 minutes.')).length,
    1,
  );
  assert.equal(world.renewCount, 1);
  const third = await call(submit, { payload: confirmPayload(41) });
  assert.match(allText(third), /Try again in 15 minutes\./);
  assert.equal(world.renewCount, 1);
  assert.equal(world.notes.length, 1);
});

await check('i. last_billing_at 5 minutes ago -> blocked by recentOrderGuard, renew NOT called', async () => {
  world.subs.get(41)!.last_billing_at = new Date(Date.now() - 5 * MIN).toISOString();
  const r = await call(submit, { payload: confirmPayload(41) });
  assert.match(allText(r), /An order was already created for this subscription at /);
  assert.equal(world.renewCount, 0);
  assert.equal(kvCalls().length, 0);
  const screen = await call(submit, { payload: submitPayload('order:41') });
  assert.match(allText(screen), /An order was already created/);
  assert.ok(!buttonIds(screen).includes('confirm_order:41'));
});

await check('j. renew returns RecurpayError -> failed card with message, failure note', async () => {
  world.renewFails = { status: 400, message: 'Card declined' };
  const r = await call(submit, { payload: confirmPayload(41) });
  assert.equal(r.status, 200);
  assert.match(allText(r), /Order failed/);
  assert.match(allText(r), /Card declined/);
  assert.equal(world.renewCount, 1);
  assert.equal(world.notes.length, 1);
  assert.match(String(world.notes[0].body.body), /Chris tried to create an instant order for RecurPay subscription 41 from Intercom; RecurPay said: Card declined/);
  // no automatic retry, and the lock keeps a manual retry out until the TTL expires
  world.renewFails = undefined;
  const retry = await call(submit, { payload: confirmPayload(41) });
  assert.match(allText(retry), /Try again in 15 minutes\./);
  assert.equal(world.renewCount, 1);
  // sanity: the error type the handler relies on
  assert.equal(new RecurpayError('x', 400).status, 400);
});

await check('k. subscription email not matching contact -> blocked', async () => {
  const screen = await call(submit, { payload: submitPayload('order:43') });
  assert.match(allText(screen), /This subscription doesn't belong to this contact\./);
  assert.ok(!buttonIds(screen).includes('confirm_order:43'));
  const forged = await call(submit, { payload: confirmPayload(43, { subscription_id: 43, contact_email: 'jane@example.com' }) });
  assert.match(allText(forged), /This subscription doesn't belong to this contact\./);
  assert.equal(world.renewCount, 0);
  assert.equal(kvCalls().length, 0);
  // contact with no email at all cannot own anything
  const noEmail = await call(submit, { payload: submitPayload('order:41', { contact: {} }) });
  assert.match(allText(noEmail), /doesn't belong to this contact/);
});

await check('l. paused subscription: no order button, forged confirm blocked', async () => {
  const card = await call(initialize, { payload: { contact: contactJane, admin, conversation } });
  assert.ok(!buttonIds(card).includes('order:42'));
  const forged = await call(submit, { payload: confirmPayload(42) });
  assert.match(allText(forged), /Subscription is paused/);
  assert.equal(world.renewCount, 0);
  assert.equal(kvCalls().length, 0);
  const forgedScreen = await call(submit, { payload: submitPayload('order:42') });
  assert.match(allText(forgedScreen), /Subscription is paused/);
  assert.equal(recurpayCalls().some((c) => c.method === 'PUT'), false);
});

console.log(`\n${passed} checks passed`);
