import { useCallback, useEffect, useState } from 'react';
import { HeroSection } from './HeroSection';
import { BenefitsBar } from './BenefitsBar';
import { WhyYoullLoveIt } from './WhyYoullLoveIt';
import { ProductTabs } from './ProductTabs';
import { TestimonialsSection } from './TestimonialsSection';
import { FAQSection } from './FAQSection';
import { FAQCTA } from './FAQCTA';
import { Footer } from './Footer';
import { StickyCTA } from './StickyCTA';
import { SampleSubscribePicker, useSampleSubscribeSelection } from './SampleSubscribePicker';
import { SubscriptionPricingTable } from './SubscriptionPricingTable';
import { trackPageViewed, trackNavAnchorClicked } from '../lib/analytics';
import { useSectionViewed } from '../hooks/useSectionViewed';
import { SAMPLE_PRICE } from '../constants/sample-subscribe';

const SAMPLE_PRICE_LABEL = `$${SAMPLE_PRICE.toFixed(2)}`;

export function SampleSubscribePage() {
  const [activeProductTab, setActiveProductTab] = useState<'info' | 'ingredients'>('info');
  const picker = useSampleSubscribeSelection();

  useEffect(() => {
    trackPageViewed();
  }, []);

  useSectionViewed('sample-subscribe', 'sample-subscribe-picker');
  useSectionViewed('product-tabs', 'product-info');
  useSectionViewed('testimonials', 'testimonials');
  useSectionViewed('faq', 'faq');

  const handleGetStarted = useCallback((location: 'hero' | 'nav' | 'sticky' | 'why-you-love-it' | 'faq') => {
    if (location === 'hero' || location === 'nav' || location === 'sticky') {
      document.getElementById('sample-subscribe')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    picker.handleCheckout(location);
  }, [picker]);

  return (
    <>
      <header className="announcement-bar">
        <p>
          🛡️ <strong>100% money-back guarantee</strong>, full refund if it&apos;s not right for your dog
        </p>
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
          <li>
            <a href="https://www.littlegreendog.co.nz/pages/contact-us" target="_blank" rel="noopener noreferrer">
              Contact
            </a>
          </li>
        </ul>
        <button
          className="btn-order nav-order-btn"
          onClick={() => handleGetStarted('nav')}
        >
          Order sample
        </button>
      </nav>

      <main className="landing-page">
        <HeroSection
          onGetStarted={() => handleGetStarted('hero')}
          onViewIngredients={() => {
            trackNavAnchorClicked({ target: 'ingredients' });
            setActiveProductTab('ingredients');
            document.getElementById('product-tabs')?.scrollIntoView({ behavior: 'smooth' });
          }}
          samplePrice={SAMPLE_PRICE_LABEL}
          trustBadges={[
            '✓ Delivered in 1–3 days',
            `✓ ${SAMPLE_PRICE_LABEL} sample, then 25% off`,
            '✓ Skip, pause, or cancel anytime',
          ]}
        />
        <BenefitsBar />
        <ProductTabs activeTab={activeProductTab} onTabChange={setActiveProductTab} />
        <WhyYoullLoveIt
          onGetStarted={() => handleGetStarted('why-you-love-it')}
          samplePrice={SAMPLE_PRICE_LABEL}
        />
        <TestimonialsSection />
        <SampleSubscribePicker
          weightRangeId={picker.weightRangeId}
          bagSizeKg={picker.bagSizeKg}
          frequencyMonths={picker.frequencyMonths}
          recurringPrice={picker.recurringPrice}
          isSubmitting={picker.isSubmitting}
          cartError={picker.cartError}
          onWeightRangeChange={picker.handleWeightRangeChange}
          onBagSizeChange={picker.handleBagSizeChange}
          onFrequencyChange={picker.handleFrequencyChange}
          onCheckout={() => picker.handleCheckout('picker')}
        />
        <FAQSection
          additionalFaqs={[
            {
              question: 'What happens after I order my sample?',
              answer: (
                <>
                  <p>
                    You pay {SAMPLE_PRICE_LABEL} today for a size-matched 2kg–8kg sample (based on the
                    bag size you choose). Your subscription for the full bag at 25% off begins one
                    billing cycle later — checkout shows the exact first payment and recurring price.
                    Change size, skip, pause, or cancel anytime.
                  </p>
                  <SubscriptionPricingTable className="subscription-pricing-table--faq" />
                </>
              ),
            },
          ]}
        >
          <FAQCTA onGetStarted={() => handleGetStarted('faq')} samplePrice={SAMPLE_PRICE_LABEL} />
        </FAQSection>
      </main>

      <Footer />
      <StickyCTA
        onOrderNow={() => handleGetStarted('sticky')}
        samplePrice={SAMPLE_PRICE_LABEL}
      />
    </>
  );
}
