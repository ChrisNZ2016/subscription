import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useSampleProduct } from '../hooks/useSampleProduct';
import { createSoloCart, createSoloCartAndRedirect } from '../lib/cart-solo';
import { formatMoney } from '../lib/pricing';
import { resolveSoloPriceTier } from '../lib/solo-pricing';
import { HeroSection } from './HeroSection';
import { BenefitsBar } from './BenefitsBar';
import { WhyYoullLoveIt } from './WhyYoullLoveIt';
import { ProductTabs } from './ProductTabs';
import { TestimonialsSection } from './TestimonialsSection';
import { SubscriptionPricingSection } from './SubscriptionPricingSection';
import { SubscriptionPricingTable } from './SubscriptionPricingTable';
import { FAQSection } from './FAQSection';
import { FAQCTA } from './FAQCTA';
import { Footer } from './Footer';
import { StickyCTA } from './StickyCTA';
import { trackPageViewed, trackCtaClicked, trackCheckoutStarted, trackNavAnchorClicked } from '../lib/analytics';
import { shopifyGidToContentId, trackMetaViewContent } from '../lib/meta-pixel';
import { useSectionViewed } from '../hooks/useSectionViewed';

export function SoloPage() {
  const { product, loading, error } = useSampleProduct();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cartError, setCartError] = useState<string | null>(null);
  const [activeProductTab, setActiveProductTab] = useState<'info' | 'ingredients'>('info');
  // Pre-created cart checkout URL so the CTA can redirect to Shopify instantly.
  const prefetchedCheckoutUrl = useRef<string | null>(null);

  const sampleVariant = product?.variants.nodes[0];
  const sampleAllocation = sampleVariant?.sellingPlanAllocations.nodes[0];

  // UTM-driven price tier. When set, both the displayed price and the variant
  // added to the cart switch to the tier's dedicated variant, so checkout
  // charges the tier price. Null → base sample variant / pricing.
  const priceTier = useMemo(() => resolveSoloPriceTier(), []);

  // The variant actually purchased: the tier's variant when active, else the
  // default sample variant.
  const cartVariantId = priceTier?.variantId ?? sampleVariant?.id;

  // Money object the page charges/displays: tier price wins, else selling-plan
  // allocation price, else the plain variant price.
  const activePriceObj = priceTier
    ? priceTier.price
    : sampleAllocation
      ? sampleAllocation.priceAdjustments[0].perDeliveryPrice
      : sampleVariant?.price;

  const samplePrice = activePriceObj ? formatMoney(activePriceObj) : undefined;

  // Discount copy reflects the active tier (50% off / 30% off); base keeps the
  // existing "50% off" messaging.
  const discountLabel = priceTier ? `${priceTier.percentOff}% off` : '50% off';
  const heroTrustBadges: [string, string, string] = [
    '✓ Delivered in 1–3 days',
    `✓ ${discountLabel} your first box`,
    '✓ Cancel anytime',
  ];

  useEffect(() => {
    trackPageViewed();
  }, []);

  useSectionViewed('product-tabs', 'product-info');
  useSectionViewed('subscription-pricing', 'subscription-pricing');
  useSectionViewed('testimonials', 'testimonials');
  useSectionViewed('faq', 'faq');

  useEffect(() => {
    if (!cartVariantId) return;
    trackMetaViewContent({
      contentIds: [shopifyGidToContentId(cartVariantId)],
      value: activePriceObj ? parseFloat(activePriceObj.amount) : undefined,
      currency: activePriceObj?.currencyCode ?? 'NZD',
    });
  }, [cartVariantId, activePriceObj]);

  // Warm the cart as soon as the variant is known so the checkout redirect is instant.
  useEffect(() => {
    if (!cartVariantId || prefetchedCheckoutUrl.current) return;
    createSoloCart(cartVariantId)
      .then((url) => { prefetchedCheckoutUrl.current = url; })
      .catch(() => { /* fall back to creating the cart at click time */ });
  }, [cartVariantId]);

  const comparePrice = priceTier?.compareAtPrice
    ? formatMoney(priceTier.compareAtPrice)
    : sampleVariant?.compareAtPrice
      ? formatMoney(sampleVariant.compareAtPrice)
      : undefined;

  const handleCheckout = useCallback(async () => {
    if (!cartVariantId) return;
    setIsSubmitting(true);
    setCartError(null);
    try {
      const checkoutValue = activePriceObj ? parseFloat(activePriceObj.amount) : undefined;
      trackCheckoutStarted({
        samplePrice: samplePrice ?? '',
        bagWeight: 2,
        frequencyWeeks: 0,
        addonCount: 0,
        contentIds: [shopifyGidToContentId(cartVariantId)],
        value: checkoutValue,
      });
      await createSoloCartAndRedirect(
        cartVariantId,
        checkoutValue,
        prefetchedCheckoutUrl.current ?? undefined,
      );
    } catch (err) {
      setCartError(err instanceof Error ? err.message : 'Failed to create cart');
      setIsSubmitting(false);
    }
  }, [cartVariantId, samplePrice, activePriceObj]);

  const handleGetStarted = useCallback((location: 'hero' | 'nav' | 'sticky' | 'why-you-love-it' | 'faq' = 'hero') => {
    trackCtaClicked(location);
    handleCheckout();
  }, [handleCheckout]);

  // Only block the page on a hard error. While the product is still loading we
  // render the full page (hero, copy, etc.) immediately — the static hero is the
  // LCP element and must not wait on the Shopify Storefront fetch. Price-dependent
  // bits (CTA price) fill in once the product resolves.
  if (!loading && (error || !product)) {
    return (
      <div className="error">
        <h2>Something went wrong</h2>
        <p>{error}</p>
        <button className="btn-order" onClick={() => window.location.reload()}>Try Again</button>
      </div>
    );
  }

  return (
    <>
      <header className="announcement-bar">
        <p>🛡️ <strong>100% money-back guarantee</strong>, full refund if it's not right for your dog</p>
      </header>
      <StickyCTA onOrderNow={() => handleGetStarted('sticky')} samplePrice={samplePrice} comparePrice={comparePrice} />

      <nav className="site-nav">
        <a href="https://www.littlegreendog.co.nz" className="nav-logo">
          <img src="/logo.png" alt="Little Green Dog" className="nav-logo-img" />
        </a>
        <ul className="nav-links">
          <li>
            <button
              className="nav-link-btn"
              onClick={() => {
                trackNavAnchorClicked({ target: 'ingredients' });
                setActiveProductTab('ingredients');
                document.getElementById('product-tabs')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Ingredients
            </button>
          </li>
          <li><a href="#faq">FAQ</a></li>
          <li><a href="https://www.littlegreendog.co.nz/pages/contact-us" target="_blank" rel="noopener noreferrer">Contact</a></li>
        </ul>
        <button className="btn-order nav-order-btn" onClick={() => handleGetStarted('nav')} disabled={isSubmitting}>
          Order Now
        </button>
      </nav>

      <main className="landing-page">
        {cartError && <p style={{ color: 'red', textAlign: 'center', padding: '1rem' }}>{cartError}</p>}
        <HeroSection
          onGetStarted={() => handleGetStarted('hero')}
          onViewIngredients={() => {
            trackNavAnchorClicked({ target: 'ingredients' });
            setActiveProductTab('ingredients');
            document.getElementById('product-tabs')?.scrollIntoView({ behavior: 'smooth' });
          }}
          samplePrice={samplePrice}
          trustBadges={heroTrustBadges}
        />
        <BenefitsBar discountPercent={priceTier?.percentOff ?? 50} />
        <ProductTabs activeTab={activeProductTab} onTabChange={setActiveProductTab} />
        <WhyYoullLoveIt onGetStarted={() => handleGetStarted('why-you-love-it')} samplePrice={samplePrice} discountLabel={discountLabel} />
        <SubscriptionPricingSection discountLabel={discountLabel} />
        <TestimonialsSection />
        <FAQSection
          additionalFaqs={[
            {
              question: 'What does the subscription cost after my sample?',
              answer: (
                <>
                  <p>
                    Your 2kg sample ships first at {discountLabel}. After that, your subscription
                    continues at the price for the bag size you choose, delivered every 4 weeks.
                    You can change size, skip, pause, or cancel anytime.
                  </p>
                  <SubscriptionPricingTable className="subscription-pricing-table--faq" />
                </>
              ),
            },
          ]}
        >
          <FAQCTA onGetStarted={() => handleGetStarted('faq')} samplePrice={samplePrice} discountLabel={discountLabel} />
        </FAQSection>
      </main>

      <Footer />
    </>
  );
}
