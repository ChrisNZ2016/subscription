export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <strong>Little Green Dog</strong>
          <span>82 Balfour St, Wellington, NZ</span>
        </div>
        <nav className="footer-links" aria-label="Footer navigation">
          <a href="https://www.littlegreendog.co.nz/pages/about-us" target="_blank" rel="noopener noreferrer">About Us</a>
          <a href="https://www.littlegreendog.co.nz/pages/contact-us" target="_blank" rel="noopener noreferrer">Contact</a>
          <a href="https://www.littlegreendog.co.nz/policies/terms-of-service" target="_blank" rel="noopener noreferrer">Terms</a>
        </nav>
        <div className="footer-social">
          <a href="https://www.instagram.com/little.green.dog/" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
              <circle cx="12" cy="12" r="4"/>
              <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/>
            </svg>
          </a>
          <a href="https://www.facebook.com/littlegreendognz" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
            </svg>
          </a>
        </div>
      </div>
    </footer>
  );
}
