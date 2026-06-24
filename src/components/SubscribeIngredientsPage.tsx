import { useEffect, useMemo } from 'react';
import { useSubscriptionProduct } from '../hooks/useSubscriptionProduct';
import {
  createSubscribeCart,
  createSubscribeCartAndRedirect,
  EARLY_SUBSCRIBER_SELLING_PLAN_ID,
} from '../lib/cart-subscribe';
import { WhyYoullLoveIt } from './WhyYoullLoveIt';
import { ProductTabs } from './ProductTabs';
import { TestimonialsSection } from './TestimonialsSection';
import { FAQSection } from './FAQSection';
import { Footer } from './Footer';
import { SubscriptionBagPicker, useSubscriptionBagSelection } from './SubscriptionBagPicker';
import { trackPageViewed, trackCtaClicked, trackNavAnchorClicked } from '../lib/analytics';
import { scrollToSubscribe } from '../lib/scrollTo';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
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

export function SubscribeIngredientsPage() {
  const { product, loading, error } = useSubscriptionProduct();

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
          <li><a href="#benefits" onClick={() => trackNavAnchorClicked({ target: 'benefits' })}>Benefits</a></li>
          <li><a href="#ingredients" onClick={() => trackNavAnchorClicked({ target: 'ingredients' })}>Ingredients</a></li>
          <li><a href="#faq" onClick={() => trackNavAnchorClicked({ target: 'faq' })}>FAQ</a></li>
          <li><a href="https://www.littlegreendog.co.nz/pages/contact-us" target="_blank" rel="noopener noreferrer">Contact</a></li>
        </ul>
        <button className="btn-order nav-order-btn" onClick={handleNavScroll}>
          Lock in 25%
        </button>
      </nav>

      <main className="landing-page reactivation-page subscribe-ingredients-page">
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
              scrollToSubscribe();
            }}
          />
        </div>

        <div id="ingredients">
          <ProductTabs activeTab="ingredients" />
        </div>

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
