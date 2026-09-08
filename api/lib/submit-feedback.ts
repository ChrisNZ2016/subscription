import crypto from 'crypto';
import Mixpanel from 'mixpanel';
import { buildIntercomMessage, upsertIntercomFeedback } from './intercom-feedback.js';

const KLAVIYO_REVISION = '2024-10-15';
const PAGES = new Set(['keep-going', 'get-feedback']);
const REASON_LABELS: Record<string, string> = {
  cost: 'Cost',
  consumption: 'Hard to estimate consumption',
  taste: "Dog doesn't like the food",
  allergies: "Allergy symptoms haven't improved",
};
const REASON_IDS = new Set(Object.keys(REASON_LABELS));
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_TEXT = 5000;

export type SubmitFeedbackResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

type FeedbackBody = {
  submissionId?: unknown;
  page?: unknown;
  email?: unknown;
  reasons?: unknown;
  comment?: unknown;
  message?: unknown;
  distinctId?: unknown;
  company?: unknown;
};

function readSecret(name: string): string | undefined {
  const value = process.env[name]?.trim();
  if (!value || value.length < 20 || value.startsWith('[')) return undefined;
  return value;
}

function asString(value: unknown, max = MAX_TEXT): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

function payloadKey(parts: {
  submissionId: string;
  page: string;
  email: string;
  reasons: string[];
  comment: string;
  message: string;
}): string {
  return crypto
    .createHash('sha256')
    .update(
      JSON.stringify({
        submissionId: parts.submissionId,
        page: parts.page,
        email: parts.email,
        reasons: [...parts.reasons].sort(),
        comment: parts.comment,
        message: parts.message,
      }),
    )
    .digest('hex')
    .slice(0, 24);
}

async function createKlaviyoEvent(input: {
  apiKey: string;
  email: string;
  uniqueId: string;
  metric: string;
  properties: Record<string, string | string[]>;
}): Promise<void> {
  const res = await fetch('https://a.klaviyo.com/api/events', {
    method: 'POST',
    headers: {
      Authorization: `Klaviyo-API-Key ${input.apiKey}`,
      revision: KLAVIYO_REVISION,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data: {
        type: 'event',
        attributes: {
          unique_id: input.uniqueId,
          properties: input.properties,
          metric: {
            data: {
              type: 'metric',
              attributes: { name: input.metric },
            },
          },
          profile: {
            data: {
              type: 'profile',
              attributes: { email: input.email },
            },
          },
        },
      },
    }),
  });
  if (!res.ok) {
    throw new Error(`Klaviyo event ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
}

function trackMixpanel(input: {
  token: string;
  uniqueId: string;
  distinctId: string;
  page: string;
  email: string;
  submissionId: string;
  reasonLabels: string[];
  comment: string;
  message: string;
}): Promise<void> {
  return new Promise((resolve, reject) => {
    Mixpanel.init(input.token).track(
      'Feedback Submitted',
      {
        distinct_id: input.distinctId,
        $insert_id: input.uniqueId,
        page: input.page,
        email: input.email,
        submission_id: input.submissionId,
        reasons: input.reasonLabels,
        comment: input.comment,
        message: input.message,
        $ip: 0,
      },
      (err) => {
        if (err) reject(err);
        else resolve();
      },
    );
  });
}

export async function submitFeedback(raw: unknown): Promise<SubmitFeedbackResult> {
  const body = (raw ?? {}) as FeedbackBody;

  // Honeypot: pretend success so bots don't retry.
  if (asString(body.company, 200)) {
    return { ok: true };
  }

  const page = asString(body.page, 40);
  if (!PAGES.has(page)) {
    return { ok: false, status: 400, error: 'Unknown page' };
  }

  const email = asString(body.email, 320).toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return { ok: false, status: 400, error: 'A valid email is required' };
  }

  const submissionId = asString(body.submissionId, 80) || crypto.randomUUID();
  const comment = asString(body.comment);
  const message = asString(body.message);
  const distinctId = asString(body.distinctId, 120);
  const reasons = Array.isArray(body.reasons)
    ? body.reasons.filter((id): id is string => typeof id === 'string' && REASON_IDS.has(id))
    : [];

  if (page === 'keep-going' && !message) {
    return { ok: false, status: 400, error: 'Please add a message' };
  }
  if (page === 'get-feedback' && reasons.length === 0 && !comment) {
    return { ok: false, status: 400, error: 'Please choose a reason or add a comment' };
  }

  const reasonLabels = reasons.map((id) => REASON_LABELS[id] ?? id);
  const uniqueId = `fb-${payloadKey({ submissionId, page, email, reasons, comment, message })}`;
  const properties = {
    page,
    customer_email: email,
    submission_id: submissionId,
    reasons: reasonLabels,
    comment,
    message,
  };

  const klaviyoKey = readSecret('KLAVIYO_API_KEY');
  const mixpanelToken = readSecret('MIXPANEL_TOKEN');
  const intercomToken = readSecret('INTERCOM_ACCESS_TOKEN');
  const tasks: Array<Promise<void>> = [];

  if (klaviyoKey) {
    tasks.push(
      createKlaviyoEvent({
        apiKey: klaviyoKey,
        email,
        uniqueId: `${uniqueId}-cust`,
        metric: 'Feedback Recorded',
        properties,
      }),
    );
  }

  if (mixpanelToken) {
    tasks.push(
      trackMixpanel({
        token: mixpanelToken,
        uniqueId,
        distinctId: distinctId || email,
        page,
        email,
        submissionId,
        reasonLabels,
        comment,
        message,
      }),
    );
  }

  if (intercomToken) {
    tasks.push(
      upsertIntercomFeedback({
        token: intercomToken,
        email,
        submissionId,
        body: buildIntercomMessage({ page, reasonLabels, comment, message }),
      }),
    );
  }

  if (tasks.length === 0) {
    // Local `npm run dev` often has placeholder env values; accept the
    // submission so the form can be previewed. Vercel functions always have
    // VERCEL_REGION and must have a real notify channel.
    if (!process.env.VERCEL_REGION) {
      console.info('Feedback saved locally (no notify keys)', { page, email, reasons: reasonLabels });
      return { ok: true };
    }
    console.error('Feedback submit: no KLAVIYO_API_KEY, MIXPANEL_TOKEN, or INTERCOM_ACCESS_TOKEN');
    return { ok: false, status: 500, error: 'Server misconfiguration' };
  }

  const results = await Promise.allSettled(tasks);
  const failures = results.filter((r) => r.status === 'rejected');
  for (const failure of failures) {
    console.error('Feedback submit channel failed', failure.reason);
  }
  if (failures.length === results.length) {
    return { ok: false, status: 502, error: 'Could not save your message. Please email hello@littlegreendog.co.nz' };
  }

  return { ok: true };
}
