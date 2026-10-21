import { getDistinctId } from './analytics';
import { getFbc, getFbp, getOrCreateWaitlistEventId } from './meta-pixel';
import { getPageAttribution } from './page-attribution';
import { getStoredUtmParams } from './utm';

/**
 * Posts an Australian waitlist signup to /api/waitlist.
 *
 * Unlike the feedback transport this is a single deliberate submit, not a
 * draft that gets flushed on the way out, so there is no beacon/retry
 * machinery here — the visitor gets an error and can press the button again.
 *
 * The Meta event id is minted here and sent to the server so the browser's
 * CompleteRegistration and the CAPI copy collapse into one conversion.
 */

export interface WaitlistResult {
  /** Pass to trackWaitlistSubmitted() so the pixel event dedupes with CAPI. */
  eventId: string;
}

function submissionId(email: string): string {
  const key = `lgd_waitlist_id:${email.trim().toLowerCase() || 'anon'}`;
  try {
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
    const id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export async function submitWaitlist(input: {
  email: string;
  consent: boolean;
  /** Honeypot. Anything in here and the server quietly drops the submission. */
  company?: string;
}): Promise<WaitlistResult> {
  const eventId = getOrCreateWaitlistEventId();
  const { page_name, page_version } = getPageAttribution();

  const res = await fetch('/api/waitlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      submissionId: submissionId(input.email),
      email: input.email.trim(),
      consent: input.consent,
      company: input.company ?? '',
      eventId,
      distinctId: getDistinctId(),
      fbp: getFbp(),
      fbc: getFbc(),
      utm: getStoredUtmParams(),
      pageName: page_name,
      pageVersion: page_version,
      sourceUrl: window.location.href,
    }),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `waitlist ${res.status}`);
  }

  return { eventId };
}
