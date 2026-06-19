import { useState, useCallback, useEffect } from 'react';
import { useSampleProduct } from '../hooks/useSampleProduct';
import { createSoloCartAndRedirect } from '../lib/cart-solo';
import { formatMoney } from '../lib/pricing';
import { HeroSection } from './HeroSection';
import { BenefitsBar } from './BenefitsBar';
import { WhyYoullLoveIt } from './WhyYoullLoveIt';
import { ProductTabs } from './ProductTabs';
import { TestimonialsSection } from './TestimonialsSection';
import { FAQSection } from './FAQSection';
import { FAQCTA } from './FAQCTA';
import { Footer } from './Footer';
import { StickyCTA } from './StickyCTA';
import { trackPageViewed, trackCtaClicked, trackCheckoutStarted } from '../lib/analytics';

export function SoloPage() {
  const { product, loading, error } = useSampleProduct();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cartError, setCartError] = useState<string | null>(null);
  const [activeProductTab, setActiveProductTab] = useState<'info' | 'ingredients'>('info');

  useEffect(() => {
    trackPageViewed();
  }, []);

  const sampleVariant = product?.variants.nodes[0];
  const sampleAllocation = sampleVariant?.sellingPlanAllocations.nodes[0];
  const samplePrice = sampleAllocation
    ? formatMoney(sampleAllocation.priceAdjustments[0].perDeliveryPrice)
    : sampleVariant?.price
      ? formatMoney(sampleVariant.price)
      : undefined;

  const comparePrice = sampleVariant?.compareAtPrice
    ? formatMoney(sampleVariant.compareAtPrice)
    : undefined;

  const handleCheckout = useCallback(async () => {
    if (!sampleVariant) return;
    setIsSubmitting(true);
    setCartError(null);
    try {
      trackCheckoutStarted({ samplePrice: samplePrice ?? '', bagWeight: 2, frequencyWeeks: 0, addonCount: 0 });
      await createSoloCartAndRedirect(sampleVariant.id);
    } catch (err) {
      setCartError(err instanceof Error ? err.message : 'Failed to create cart');
      setIsSubmitting(false);
    }
  }, [sampleVariant, samplePrice]);

  const handleGetStarted = useCallback((location: 'hero' | 'nav' | 'sticky' | 'why-you-love-it' | 'faq' = 'hero') => {
    trackCtaClicked(location);
    handleCheckout();
  }, [handleCheckout]);

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  if (error || !product) {
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
            setActiveProductTab('ingredients');
            document.getElementById('product-tabs')?.scrollIntoView({ behavior: 'smooth' });
          }}
          samplePrice={samplePrice}
        />
        <BenefitsBar />
        <ProductTabs activeTab={activeProductTab} onTabChange={setActiveProductTab} />
        <WhyYoullLoveIt onGetStarted={() => handleGetStarted('why-you-love-it')} samplePrice={samplePrice} />
        <TestimonialsSection />
        <FAQSection>
          <FAQCTA onGetStarted={() => handleGetStarted('faq')} samplePrice={samplePrice} />
        </FAQSection>
      </main>

      <Footer />
      <StickyCTA onOrderNow={() => handleGetStarted('sticky')} samplePrice={samplePrice} comparePrice={comparePrice} />
    </>
  );
}
