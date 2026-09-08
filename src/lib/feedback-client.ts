import type { FeedbackPage } from '../constants/feedback';
import { getDistinctId } from './analytics';

export type FeedbackPayload = {
  submissionId: string;
  page: FeedbackPage;
  email: string;
  reasons?: string[];
  comment?: string;
  message?: string;
  distinctId?: string;
  company?: string;
};

export type FeedbackTransport = {
  sendNow(payload: FeedbackPayload): Promise<void>;
  schedule(payload: FeedbackPayload, delayMs?: number): void;
  sendOnLeave(payload: FeedbackPayload): void;
};

function payloadHash(payload: FeedbackPayload): string {
  return JSON.stringify({
    page: payload.page,
    email: payload.email.trim().toLowerCase(),
    reasons: [...(payload.reasons ?? [])].sort(),
    comment: payload.comment?.trim() ?? '',
    message: payload.message?.trim() ?? '',
  });
}

function storageKey(page: FeedbackPage, email: string): string {
  return `lgd_feedback_id:${page}:${email.trim().toLowerCase() || 'anon'}`;
}

export function getFeedbackSubmissionId(page: FeedbackPage, email: string): string {
  try {
    const key = storageKey(page, email);
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
    const id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export function createFeedbackTransport(): FeedbackTransport {
  let lastSentHash = '';
  let latest: FeedbackPayload | null = null;
  let inFlight: Promise<void> | null = null;
  let timer: number | null = null;

  function withDistinctId(payload: FeedbackPayload): FeedbackPayload {
    return { ...payload, distinctId: payload.distinctId ?? getDistinctId() };
  }

  async function post(payload: FeedbackPayload, keepalive: boolean): Promise<void> {
    const res = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(withDistinctId(payload)),
      keepalive,
    });
    if (!res.ok) throw new Error(`feedback ${res.status}`);
  }

  function beacon(payload: FeedbackPayload): boolean {
    return navigator.sendBeacon(
      '/api/feedback',
      new Blob([JSON.stringify(withDistinctId(payload))], { type: 'application/json' }),
    );
  }

  function clearTimer(): void {
    if (timer === null) return;
    window.clearTimeout(timer);
    timer = null;
  }

  async function deliver(snapshot: FeedbackPayload, keepalive: boolean): Promise<void> {
    const hash = payloadHash(snapshot);
    try {
      await post(snapshot, keepalive);
      lastSentHash = hash;
    } catch (err) {
      if (!keepalive) throw err;
      if (beacon(snapshot)) lastSentHash = hash;
    }
  }

  async function flush(keepalive: boolean): Promise<void> {
    if (inFlight) return inFlight;
    inFlight = (async () => {
      try {
        while (latest) {
          const snapshot = latest;
          if (payloadHash(snapshot) === lastSentHash) break;
          await deliver(snapshot, keepalive);
        }
      } finally {
        inFlight = null;
      }
    })();
    return inFlight;
  }

  return {
    async sendNow(payload: FeedbackPayload): Promise<void> {
      latest = payload;
      clearTimer();
      await flush(false);
    },
    schedule(payload: FeedbackPayload, delayMs = 800): void {
      latest = payload;
      clearTimer();
      timer = window.setTimeout(() => {
        timer = null;
        void flush(false).catch(() => {});
      }, delayMs);
    },
    sendOnLeave(payload: FeedbackPayload): void {
      latest = payload;
      clearTimer();
      const hash = payloadHash(payload);
      if (hash === lastSentHash) return;
      void flush(true).catch(() => {
        if (hash === lastSentHash) return;
        if (beacon(payload)) lastSentHash = hash;
      });
    },
  };
}
