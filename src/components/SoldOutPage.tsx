import { type FormEvent, useEffect, useState } from 'react';
import { FEEDBACK_NOTIFY_EMAIL } from '../constants/feedback';
import { trackPageViewed, trackWaitlistSubmitted } from '../lib/analytics';
import { AU_SAMPLE_PRICE } from '../lib/au-pricing';
import { isValidEmail } from '../lib/email-from-url';
import { submitWaitlist } from '../lib/waitlist-client';
import { FeedbackHoneypot, FeedbackLayout } from './FeedbackLayout';

interface SoldOutPageProps {
  /** Returns to the landing page without a reload, so the pixel session holds. */
  onBack: () => void;
}

/**
 * Where every CTA on the Australian test lands: out of stock, with a waitlist
 * signup. The email submit is the quality signal behind the CTA click the AU
 * campaigns optimise for — see README "Australian demand test".
 */
export function SoldOutPage({ onBack }: SoldOutPageProps) {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [company, setCompany] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    trackPageViewed();
  }, []);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!consent) {
      setError('Please tick the box so we know we can email you.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const { eventId } = await submitWaitlist({ email, consent, company });
      trackWaitlistSubmitted({ eventId });
      setDone(true);
    } catch (err) {
      setError(
        err instanceof Error && err.message && !err.message.startsWith('waitlist ')
          ? err.message
          : `Something went wrong. Email us at ${FEEDBACK_NOTIFY_EMAIL} and we'll add you by hand.`,
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <FeedbackLayout
      announcement={
        <>
          😬 <strong>Sold out</strong> — the next batch is on its way
        </>
      }
      navCtaLabel="Back to the food"
      onNavCta={onBack}
    >
      <section className="reactivation-hero">
        <h1>Ah. We&apos;ve sold out.</h1>
        <p className="reactivation-sub">
          More dogs in Australia wanted this than we had bags for. The next batch is in
          production — leave your email and you&apos;ll be first in line when it lands, before
          we open it up to anyone else.
        </p>
      </section>

      <section id="waitlist" className="subscription-picker-primary">
        <div className="subscription-picker-inner">
          {done ? (
            <div className="feedback-done">
              <h2>You&apos;re on the list</h2>
              <p>
                We&apos;ll email {email} the moment the next batch is ready. No spam in the
                meantime, just the one message.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <h2>Join the waitlist</h2>
              <p className="picker-subtitle">
                First access to the next batch, at the {AU_SAMPLE_PRICE} sample price you came here
                for.
              </p>

              <FeedbackHoneypot value={company} onChange={setCompany} />

              <div className="feedback-field">
                <label htmlFor="waitlist-email">Your email</label>
                <input
                  id="waitlist-email"
                  className="feedback-input"
                  type="email"
                  name="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <label className="waitlist-consent">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  required
                />
                <span>
                  Email me when Little Green Dog is available in Australia. You can unsubscribe at
                  any time.
                </span>
              </label>

              {error && <p className="feedback-error" role="alert">{error}</p>}

              <button className="btn-order reactivation-cta" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Adding you...' : 'Tell me when it lands'}
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
