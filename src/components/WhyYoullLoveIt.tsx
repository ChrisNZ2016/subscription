import { useState } from 'react';

const features = [
  {
    number: 1,
    title: 'Grain-Free Carbohydrates',
    description:
      'Provide easily digestible, sustained energy from slow-release sources — avoiding common allergenic proteins and supporting active lifestyles.',
    what: 'Peas, Tapioca Starch, Sweet Potato',
  },
  {
    number: 2,
    title: 'Hypoallergenic Proteins',
    description:
      'Highly digestible hydrolysed protein sources chosen to significantly reduce the risk of food sensitivities.',
    what: 'Hydrolysed Chicken Pulp, Hydrolysed Chicken Meal',
  },
  {
    number: 3,
    title: 'Functional Fats & Omegas',
    description:
      'Rich in essential Omega-3 and Omega-6 fatty acids. Supports healthy skin, a lustrous coat, joint mobility, and overall cellular function.',
    what: 'Chicken Fat, Salmon Oil, Flaxseed',
  },
  {
    number: 4,
    title: 'Digestive & Gut Health',
    description:
      'A blend of fibres to support healthy digestion, beneficial gut bacteria, stool consistency, and reduced stool odour.',
    what: 'Beet Pulp, Cellulose, Fructo-oligosaccharides, Yucca schidigera',
  },
  {
    number: 5,
    title: 'Amino Acids',
    description:
      "Essential amino acids that support eye health, muscle development, heart health, tissue repair, healthy skin and coat, and your dog's immune system.",
    what: 'DL-methionine, L-lysine Hydrochloride, Taurine',
  },
  {
    number: 6,
    title: 'Vital Minerals',
    description:
      'Key minerals that contribute to strong bones and teeth, healthy blood, thyroid function, electrolyte balance, and immune defence.',
    what: 'Zinc Sulphate, Manganese Sulphate, Sodium Selenite, Calcium Iodate, Potassium Chloride, Calcium Phosphate',
  },
  {
    number: 7,
    title: 'Essential Vitamins',
    description:
      'A complete spectrum of essential vitamins to support immune function, healthy vision, energy metabolism, bone health, and cellular repair and development.',
    what: 'Vitamins A, D3, E, B1, B2, B6, B12, Folic Acid, Niacinamide, Calcium D-pantothenate, Choline Chloride',
  },
  {
    number: 8,
    title: 'Antioxidants & Whole Foods',
    description:
      'A powerful blend of natural fruits, vegetables, and extracts providing vital antioxidants to support immune function and protect cells from oxidative stress.',
    what: 'Carrot, Apple, Cabbage, Cauliflower, Blueberries, Rosemary Extract',
  },
];

// Grid layout: row1=[0,1,2], row2=[3, IMAGE, 4], row3=[5,6,7]
// Each cell is either a feature index or 'image'
const gridCells: (number | 'image')[] = [0, 1, 2, 3, 'image', 4, 5, 6, 7];

function FeatureCell({ feature }: { feature: typeof features[number] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="wl-cell wl-cell--feature">
      <button
        className="wl-cell-header"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <h3>{feature.title}</h3>
        <span className="wl-cell-chevron" aria-hidden="true">{open ? '−' : '+'}</span>
      </button>
      <div className={`wl-cell-body ${open ? 'wl-cell-body--open' : ''}`}>
        <p>{feature.description}</p>
        <p className="why-love-what"><strong>What:</strong> {feature.what}</p>
      </div>
    </div>
  );
}

interface WhyYoullLoveItProps {
  onGetStarted?: () => void;
  samplePrice?: string;
}

export function WhyYoullLoveIt({ onGetStarted, samplePrice }: WhyYoullLoveItProps) {
  return (
    <section className="why-love-section">
      <div className="why-love-header">
        <span className="section-label">Why You'll Love It</span>
        <h2>We're transparent about everything that goes in — and why</h2>
        <p className="why-love-subtitle">
          Grain-free and hypoallergenic. Free from beef, dairy, gluten, wheat, fillers, and artificial colours.
        </p>
      </div>

      <div className="wl-grid">
        {gridCells.map((cell) =>
          cell === 'image' ? (
            <div key="image" className="wl-cell wl-cell--image">
              <img
                src="/kibble bowl benefits@0.5x.jpg"
                alt="Little Green Dog kibble bowl showing key benefits"
                className="why-love-bowl-img"
              />
            </div>
          ) : (
            <FeatureCell key={features[cell].number} feature={features[cell]} />
          )
        )}
      </div>

      {onGetStarted && (
        <div className="why-love-cta">
          <button className="btn-order" onClick={onGetStarted}>
            {samplePrice ? `Get my sample — ${samplePrice}` : 'Get my sample'}
          </button>
          <p className="why-love-cta-note">50% off your first box · Delivered in 1–3 days · Cancel anytime</p>
        </div>
      )}
    </section>
  );
}
