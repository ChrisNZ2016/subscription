import { useEffect, useMemo } from 'react';
import { useSubscriptionProduct } from '../hooks/useSubscriptionProduct';
import {
  createReactivationCart,
  createReactivationCartAndRedirect,
  REACTIVATION_SELLING_PLAN_ID,
} from '../lib/cart-reactivation';
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

  useEffect(() => {
    trackPageViewed();
  }, []);

  useSectionViewed('subscribe', 'picker');
  useSectionViewed('testimonials', 'testimonials');
  useSectionViewed('faq', 'faq');

  const variants = useMemo(() => {
    if (!product) return [];
    return product.variants.nodes
      .filter((v) => reactivationPrice(v) !== undefined)
      .sort((a, b) => VARIANT_SORT_ORDER.indexOf(a.title) - VARIANT_SORT_ORDER.indexOf(b.title));
  }, [product]);

  useHashScroll(!loading && !error && !!product && variants.length > 0);

  const bagSelection = useSubscriptionBagSelection({
    variants,
    getPrice: reactivationPrice,
    getPriceAmount: reactivationPriceAmount,
    createCart: createReactivationCart,
    createCartAndRedirect: createReactivationCartAndRedirect,
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
        <button className="btn-order nav-order-btn" onClick={handleNavScroll}>
          Claim my offer
        </button>
      </nav>

      <main className="landing-page reactivation-page">
        <section className="reactivation-hero">
          <h1>Pick up where your dog left off, at 25% off, for good</h1>
          <p className="reactivation-sub">
            You already saw how they did on Little Green Dog. Subscribe now and we'll lock in
            <strong> 25% off every delivery</strong> for as long as you stay subscribed, plus a
            <strong> free 60-pack of compostable poop bags</strong> in your first box.
          </p>

          <ul className="reactivation-reasons">
            <li><strong>No lock-in.</strong> Skip, pause or cancel anytime in a couple of taps.</li>
            <li><strong>Always covered.</strong> The Sensitivity Promise backs every delivery, not just the first.</li>
            <li><strong>Never run out.</strong> The right amount, Free Shipping (over $50), delivered every 4 weeks.</li>
            <li><strong>Your best rate.</strong> 25% beats our standard 20% subscriber price, locked in.</li>
          </ul>
        </section>

        <SubscriptionBagPicker
          {...bagSelection}
          onCheckout={bagSelection.handleCheckout}
          finePrint="25% off every delivery · free poop bags in your first box · cancel anytime"
        />

        <TestimonialsSection />
        <FAQSection />
      </main>

      <Footer />
    </>
  );
}
