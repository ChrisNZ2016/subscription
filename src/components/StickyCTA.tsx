interface StickyCTAProps {
  onOrderNow: () => void;
  samplePrice?: string;
  comparePrice?: string;
}

export function StickyCTA({ onOrderNow, samplePrice, comparePrice }: StickyCTAProps) {
  return (
    <div className="sticky-cta" role="complementary" aria-label="Order call to action">
      <div className="sticky-cta-inner">
        <div className="sticky-cta-text">
          <span className="sticky-cta-label">Try risk-free · Delivered in 1–3 days</span>
          <div className="sticky-cta-price">
            {comparePrice && <del className="sticky-cta-original">{comparePrice}</del>}
            {samplePrice && <strong className="sticky-cta-sale">{samplePrice}</strong>}
            <span className="sticky-cta-note">first 2kg box</span>
          </div>
        </div>
        <button className="btn-order sticky-cta-btn" onClick={onOrderNow}>
          Get my sample
        </button>
      </div>
    </div>
  );
}
