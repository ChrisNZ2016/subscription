import { useState, useCallback, useEffect, useMemo } from 'react';
import { useSubscriptionProduct } from '../hooks/useSubscriptionProduct';
import {
  createSubscribeCartAndRedirect,
  EARLY_SUBSCRIBER_SELLING_PLAN_ID,
} from '../lib/cart-subscribe';
import { formatMoney } from '../lib/pricing';
import { WhyYoullLoveIt } from './WhyYoullLoveIt';
import { ProductTabs } from './ProductTabs';
import { TestimonialsSection } from './TestimonialsSection';
import { FAQSection } from './FAQSection';
import { Footer } from './Footer';
import { trackPageViewed, trackCtaClicked, trackCheckoutStarted, trackVariantSelected, trackNavAnchorClicked } from '../lib/analytics';
import { shopifyGidToContentId, trackMetaViewContent } from '../lib/meta-pixel';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import { useSectionViewed } from '../hooks/useSectionViewed';
import { useHashScroll } from '../hooks/useHashScroll';
import type { ProductVariant } from '../types/shopify';

function subscribePrice(variant: ProductVariant): string | undefined {
  const alloc = variant.sellingPlanAllocations.nodes.find(
    (n) => n.sellingPlan.id === EARLY_SUBSCRIBER_SELLING_PLAN_ID,
  );
  return alloc ? formatMoney(alloc.priceAdjustments[0].perDeliveryPrice) : undefined;
}

function subscribePriceAmount(variant: ProductVariant): number | undefined {
  const alloc = variant.sellingPlanAllocations.nodes.find(
    (n) => n.sellingPlan.id === EARLY_SUBSCRIBER_SELLING_PLAN_ID,
  );
  const price = alloc?.priceAdjustments[0]?.perDeliveryPrice;
  return price ? parseFloat(price.amount) : undefined;
}

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

