import { useState, useCallback, useEffect, useMemo } from 'react';
import { useSubscriptionProduct } from '../hooks/useSubscriptionProduct';
import {
  createReactivationCartAndRedirect,
  REACTIVATION_SELLING_PLAN_ID,
} from '../lib/cart-reactivation';
import { formatMoney } from '../lib/pricing';
import { TestimonialsSection } from './TestimonialsSection';
import { FAQSection } from './FAQSection';
import { Footer } from './Footer';
import { trackPageViewed, trackCtaClicked, trackCheckoutStarted, trackVariantSelected, trackNavAnchorClicked } from '../lib/analytics';
import { shopifyGidToContentId, trackMetaViewContent } from '../lib/meta-pixel';
import { useSectionViewed } from '../hooks/useSectionViewed';
import { useHashScroll } from '../hooks/useHashScroll';
import type { ProductVariant } from '../types/shopify';

/** Per-delivery reactivation price for a variant, or null if the plan isn't allocated. */
function reactivationPrice(variant: ProductVariant): string | undefined {
  const alloc = variant.sellingPlanAllocations.nodes.find(
    (n) => n.sellingPlan.id === REACTIVATION_SELLING_PLAN_ID,
  );
  return alloc ? formatMoney(alloc.priceAdjustments[0].perDeliveryPrice) : undefined;
}

function reactivationPriceAmount(variant: ProductVariant): number | undefined {
  const alloc = variant.sellingPlanAllocations.nodes.find(
    (n) => n.sellingPlan.id === REACTIVATION_SELLING_PLAN_ID,
  );
  const price = alloc?.priceAdjustments[0]?.perDeliveryPrice;
  return price ? parseFloat(price.amount) : undefined;
}

export function ReactivationPage() {
  const { product, loading, error } = useSubscriptionProduct();
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cartError, setCartError] = useState<string | null>(null);

  useEffect(() => {
    trackPageViewed();
  }, []);

  useSectionViewed('subscribe', 'picker');
  useSectionViewed('testimonials', 'testimonials');
  useSectionViewed('faq', 'faq');

  // Only offer variants that actually carry the reactivation plan, in size order.
  const variants = useMemo(() => {
    if (!product) return [];
    const order = ['2kg', '4kg', '6kg', '8kg'];
    return product.variants.nodes
      .filter((v) => reactivationPrice(v) !== undefined)
      .sort((a, b) => order.indexOf(a.title) - order.indexOf(b.title));
  }, [product]);

  useHashScroll(!loading && !error && !!product && variants.length > 0);

  // Default to the 2kg (smallest / most common) once loaded.
  useEffect(() => {
    if (!selectedVariantId && variants.length > 0) {
      const twoKg = variants.find((v) => v.title === '2kg') ?? variants[0];
      setSelectedVariantId(twoKg.id);
      trackVariantSelected({
        bagWeight: parseInt(twoKg.title, 10) || 0,
        price: reactivationPrice(twoKg) ?? '',
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
      price: reactivationPrice(variant) ?? '',
      frequencyWeeks: 4,
      source: 'user',
    });
  }, [selectedVariantId]);

  const selectedVariant = variants.find((v) => v.id === selectedVariantId);
  const selectedPrice = selectedVariant ? reactivationPrice(selectedVariant) : undefined;

  useEffect(() => {
    if (!selectedVariant) return;
    trackMetaViewContent({
      contentIds: [shopifyGidToContentId(selectedVariant.id)],
      value: reactivationPriceAmount(selectedVariant),
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
        const checkoutValue = reactivationPriceAmount(selectedVariant);
        trackCheckoutStarted({
          samplePrice: selectedPrice ?? '',
          bagWeight: parseInt(selectedVariant.title, 10) || 0,
          frequencyWeeks: 4,
          addonCount: 0,
          contentIds: [shopifyGidToContentId(selectedVariant.id)],
          value: checkoutValue,
        });
        await createReactivationCartAndRedirect(selectedVariant.id, checkoutValue);
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
        <p>🎁 <strong>Welcome back offer</strong>, 25% off every delivery + a free 60-pack of compostable poop bags</p>
      </header>

      <nav className="site-nav">
        <a href="/" className="nav-logo">
          <img src="/logo.png" alt="Little Green Dog" className="nav-logo-img" />
        </a>
        <ul className="nav-links">
          <li><a href="#faq" onClick={() => trackNavAnchorClicked({ target: 'faq' })}>FAQ</a></li>
          <li><a href="https://www.littlegreendog.co.nz/pages/contact-us" target="_blank" rel="noopener noreferrer">Contact</a></li>
        </ul>
        <button className="btn-order nav-order-btn" onClick={() => handleCheckout('nav')} disabled={isSubmitting}>
          {isSubmitting ? 'Working…' : 'Claim my offer'}
        </button>
      </nav>

      <main className="landing-page reactivation-page">
        {cartError && <p style={{ color: 'red', textAlign: 'center', padding: '1rem' }}>{cartError}</p>}

        {/* Hero — they already tried the food, so reaffirm the result and the offer */}
        <section className="reactivation-hero">
          <h1>Pick up where your dog left off, at 25% off, for good</h1>
          <p className="reactivation-sub">
            You already saw how they did on Little Green Dog. Subscribe now and we'll lock in
            <strong> 25% off every delivery</strong> for as long as you stay subscribed, plus a
            <strong> free 60-pack of compostable poop bags</strong> in your first box.
          </p>

          {/* Objection handling — short, scannable */}
          <ul className="reactivation-reasons">
            <li><strong>No lock-in.</strong> Skip, pause or cancel anytime in a couple of taps.</li>
            <li><strong>Always covered.</strong> The Sensitivity Promise backs every delivery, not just the first.</li>
            <li><strong>Never run out.</strong> The right amount, free shipping (over $55), delivered every 4 weeks.</li>
            <li><strong>Your best rate.</strong> 25% beats our standard 20% subscriber price, locked in.</li>
          </ul>
        </section>

        {/* Variant selector + price */}
        <section className="reactivation-picker" id="subscribe">
          <h2>Choose your bag size</h2>
          <div className="variant-grid">
            {variants.map((v) => {
              const price = reactivationPrice(v);
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
                ? `Subscribe & claim free gift, ${selectedPrice}/delivery`
                : 'Subscribe & claim free gift'}
          </button>
          <p className="reactivation-finefoot">
            25% off every delivery · free poop bags in your first box · cancel anytime
          </p>
        </section>

        <TestimonialsSection />
        <FAQSection />
      </main>

      <Footer />
    </>
  );
}
