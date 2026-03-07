interface StickyCTAProps {
  onOrderNow: () => void;
}

export function StickyCTA({ onOrderNow }: StickyCTAProps) {
  return (
    <div className="sticky-cta" role="complementary" aria-label="Order call to action">
      <div className="sticky-cta-inner">
        <div className="sticky-cta-text">
          <span className="sticky-cta-label">Autoship &amp; Save</span>
          <div className="sticky-cta-price">
            <del className="sticky-cta-original">$55.00</del>
            <strong className="sticky-cta-sale">$19.99</strong>
            <span className="sticky-cta-note">first 2kg box</span>
          </div>
        </div>
        <button className="btn-order sticky-cta-btn" onClick={onOrderNow}>
          Order Now
        </button>
      </div>
    </div>
  );
}
