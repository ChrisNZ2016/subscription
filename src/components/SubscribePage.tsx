import { useEffect, useMemo } from 'react';
import { useSubscriptionProduct } from '../hooks/useSubscriptionProduct';
import {
  createSubscribeCart,
  createSubscribeCartAndRedirect,
  EARLY_SUBSCRIBER_SELLING_PLAN_ID,
} from '../lib/cart-subscribe';
import { TestimonialsSection } from './TestimonialsSection';
import { FAQSection } from './FAQSection';
import { Footer } from './Footer';
import { SubscriptionBagPicker, useSubscriptionBagSelection } from './SubscriptionBagPicker';
import { trackPageViewed, trackNavAnchorClicked, trackCtaClicked } from '../lib/analytics';
import { scrollToSubscribe } from '../lib/scrollTo';
import { useSectionViewed } from '../hooks/useSectionViewed';
import { useHashScroll } from '../hooks/useHashScroll';
import { VARIANT_SORT_ORDER } from '../lib/feedingGuide';
import { formatMoney } from '../lib/pricing';
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

export function SubscribePage() {
  const { product, loading, error } = useSubscriptionProduct();

  useEffect(() => {
    trackPageViewed();
  }, []);

  useSectionViewed('subscribe', 'picker');
  useSectionViewed('testimonials', 'testimonials');
  useSectionViewed('faq', 'faq');

  const variants = useMemo(() => {
    if (!product) return [];
    return product.variants.nodes
      .filter((v) => subscribePrice(v) !== undefined)
      .sort((a, b) => VARIANT_SORT_ORDER.indexOf(a.title) - VARIANT_SORT_ORDER.indexOf(b.title));
  }, [product]);

  useHashScroll(!loading && !error && !!product && variants.length > 0);

  const bagSelection = useSubscriptionBagSelection({
    variants,
    getPrice: subscribePrice,
    getPriceAmount: subscribePriceAmount,
    createCart: createSubscribeCart,
    createCartAndRedirect: createSubscribeCartAndRedirect,
  });

  const handleNavScroll = () => {
    trackCtaClicked('nav');
    scrollToSubscribe();
  };

  if (!loading && (error || !product || variants.length === 0)) {
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
          <li><a href="#faq" onClick={() => trackNavAnchorClicked({ target: 'faq' })}>FAQ</a></li>
          <li><a href="https://www.littlegreendog.co.nz/pages/contact-us" target="_blank" rel="noopener noreferrer">Contact</a></li>
        </ul>
        <button className="btn-order nav-order-btn" onClick={handleNavScroll}>
          Lock in 25%
        </button>
      </nav>

      <main className="landing-page reactivation-page">
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
            <li><strong>Never run out.</strong> The right amount, Free Shipping (over $50), delivered every 4 weeks.</li>
            <li><strong>Always covered.</strong> The Sensitivity Promise backs every delivery, not just the first.</li>
          </ul>
        </section>

        <SubscriptionBagPicker
          {...bagSelection}
          onCheckout={bagSelection.handleCheckout}
          finePrint="25% off every delivery · Free Shipping (over $50) · cancel anytime"
        />

        <TestimonialsSection />
        <FAQSection />
      </main>

      <Footer />
    </>
  );
}
