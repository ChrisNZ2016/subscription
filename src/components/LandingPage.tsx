import { useState, useCallback } from 'react';
import { useProducts } from '../hooks/useProducts';
import { useCart } from '../hooks/useCart';
import { DOG_SIZE_PRESETS } from '../constants/dogSizes';
import { HeroSection } from './HeroSection';
import { DogSizeCalculator } from './DogSizeCalculator';
import { AddonsStep } from './AddonsStep';
import { OrderSummary } from './OrderSummary';
import type { Product } from '../types/shopify';
import type { AddonSelection } from '../lib/cart';

type FunnelStep = 'hero' | 'size' | 'addons' | 'summary';

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

  // Fallback: first selling plan allocation on the first variant
  const allocation = product.variants.nodes[0]?.sellingPlanAllocations.nodes[0];
  return allocation?.sellingPlan.id ?? null;
}

export function LandingPage() {
  const { sampleProduct, addonProducts, loading, error: loadError } = useProducts();
  const { submit, isSubmitting, error: cartError } = useCart();

  const [step, setStep] = useState<FunnelStep>('hero');
  const [selectedSize, setSelectedSize] = useState<number | null>(null);
  const [bagWeight, setBagWeight] = useState(2);
  const [frequencyWeeks, setFrequencyWeeks] = useState(4);
  const [selectedAddons, setSelectedAddons] = useState<AddonSelection[]>([]);

  const handleGetStarted = useCallback(() => {
    setStep('size');
    setTimeout(() => scrollToId('dog-size'), 100);
  }, []);

  const handleSelectSize = useCallback((index: number) => {
    setSelectedSize(index);
    const preset = DOG_SIZE_PRESETS[index];
    setBagWeight(preset.bagWeight);
    setFrequencyWeeks(preset.frequencyWeeks);
  }, []);

  const handleSizeContinue = useCallback(() => {
    if (addonProducts.length > 0) {
      setStep('addons');
      setTimeout(() => scrollToId('addons'), 100);
    } else {
      setStep('summary');
      setTimeout(() => scrollToId('summary'), 100);
    }
  }, [addonProducts.length]);

  const handleToggleAddon = useCallback((product: Product) => {
    const variant = product.variants.nodes[0];
    if (!variant) return;

    setSelectedAddons((prev) => {
      const exists = prev.find((a) => a.variantId === variant.id);
      if (exists) {
        return prev.filter((a) => a.variantId !== variant.id);
      }

      const allocation = variant.sellingPlanAllocations.nodes[0];
      return [
        ...prev,
        {
          variantId: variant.id,
          sellingPlanId: allocation?.sellingPlan.id,
          quantity: 1,
        },
      ];
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
    setTimeout(() => scrollToId('summary'), 100);
  }, []);

  const handleCheckout = useCallback(() => {
    if (!sampleProduct) return;

    const variant = sampleProduct.variants.nodes[0];
    if (!variant) return;

    const sellingPlanId = findSampleSellingPlan(sampleProduct);
    if (!sellingPlanId) return;

    submit(variant.id, sellingPlanId, { bagWeight, frequencyWeeks }, selectedAddons);
  }, [sampleProduct, bagWeight, frequencyWeeks, selectedAddons, submit]);

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        <p>Loading your subscription options…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="error">
        <h2>Something went wrong</h2>
        <p>{loadError}</p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>
          Try Again
        </button>
      </div>
    );
  }

  if (!sampleProduct) return null;

  return (
    <main className="funnel">
      <HeroSection onGetStarted={handleGetStarted} />

      {step !== 'hero' && (
        <DogSizeCalculator
          selectedSize={selectedSize}
          bagWeight={bagWeight}
          frequencyWeeks={frequencyWeeks}
          onSelectSize={handleSelectSize}
          onBagWeightChange={setBagWeight}
          onFrequencyChange={setFrequencyWeeks}
          onContinue={handleSizeContinue}
        />
      )}

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
    </main>
  );
}
