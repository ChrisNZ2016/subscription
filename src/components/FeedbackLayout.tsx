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

export function FeedbackHoneypot({ value, onChange }: FeedbackHoneypotProps) {
  return (
    <label className="feedback-hp" aria-hidden="true">
      Company
      <input
        tabIndex={-1}
        autoComplete="off"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
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
