import { type FormEvent, useEffect, useState } from 'react';
import { FEEDBACK_NOTIFY_EMAIL } from '../constants/feedback';
import { getDistinctId, trackCtaClicked, trackPageViewed } from '../lib/analytics';
import { getEmailFromSearch, isValidEmail } from '../lib/email-from-url';
import {
  createFeedbackTransport,
  getFeedbackSubmissionId,
} from '../lib/feedback-client';
import { FeedbackHoneypot, FeedbackLayout } from './FeedbackLayout';

export function KeepGoingPage() {
  const email = getEmailFromSearch();
  const [message, setMessage] = useState('');
  const [company, setCompany] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [transport] = useState(() => createFeedbackTransport());

  useEffect(() => {
    trackPageViewed();
  }, []);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!message.trim()) {
      setError('Please add a message.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await transport.sendNow({
        submissionId: getFeedbackSubmissionId('keep-going', email),
        page: 'keep-going',
        email,
        message: message.trim(),
        distinctId: getDistinctId(),
        company,
      });
      setDone(true);
    } catch {
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
          Take your time, <strong>we're here</strong> if you need us
        </>
      }
      navCtaLabel="Email us"
      navCtaHref={`mailto:${FEEDBACK_NOTIFY_EMAIL}`}
    >
      <section className="reactivation-hero">
        <h1>Thanks so much for updating us</h1>
        <p className="reactivation-sub">
          We get that it takes time to see if things are working. If you have any questions just use
          the form below, or{' '}
          <a href={`mailto:${FEEDBACK_NOTIFY_EMAIL}`}>email us anytime</a>.
        </p>
      </section>

      <section id="feedback" className="subscription-picker-primary">
        <div className="subscription-picker-inner">
          {done ? (
            <div className="feedback-done">
              <h2>We've got your message</h2>
              <p>Someone from the team will reply to {email} as soon as we can.</p>
            </div>
          ) : !isValidEmail(email) ? (
            <div className="feedback-done">
              <h2>We need the link from your email</h2>
              <p>
                Open this page from the message we sent you, or write to{' '}
                <a href={`mailto:${FEEDBACK_NOTIFY_EMAIL}`}>{FEEDBACK_NOTIFY_EMAIL}</a>.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <h2>Ask us anything</h2>
              <p className="picker-subtitle">
                Questions about the food, the schedule, or how your dog is going, send them through.
              </p>

              <FeedbackHoneypot value={company} onChange={setCompany} />

              <div className="feedback-field">
                <label htmlFor="keep-going-message">Your message</label>
                <textarea
                  id="keep-going-message"
                  className="feedback-input feedback-textarea"
                  name="message"
                  rows={6}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                />
              </div>

              {error && <p className="feedback-error" role="alert">{error}</p>}

              <button
                className="btn-order reactivation-cta"
                type="submit"
                disabled={isSubmitting}
                onClick={() => trackCtaClicked('picker')}
              >
                {isSubmitting ? 'Sending...' : 'Send message'}
              </button>
              <p className="reactivation-finefoot">
                Or email{' '}
                <a href={`mailto:${FEEDBACK_NOTIFY_EMAIL}`}>{FEEDBACK_NOTIFY_EMAIL}</a>
              </p>
            </form>
          )}
        </div>
      </section>
    </FeedbackLayout>
  );
}
