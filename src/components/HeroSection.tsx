import { useState, useRef } from 'react';

interface HeroSectionProps {
  onGetStarted: () => void;
  /** Accepted for API compatibility with callers; ingredients nav is handled elsewhere. */
  onViewIngredients?: () => void;
  samplePrice?: string;
}

const galleryImages = [
  { src: '/kibble/1.jpg', alt: 'Little Green Dog kibble', thumb: '/kibble/1.jpg' },
  { src: '/kibble/2.jpg', alt: 'Little Green Dog kibble', thumb: '/kibble/2.jpg' },
  { src: '/kibble/3.jpg', alt: 'Little Green Dog kibble', thumb: '/kibble/3.jpg' },
  { src: '/kibble/4.jpg', alt: 'Little Green Dog kibble', thumb: '/kibble/4.jpg' },
  { src: '/kibble/5.jpg', alt: 'Little Green Dog kibble', thumb: '/kibble/5.jpg' },
  { src: '/kibble/6.jpg', alt: 'Little Green Dog kibble', thumb: '/kibble/6.jpg' },
];

const COUNT = galleryImages.length;

export function HeroSection({ onGetStarted, samplePrice }: HeroSectionProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  // live drag offset in px (null = not dragging)
  const [dragOffset, setDragOffset] = useState<number | null>(null);
  const touchStartX = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setDragOffset(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    setDragOffset(e.touches[0].clientX - touchStartX.current);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    setDragOffset(null);
    if (Math.abs(delta) < 40) return;
    if (delta < 0) {
      setActiveIndex((i) => (i + 1) % COUNT);
    } else {
      setActiveIndex((i) => (i - 1 + COUNT) % COUNT);
    }
  };

  // Base translate is -activeIndex * 100%. Live drag adds a px offset on top.
  const translateX = dragOffset !== null
    ? `calc(${-activeIndex * 100}% + ${dragOffset}px)`
    : `${-activeIndex * 100}%`;

  const isAnimating = dragOffset === null;

  return (
    <section className="hero">
      <div className="hero-copy">
        <span className="badge">Hypoallergenic Dog Food</span>
        <h1>Stop the scratching, stomach issues, and food guessing, for good.</h1>
        <p className="hero-subtitle">
          Vet-formulated, single-protein kibble with 6+ functional superfoods.
          Free from beef, dairy, gluten, wheat, grain, fillers, and colours.{' '}
          <span className="hero-sensitivity-promise">Try risk-free with our Sensitivity Promise, full refund if it's not the right fit.</span>
        </p>
        <div className="hero-actions">
          <button className="btn-order" onClick={onGetStarted}>
            {samplePrice ? `Get my sample, ${samplePrice}` : 'Get my sample'}
          </button>
        </div>
        <div className="hero-trust">
          <span>✓ Delivered in 1–3 days</span>
          <span>✓ 50% off your first box</span>
          <span>✓ Cancel anytime</span>
        </div>
        <p className="hero-guarantee">🛡️ 100% money-back guarantee, no questions asked</p>
      </div>

      <div className="hero-image">
        <div className="gallery">
          <div
            className="gallery-main"
            ref={containerRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div
              className="gallery-strip"
              style={{
                transform: `translateX(${translateX})`,
                transition: isAnimating ? 'transform 0.3s ease' : 'none',
              }}
            >
              {galleryImages.map((img, i) => (
                <img
                  key={i}
                  src={img.src}
                  alt={img.alt}
                  className="gallery-primary-img"
                  draggable={false}
                />
              ))}
            </div>
          </div>
          <div className="gallery-dots" aria-hidden="true">
            {galleryImages.map((_, i) => (
              <span key={i} className={`gallery-dot ${i === activeIndex ? 'active' : ''}`} />
            ))}
          </div>
          <div className="gallery-thumbs" role="list" aria-label="Product image gallery">
            {galleryImages.map((img, i) => (
              <button
                key={i}
                role="listitem"
                className={`gallery-thumb ${i === activeIndex ? 'active' : ''}`}
                onClick={() => setActiveIndex(i)}
                aria-label={img.alt}
                aria-current={i === activeIndex}
              >
                <img src={img.thumb} alt={img.alt} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
