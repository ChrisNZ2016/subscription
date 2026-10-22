/**
 * Offline check for api/lib/submit-waitlist.ts (the AU demand test's signup).
 * Not a test framework: run with `npx tsx scripts/check-waitlist.mts`.
 *
 * globalThis.fetch is replaced with an in-memory stub routing Klaviyo and Meta
 * CAPI URLs, so a live call is impossible and no test profile reaches Klaviyo.
 *
 * What it pins down: the Klaviyo write decides the response. A signup Klaviyo
 * rejects must come back as a failure the visitor can retry, never as the
 * cheerful confirmation — that failure is silent mid-campaign and costs every
 * signup. Reporting (Mixpanel, CAPI) runs only once the address is stored, and
 * cannot fail the request.
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

let calls: string[] = [];

function stubFetch(klaviyoStatus: number, capiStatus = 200): void {
  calls = [];
  globalThis.fetch = (async (input: unknown) => {
    const url = String(input);
    calls.push(url);
    if (url.includes('klaviyo')) {
      return new Response(
        klaviyoStatus === 200
          ? '{}'
          : '{"errors":[{"code":"permission_denied","detail":"missing scopes: subscriptions:write"}]}',
        { status: klaviyoStatus },
      );
    }
    if (url.includes('facebook')) return new Response('{}', { status: capiStatus });
    throw new Error(`check-waitlist: unexpected live call to ${url}`);
  }) as typeof fetch;
}

const hosts = () => calls.map((c) => new URL(c).hostname).join(', ') || 'none';

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
check('Klaviyo 403 → no conversion reported', !calls.some((c) => c.includes('facebook')), hosts());

// 3. Klaviyo accepts → ok, and only then is the conversion reported.
stubFetch(200);
r = await submitWaitlist(body);
check('Klaviyo 200 → ok', r.ok);
check('Klaviyo 200 → CAPI fired', calls.some((c) => c.includes('facebook')), hosts());

// 4. Reporting is best-effort: a dead CAPI must not lose a stored signup.
stubFetch(200, 500);
r = await submitWaitlist(body);
check('CAPI failure does not fail the signup', r.ok);

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
