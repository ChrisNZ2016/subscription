interface HeroSectionProps {
  onGetStarted: () => void;
}

export function HeroSection({ onGetStarted }: HeroSectionProps) {
  return (
    <section className="hero">
      <div className="hero-content">
        <span className="badge">50% OFF</span>
        <h1>Fresh dog food, delivered to your door</h1>
        <p className="hero-subtitle">
          Try a 2kg sample box at half price. Set up your perfect subscription
          and we'll handle the rest.
        </p>
        <button className="btn btn-primary btn-lg" onClick={onGetStarted}>
          Get Started
        </button>
      </div>
    </section>
  );
}
