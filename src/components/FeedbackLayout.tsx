import type { ReactNode } from 'react';
import { Footer } from './Footer';
import { trackExternalLinkClicked } from '../lib/analytics';

const CONTACT_HREF = 'https://www.littlegreendog.co.nz/pages/contact-us';

type FeedbackLayoutProps = {
  announcement: ReactNode;
  navCtaLabel: string;
  navCtaHref?: string;
  onNavCta?: () => void;
  children: ReactNode;
};

type FeedbackHoneypotProps = {
  value: string;
  onChange: (value: string) => void;
};

/**
 * Spam trap. A real visitor never sees it, so anything typed here came from
 * something filling the form blind.
 *
 * Two things keep honest submissions out of it. The field is display:none
 * rather than parked off-screen, which browser autofill skips but an
 * off-screen field it will happily complete. And nothing about it reads as a
 * contact field: the label and name were "Company", which is one of the
 * standard tokens autofill matches on, and `autocomplete="off"` is widely
 * ignored for those. A customer whose password manager filled this in was
 * dropped silently, which is the opposite of what a trap is for.
 */
export function FeedbackHoneypot({ value, onChange }: FeedbackHoneypotProps) {
  return (
    <div className="feedback-hp" aria-hidden="true">
      <label htmlFor="lgd-hp-field">Leave this field empty</label>
      <input
        id="lgd-hp-field"
        name="lgd_hp_field"
        type="text"
        tabIndex={-1}
        autoComplete="off"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

export function FeedbackLayout({
  announcement,
  navCtaLabel,
  navCtaHref,
  onNavCta,
  children,
}: FeedbackLayoutProps) {
  return (
    <>
      <header className="announcement-bar">
        <p>{announcement}</p>
      </header>

      <nav className="site-nav">
        <a href="https://www.littlegreendog.co.nz" className="nav-logo">
          <img src="/logo.png" alt="Little Green Dog" className="nav-logo-img" />
        </a>
        <ul className="nav-links">
          <li>
            <a
              href={CONTACT_HREF}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() =>
                trackExternalLinkClicked({ destination: CONTACT_HREF, location: 'nav', label: 'Contact' })
              }
            >
              Contact
            </a>
          </li>
        </ul>
        {navCtaHref ? (
          <a className="btn-order nav-order-btn" href={navCtaHref}>
            {navCtaLabel}
          </a>
        ) : (
          <button className="btn-order nav-order-btn" type="button" onClick={onNavCta}>
            {navCtaLabel}
          </button>
        )}
      </nav>

      <main className="landing-page reactivation-page">{children}</main>
      <Footer />
    </>
  );
}
