import { useEffect, useMemo } from 'react';
import { useSubscriptionProduct } from '../hooks/useSubscriptionProduct';
import { findEarlySubscriberAllocation } from '../lib/subscribe-offer-plans';
import { TestimonialsSection } from './TestimonialsSection';
import { FAQSection } from './FAQSection';
import { Footer } from './Footer';
import { SubscribeOfferPicker, useSubscribeOfferSelection } from './SubscribeOfferPicker';
import { trackPageViewed, trackNavAnchorClicked, trackCtaClicked } from '../lib/analytics';
import { scrollToSubscribe } from '../lib/scrollTo';
import { useSectionViewed } from '../hooks/useSectionViewed';
import { useHashScroll } from '../hooks/useHashScroll';
import { VARIANT_SORT_ORDER } from '../lib/feedingGuide';
import {
  BF_KIBBLE_SELLING_PLAN_IDS,
  getGiftSellingPlanId,
  isGiftOfferConfigured,
} from '../lib/black-friday-plans';
import {
  blackFridayCartKey,
  createBlackFridayCart,
  createBlackFridayCartAndRedirect,
} from '../lib/cart-blackfriday';
import type { ProductVariant } from '../types/shopify';
import type { FrequencyMonths } from '../constants/sample-subscribe';

function hasBlackFridayPlan(variant: ProductVariant): boolean {
  return findEarlySubscriberAllocation(variant, 1, BF_KIBBLE_SELLING_PLAN_IDS) !== undefined;
}

/** Pull the delivery interval back out of the kibble plan id the picker chose. */
function frequencyForKibblePlan(sellingPlanId: string): FrequencyMonths | undefined {
  return ([1, 2, 3] as FrequencyMonths[]).find(
    (m) => BF_KIBBLE_SELLING_PLAN_IDS[m] === sellingPlanId,
  );
}

/**
 * The gift has to ride the same interval as the food. Resolve it from the
 * kibble plan rather than from picker state, so the two can never drift apart.
 *
 * Returns undefined rather than throwing: `key` runs inside a useMemo during
 * render, and a throw there takes the whole page down before the not-configured
 * guard below ever gets to run.
 */
function giftPlanFor(kibbleSellingPlanId: string): string | undefined {
  const months = frequencyForKibblePlan(kibbleSellingPlanId);
  return months ? getGiftSellingPlanId(months) : undefined;
}

function requireGiftPlan(kibbleSellingPlanId: string): string {
  const giftPlanId = giftPlanFor(kibbleSellingPlanId);
  if (!giftPlanId) throw new Error('Black Friday gift plan is not configured');
  return giftPlanId;
}

const BF_CART = {
  // Empty key disables prefetch, which is correct when there is nothing to sell.
  key: (variantId: string, sellingPlanId: string) => {
    const giftPlanId = giftPlanFor(sellingPlanId);
    return giftPlanId ? blackFridayCartKey(variantId, sellingPlanId, giftPlanId) : '';
  },
  create: (variantId: string, sellingPlanId: string) =>
    createBlackFridayCart(variantId, sellingPlanId, requireGiftPlan(sellingPlanId)),
  createAndRedirect: (
    variantId: string,
    sellingPlanId: string,
    checkoutValue?: number,
    prefetchedCheckoutUrl?: string,
  ) =>
    createBlackFridayCartAndRedirect(
      variantId,
      sellingPlanId,
      requireGiftPlan(sellingPlanId),
      checkoutValue,
      prefetchedCheckoutUrl,
    ),
};