export function SubscribeIngredientsPage() {
  const { product, loading, error } = useSubscriptionProduct();
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cartError, setCartError] = useState<string | null>(null);

  useScrollAnimation();

  useEffect(() => {
    trackPageViewed();
  }, []);

  useSectionViewed('benefits', 'benefits');
  useSectionViewed('ingredients', 'ingredients');
  useSectionViewed('subscribe', 'picker');
  useSectionViewed('testimonials', 'testimonials');
  useSectionViewed('faq', 'faq');

  const variants = useMemo(() => {
    if (!product) return [];
    const order = ['2kg', '4kg', '6kg', '8kg'];
    return product.variants.nodes
      .filter((v) => subscribePrice(v) !== undefined)
      .sort((a, b) => order.indexOf(a.title) - order.indexOf(b.title));
  }, [product]);

  useHashScroll(!loading && !error && !!product && variants.length > 0);

  useEffect(() => {
    if (!selectedVariantId && variants.length > 0) {
      const twoKg = variants.find((v) => v.title === '2kg') ?? variants[0];
      setSelectedVariantId(twoKg.id);
      trackVariantSelected({
        bagWeight: parseInt(twoKg.title, 10) || 0,
        price: subscribePrice(twoKg) ?? '',
        frequencyWeeks: 4,
        source: 'default',
      });
    }
  }, [variants, selectedVariantId]);

  const handleVariantSelect = useCallback((variant: ProductVariant) => {
    if (variant.id === selectedVariantId) return;
    setSelectedVariantId(variant.id);
    trackVariantSelected({
      bagWeight: parseInt(variant.title, 10) || 0,
      price: subscribePrice(variant) ?? '',
      frequencyWeeks: 4,
      source: 'user',
    });
  }, [selectedVariantId]);

  const selectedVariant = variants.find((v) => v.id === selectedVariantId);
  const selectedPrice = selectedVariant ? subscribePrice(selectedVariant) : undefined;

  useEffect(() => {
    if (!selectedVariant) return;
    trackMetaViewContent({
      contentIds: [shopifyGidToContentId(selectedVariant.id)],
      value: subscribePriceAmount(selectedVariant),
      currency: 'NZD',
    });
  }, [selectedVariant]);

  const handleCheckout = useCallback(
    async (location: 'nav' | 'picker') => {
      if (!selectedVariant) return;
      trackCtaClicked(location);
      setIsSubmitting(true);
      setCartError(null);
      try {
        const checkoutValue = subscribePriceAmount(selectedVariant);
        trackCheckoutStarted({
          samplePrice: selectedPrice ?? '',
          bagWeight: parseInt(selectedVariant.title, 10) || 0,
          frequencyWeeks: 4,
          addonCount: 0,
          contentIds: [shopifyGidToContentId(selectedVariant.id)],
          value: checkoutValue,
        });
        await createSubscribeCartAndRedirect(selectedVariant.id, checkoutValue);
      } catch (err) {
        setCartError(err instanceof Error ? err.message : 'Failed to create cart');
        setIsSubmitting(false);
      }
    },
    [selectedVariant, selectedPrice],
  );

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        <p>Loading…</p>
      </div>
    );
  }

  if (error || !product || variants.length === 0) {
    return (
      <div className="error">
        <h2>Something went wrong</h2>
        <p>{error ?? 'This offer is not available right now.'}</p>
        <button className="btn-order" onClick={() => window.location.reload()}>Try Again</button>
      </div>
    );
  }

  return (
    <>
      <header className="announcement-bar">
        <p>🔒 <strong>Lock in 25% off</strong> every delivery, better than our standard 20% subscriber rate</p>
      </header>

      <nav className="site-nav">
        <a href="/" className="nav-logo">
          <img src="/logo.png" alt="Little Green Dog" className="nav-logo-img" />
        </a>
        <ul className="nav-links">
          <li><a href="#benefits" onClick={() => trackNavAnchorClicked({ target: 'benefits' })}>Benefits</a></li>
          <li><a href="#ingredients" onClick={() => trackNavAnchorClicked({ target: 'ingredients' })}>Ingredients</a></li>
          <li><a href="#faq" onClick={() => trackNavAnchorClicked({ target: 'faq' })}>FAQ</a></li>
          <li><a href="https://www.littlegreendog.co.nz/pages/contact-us" target="_blank" rel="noopener noreferrer">Contact</a></li>
        </ul>
        <button className="btn-order nav-order-btn" onClick={() => handleCheckout('nav')} disabled={isSubmitting}>
          {isSubmitting ? 'Working…' : 'Lock in 25%'}
        </button>
      </nav>

      <main className="landing-page reactivation-page subscribe-ingredients-page">
        {cartError && <p style={{ color: 'red', textAlign: 'center', padding: '1rem' }}>{cartError}</p>}

        <section className="reactivation-hero">
          <span className="section-label">What's inside</span>
          <h1>Every ingredient earns its place</h1>
          <p className="reactivation-sub">
            Vet-formulated with hydrolysed chicken protein and 6+ functional superfoods,
            built from the ground up for dogs with sensitive stomachs.
            Subscribe now and <strong>lock in 25% off every delivery</strong> for as long as you stay subscribed.
          </p>

          <ul className="reactivation-reasons">
            <li><strong>Hypoallergenic protein.</strong> Hydrolysed chicken is broken into smaller fragments, dramatically reducing the risk of immune reactions.</li>
            <li><strong>Grain-free energy.</strong> Sweet potato, peas, and tapioca provide gentle, slow-release fuel without common allergens.</li>
            <li><strong>Gut health support.</strong> Prebiotics, beet pulp, and fibre blends promote healthy digestion and firm stools.</li>
            <li><strong>Your best rate, locked in.</strong> 25% off every delivery beats our standard 20%, skip, pause, or cancel anytime.</li>
          </ul>
        </section>

        <div id="benefits">
          <WhyYoullLoveIt
            onGetStarted={() => {
              trackCtaClicked('why-you-love-it');
              scrollToId('subscribe');
            }}
          />
        </div>

        <div id="ingredients">
          <ProductTabs activeTab="ingredients" />
        </div>

        <section className="reactivation-picker" id="subscribe">
          <h2>Choose your bag size</h2>
          <div className="variant-grid">
            {variants.map((v) => {
              const price = subscribePrice(v);
              const retail = formatMoney(v.price);
              const selected = v.id === selectedVariantId;
              return (
                <button
                  key={v.id}
                  type="button"
                  className={`variant-card${selected ? ' variant-card--selected' : ''}`}
                  onClick={() => handleVariantSelect(v)}
                  aria-pressed={selected}
                >
                  <span className="variant-size">{v.title}</span>
                  <span className="variant-price">{price}</span>
                  <span className="variant-retail">was {retail}</span>
                  <span className="variant-cadence">every 4 weeks</span>
                </button>
              );
            })}
          </div>

          <button
            className="btn-order reactivation-cta"
            onClick={() => handleCheckout('picker')}
            disabled={isSubmitting || !selectedVariant}
          >
            {isSubmitting
              ? 'Working…'
              : selectedPrice
                ? `Lock in 25% off, ${selectedPrice}/delivery`
                : 'Lock in 25% off'}
          </button>
          <p className="reactivation-finefoot">
            25% off every delivery · free shipping · cancel anytime
          </p>
        </section>

        <TestimonialsSection />
        <FAQSection />
      </main>

      <Footer />
    </>
  );
}
