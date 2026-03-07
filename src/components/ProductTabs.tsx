import { useState, useEffect } from 'react';

// ─── Ingredient list with hover explanations ─────────────────────────────────
// Edit the `tooltip` field to change the explanation shown on hover/tap.
const ingredients: { name: string; tooltip: string }[] = [
  {
    name: 'Hydrolysed Chicken Meal',
    tooltip: 'A hypoallergenic protein source — the hydrolysis process breaks proteins into smaller fragments, dramatically reducing the risk of immune reactions in sensitive dogs.',
  },
  {
    name: 'Whole Peas',
    tooltip: 'A grain-free carbohydrate providing sustained energy, fibre for digestive health, and natural plant protein.',
  },
  {
    name: 'Tapioca Starch',
    tooltip: 'A gentle, easily digestible carbohydrate derived from cassava root. Grain-free and suitable for dogs with grain sensitivities.',
  },
  {
    name: 'Dried Sweet Potato',
    tooltip: 'Rich in dietary fibre, vitamins A and C, and potassium. Supports healthy digestion and provides antioxidant protection.',
  },
  {
    name: 'Chicken Fat',
    tooltip: 'A highly digestible fat source rich in omega-6 fatty acids. Supports a shiny coat, healthy skin, and provides concentrated energy.',
  },
  {
    name: 'Beet Pulp Granules',
    tooltip: 'A prebiotic fibre that feeds beneficial gut bacteria. Promotes firm stools and healthy digestive transit — not a filler, a functional ingredient.',
  },
  {
    name: 'Hydrolysed Chicken Pulp',
    tooltip: 'A secondary hydrolysed protein source that enhances palatability while remaining hypoallergenic for sensitive stomachs.',
  },
  {
    name: 'Salmon Oil',
    tooltip: 'Rich in omega-3 fatty acids (EPA & DHA) that reduce inflammation, support brain function, and give coats a healthy shine.',
  },
  {
    name: 'Powdered Cellulose',
    tooltip: 'A plant-derived dietary fibre that supports healthy digestion, helps regulate bowel movements, and contributes to satiety.',
  },
  {
    name: 'Ground Flaxseed',
    tooltip: 'An excellent plant source of omega-3 ALA fatty acids and lignans. Supports skin health, reduces inflammation, and provides fibre.',
  },
  {
    name: 'Carrot Granules',
    tooltip: 'Packed with beta-carotene (a precursor to vitamin A), fibre, and antioxidants. Supports eye health and immune function.',
  },
  {
    name: 'Dried Apples',
    tooltip: 'A natural source of quercetin and pectin — antioxidants that support immune health and gut motility.',
  },
  {
    name: 'Dried Cabbage',
    tooltip: 'Rich in vitamin K, vitamin C, and glucosinolates which support liver detoxification and immune function.',
  },
  {
    name: 'Dried Cauliflower',
    tooltip: 'A cruciferous superfood high in vitamin C and choline, supporting brain health and anti-inflammatory pathways.',
  },
  {
    name: 'Blueberry Powder',
    tooltip: 'One of the richest sources of antioxidants (anthocyanins). Supports cognitive function, immune health, and fights oxidative stress.',
  },
  {
    name: 'Taurine',
    tooltip: 'An essential amino acid important for heart muscle function, eye health, and immune support — especially critical for dogs on non-beef diets.',
  },
  {
    name: 'Retinyl Acetate (Vitamin A)',
    tooltip: 'Supports vision, immune function, and healthy skin and coat. A stable form of vitamin A that\'s efficiently absorbed.',
  },
  {
    name: 'Vitamin D3',
    tooltip: 'Essential for calcium and phosphorus absorption, supporting strong bones and teeth, and modulating immune responses.',
  },
  {
    name: 'dI-α-tocopheryl Acetate',
    tooltip: 'A stable form of vitamin E — a powerful antioxidant that protects cells from oxidative damage and supports immune function.',
  },
  {
    name: 'Thiamine Mononitrate (Vitamin B1)',
    tooltip: 'Critical for carbohydrate metabolism and healthy nervous system function. Deficiency can cause neurological issues in dogs.',
  },
  {
    name: 'Riboflavin (Vitamin B2)',
    tooltip: 'Supports energy production at the cellular level, healthy red blood cell formation, and skin and coat condition.',
  },
  {
    name: 'Pyridoxine Hydrochloride (Vitamin B6)',
    tooltip: 'Involved in amino acid metabolism, red blood cell production, and healthy immune and nervous system function.',
  },
  {
    name: 'Cyanocobalamin (Vitamin B12)',
    tooltip: 'Essential for DNA synthesis, nerve function, and red blood cell formation. Often lower in non-meat-heavy diets.',
  },
  {
    name: 'D-biotin',
    tooltip: 'Supports healthy skin, coat, and nail growth. Plays a key role in fatty acid synthesis and glucose metabolism.',
  },
  {
    name: 'Folic Acid',
    tooltip: 'Important for cell division, DNA synthesis, and amino acid metabolism. Supports healthy red blood cell production.',
  },
  {
    name: 'Niacinamide',
    tooltip: 'A form of vitamin B3 that supports energy metabolism, DNA repair, and healthy skin barrier function.',
  },
  {
    name: 'Calcium D-pantothenate',
    tooltip: 'Vitamin B5 — involved in energy metabolism, hormone production, and the synthesis of coenzyme A. Supports adrenal function.',
  },
  {
    name: 'Choline Chloride',
    tooltip: 'Supports brain and nervous system function, liver health, and fat metabolism. Often grouped with B vitamins.',
  },
  {
    name: 'Zinc Sulphate',
    tooltip: 'Essential for immune function, wound healing, skin and coat health, and over 300 enzyme reactions in the body.',
  },
  {
    name: 'Copper Sulphate',
    tooltip: 'Supports iron absorption, collagen synthesis, and healthy pigmentation of coat and skin.',
  },
  {
    name: 'Ferrous Sulphate',
    tooltip: 'A bioavailable form of iron essential for red blood cell production and oxygen transport throughout the body.',
  },
  {
    name: 'Manganese Sulphate',
    tooltip: 'Supports bone development, cartilage formation, and the activation of enzymes involved in antioxidant defence.',
  },
  {
    name: 'Sodium Selenite',
    tooltip: 'A source of selenium — a trace mineral and antioxidant that works with vitamin E to protect cells from oxidative damage.',
  },
  {
    name: 'Calcium Iodate',
    tooltip: 'Provides iodine, which is essential for thyroid hormone production that regulates metabolism and energy levels.',
  },
  {
    name: 'Potassium Chloride',
    tooltip: 'Maintains fluid and electrolyte balance, supports nerve and muscle function, and healthy heart rhythm.',
  },
  {
    name: 'DL-methionine',
    tooltip: 'An essential sulphur-containing amino acid important for protein synthesis, antioxidant production (glutathione), and urinary health.',
  },
  {
    name: 'L-lysine Hydrochloride',
    tooltip: 'An essential amino acid that supports collagen production, immune function, and the absorption of calcium.',
  },
  {
    name: 'Fructo-oligosaccharides (FOS)',
    tooltip: 'A prebiotic fibre that selectively feeds beneficial gut bacteria (Lactobacillus & Bifidobacterium), supporting a healthy microbiome.',
  },
  {
    name: 'Rosemary Extract',
    tooltip: 'A natural antioxidant that helps preserve freshness and fat quality in the kibble, without the need for artificial preservatives.',
  },
  {
    name: 'Yucca Schidigera Extract',
    tooltip: 'A natural plant extract that binds ammonia in the gut, reducing faecal odour and supporting overall digestive health.',
  },
  {
    name: 'Preservative (TBHQ)',
    tooltip: 'Tert-Butylhydroquinone — a safe, approved antioxidant preservative that prevents fat oxidation (rancidity), keeping the kibble fresh and nutritionally stable.',
  },
  {
    name: 'Calcium Phosphate',
    tooltip: 'Provides both calcium and phosphorus in a highly bioavailable form, supporting strong bones, teeth, and cellular energy (ATP) production.',
  },
];

