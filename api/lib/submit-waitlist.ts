import crypto from 'crypto';
import Mixpanel from 'mixpanel';
import { sendMetaCompleteRegistration } from './meta-capi.js';

/**
 * Australian waitlist signups from the sold-out page on lp.littlegreen-dog.com.
 *
 * The AU test has no stock and no checkout, so this endpoint is the whole
 * conversion: it records the email in Klaviyo, the event in the AU Mixpanel
 * project, and a CompleteRegistration in the AU pixel via CAPI.
 *
 * Only the Klaviyo write decides whether the request succeeded — see the
 * comment at the bottom of submitWaitlist().
 *
 * Express consent is required — this collects marketing emails from Australian
 * residents, so the checkbox on the form is not decoration and an unconsented
 * payload is rejected rather than quietly subscribed.
 */

const KLAVIYO_REVISION = '2024-10-15';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_TEXT = 500;
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;

export type SubmitWaitlistResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

type WaitlistBody = {
  submissionId?: unknown;
  email?: unknown;
  consent?: unknown;
  company?: unknown;
  eventId?: unknown;
  distinctId?: unknown;
  fbp?: unknown;
  fbc?: unknown;
  utm?: unknown;
  pageName?: unknown;
  pageVersion?: unknown;
  sourceUrl?: unknown;
};

export interface WaitlistRequestMeta {
  clientIp?: string;
  userAgent?: string;
}

function readSecret(name: string): string | undefined {
  const value = process.env[name]?.trim();
  if (!value || value.length < 20 || value.startsWith('[')) return undefined;
  return value;
}

function asString(value: unknown, max = MAX_TEXT): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

function readUtms(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object') return {};
  const source = value as Record<string, unknown>;
  const utms: Record<string, string> = {};
  for (const key of UTM_KEYS) {
    const v = asString(source[key], 200);
    if (v) utms[key] = v;
  }
  return utms;
}

/**
 * Subscribes the profile to the AU waitlist list with express email consent.
 *
 * Klaviyo honours the list's own opt-in setting here: on a double opt-in list
 * this only sends a confirmation email and the profile stays unconsented until
 * the visitor clicks it, which would silently undercount the test. The AU
 * waitlist list must be single opt-in.
 */
async function subscribeToKlaviyoList(input: {
  apiKey: string;
  listId: string;
  email: string;
  properties: Record<string, string>;
}): Promise<void> {
  const res = await fetch('https://a.klaviyo.com/api/profile-subscription-bulk-create-jobs', {
    method: 'POST',
    headers: {
      Authorization: `Klaviyo-API-Key ${input.apiKey}`,
      revision: KLAVIYO_REVISION,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data: {
        type: 'profile-subscription-bulk-create-job',
        attributes: {
          custom_source: 'AU waitlist (lp.littlegreen-dog.com)',
          profiles: {
            data: [
              {
                type: 'profile',
                attributes: {
                  email: input.email,
                  properties: input.properties,
                  subscriptions: {
                    email: { marketing: { consent: 'SUBSCRIBED' } },
                  },
                },
              },
            ],
          },
        },
        relationships: {
          list: { data: { type: 'list', id: input.listId } },
        },
      },
    }),
  });

  if (!res.ok) {
    throw new Error(
      `Klaviyo subscribe ${res.status}: ${(await res.text()).slice(0, 300)}`,
    );
  }
}

function trackMixpanel(input: {
  token: string;
  insertId: string;
  distinctId: string;
  email: string;
  submissionId: string;
  pageName: string;
  pageVersion: string;
  utms: Record<string, string>;
}): Promise<void> {
  return new Promise((resolve, reject) => {
    Mixpanel.init(input.token).track(
      'Waitlist Submitted (Server)',
      {
        distinct_id: input.distinctId,
        $insert_id: input.insertId,
        email: input.email,
        submission_id: input.submissionId,
        page: input.pageName,
        page_name: input.pageName,
        page_version: input.pageVersion,
        ...input.utms,
        $ip: 0,
      },
      (err) => {
        if (err) reject(err);
        else resolve();
      },
    );
  });
}

