import { useState, useCallback, useEffect } from 'react';
import { useProducts } from '../hooks/useProducts';
import { useCart } from '../hooks/useCart';
import { DOG_SIZE_PRESETS } from '../constants/dogSizes';
import { HeroSection } from './HeroSection';
import { BenefitsBar } from './BenefitsBar';
import { WhyYoullLoveIt } from './WhyYoullLoveIt';
import { ProductTabs } from './ProductTabs';
import { TestimonialsSection } from './TestimonialsSection';
import { DogSizeCalculator } from './DogSizeCalculator';
import { AddonsStep } from './AddonsStep';
import { HowItWorks } from './HowItWorks';
import { SubscriptionExplainer } from './SubscriptionExplainer';
import { OrderSummary } from './OrderSummary';
import { FAQSection } from './FAQSection';
import { Footer } from './Footer';
import { StickyCTA } from './StickyCTA';
import type { Product } from '../types/shopify';
import type { AddonSelection } from '../lib/cart';
import {
  trackPageViewed,
  trackCtaClicked,
  trackDogSizeSelected,
  trackPlanCustomized,
  trackAddonsStepViewed,
  trackAddonAdded,
  trackAddonRemoved,
  trackOrderSummaryViewed,
  trackCheckoutStarted,
} from '../lib/analytics';

type FunnelStep = 'hero' | 'size' | 'addons' | 'summary';
type ProductTab = 'info' | 'benefits' | 'ingredients';

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

function findSampleSellingPlan(product: Product): string | null {
  for (const group of product.sellingPlanGroups.nodes) {
    for (const plan of group.sellingPlans.nodes) {
      for (const adj of plan.priceAdjustments) {
        if (
          adj.adjustmentValue.__typename === 'SellingPlanPercentagePriceAdjustment' &&
          adj.adjustmentValue.adjustmentPercentage === 50
        ) {
          return plan.id;
        }
      }
    }
  }
  const allocation = product.variants.nodes[0]?.sellingPlanAllocations.nodes[0];
  return allocation?.sellingPlan.id ?? null;
}

