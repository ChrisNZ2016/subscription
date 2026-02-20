interface HeroSectionProps {
  onGetStarted: () => void;
}

export function HeroSection({ onGetStarted }: HeroSectionProps) {
  return (
    <section className="hero">
      <div className="hero-inner">
        <div className="hero-copy">
          <span className="badge">50% Off Your First Box</span>
          <h1>Finally, dog food made for sensitive stomachs</h1>
          <p className="hero-subtitle">
            Hypoallergenic, grain-free, vet-formulated kibble with superfoods.
            Try a 2kg sample at 50% off.
          </p>
          <div className="trust-badges">
            <span className="trust-badge">Grain Free</span>
            <span className="trust-badge">Hypoallergenic</span>
            <span className="trust-badge">NZ Owned</span>
            <span className="trust-badge">Money-Back Guarantee</span>
          </div>
          <button className="btn btn-primary btn-lg" onClick={onGetStarted}>
            Build Your Plan
          </button>
        </div>
        <div className="hero-image">
          <div
            className="hero-image-placeholder"
            role="img"
            aria-label="Little Green Dog hypoallergenic kibble product packaging"
          />
        </div>
      </div>
    </section>
  );
}