export async function submitWaitlist(
  raw: unknown,
  meta: WaitlistRequestMeta = {},
): Promise<SubmitWaitlistResult> {
  const body = (raw ?? {}) as WaitlistBody;

  // Honeypot: pretend success so bots don't retry.
  if (asString(body.company, 200)) {
    return { ok: true };
  }

  const email = asString(body.email, 320).toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return { ok: false, status: 400, error: 'A valid email is required' };
  }
  if (body.consent !== true) {
    return { ok: false, status: 400, error: 'Please tick the box to join the waitlist' };
  }

  const submissionId = asString(body.submissionId, 80) || crypto.randomUUID();
  const eventId = asString(body.eventId, 80) || submissionId;
  const distinctId = asString(body.distinctId, 120);
  const pageName = asString(body.pageName, 40) || 'sold-out-au';
  const pageVersion = asString(body.pageVersion, 20) || '0.0.0';
  const fbp = asString(body.fbp, 200);
  const fbc = asString(body.fbc, 500);
  const sourceUrl = asString(body.sourceUrl, 1000);
  const utms = readUtms(body.utm);

  const insertId = `wl-${crypto
    .createHash('sha256')
    .update(`${submissionId}:${email}`)
    .digest('hex')
    .slice(0, 24)}`;

  const klaviyoKey = readSecret('KLAVIYO_API_KEY');
  const listId = process.env.KLAVIYO_AU_WAITLIST_LIST_ID?.trim();
  const mixpanelToken = readSecret('MIXPANEL_TOKEN');

  // Klaviyo decides the outcome. It is the only channel that stores the address
  // somewhere we can email from later, and the page has just promised the
  // visitor exactly that — so a signup Klaviyo did not accept is a failed
  // signup, however well the analytics went. Telling someone they are on a
  // list they are not on is the one failure here with no way back: they do not
  // retry, and during a campaign it is silent.
  if (!klaviyoKey || !listId) {
    // Local `npm run dev` usually has placeholder env values; accept the
    // submission so the form can be previewed. Vercel functions always have
    // VERCEL_REGION and must have somewhere real to put the email.
    if (!process.env.VERCEL_REGION) {
      console.info('Waitlist accepted locally (no Klaviyo keys)', { email, pageName });
      return { ok: true };
    }
    console.error('Waitlist submit: missing KLAVIYO_API_KEY or KLAVIYO_AU_WAITLIST_LIST_ID');
    return { ok: false, status: 500, error: 'Server misconfiguration' };
  }

  try {
    await subscribeToKlaviyoList({
      apiKey: klaviyoKey,
      listId,
      email,
      properties: {
        waitlist_source: 'au-demand-test',
        waitlist_page: pageName,
        waitlist_page_version: pageVersion,
        ...utms,
      },
    });
  } catch (err) {
    console.error('Waitlist Klaviyo subscribe failed', err);
    return {
      ok: false,
      status: 502,
      error: 'Could not save your email. Please try again in a moment.',
    };
  }

  // The email is stored, so the signup has happened. Everything below reports
  // it; none of it can un-happen it, so none of it changes the response. These
  // are awaited rather than left dangling because the serverless instance is
  // frozen as soon as the response is sent.
  const reports: Array<Promise<unknown>> = [
    sendMetaCompleteRegistration({
      eventId,
      email,
      fbp: fbp || undefined,
      fbc: fbc || undefined,
      sourceUrl: sourceUrl || undefined,
      clientIp: meta.clientIp,
      userAgent: meta.userAgent,
      customData: utms,
    }).catch((err: unknown) => {
      console.error('Waitlist CAPI failed', err);
    }),
  ];

  if (mixpanelToken) {
    reports.push(
      trackMixpanel({
        token: mixpanelToken,
        insertId,
        distinctId: distinctId || email,
        email,
        submissionId,
        pageName,
        pageVersion,
        utms,
      }).catch((err: unknown) => {
        console.error('Waitlist Mixpanel failed', err);
      }),
    );
  }

  await Promise.all(reports);

  return { ok: true };
}