export function BlackFridayPage() {
  const { product, loading, error } = useSubscriptionProduct();
  const giftReady = isGiftOfferConfigured();

  useEffect(() => {
    trackPageViewed();
  }, []);

  useSectionViewed('subscribe', 'picker');
  useSectionViewed('testimonials', 'testimonials');
  useSectionViewed('faq', 'faq');

  const variants = useMemo(() => {
    if (!product) return [];
    return product.variants.nodes
      .filter((variant) => hasBlackFridayPlan(variant))
      .sort((a, b) => VARIANT_SORT_ORDER.indexOf(a.title) - VARIANT_SORT_ORDER.indexOf(b.title));
  }, [product]);

  useHashScroll(!loading && !error && !!product && variants.length > 0 && giftReady);

  const bagSelection = useSubscribeOfferSelection({
    variants,
    planIds: BF_KIBBLE_SELLING_PLAN_IDS,
    cart: BF_CART,
  });

  const handleNavScroll = () => {
    trackCtaClicked('nav');
    scrollToSubscribe();
  };

  // Refuse to sell rather than quietly take a subscription with no gift on it.
  if (!loading && (error || !product || variants.length === 0 || !giftReady)) {
    return (
      <div className="error">
        <h2>This offer isn&apos;t live yet</h2>
        <p>
          {!giftReady
            ? 'The Black Friday offer is not switched on. Please check back shortly.'
            : (error ?? 'This offer is not available right now.')}
        </p>
        <a className="btn-order" href="https://www.littlegreendog.co.nz">
          Visit the store
        </a>
      </div>
    );
  }

  return (
    <>
      <header className="announcement-bar">
        <p>🖤 <strong>Black Friday</strong> · free poop bags in every delivery for 12 months</p>
      </header>

      <nav className="site-nav">
        <a href="https://www.littlegreendog.co.nz" className="nav-logo">
          <img src="/logo.png" alt="Little Green Dog" className="nav-logo-img" />
        </a>
        <ul className="nav-links">
          <li><a href="#faq" onClick={() => trackNavAnchorClicked({ target: 'faq' })}>FAQ</a></li>
          <li><a href="https://www.littlegreendog.co.nz/pages/contact-us" target="_blank" rel="noopener noreferrer">Contact</a></li>
        </ul>
        <button className="btn-order nav-order-btn" onClick={handleNavScroll}>
          Get the offer
        </button>
      </nav>

      <main className="landing-page reactivation-page black-friday-page">
        <div className="bf-offer-layout">
          <section className="reactivation-hero">
            <h1>Free poop bags for a year</h1>
            <p className="reactivation-sub">
              Subscribe to our sensitive dog food and we&apos;ll put a 60-pack of our compostable poop bags in
              <strong> every delivery for the next 12 months</strong>, free. When you subscribe you get
               20% off the standard price of the food.
            </p>

            <ul className="reactivation-reasons">
              <li><strong>Free bags, every delivery.</strong> A 60-pack rides along with the food for 12 months. They&apos;re the home-compostable ones, not the misleading kind.</li>
              <li><strong>20% off the dog food.</strong> For as long as you stay subscribed, not just the first order.</li>
              <li><strong>No lock-in.</strong> Skip, pause or cancel anytime in a couple of taps.</li>
            </ul>
          </section>

          <SubscribeOfferPicker
            weightRangeId={bagSelection.weightRangeId}
            bagSizeKg={bagSelection.bagSizeKg}
            frequencyMonths={bagSelection.frequencyMonths}
            availableSizes={bagSelection.availableSizes}
            availableFrequencies={bagSelection.availableFrequencies}
            pricing={bagSelection.pricing}
            isSubmitting={bagSelection.isSubmitting}
            cartError={bagSelection.cartError}
            onWeightRangeChange={bagSelection.handleWeightRangeChange}
            onBagSizeChange={bagSelection.handleBagSizeChange}
            onFrequencyChange={bagSelection.handleFrequencyChange}
            onCheckout={bagSelection.handleCheckout}
            ctaLabel="Buy now and get free poop bags for 12 months"
            finePrint="20% off every delivery · free poop bags for 12 months · cancel anytime"
          />
        </div>

        <TestimonialsSection />
        <FAQSection />
      </main>

      <Footer />
    </>
  );
}
