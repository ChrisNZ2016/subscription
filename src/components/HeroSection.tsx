import { useState } from 'react';

interface HeroSectionProps {
  onGetStarted: () => void;
  onViewIngredients: () => void;
  samplePrice?: string;
}

// Edit these images to use your own product photos
const galleryImages = [
  {
    src: '/kibble/1.jpg',
    alt: 'Little Green Dog kibble',
    thumb: '/kibble/1.jpg',
  },
  {
    src: '/kibble/2.jpg',
    alt: 'Little Green Dog kibble',
    thumb: '/kibble/2.jpg',
  },
  {
    src: '/kibble/3.jpg',
    alt: 'Little Green Dog kibble',
    thumb: '/kibble/3.jpg',
  },
  {
    src: '/kibble/4.jpg',
    alt: 'Little Green Dog kibble',
    thumb: '/kibble/4.jpg',
  },
  {
    src: '/kibble/5.jpg',
    alt: 'Little Green Dog kibble',
    thumb: '/kibble/5.jpg',
  },
  {
    src: '/kibble/6.jpg',
    alt: 'Little Green Dog kibble',
    thumb: '/kibble/6.jpg',
  },
];

export function HeroSection({ onGetStarted, onViewIngredients, samplePrice }: HeroSectionProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <section className="hero">
      <div className="hero-copy">
        <span className="badge">Hypoallergenic Dog Food</span>
        <h1>Stop the scratching, stomach issues, and food guessing — for good.</h1>
        <p className="hero-subtitle">
          Vet-formulated, single-protein kibble with 20+ functional superfoods.
          Free from beef, dairy, gluten, wheat, grain, fillers, and colours.
          Try risk-free with our Sensitivity Promise — full refund if it's not the right fit.
        </p>
        <div className="hero-actions">
          <button className="btn-order" onClick={onGetStarted}>
            {samplePrice ? `Get my sample — ${samplePrice}` : 'Get my sample'}
          </button>
          <button
            className="btn-text"
            onClick={onViewIngredients}
          >
            View Ingredients ↓
          </button>
        </div>
        <div className="hero-trust">
          <span>✓ Delivered in 1–3 days</span>
          <span>✓ 50% off your first box</span>
          <span>✓ Cancel anytime</span>
        </div>
      </div>

      <div className="hero-image">
        <div className="gallery">
          <div className="gallery-main">
            <img
              src={galleryImages[activeIndex].src}
              alt={galleryImages[activeIndex].alt}
              className="gallery-primary-img"
            />
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
