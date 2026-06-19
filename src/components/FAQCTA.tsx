interface FAQCTAProps {
  onGetStarted: () => void;
  samplePrice?: string;
}

export function FAQCTA({ onGetStarted, samplePrice }: FAQCTAProps) {
  return (
    <div className="faq-cta">
      <p className="faq-cta-heading">Still on the fence? Try it risk-free.</p>
      <button className="btn-order" onClick={onGetStarted}>
        {samplePrice ? `Get my sample, ${samplePrice}` : 'Get my sample'}
      </button>
      <p className="faq-cta-note">50% off your first box · Full refund if it's not a fit</p>
      <p className="cta-guarantee">🛡️ 100% money-back guarantee, no questions asked</p>
    </div>
  );
}