// ─── Category boxes for Benefits tab ─────────────────────────────────────────
const benefitCategories = [
  {
    name: 'Grain-Free Carbohydrates',
    why: 'Gentle, slow-release energy without common grain allergens',
    what: 'Sweet potato, peas, tapioca',
  },
  {
    name: 'Hypoallergenic Proteins',
    why: 'Minimise allergic reactions with easy-to-digest hydrolysed sources',
    what: 'Hydrolysed chicken meal, salmon oil',
  },
  {
    name: 'Functional Fats & Omegas',
    why: 'Support coat health, brain function, and reduce inflammation',
    what: 'Salmon oil, flaxseed, chicken fat',
  },
  {
    name: 'Digestive & Gut Health',
    why: 'Promote healthy gut flora and smooth digestion',
    what: 'FOS prebiotics, beet pulp, yucca extract',
  },
  {
    name: 'Antioxidants & Superfoods',
    why: 'Fight free radicals and support immune health',
    what: 'Blueberries, carrots, apples, cabbage, cauliflower',
  },
  {
    name: 'Amino Acids',
    why: 'Building blocks for muscle repair and overall vitality',
    what: 'Taurine, DL-methionine, L-lysine',
  },
  {
    name: 'Essential Vitamins',
    why: 'Complete daily nutrition with every meal',
    what: 'Vitamins A, D3, E, full B-complex, biotin',
  },
  {
    name: 'Vital Minerals',
    why: 'Support bones, teeth, skin, and metabolic function',
    what: 'Zinc, copper, iron, selenium, iodine, manganese',
  },
];

