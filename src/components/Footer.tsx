export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <strong>Little Green Dog</strong>
          <span>82 Balfour St, Wellington, NZ</span>
        </div>
        <nav className="footer-links" aria-label="Footer navigation">
          <a href="#faq">FAQ</a>
          <a href="#product-tabs">Ingredients</a>
          <a href="https://www.littlegreendog.co.nz/pages/contact-us" target="_blank" rel="noopener noreferrer">Contact</a>
          <a href="https://www.littlegreendog.co.nz/policies/refund-policy" target="_blank" rel="noopener noreferrer">Refund Policy</a>
          <a href="https://www.littlegreendog.co.nz/policies/terms-of-service" target="_blank" rel="noopener noreferrer">Terms</a>
        </nav>
      </div>
    </footer>
  );
}
