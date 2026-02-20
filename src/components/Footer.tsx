export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <strong>Little Green Dog</strong>
          <span>NZ Owned & Operated</span>
        </div>
        <nav className="footer-links" aria-label="Footer navigation">
          <a href="#faq">FAQ</a>
          <a href="mailto:hello@littlegreendog.com">Contact</a>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
        </nav>
      </div>
    </footer>
  );
}
