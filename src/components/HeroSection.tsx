import { useState } from 'react';

interface HeroSectionProps {
  onGetStarted: () => void;
}

// Edit these images to use your own product photos
const galleryImages = [
  {
    src: 'https://images.unsplash.com/photo-1568640347023-a616a30bc3bd?w=800&q=80',
    alt: 'Happy dog ready for meal time',
    thumb: 'https://images.unsplash.com/photo-1568640347023-a616a30bc3bd?w=120&q=70',
  },
  {
    src: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&q=80',
    alt: 'Little Green Dog kibble close up',
    thumb: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=120&q=70',
  },
  {
    src: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800&q=80',
    alt: 'Dog enjoying hypoallergenic food',
    thumb: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=120&q=70',
  },
  {
    src: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&q=80',
    alt: 'Two dogs running happily',
    thumb: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=120&q=70',
  },
  {
    src: 'https://images.unsplash.com/photo-1534361960057-19f4434a29d9?w=800&q=80',
    alt: 'Dog with shiny healthy coat',
    thumb: 'https://images.unsplash.com/photo-1534361960057-19f4434a29d9?w=120&q=70',
  },
];

export function HeroSection({ onGetStarted }: HeroSectionProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <section className="hero">
      <div className="hero-copy">
        <span className="badge">Hypoallergenic Dog Food</span>
        <h1>Formulated for sensitive stomachs. Loved by dogs.</h1>
        <p className="hero-subtitle">
          Vet-formulated, single-protein kibble with 20+ functional superfoods.
          Free from common allergens like beef, dairy, gluten, wheat, grain, fillers, and colours.
          Gentle digestion guaranteed or your money back.
        </p>
        <div className="hero-actions">
          <button className="btn-order" onClick={onGetStarted}>
            Order Now
          </button>
          <button
            className="btn-text"
            onClick={() => document.getElementById('product-tabs')?.scrollIntoView({ behavior: 'smooth' })}
          >
            View Ingredients ↓
          </button>
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
