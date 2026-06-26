import { useState, useRef, useEffect } from 'react';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import { useSectionViewed } from '../hooks/useSectionViewed';
import {
  trackPageViewed,
  trackNavAnchorClicked,
  trackInternalLinkClicked,
  trackExternalLinkClicked,
} from '../lib/analytics';
import { Footer } from './Footer';
import { TestimonialsSection } from './TestimonialsSection';
import { IngredientList } from './IngredientList';

const WHOLESALE_URL = 'https://www.littlegreendog.co.nz/pages/wholesale';
const ORDER_EMAIL = 'orders@littlegreendog.co.nz';

const galleryImages = [
  { src: '/kibble/1.jpg', alt: 'Little Green Dog Sensitive kibble' },
  { src: '/kibble/2.jpg', alt: 'Little Green Dog Sensitive kibble' },
  { src: '/kibble/3.jpg', alt: 'Little Green Dog Sensitive kibble' },
  { src: '/kibble/4.jpg', alt: 'Little Green Dog Sensitive kibble' },
  { src: '/kibble/5.jpg', alt: 'Little Green Dog Sensitive kibble' },
  { src: '/kibble/6.jpg', alt: 'Little Green Dog Sensitive kibble' },
];

const ingredientGroups = [
  {
    name: 'Hydrolysed Protein',
    why: 'Enzymatically hydrolysed chicken pulp + chicken polypeptide meal — pre-digested for maximum absorption and minimal immunogenic load.',
    key: true,
  },
  {
    name: 'Skin & Coat',
    why: 'Omega-3 (salmon oil, flaxseed) and omega-6 (chicken oil) for EPA/DHA and epidermal barrier support, plus DL-methionine and L-lysine for keratin synthesis.',
    key: false,
  },
  {
    name: 'Gut Health',
    why: 'FOS prebiotic (supports Lactobacillus and Bifidobacterium), beet pulp and cellulose for stool quality, yucca schidigera to reduce colonic ammonia and faecal odour.',
    key: false,
  },
  {
    name: 'Immune Support',
    why: 'Blueberry, rosemary extract, carrot, apple, cabbage, cauliflower — polyphenol and flavonoid sources — plus a full B-vitamin complex.',
    key: false,
  },
  {
    name: 'Low-GI Carbohydrates',
    why: 'Grain-free (peas, tapioca, sweet potato). Peas present but deliberately not dominant, consistent with FDA guidance on legume-heavy grain-free diets.',
    key: true,
  },
  {
    name: 'Amino Acid Profile',
    why: 'Complete profile for adult maintenance: taurine, L-carnitine, DL-methionine, L-lysine for muscle integrity and metabolic function.',
    key: false,
  },
];

const excluded = ['Beef', 'Dairy', 'Gluten', 'Wheat', 'Grain', 'Fillers', 'Artificial colours'];

// All 73 factors from SGS report ASH26-0024284-01A1 (independent batch testing panel)
const sgsTestGroups = [
  {
    heading: 'Microbial safety',
    tests: [
      'Salmonella',
      'Listeria monocytogenes',
      'Escherichia coli',
      'Bacterial count',
      'Mould and Yeast',
    ],
  },
  {
    heading: 'Macronutrients',
    tests: [
      'Moisture',
      'Crude Protein',
      'Crude Fat',
      'Crude Fiber',
      'Crude Ash',
      'Water Activity',
    ],
  },
  {
    heading: 'Amino acids & fatty acids',
    tests: [
      'Arginine',
      'Histidine',
      'Isoleucine',
      'Leucine',
      'Lysine',
      'Phenylalanine',
      'Threonine',
      'Tyrosine',
      'Valine',
      'Cystine',
      'Methionine',
      'Tryptophan',
      'Linoleic Acid (Omega-6)',
      'α-Linolenic Acid (ALA)',
      'Arachidonic Acid (ARA)',
      'EPA',
      'DHA',
    ],
  },
  {
    heading: 'Vitamins & minerals',
    tests: [
      'Folic Acid',
      'Vitamin B1 (Thiamine)',
      'Vitamin B2 (Riboflavin)',
      'Vitamin B5 (Pantothenic Acid)',
      'Vitamin B6 (as Pyridoxine)',
      'Pyridoxine',
      'Pyridoxal',
      'Pyridoxamine',
      'Vitamin B12',
      'Vitamin A (μg/100g)',
      'Vitamin A (IU/kg)',
      'α-Tocopherol',
      'Vitamin E (IU/kg)',
      'Vitamin D2',
      'Vitamin D3',
      'Vitamin D (D2+D3)',
      'Vitamin D (IU/kg)',
      'Choline',
      'Niacin',
      'Niacinamide',
      'Total Niacin and Niacinamide',
      'Calcium',
      'Total Phosphorus',
      'Sodium',
      'Magnesium',
      'Potassium',
      'Iron',
      'Zinc',
      'Copper',
      'Manganese',
      'Iodine',
      'Selenium',
      'Water-soluble Chlorides',
    ],
  },
  {
    heading: 'Contaminants & chemical safety',
    tests: [
      'Total Arsenic',
      'Lead',
      'Cadmium',
      'Mercury',
      'Aflatoxin B1',
      'Aflatoxin B2',
      'Aflatoxin G1',
      'Aflatoxin G2',
      'Total Aflatoxins (B1+B2+G1+G2)',
      'Melamine',
      'Cyanide (as HCN)',
      'TBHQ',
    ],
  },
];

