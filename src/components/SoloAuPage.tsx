import { useCallback, useEffect, useState } from 'react';
import {
  AU_SAMPLE_COMPARE_AT,
  AU_SAMPLE_DISCOUNT_LABEL,
  AU_SAMPLE_PERCENT_OFF,
  AU_SAMPLE_PRICE,
} from '../lib/au-pricing';
import { trackAuCtaClicked, trackNavAnchorClicked, trackPageViewed } from '../lib/analytics';
import { useSectionViewed } from '../hooks/useSectionViewed';
import { HeroSection } from './HeroSection';
import { BenefitsBar } from './BenefitsBar';
import { WhyYoullLoveIt } from './WhyYoullLoveIt';
import { ProductTabs } from './ProductTabs';
import { TestimonialsSection } from './TestimonialsSection';
import { SubscriptionPricingSectionAu } from './SubscriptionPricingSectionAu';
import { SubscriptionPricingTableAu } from './SubscriptionPricingTableAu';
import { FAQSection } from './FAQSection';
import { FAQCTA } from './FAQCTA';
import { Footer } from './Footer';
import { StickyCTA } from './StickyCTA';

interface SoloAuPageProps {
  /** Hands control to the sold-out page. Tracking happens here, before the hop. */
  onSoldOut: () => void;
}

/**
 * Australian demand test landing page.
 *
 * Deliberately the same page as the NZ `/solo` funnel, with AUD pricing and no
 * Shopify: every CTA lands on the sold-out waitlist page instead of a cart. The
 * point is to read conversion rate off paid AU traffic without holding stock,
 * so the CTA click is the event the campaigns optimise for.
 */
export function SoloAuPage({ onSoldOut }: SoloAuPageProps) {
  const [activeProductTab, setActiveProductTab] = useState<'info' | 'ingredients'>('info');

  useEffect(() => {
    trackPageViewed();
  }, []);

  useSectionViewed('product-tabs', 'product-info');
  useSectionViewed('subscription-pricing', 'subscription-pricing');
  useSectionViewed('testimonials', 'testimonials');
  useSectionViewed('faq', 'faq');

  const handleGetStarted = useCallback(
    (location: 'hero' | 'nav' | 'sticky' | 'why-you-love-it' | 'faq' = 'hero') => {
      trackAuCtaClicked(location);
      onSoldOut();
    },
    [onSoldOut],
  );

  const showIngredients = useCallback(() => {
    trackNavAnchorClicked({ target: 'ingredients' });
    setActiveProductTab('ingredients');
    document.getElementById('product-tabs')?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const heroTrustBadges: [string, string, string] = [
    '✓ Delivered in 1–3 days',
    `✓ ${AU_SAMPLE_DISCOUNT_LABEL} your first box`,
    '✓ Cancel anytime',
  ];

  return (
    <>
      <header className="announcement-bar">
        <p>
          🛡️ <strong>100% money-back guarantee</strong>, full refund if it&apos;s not right for your
          dog
        </p>
      </header>
      <StickyCTA
        onOrderNow={() => handleGetStarted('sticky')}
        samplePrice={AU_SAMPLE_PRICE}
        comparePrice={AU_SAMPLE_COMPARE_AT}
      />

      <nav className="site-nav">
        <a href="https://www.littlegreendog.co.nz" className="nav-logo">
          <img src="/logo.png" alt="Little Green Dog" className="nav-logo-img" />
        </a>
        <ul className="nav-links">
          <li>
            <button className="nav-link-btn" onClick={showIngredients}>
              Ingredients
            </button>
          </li>
          <li><a href="#faq">FAQ</a></li>
          <li>
            <a
              href="https://www.littlegreendog.co.nz/pages/contact-us"
              target="_blank"
              rel="noopener noreferrer"
            >
              Contact
            </a>
          </li>
        </ul>
        <button className="btn-order nav-order-btn" onClick={() => handleGetStarted('nav')}>
          Order Now
        </button>
      </nav>

      <main className="landing-page">
        <HeroSection
          onGetStarted={() => handleGetStarted('hero')}
          onViewIngredients={showIngredients}
          samplePrice={AU_SAMPLE_PRICE}
          trustBadges={heroTrustBadges}
        />
        <BenefitsBar discountPercent={AU_SAMPLE_PERCENT_OFF} />
        <ProductTabs activeTab={activeProductTab} onTabChange={setActiveProductTab} />
        <WhyYoullLoveIt
          onGetStarted={() => handleGetStarted('why-you-love-it')}
          samplePrice={AU_SAMPLE_PRICE}
          discountLabel={AU_SAMPLE_DISCOUNT_LABEL}
        />
        <SubscriptionPricingSectionAu />
        <TestimonialsSection />
        <FAQSection
          additionalFaqs={[
            {
              question: 'What does the subscription cost after my sample?',
              answer: (
                <>
                  <p>
                    Your 2kg sample ships first at {AU_SAMPLE_DISCOUNT_LABEL}. After that, your
                    subscription continues at the price for the bag size you choose, delivered every
                    4 weeks. You can change size, skip, pause, or cancel anytime.
                  </p>
                  <SubscriptionPricingTableAu className="subscription-pricing-table--faq" />
                </>
              ),
            },
          ]}
        >
          <FAQCTA
            onGetStarted={() => handleGetStarted('faq')}
            samplePrice={AU_SAMPLE_PRICE}
            discountLabel={AU_SAMPLE_DISCOUNT_LABEL}
          />
        </FAQSection>
      </main>

      <Footer />
    </>
  );
}
