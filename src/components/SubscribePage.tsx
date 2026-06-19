import { useState, useCallback, useEffect, useMemo } from 'react';
import { useSubscriptionProduct } from '../hooks/useSubscriptionProduct';
import {
  createSubscribeCartAndRedirect,
  EARLY_SUBSCRIBER_SELLING_PLAN_ID,
} from '../lib/cart-subscribe';
import { formatMoney } from '../lib/pricing';
import { TestimonialsSection } from './TestimonialsSection';
import { FAQSection } from './FAQSection';
import { Footer } from './Footer';
import { trackPageViewed, trackCtaClicked, trackCheckoutStarted } from '../lib/analytics';
import { shopifyGidToContentId, trackMetaViewContent } from '../lib/meta-pixel';
import type { ProductVariant } from '../types/shopify';

/** Per-delivery early-subscriber price for a variant, or undefined if not allocated. */
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

export function SubscribePage() {
  const { product, loading, error } = useSubscriptionProduct();
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cartError, setCartError] = useState<string | null>(null);

  useEffect(() => {
    trackPageViewed();
  }, []);

  const variants = useMemo(() => {
    if (!product) return [];
    const order = ['2kg', '4kg', '6kg', '8kg'];
    return product.variants.nodes
      .filter((v) => subscribePrice(v) !== undefined)
      .sort((a, b) => order.indexOf(a.title) - order.indexOf(b.title));
  }, [product]);

  useEffect(() => {
    if (!selectedVariantId && variants.length > 0) {
      const twoKg = variants.find((v) => v.title === '2kg') ?? variants[0];
      setSelectedVariantId(twoKg.id);
    }
  }, [variants, selectedVariantId]);

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
    async (location: 'hero' | 'sticky' | 'faq') => {
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
          <li><a href="#faq">FAQ</a></li>
          <li><a href="https://www.littlegreendog.co.nz/pages/contact-us" target="_blank" rel="noopener noreferrer">Contact</a></li>
        </ul>
        <button className="btn-order nav-order-btn" onClick={() => handleCheckout('hero')} disabled={isSubmitting}>
          {isSubmitting ? 'Working…' : 'Lock in 25%'}
        </button>
      </nav>

      <main className="landing-page reactivation-page">
        {cartError && <p style={{ color: 'red', textAlign: 'center', padding: '1rem' }}>{cartError}</p>}

        <section className="reactivation-hero">
          <h1>Keep it going, and lock in 25% off, for good</h1>
          <p className="reactivation-sub">
            Your dog's settling in. Subscribe before the offer ends and you'll
            <strong> lock in 25% off every delivery</strong> for as long as you stay subscribed,
            that's better than our standard 20% subscriber rate, yours to keep.
          </p>

          <ul className="reactivation-reasons">
            <li><strong>Your best rate, locked in.</strong> 25% beats the standard 20%, for every future delivery.</li>
            <li><strong>No lock-in.</strong> Skip, pause or cancel anytime in a couple of taps.</li>
            <li><strong>Never run out.</strong> The right amount, free shipping (over $55), delivered every 4 weeks.</li>
            <li><strong>Always covered.</strong> The Sensitivity Promise backs every delivery, not just the first.</li>
          </ul>
        </section>

        <section className="reactivation-picker">
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
                  onClick={() => setSelectedVariantId(v.id)}
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
            onClick={() => handleCheckout('hero')}
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