// Split benefit categories 3 + 3 flanking the image, last 2 below
const leftBenefits = benefitCategories.slice(0, 3);
const rightBenefits = benefitCategories.slice(3, 6);
const bottomBenefits = benefitCategories.slice(6, 8);

type Tab = 'info' | 'benefits' | 'ingredients';

interface ProductTabsProps {
  activeTab?: Tab;
  onTabChange?: (tab: Tab) => void;
}

function IngredientItem({ name, tooltip }: { name: string; tooltip: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={`ing-item ${open ? 'ing-item--open' : ''}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onClick={() => setOpen((v) => !v)}
    >
      <span className="ing-name">{name}</span>
      {open && (
        <div className="ing-tooltip" role="tooltip">
          {tooltip}
        </div>
      )}
    </div>
  );
}

export function ProductTabs({ activeTab: controlledTab, onTabChange }: ProductTabsProps = {}) {
  const [activeTab, setActiveTab] = useState<Tab>(controlledTab ?? 'info');

  // Sync when parent drives the active tab (e.g. nav link click)
  useEffect(() => {
    if (controlledTab) setActiveTab(controlledTab);
  }, [controlledTab]);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  return (
    <section className="product-tabs-section" id="product-tabs">
      <div className="product-tabs-inner">
        {/* Tab bar */}
        <div className="tab-bar" role="tablist">
          {(['info', 'benefits', 'ingredients'] as Tab[]).map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              className={`tab-btn ${activeTab === tab ? 'tab-btn--active' : ''}`}
              onClick={() => handleTabChange(tab)}
            >
              {tab === 'info' ? 'Product Info' : tab === 'benefits' ? 'Benefits' : 'Ingredients'}
            </button>
          ))}
        </div>

        {/* ── Product Info tab ── */}
        {activeTab === 'info' && (
          <div className="tab-panel" role="tabpanel">
            <div className="tab-info-grid">
              <div className="tab-info-content">
                <span className="section-label">Overview</span>
                <h2>Hypoallergenic with Superfoods</h2>
                <p>
                  Complete premium food for adult dogs. Our 2kg kibble is vet-formulated
                  with a single hydrolysed protein and 20+ functional superfoods —
                  designed specifically for dogs with food sensitivities.
                </p>
                <p>
                  Free from beef, dairy, gluten, wheat, grain, fillers, and artificial
                  colours. Gentle on digestion, great for joints, coat, and immune health.
                </p>

                <div className="analysis-grid">
                  <div className="analysis-item">
                    <span className="analysis-value">27%</span>
                    <span className="analysis-label">Crude Protein</span>
                  </div>
                  <div className="analysis-item">
                    <span className="analysis-value">13%</span>
                    <span className="analysis-label">Crude Fat</span>
                  </div>
                  <div className="analysis-item">
                    <span className="analysis-value">5%</span>
                    <span className="analysis-label">Crude Fibre</span>
                  </div>
                  <div className="analysis-item">
                    <span className="analysis-value">3,383</span>
                    <span className="analysis-label">kcal ME/kg</span>
                  </div>
                </div>

                <div className="sensitivity-promise" style={{ marginTop: '2rem' }}>
                  <strong>The Sensitivity Promise</strong>
                  <p>
                    If it's not the right fit for your dog, we'll refund you — just reach out.
                    No hoops, no hassle.
                  </p>
                </div>
              </div>

              <div className="tab-info-story">
                <span className="section-label">Our Story</span>
                <h2>Created for Chloe</h2>
                <p>
                  Chloe had lifelong food sensitivities. Every commercial kibble we tried
                  left her with itchy skin, digestive issues, and low energy. We spent years
                  searching for the right food — and when we couldn't find it, we made it.
                </p>
                <div
                  className="story-image-placeholder"
                  style={{ height: '220px', margin: '1.5rem 0' }}
                  role="img"
                  aria-label="Chloe the dog who inspired Little Green Dog"
                />
                <p>
                  Little Green Dog was born from a simple belief: every dog deserves food
                  that doesn't make them feel terrible. Our hypoallergenic, grain-free formula
                  is built from the ground up for sensitive stomachs.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Benefits tab ── */}
        {activeTab === 'benefits' && (
          <div className="tab-panel" role="tabpanel">
            <div className="benefits-layout">
              {/* Left column */}
              <div className="benefits-col">
                {leftBenefits.map((cat) => (
                  <div className="benefit-box" key={cat.name}>
                    <h3><span className="ing-dot">·</span> {cat.name}</h3>
                    <p>{cat.why}</p>
                    <span className="benefit-what">{cat.what}</span>
                  </div>
                ))}
              </div>

              {/* Centre image */}
              <div className="benefits-centre">
                <img
                  src="https://images.unsplash.com/photo-1568640347023-a616a30bc3bd?w=500&q=80"
                  alt="Bowl of Little Green Dog kibble"
                  className="benefits-kibble-img"
                />
              </div>

              {/* Right column */}
              <div className="benefits-col">
                {rightBenefits.map((cat) => (
                  <div className="benefit-box" key={cat.name}>
                    <h3><span className="ing-dot">·</span> {cat.name}</h3>
                    <p>{cat.why}</p>
                    <span className="benefit-what">{cat.what}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom row */}
            <div className="benefits-bottom-row">
              {bottomBenefits.map((cat) => (
                <div className="benefit-box" key={cat.name}>
                  <h3><span className="ing-dot">·</span> {cat.name}</h3>
                  <p>{cat.why}</p>
                  <span className="benefit-what">{cat.what}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Ingredients tab ── */}
        {activeTab === 'ingredients' && (
          <div className="tab-panel" role="tabpanel">
            <div className="ing-header">
              <p className="ing-intro">
                Hover (or tap on mobile) any ingredient to learn exactly why it's included.
              </p>
              <div className="excluded-list-large">
                <span className="excluded-title">No:</span>
                {['Beef', 'Dairy', 'Gluten', 'Wheat', 'Grain', 'Fillers', 'Artificial colours'].map((item) => (
                  <span className="excluded-tag-large" key={item}>{item}</span>
                ))}
              </div>
            </div>
            <div className="ing-list">
              {ingredients.map((ing) => (
                <IngredientItem key={ing.name} name={ing.name} tooltip={ing.tooltip} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
