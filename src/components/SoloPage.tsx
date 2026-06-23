import { useState, useCallback, useEffect, useRef } from 'react';
import { useSampleProduct } from '../hooks/useSampleProduct';
import { createSoloCart, createSoloCartAndRedirect } from '../lib/cart-solo';
import { formatMoney } from '../lib/pricing';
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
  const samplePrice = sampleAllocation
    ? formatMoney(sampleAllocation.priceAdjustments[0].perDeliveryPrice)
    : sampleVariant?.price
      ? formatMoney(sampleVariant.price)
      : undefined;

  useEffect(() => {
    trackPageViewed();
  }, []);

  useSectionViewed('product-tabs', 'product-info');
  useSectionViewed('subscription-pricing', 'subscription-pricing');
  useSectionViewed('testimonials', 'testimonials');
  useSectionViewed('faq', 'faq');

  useEffect(() => {
    if (!sampleVariant) return;
    const priceObj = sampleAllocation
      ? sampleAllocation.priceAdjustments[0].perDeliveryPrice
      : sampleVariant.price;
    trackMetaViewContent({
      contentIds: [shopifyGidToContentId(sampleVariant.id)],
      value: priceObj ? parseFloat(priceObj.amount) : undefined,
      currency: priceObj?.currencyCode ?? 'NZD',
    });
  }, [sampleVariant, sampleAllocation]);

  // Warm the cart as soon as the variant is known so the checkout redirect is instant.
  useEffect(() => {
    if (!sampleVariant || prefetchedCheckoutUrl.current) return;
    createSoloCart(sampleVariant.id)
      .then((url) => { prefetchedCheckoutUrl.current = url; })
      .catch(() => { /* fall back to creating the cart at click time */ });
  }, [sampleVariant]);

  const comparePrice = sampleVariant?.compareAtPrice
    ? formatMoney(sampleVariant.compareAtPrice)
    : undefined;

  const handleCheckout = useCallback(async () => {
    if (!sampleVariant) return;
    setIsSubmitting(true);
    setCartError(null);
    try {
      const priceObj = sampleAllocation
        ? sampleAllocation.priceAdjustments[0].perDeliveryPrice
        : sampleVariant.price;
      const checkoutValue = priceObj ? parseFloat(priceObj.amount) : undefined;
      trackCheckoutStarted({
        samplePrice: samplePrice ?? '',
        bagWeight: 2,
        frequencyWeeks: 0,
        addonCount: 0,
        contentIds: [shopifyGidToContentId(sampleVariant.id)],
        value: checkoutValue,
      });
      await createSoloCartAndRedirect(sampleVariant.id, checkoutValue, prefetchedCheckoutUrl.current ?? undefined);
    } catch (err) {
      setCartError(err instanceof Error ? err.message : 'Failed to create cart');
      setIsSubmitting(false);
    }
  }, [sampleVariant, samplePrice]);

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

      <nav className="site-nav">
        <a href="/" className="nav-logo">
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
        />
        <BenefitsBar />
        <ProductTabs activeTab={activeProductTab} onTabChange={setActiveProductTab} />
        <WhyYoullLoveIt onGetStarted={() => handleGetStarted('why-you-love-it')} samplePrice={samplePrice} />
        <SubscriptionPricingSection />
        <TestimonialsSection />
        <FAQSection
          additionalFaqs={[
            {
              question: 'What does the subscription cost after my sample?',
              answer: (
                <>
                  <p>
                    Your 2kg sample ships first at 50% off. After that, your subscription
                    continues at the price for the bag size you choose, delivered every 4 weeks.
                    You can change size, skip, pause, or cancel anytime.
                  </p>
                  <SubscriptionPricingTable className="subscription-pricing-table--faq" />
                </>
              ),
            },
          ]}
        >
          <FAQCTA onGetStarted={() => handleGetStarted('faq')} samplePrice={samplePrice} />
        </FAQSection>
      </main>

      <Footer />
      <StickyCTA onOrderNow={() => handleGetStarted('sticky')} samplePrice={samplePrice} comparePrice={comparePrice} />
    </>
  );
}
