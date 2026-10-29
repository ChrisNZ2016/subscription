/**
 * Offline check for api/lib/submit-waitlist.ts (the AU demand test's signup).
 * Not a test framework: run with `npx tsx scripts/check-waitlist.mts`.
 *
 * globalThis.fetch is replaced with an in-memory stub routing Klaviyo and Meta
 * CAPI URLs, so a live call is impossible and no test profile reaches Klaviyo.
 *
 * What it pins down:
 *  - The shape of the request bodies Klaviyo receives. An earlier version of
 *    this check only matched on URL and returned 200 for any payload, so a
 *    subscribe body carrying `properties` — which Klaviyo rejects with a 400 —
 *    passed every assertion here and then failed on every real signup for a
 *    week. The stub now asserts on what is actually sent.
 *  - The Klaviyo write decides the response. A signup Klaviyo rejects must come
 *    back as a failure the visitor can retry, never the cheerful confirmation.
 *  - Reporting (properties, Mixpanel, CAPI) runs only once the address is
 *    stored, and cannot fail the request.
 */
import { submitWaitlist } from '../api/lib/submit-waitlist.js';

const fails: string[] = [];
const check = (name: string, ok: boolean, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ` — ${extra}` : ''}`);
  if (!ok) fails.push(name);
};

const KEY = 'pk_test_0123456789abcdefghijklmno';
const body = {
  email: 'check-waitlist@example.invalid',
  consent: true,
  submissionId: 'sub-1',
  eventId: 'evt-1',
  pageName: 'sold-out-au',
  pageVersion: '1.0.1',
  utm: { utm_source: 'meta' },
};

// Pretend to be the serverless runtime, where a missing store is fatal rather
// than the local-dev convenience pass-through.
process.env.VERCEL_REGION = 'syd1';

type Call = { url: string; body: any };
let calls: Call[] = [];

/**
 * Stands in for Klaviyo and Meta, and rejects a subscribe body the real API
 * would reject, so a malformed payload fails here rather than in production.
 */
function stubFetch(klaviyoStatus: number, capiStatus = 200): void {
  calls = [];
  globalThis.fetch = (async (input: unknown, init?: RequestInit) => {
    const url = String(input);
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ url, body });

    if (url.includes('profile-subscription-bulk-create-jobs')) {
      const profile = body?.data?.attributes?.profiles?.data?.[0]?.attributes ?? {};
      if ('properties' in profile) {
        return new Response(
          '{"errors":[{"status":400,"code":"invalid","detail":"\'properties\' is not a valid field for the resource \'profile\'."}]}',
          { status: 400 },
        );
      }
      return new Response('{}', { status: klaviyoStatus });
    }
    if (url.includes('profile-import')) return new Response('{}', { status: klaviyoStatus });
    if (url.includes('facebook')) return new Response('{}', { status: capiStatus });
    throw new Error(`check-waitlist: unexpected live call to ${url}`);
  }) as typeof fetch;
}

const hosts = () => calls.map((c) => new URL(c.url).hostname).join(', ') || 'none';
const call = (fragment: string) => calls.find((c) => c.url.includes(fragment));

// 1. No Klaviyo config in production: refuse rather than pretend.
delete process.env.KLAVIYO_API_KEY;
delete process.env.KLAVIYO_AU_WAITLIST_LIST_ID;
delete process.env.MIXPANEL_TOKEN;
process.env.META_PIXEL_ID = '0';
process.env.META_CAPI_ACCESS_TOKEN = 'capi-token-long-enough-to-pass';
stubFetch(200);
let r = await submitWaitlist(body);
check('unconfigured Klaviyo in prod → 500', !r.ok && r.status === 500, r.ok ? 'ok' : String(r.status));

// 2. Klaviyo 403 (a key missing subscriptions:write) → retryable failure.
process.env.KLAVIYO_API_KEY = KEY;
process.env.KLAVIYO_AU_WAITLIST_LIST_ID = 'list-id';
stubFetch(403);
r = await submitWaitlist(body);
check('Klaviyo 403 → 502', !r.ok && r.status === 502, r.ok ? 'ok' : String(r.status));
check('Klaviyo 403 → retryable message', !r.ok && /try again/i.test(r.error));
check('Klaviyo 403 → no conversion reported', !calls.some((c) => c.url.includes('facebook')), hosts());

// 3. Klaviyo accepts → ok, and only then is the conversion reported.
stubFetch(200);
r = await submitWaitlist(body);
check('Klaviyo 200 → ok', r.ok);
check('Klaviyo 200 → CAPI fired', calls.some((c) => c.url.includes('facebook')), hosts());

// 4. Reporting is best-effort: a dead CAPI must not lose a stored signup.
stubFetch(200, 500);
r = await submitWaitlist(body);
check('CAPI failure does not fail the signup', r.ok);

// 4b. The subscribe body must be what Klaviyo actually accepts.
const subscribe = call('profile-subscription-bulk-create-jobs');
const subProfile = subscribe?.body?.data?.attributes?.profiles?.data?.[0]?.attributes ?? {};
check('subscribe body carries the email', subProfile.email === body.email);
check(
  'subscribe body sends no properties (Klaviyo 400s on them)',
  !('properties' in subProfile),
  Object.keys(subProfile).join(', '),
);
check(
  'subscribe body records express consent',
  subProfile?.subscriptions?.email?.marketing?.consent === 'SUBSCRIBED',
);
check(
  'subscribe body targets the configured list',
  subscribe?.body?.data?.relationships?.list?.data?.id === 'list-id',
);

// 4c. Attribution goes through profile-import, which does take properties.
const imported = call('profile-import');
check('profile-import carries the properties', Boolean(imported?.body?.data?.attributes?.properties));
check(
  'profile-import carries the campaign UTMs',
  imported?.body?.data?.attributes?.properties?.utm_source === 'meta',
);

// 5. Validation still gates everything.
stubFetch(200);
r = await submitWaitlist({ ...body, consent: false });
check('no consent → 400', !r.ok && r.status === 400, r.ok ? 'ok' : String(r.status));
r = await submitWaitlist({ ...body, email: 'nope' });
check('invalid email → 400', !r.ok && r.status === 400, r.ok ? 'ok' : String(r.status));
r = await submitWaitlist({ ...body, company: 'spambot' });
check('honeypot → silent ok, nothing written', r.ok && calls.length === 0, `${calls.length} calls`);

console.log(fails.length ? `\n${fails.length} FAILED: ${fails.join(', ')}` : '\nall checks passed');
process.exit(fails.length ? 1 : 0);