const sgsTestCount = sgsTestGroups.reduce((total, group) => total + group.tests.length, 0);

const certifications = [
  { code: 'ISO 9001', name: 'Quality Management' },
  { code: 'ISO 22000', name: 'Food Safety' },
  { code: 'ISO 45001', name: 'Occupational Health' },
  { code: 'ISO 14001', name: 'Environmental' },
  { code: 'GMP', name: 'Good Manufacturing' },
  { code: 'BRC', name: 'Global Food Standard' },
  { code: 'HACCP', name: 'Hazard Analysis' },
  { code: 'FDA', name: 'Facility Registration' },
];

export function WholesalePage() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [dragOffset, setDragOffset] = useState<number | null>(null);
  const touchStartX = useRef<number | null>(null);
  const COUNT = galleryImages.length;

  useScrollAnimation();

  useEffect(() => {
    trackPageViewed();
  }, []);

  useSectionViewed('hero', 'hero');
  useSectionViewed('stats', 'stats');
  useSectionViewed('product-info', 'product');
  useSectionViewed('ingredients', 'ingredients');
  useSectionViewed('science', 'science');
  useSectionViewed('testimonials', 'testimonials');
  useSectionViewed('order', 'order');

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
    if (delta < 0) setActiveIdx((i) => (i + 1) % COUNT);
    else setActiveIdx((i) => (i - 1 + COUNT) % COUNT);
  };

  const translateX =
    dragOffset !== null
      ? `calc(${-activeIdx * 100}% + ${dragOffset}px)`
      : `${-activeIdx * 100}%`;
  const isAnimating = dragOffset === null;

  return (
    <>
      <header className="announcement-bar">
        <p>
          Now available to wholesale —{' '}
          <strong>40% margin, $55 RRP</strong> — add to your next order today
        </p>
      </header>

      <nav className="site-nav">
        <a
          href="/"
          className="nav-logo"
          onClick={() =>
            trackInternalLinkClicked({ destination: '/', location: 'nav', label: 'logo' })
          }
        >
          <img src="/logo.png" alt="Little Green Dog" className="nav-logo-img" />
        </a>
        <ul className="nav-links">
          <li>
            <a
              href="#product-info"
              className="nav-link-btn-a"
              onClick={() => trackNavAnchorClicked({ target: 'product-info' })}
            >
              Product
            </a>
          </li>
          <li>
            <a
              href="#ingredients"
              className="nav-link-btn-a"
              onClick={() => trackNavAnchorClicked({ target: 'ingredients' })}
            >
              Ingredients
            </a>
          </li>
          <li>
            <a
              href="#science"
              className="nav-link-btn-a"
              onClick={() => trackNavAnchorClicked({ target: 'science' })}
            >
              Science
            </a>
          </li>
        </ul>
        <a
          href={WHOLESALE_URL}
          className="btn-order nav-order-btn"
          target="_blank"
          rel="noopener noreferrer"
          onClick={() =>
            trackExternalLinkClicked({
              destination: WHOLESALE_URL,
              location: 'nav',
              label: 'Order Now',
              link_kind: 'url',
            })
          }
        >
          Order Now
        </a>
      </nav>

      <main className="wh-page">
        {/* ── Hero ── */}
        <section className="hero" id="hero">
          <div className="hero-copy">
            <span className="badge">For Retailers &amp; Vet Clinics</span>
            <h1>
              A non-prescription hypoallergenic diet you can actually recommend
            </h1>
            <p className="hero-subtitle">
              There's a real space between "grain-free" (which often doesn't solve adverse food
              reactions) and a prescription elimination diet (which many dogs don't clinically need
              long-term).{' '}
              <span className="hero-sensitivity-promise">
                This dog food sits in that space: a non-prescription, long-term management diet for dogs
                with confirmed or suspected food sensitivities.
              </span>
            </p>
            <div className="hero-actions">
              <a
                href={WHOLESALE_URL}
                className="btn-order"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  trackExternalLinkClicked({
                    destination: WHOLESALE_URL,
                    location: 'hero',
                    label: 'Order through the wholesale portal',
                    link_kind: 'url',
                  })
                }
              >
                Order through the wholesale portal →
              </a>
              <p className="wh-cta-email">
                Or email{' '}
                <a
                  href={`mailto:${ORDER_EMAIL}`}
                  onClick={() =>
                    trackExternalLinkClicked({
                      destination: ORDER_EMAIL,
                      location: 'hero',
                      label: ORDER_EMAIL,
                      link_kind: 'email',
                    })
                  }
                >
                  {ORDER_EMAIL}
                </a>
              </p>
            </div>

            <div className="hero-trust">
              <span>✓ AAFCO formulated</span>
              <span>✓ SGS tested, 73 factors</span>
              <span>✓ ISO-accredited manufacturer</span>
            </div>
          
          </div>

          <div className="hero-image">
            <div className="gallery">
              <div
                className="gallery-main"
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
                      width={800}
                      height={800}
                      loading={i === 0 ? 'eager' : 'lazy'}
                      decoding="async"
                      draggable={false}
                    />
                  ))}
                </div>
              </div>
              <div className="gallery-dots" aria-hidden="true">
                {galleryImages.map((_, i) => (
                  <span
                    key={i}
                    className={`gallery-dot ${i === activeIdx ? 'active' : ''}`}
                  />
                ))}
              </div>
              <div className="gallery-thumbs" role="list" aria-label="Product image gallery">
                {galleryImages.map((img, i) => (
                  <button
                    key={i}
                    role="listitem"
                    className={`gallery-thumb ${i === activeIdx ? 'active' : ''}`}
                    onClick={() => setActiveIdx(i)}
                    aria-label={img.alt}
                    aria-current={i === activeIdx}
                  >
                    <img
                      src={img.src}
                      alt=""
                      width={80}
                      height={80}
                      loading="lazy"
                      decoding="async"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Stats bar ── */}
        <section className="benefits-bar" id="stats" aria-label="Key numbers">
          <div className="benefits-inner animate-stagger">
            <div className="benefit-item">
              <div className="benefit-icon">
                40<span>%</span>
              </div>
              <div className="benefit-label">Margin on every bag sold</div>
            </div>
            <div className="benefit-item">
              <div className="benefit-icon">$55</div>
              <div className="benefit-label">RRP (inc GST) — $28.70 wholesale</div>
            </div>
            <div className="benefit-item">
              <div className="benefit-icon">
                80<span>+</span>
              </div>
              <div className="benefit-label">NZ stores &amp; vet clinics stocking LGD products</div>
            </div>
            <div className="benefit-item">
              <div className="benefit-icon">73</div>
              <div className="benefit-label">Quality factors independently tested per batch</div>
            </div>
          </div>
        </section>

        {/* ── Product Info ── */}
        <section className="wh-product-section animate-on-scroll" id="product-info">
          <div className="wh-product-inner">
            <div className="wh-product-copy">
              <span className="section-label">Product</span>
              <h2>
                Complete adult maintenance.
                <br />
                Long-term sensitivity management.
              </h2>
              <p>
                Formulated to AAFCO nutritional profiles. Free from beef, dairy, gluten, wheat, and
                grain. Built on enzymatically hydrolysed chicken, the mechanism that separates it
                from both grain-free diets and novel-protein options.
              </p>
              <p>
                Grain-free diets work on the assumption that removing common allergens (often grain)
                will resolve reactions. They frequently don't, because the problem is the protein
                structure, not the carbohydrate. Novel protein diets shift the source, but the intact
                protein structure remains which risks cross-reactivity or new sensitisation over time.
              </p>
            </div>

            <div className="wh-product-image">
              <img
                src="/kibble/2.jpg"
                alt="Little Green Dog Sensitive kibble bag"
                className="wh-product-img"
                loading="lazy"
              />
            </div>
          </div>

          <div className="wh-product-full">
            <p>
              <strong>Hydrolysis alters the protein structure itself.</strong> Dual enzymatic
              hydrolysis breaks chicken protein into small peptide fragments below the threshold
              of immune recognition — so IgE- and T-cell-mediated responses largely don't occur.
              That's the clinical case for long-term use.
            </p>
            <p>
              Fragment size is measured in Daltons (Da), the unit of molecular weight used to
              describe protein size, and smaller fragments are less likely to be recognised by the
              immune system as allergens. The hydrolysate we use has a pepsin
              digestibility of 94.1%, and its Dalton split shows that <strong>93.6% of soluble protein falls below 10,000 Da</strong> — the threshold commonly cited in veterinary literature for reduced
              allergenicity. More significantly, <strong>84% sits below 5,000 Da and roughly 50% below
              500 Da</strong>, meaning about half the protein is present as free amino acids or dipeptides
              that require no further digestion and are absorbed directly through the gut wall.
            </p>

            <div className="wh-product-specs">
              <div className="wh-spec-row">
                <span className="wh-spec-label">Protein source</span>
                <span className="wh-spec-value">
                  Hydrolysed chicken (dual enzymatic hydrolysis)
                </span>
              </div>
              <div className="wh-spec-row">
                <span className="wh-spec-label">Format</span>
                <span className="wh-spec-value">
                  2kg bags, $55 RRP (larger bags later this year)
                </span>
              </div>
              <div className="wh-spec-row">
                <span className="wh-spec-label">Standard</span>
                <span className="wh-spec-value">AAFCO complete adult maintenance</span>
              </div>
              <div className="wh-spec-row">
                <span className="wh-spec-label">Prescription</span>
                <span className="wh-spec-value">Not required — long-term OTC management diet</span>
              </div>
              <div className="wh-spec-row">
                <span className="wh-spec-label">Excluded</span>
                <span className="wh-spec-value">Beef, dairy, gluten, wheat, grain</span>
              </div>
            </div>

            <div style={{ marginTop: '1.75rem' }}>
              <a
                href={WHOLESALE_URL}
                className="btn-order"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  trackExternalLinkClicked({
                    destination: WHOLESALE_URL,
                    location: 'product',
                    label: 'Order now',
                    link_kind: 'url',
                  })
                }
              >
                Order now →
              </a>
              <p className="wh-cta-email">
                Or email{' '}
                <a
                  href={`mailto:${ORDER_EMAIL}`}
                  onClick={() =>
                    trackExternalLinkClicked({
                      destination: ORDER_EMAIL,
                      location: 'product',
                      label: ORDER_EMAIL,
                      link_kind: 'email',
                    })
                  }
                >
                  {ORDER_EMAIL}
                </a>
              </p>
            </div>
          </div>
        </section>

        {/* ── Ingredients ── */}
        <section className="ingredients-section" id="ingredients">
          <div className="wh-ingredients-inner">
            <span className="section-label">Ingredients</span>
            <h2>We're transparent about everything that goes in, and why</h2>
            <p className="ingredients-subtitle">
              Every ingredient earns its place — and has a clinical reason for being there.
              Here's the breakdown your team will want before they recommend it.
            </p>

            <div className="ingredients-excluded">
              <h3>What we never use</h3>
              <div className="excluded-list">
                {excluded.map((item) => (
                  <span className="excluded-tag" key={item}>
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="ingredient-grid wh-ingredient-grid">
              {ingredientGroups.map((group) => (
                <div
                  className={`ingredient-card${group.key ? ' ingredient-card--key' : ''}`}
                  key={group.name}
                >
                  <h3>
                    <span className="ing-dot">·</span> {group.name}
                    {group.key && <span className="ing-key-badge">Clinical</span>}
                  </h3>
                  <p className="ingredient-why">{group.why}</p>
                </div>
              ))}
            </div>

            <details className="wh-ingredients-accordion">
              <summary className="wh-ingredients-summary">
                <div>
                  <strong>The full ingredient list</strong>
                  <p>Every ingredient, with the reason it's there. Hover or tap any item for detail.</p>
                  <span className="wh-ingredients-toggle-label">View full ingredient list</span>
                </div>
              </summary>
              <div className="wh-ingredients-accordion-body">
                <IngredientList />
              </div>
            </details>
          </div>
        </section>

        {/* ── Science section ── */}
        <section className="wh-science-section" id="science">
          <div className="wh-science-inner">
            <div className="wh-science-header animate-on-scroll">
              <span className="section-label" style={{ display: 'block', textAlign: 'center' }}>
                Science &amp; Credibility
              </span>
              <h2>We paid attention to the details</h2>
              <p className="wh-science-subtitle">
                The clinical detail your staff will need before they recommend it and the
                manufacturing proof to back every bag.
              </p>
            </div>

            <div className="wh-science-body">
              <div className="wh-science-mechanism animate-on-scroll">
                <h3>Why hydrolysis, not novel protein</h3>
                <p>
                  Conventional intact proteins can drive IgE- and T-cell-mediated adverse food
                  reactions. Novel protein diets shift the source, but the protein structure remains
                  intact, so cross-reactivity risk and new sensitisation over time persist.
                </p>
                <p>
                  Our formula uses enzymatically hydrolysed chicken.{' '}
                  <strong>Dual hydrolysis</strong> breaks the protein into small peptide fragments
                  below the threshold of immune recognition. The protein structure is altered, not
                  just swapped out. That's why it's suitable for long-term management.
                </p>

                <div className="wh-hydrolysis-callout">
                  <div className="wh-hydrolysis-step">
                    <div className="wh-hydrolysis-num">1</div>
                    <div>
                      <strong>Intact protein</strong>
                      <p>
                        Whole chicken protein → recognised by immune system → IgE/T-cell response
                      </p>
                    </div>
                  </div>
                  <div className="wh-hydrolysis-arrow" aria-hidden="true">→</div>
                  <div className="wh-hydrolysis-step">
                    <div className="wh-hydrolysis-num">2</div>
                    <div>
                      <strong>Dual enzymatic hydrolysis</strong>
                      <p>
                        Two-stage breakdown → peptide fragments below immune recognition threshold
                        → adverse reaction risk decreased
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="wh-science-credentials animate-on-scroll">
                <h3>Manufacturing &amp; testing</h3>

                <div className="wh-manufacturer-block">
                  <p className="wh-manufacturer-name">Made in partnership with Bridge PetCare</p>
                  <p className="wh-manufacturer-desc">
                    8 internal testing labs, no product recalls in their history, FDA-registered facility.
                  </p>
                  <div className="wh-cert-grid">
                    {certifications.map((cert) => (
                      <div className="wh-cert-item" key={cert.code}>
                        <strong>{cert.code}</strong>
                        <span>{cert.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <details className="wh-sgs-block wh-sgs-accordion">
                  <summary className="wh-sgs-summary">
                    <div className="wh-sgs-icon" aria-hidden="true">SGS</div>
                    <div>
                      <strong>Independent batch testing</strong>
                      <p>
                        Every batch independently verified by SGS across 73 distinct nutritional,
                        chemical and safety factors.
                      </p>
                      <span className="wh-sgs-toggle-label">View all {sgsTestCount} tests</span>
                    </div>
                  </summary>
                  <div className="wh-sgs-test-groups">
                    {sgsTestGroups.map((group) => (
                      <div key={group.heading} className="wh-sgs-test-group">
                        <h4 className="wh-sgs-test-group-heading">{group.heading}</h4>
                        <div className="wh-sgs-test-grid">
                          {group.tests.map((test) => (
                            <span key={test} className="wh-sgs-test-item">{test}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </details>

                <div className="wh-lgd-block">
                  <p>
                    <strong>Little Green Dog</strong> is a New Zealand business selling quality dog
                    products since 2019, stocked in 80+ stores and vet clinics nationwide.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Testimonials ── */}
        <div id="testimonials">
          <TestimonialsSection headingOverride="What our customers are saying" />
        </div>

        {/* ── Commercial / Order section ── */}
        <section className="wh-commercial-section" id="order">
          <div className="wh-commercial-inner">
            <div className="wh-commercial-header animate-on-scroll">
              <span className="section-label">Wholesale</span>
              <h2>Easy to stock. Built for repeat orders.</h2>
              <p>
                Sensitivity buyers don't bargain-hunt. Once a dog settles on a food that works,
                the owner stays on it which results in repeat, predictable re-orders for you, not a one-off
                sale.
              </p>
            </div>

            <div className="wh-commercial-body">
              <div className="wh-pricing-card animate-on-scroll">
                <div className="wh-pricing-header">
                  <span className="section-label">Pricing</span>
                  <h3>The margin maths</h3>
                </div>
                <div className="wh-pricing-row">
                  <span>Wholesale (ex GST)</span>
                  <strong>$28.70</strong>
                </div>
                <div className="wh-pricing-row wh-pricing-row--rrp">
                  <span>RRP (inc GST)</span>
                  <strong>$55.00</strong>
                </div>
                <div className="wh-pricing-margin">
                  <span className="wh-margin-label">Your margin</span>
                  <span className="wh-margin-value">40%</span>
                  <span className="wh-margin-amount">$19.13 per bag</span>
                </div>
              </div>

              <div className="wh-reasons animate-stagger">
                <div className="wh-reason">
                  <div className="wh-reason-icon" aria-hidden="true">↩</div>
                  <div>
                    <strong>Repeat customers</strong>
                    <p>
                      Sensitivity customers don't switch once it works. Predictable, recurring
                      re-orders.
                    </p>
                  </div>
                </div>
                <div className="wh-reason">
                  <div className="wh-reason-icon" aria-hidden="true">◇</div>
                  <div>
                    <strong>Genuinely differentiated</strong>
                    <p>
                      A non-prescription hydrolysed diet at an affordable price.
                    </p>
                  </div>
                </div>
                <div className="wh-reason">
                  <div className="wh-reason-icon" aria-hidden="true">+</div>
                  <div>
                    <strong>Natural cross-sell</strong>
                    <p>
                      Our hypoallergenic treats pair naturally with the kibble for
                      the same sensitive-dog customer.
                    </p>
                  </div>
                </div>
                <div className="wh-reason">
                  <div className="wh-reason-icon" aria-hidden="true">✓</div>
                  <div>
                    <strong>Easy to start</strong>
                    <p>
                      2kg bags, $55 RRP. Add to your next order through the portal, or reply to us
                      directly and we'll sort it.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="wh-order-block animate-on-scroll">
              <h3>Ready to add it to your next order?</h3>
              <p>
                Order through the wholesale portal, or email us directly and we'll sort everything.
              </p>
              <div className="wh-order-actions">
                <a
                  href={WHOLESALE_URL}
                  className="btn-order"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() =>
                    trackExternalLinkClicked({
                      destination: WHOLESALE_URL,
                      location: 'order',
                      label: 'Order through the wholesale portal',
                      link_kind: 'url',
                    })
                  }
                >
                  Order through the wholesale portal →
                </a>
                <p className="wh-cta-email">
                  Or email{' '}
                  <a
                    href={`mailto:${ORDER_EMAIL}`}
                    onClick={() =>
                      trackExternalLinkClicked({
                        destination: ORDER_EMAIL,
                        location: 'order',
                        label: ORDER_EMAIL,
                        link_kind: 'email',
                      })
                    }
                  >
                    {ORDER_EMAIL}
                  </a>
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