export function LandingPage() {
  const { sampleProduct, addonProducts, loading, error: loadError } = useProducts();
  const { submit, isSubmitting, error: cartError } = useCart();

  const [step, setStep] = useState<FunnelStep>('hero');
  const [selectedSize, setSelectedSize] = useState<number | null>(null);
  const [bagWeight, setBagWeight] = useState(2);
  const [frequencyWeeks] = useState(4); // Fixed at 4 weeks
  const [selectedAddons, setSelectedAddons] = useState<AddonSelection[]>([]);
  const [activeProductTab, setActiveProductTab] = useState<ProductTab>('info');

  // Track page view once on mount
  useEffect(() => {
    trackPageViewed();
  }, []);

  const handleGetStarted = useCallback(() => {
    trackCtaClicked('hero');
    setStep('size');
    setTimeout(() => scrollToId('dog-size'), 100);
  }, []);

  const handleSelectSize = useCallback((index: number) => {
    setSelectedSize(index);
    const preset = DOG_SIZE_PRESETS[index];
    setBagWeight(preset.bagWeight);
    trackDogSizeSelected({
      size: preset.label,
      bagWeight: preset.bagWeight,
      frequencyWeeks: 4,
    });
  }, []);

  const handleBagWeightChange = useCallback(
    (weight: number) => {
      setBagWeight(weight);
      trackPlanCustomized({ field: 'bagWeight', bagWeight: weight, frequencyWeeks });
    },
    [frequencyWeeks],
  );

  const handleSizeContinue = useCallback(() => {
    if (addonProducts.length > 0) {
      setStep('addons');
      trackAddonsStepViewed();
      setTimeout(() => scrollToId('addons'), 100);
    } else {
      setStep('summary');
      trackOrderSummaryViewed({ bagWeight, frequencyWeeks, addonCount: 0 });
      setTimeout(() => scrollToId('summary'), 100);
    }
  }, [addonProducts.length, bagWeight, frequencyWeeks]);

  const handleToggleAddon = useCallback((product: Product) => {
    const variant = product.variants.nodes[0];
    if (!variant) return;

    setSelectedAddons((prev) => {
      const exists = prev.find((a) => a.variantId === variant.id);
      if (exists) {
        trackAddonRemoved({ productTitle: product.title });
        return prev.filter((a) => a.variantId !== variant.id);
      }

      const allocation = variant.sellingPlanAllocations.nodes[0];
      const priceObj = allocation ? allocation.priceAdjustments[0]?.perDeliveryPrice : variant.price;
      const price = priceObj
        ? new Intl.NumberFormat('en-AU', { style: 'currency', currency: priceObj.currencyCode }).format(parseFloat(priceObj.amount))
        : null;
      trackAddonAdded({ productTitle: product.title, price });

      return [...prev, { variantId: variant.id, sellingPlanId: allocation?.sellingPlan.id, quantity: 1 }];
    });
  }, []);

  const handleAddonQuantityChange = useCallback(
    (variantId: string, quantity: number) => {
      setSelectedAddons((prev) =>
        prev.map((a) => (a.variantId === variantId ? { ...a, quantity } : a)),
      );
    },
    [],
  );

  const handleAddonsContinue = useCallback(() => {
    setStep('summary');
    trackOrderSummaryViewed({ bagWeight, frequencyWeeks, addonCount: selectedAddons.length });
    setTimeout(() => scrollToId('summary'), 100);
  }, [bagWeight, frequencyWeeks, selectedAddons.length]);

  const handleCheckout = useCallback(() => {
    if (!sampleProduct) return;
    const variant = sampleProduct.variants.nodes[0];
    if (!variant) return;
    const sellingPlanId = findSampleSellingPlan(sampleProduct);
    if (!sellingPlanId) return;

    const allocation = variant.sellingPlanAllocations.nodes.find((a) => a.sellingPlan.id === sellingPlanId);
    const priceObj = allocation ? allocation.priceAdjustments[0]?.perDeliveryPrice : variant.price;
    const samplePrice = priceObj
      ? new Intl.NumberFormat('en-AU', { style: 'currency', currency: priceObj.currencyCode }).format(parseFloat(priceObj.amount))
      : '';

    trackCheckoutStarted({ samplePrice, bagWeight, frequencyWeeks, addonCount: selectedAddons.length });
    submit(variant.id, sellingPlanId, { bagWeight, frequencyWeeks }, selectedAddons);
  }, [sampleProduct, bagWeight, frequencyWeeks, selectedAddons, submit]);

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        <p>Loading your subscription options...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="error">
        <h2>Something went wrong</h2>
        <p>{loadError}</p>
        <button className="btn-order" onClick={() => window.location.reload()}>
          Try Again
        </button>
      </div>
    );
  }

  if (!sampleProduct) return null;

  return (
    <>
      <header className="announcement-bar">
        <p><strong>50% Off</strong> Your First 2kg Sample Box — Limited Time</p>
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
                setTimeout(() => scrollToId('product-tabs'), 50);
              }}
            >
              Ingredients
            </button>
          </li>
          <li><a href="#faq">FAQ</a></li>
          <li><a href="https://www.littlegreendog.co.nz/pages/contact-us" target="_blank" rel="noopener noreferrer">Contact</a></li>
        </ul>
        <button className="btn-order nav-order-btn" onClick={handleGetStarted}>
          Order Now
        </button>
      </nav>

      <main className="landing-page">
        <HeroSection onGetStarted={handleGetStarted} />
        <BenefitsBar />
        <WhyYoullLoveIt />
        <ProductTabs activeTab={activeProductTab} onTabChange={setActiveProductTab} />
        <TestimonialsSection />
        <SubscriptionExplainer />
        <HowItWorks />

        <DogSizeCalculator
          selectedSize={selectedSize}
          bagWeight={bagWeight}
          frequencyWeeks={frequencyWeeks}
          onSelectSize={handleSelectSize}
          onBagWeightChange={handleBagWeightChange}
          onFrequencyChange={() => {}}
          onContinue={handleSizeContinue}
        />

        {(step === 'addons' || step === 'summary') && addonProducts.length > 0 && (
          <AddonsStep
            addonProducts={addonProducts}
            selectedAddons={selectedAddons}
            onToggleAddon={handleToggleAddon}
            onAddonQuantityChange={handleAddonQuantityChange}
            onContinue={handleAddonsContinue}
            onSkip={handleAddonsContinue}
          />
        )}

        {step === 'summary' && (
          <OrderSummary
            sampleProduct={sampleProduct}
            bagWeight={bagWeight}
            frequencyWeeks={frequencyWeeks}
            selectedAddons={selectedAddons}
            addonProducts={addonProducts}
            isSubmitting={isSubmitting}
            error={cartError}
            onCheckout={handleCheckout}
          />
        )}

        <FAQSection />
      </main>

      <Footer />

      {/* Sticky bottom CTA */}
      <StickyCTA onOrderNow={handleGetStarted} />
    </>
  );
}
