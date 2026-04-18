import {
  DOG_SIZE_PRESETS,
  BAG_WEIGHT_OPTIONS,
} from '../constants/dogSizes';
import type { Product } from '../types/shopify';
import { getSubscriptionPricing, formatMoney } from '../lib/pricing';

type Variant = 'default' | 'simple' | 'solo';

interface DogSizeCalculatorProps {
  selectedSize: number | null;
  bagWeight: number;
  frequencyWeeks: number;
  sampleProduct: Product | null;
  subscriptionProduct: Product | null;
  variant?: Variant;
  onSelectSize: (index: number) => void;
  onBagWeightChange: (weight: number) => void;
  onFrequencyChange: (weeks: number) => void;
  onContinue: () => void;
}

const SIZE_ICONS: Record<string, string> = {
  Small: 'S',
  Medium: 'M',
  Large: 'L',
};

export function DogSizeCalculator({
  selectedSize,
  bagWeight,
  sampleProduct,
  subscriptionProduct,
  variant = 'default',
  onSelectSize,
  onBagWeightChange,
  onContinue,
}: DogSizeCalculatorProps) {
  const pricing = subscriptionProduct
    ? getSubscriptionPricing(subscriptionProduct, bagWeight)
    : null;

  // Sample product price (discounted one-time trial price)
  const sampleVariant = sampleProduct?.variants.nodes[0];
  const sampleAllocation = sampleVariant?.sellingPlanAllocations.nodes[0];
  const samplePrice = sampleAllocation
    ? sampleAllocation.priceAdjustments[0].perDeliveryPrice
    : sampleVariant?.price ?? null;

  return (
    <section className="step" id="dog-size">
      <div className="step-inner">
        <span className="section-label animate-on-scroll" style={{ display: 'block' }}>Step 1</span>
        <h2 className="animate-on-scroll">Build your perfect plan</h2>
        <p className="step-subtitle animate-on-scroll">
          Pick your dog's size to get started. Available in 2kg, 6kg, and 12kg bags — delivered every 4 weeks.
        </p>

        <div className="size-cards animate-stagger">
          {DOG_SIZE_PRESETS.map((preset, i) => (
            <button
              key={preset.label}
              className={`size-card ${selectedSize === i ? 'selected' : ''}`}
              onClick={() => onSelectSize(i)}
            >
              <span className="size-icon" aria-hidden="true">
                {SIZE_ICONS[preset.label] ?? preset.label[0]}
              </span>
              <strong>{preset.label}</strong>
              <span className="size-desc">{preset.description}</span>
            </button>
          ))}
        </div>

        {selectedSize !== null && (
          <>
            <div className="customiser">
              <div className="customiser-row">
                <label className="customiser-label" htmlFor="bag-weight">Bag size</label>
                <select
                  id="bag-weight"
                  className="customiser-select"
                  value={bagWeight}
                  onChange={(e) => onBagWeightChange(Number(e.target.value))}
                >
                  {BAG_WEIGHT_OPTIONS.map((w) => (
                    <option key={w} value={w}>
                      {w}kg
                    </option>
                  ))}
                </select>

                {(samplePrice || (pricing && variant !== 'solo')) && (
                  <span className="customiser-price-row">
                    {samplePrice && (
                      <span>{formatMoney(samplePrice)} today for your 2kg sample pack{variant !== 'solo' ? ',' : '.'}</span>
                    )}
                    {pricing && variant !== 'solo' && (
                      <>
                        <span>
                          {pricing.savingsPercent > 0 && `then save ${pricing.savingsPercent}% and pay `}
                          {formatMoney(pricing.price)}
                          {pricing.retailPrice && pricing.savingsPercent > 0 && (
                            <> <span className="customiser-retail">{formatMoney(pricing.retailPrice)}</span></>
                          )}
                          {' '}per delivery after that. Cancel anytime.
                        </span>
                      </>
                    )}
                  </span>
                )}
              </div>

              <button className="btn-order customiser-btn" onClick={onContinue}>
                Get my sample
              </button>
            </div>
            <p className="customiser-frequency-note">Delivered every 4 weeks · Skip or cancel anytime</p>
          </>
        )}
      </div>
    </section>
  );
}
