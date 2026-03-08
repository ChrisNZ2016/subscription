import {
  DOG_SIZE_PRESETS,
  BAG_WEIGHT_OPTIONS,
} from '../constants/dogSizes';
import type { Product } from '../types/shopify';
import { getSubscriptionPricing, formatMoney } from '../lib/pricing';

interface DogSizeCalculatorProps {
  selectedSize: number | null;
  bagWeight: number;
  frequencyWeeks: number;
  subscriptionProduct: Product | null;
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
  subscriptionProduct,
  onSelectSize,
  onBagWeightChange,
  onContinue,
}: DogSizeCalculatorProps) {
  const pricing = subscriptionProduct
    ? getSubscriptionPricing(subscriptionProduct, bagWeight)
    : null;

  return (
    <section className="step" id="dog-size">
      <div className="step-inner">
        <span className="section-label">Step 1</span>
        <h2>Build your perfect plan</h2>
        <p className="step-subtitle">
          Pick your dog's size and we'll recommend the right bag. Delivered every 4 weeks.
        </p>

        <div className="size-cards">
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
              <div className="customiser-field">
                <label htmlFor="bag-weight">Bag size</label>
                <select
                  id="bag-weight"
                  value={bagWeight}
                  onChange={(e) => onBagWeightChange(Number(e.target.value))}
                >
                  {BAG_WEIGHT_OPTIONS.map((w) => (
                    <option key={w} value={w}>
                      {w}kg
                    </option>
                  ))}
                </select>
              </div>

              {pricing && (
                <div className="customiser-pricing">
                  <div className="customiser-price-row">
                    <span className="customiser-price">{formatMoney(pricing.price)}</span>
                    {pricing.retailPrice && pricing.savingsPercent > 0 && (
                      <span className="customiser-retail">{formatMoney(pricing.retailPrice)}</span>
                    )}
                    <span className="customiser-price-label">per delivery</span>
                    {pricing.savingsPercent > 0 && (
                      <span className="savings-badge">Save {pricing.savingsPercent}%</span>
                    )}
                  </div>
                </div>
              )}

              <button className="btn-order" onClick={onContinue}>
                Order Now
              </button>
            </div>
            <p className="customiser-frequency-note">We'll deliver every 4 weeks</p>
          </>
        )}
      </div>
    </section>
  );
}
