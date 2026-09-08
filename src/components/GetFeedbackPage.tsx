import { type FormEvent, useEffect, useRef, useState } from 'react';
import {
  FEEDBACK_NOTIFY_EMAIL,
  FEEDBACK_REASONS,
  type FeedbackReasonId,
} from '../constants/feedback';
import {
  getDistinctId,
  trackCtaClicked,
  trackFeedbackReasonClicked,
  trackPageViewed,
} from '../lib/analytics';
import { getEmailFromSearch, isValidEmail } from '../lib/email-from-url';
import {
  createFeedbackTransport,
  getFeedbackSubmissionId,
  type FeedbackPayload,
} from '../lib/feedback-client';
import { scrollToId } from '../lib/scrollTo';
import { FeedbackHoneypot, FeedbackLayout } from './FeedbackLayout';

type FeedbackDraft = {
  email: string;
  reasons: FeedbackReasonId[];
  comment: string;
  company: string;
};

function toggleReason(reasons: FeedbackReasonId[], id: FeedbackReasonId): FeedbackReasonId[] {
  return reasons.includes(id) ? reasons.filter((item) => item !== id) : [...reasons, id];
}

function payloadFromDraft(draft: FeedbackDraft): FeedbackPayload | null {
  const trimmedEmail = draft.email.trim();
  if (!isValidEmail(trimmedEmail)) return null;
  if (draft.reasons.length === 0 && !draft.comment.trim()) return null;
  return {
    submissionId: getFeedbackSubmissionId('get-feedback', trimmedEmail),
    page: 'get-feedback',
    email: trimmedEmail,
    reasons: draft.reasons,
    comment: draft.comment.trim() || undefined,
    distinctId: getDistinctId(),
    company: draft.company,
  };
}

export function GetFeedbackPage() {
  const [email, setEmail] = useState(() => getEmailFromSearch());
  const [reasons, setReasons] = useState<FeedbackReasonId[]>([]);
  const [comment, setComment] = useState('');
  const [company, setCompany] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [transport] = useState(() => createFeedbackTransport());
  const sentRef = useRef(false);
  const draftRef = useRef<FeedbackDraft>({ email, reasons, comment, company });
  draftRef.current = { email, reasons, comment, company };

  useEffect(() => {
    trackPageViewed();
  }, []);

  useEffect(() => {
    function onLeave() {
      if (sentRef.current) return;
      const payload = payloadFromDraft(draftRef.current);
      if (payload) transport.sendOnLeave(payload);
    }
    function onVisibility() {
      if (document.visibilityState === 'hidden') onLeave();
    }
    window.addEventListener('pagehide', onLeave);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', onLeave);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [transport]);

  function handleReasonClick(id: FeedbackReasonId): void {
    const next = toggleReason(reasons, id);
    setReasons(next);
    trackFeedbackReasonClicked({ reason: id });
    const payload = payloadFromDraft({ ...draftRef.current, reasons: next });
    if (payload) transport.schedule(payload);
  }

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    const payload = payloadFromDraft(draftRef.current);
    if (!payload) {
      if (!isValidEmail(email.trim())) {
        setError('Please add the email we should reply to.');
      } else {
        setError('Please choose a reason or add a comment.');
      }
      return;
    }
    setError(null);
    sentRef.current = true;
    setIsSubmitting(true);
    try {
      await transport.sendNow(payload);
      setDone(true);
    } catch {
      sentRef.current = false;
      setError(
        `Something went wrong. Email us at ${FEEDBACK_NOTIFY_EMAIL} and we will pick it up.`,
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <FeedbackLayout
      announcement={
        <>
          Thanks for telling us, <strong>it helps us improve</strong>
        </>
      }
      navCtaLabel="Send feedback"
      onNavCta={() => {
        trackCtaClicked('nav');
        scrollToId('feedback');
      }}
    >
      <section className="reactivation-hero">
        <h1>Thanks so much for updating us</h1>
        <p className="reactivation-sub">Sorry to hear things aren't working out.</p>
      </section>

      <section id="feedback" className="subscription-picker-primary">
        <div className="subscription-picker-inner">
          {done ? (
            <div className="feedback-done">
              <h2>We've got your feedback</h2>
              <p>Thank you for taking the time, it really does help us get this right.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <h2>What should we know?</h2>
              <p className="picker-subtitle">
                Tap any reasons that apply, then add a comment if you want.
              </p>

              <FeedbackHoneypot value={company} onChange={setCompany} />

              <div className="feedback-field">
                <label htmlFor="get-feedback-email">Your email</label>
                <input
                  id="get-feedback-email"
                  className="feedback-input"
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <fieldset className="feedback-field">
                <legend>Common reasons</legend>
                <div className="activity-cards">
                  {FEEDBACK_REASONS.map((reason) => {
                    const selected = reasons.includes(reason.id);
                    return (
                      <button
                        key={reason.id}
                        type="button"
                        className={`activity-card feedback-reason${selected ? ' activity-card--selected' : ''}`}
                        aria-pressed={selected}
                        onClick={() => handleReasonClick(reason.id)}
                      >
                        <strong>{reason.label}</strong>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <div className="feedback-field">
                <label htmlFor="get-feedback-comment">Anything else? (optional)</label>
                <textarea
                  id="get-feedback-comment"
                  className="feedback-input feedback-textarea"
                  name="comment"
                  rows={5}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>

              {error && <p className="feedback-error" role="alert">{error}</p>}

              <button
                className="btn-order reactivation-cta"
                type="submit"
                disabled={isSubmitting}
                onClick={() => trackCtaClicked('picker')}
              >
                {isSubmitting ? 'Sending...' : 'Send feedback'}
              </button>
            </form>
          )}
        </div>
      </section>
    </FeedbackLayout>
  );
}
