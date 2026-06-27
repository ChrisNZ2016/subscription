import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DOG_WEIGHT_RANGES,
  getBagSizeForWeightRange,
  suggestSampleSubscribePlan,
} from '../lib/feedingGuide';
import {
  createSampleSubscribeCart,
  createSampleSubscribeCartAndRedirect,
  sampleSubscribeCartKey,
  type SampleSubscribeCartSelection,
} from '../lib/cart-sample-subscribe';
import { trackCheckoutStarted, trackCtaClicked, trackPlanCustomized, type CtaLocation } from '../lib/analytics';
import { shopifyGidToContentId } from '../lib/meta-pixel';
import {
  DEFAULT_DISCOUNT_TIER,
  formatRecurringPrice,
  formatRetailPrice,
  FREQUENCY_MONTHS_OPTIONS,
  getSampleVariantGid,
  SAMPLE_BAG_SIZES,
  SAMPLE_PRICE,
  type FrequencyMonths,
  type SampleBagSizeKg,
} from '../constants/sample-subscribe';

function clampBagSize(kg: number): SampleBagSizeKg {
  if (SAMPLE_BAG_SIZES.includes(kg as SampleBagSizeKg)) return kg as SampleBagSizeKg;
  const sorted = [...SAMPLE_BAG_SIZES];
  const adequate = sorted.find((s) => s >= kg);
  return adequate ?? sorted[sorted.length - 1];
}

function clampFrequency(months: number): FrequencyMonths {
  if (months === 2 || months === 3) return months;
  return 1;
}

export function useSampleSubscribeSelection() {
  const [weightRangeId, setWeightRangeId] = useState(DOG_WEIGHT_RANGES[2].id);
  const [bagSizeKg, setBagSizeKg] = useState<SampleBagSizeKg>(6);
  const [frequencyMonths, setFrequencyMonths] = useState<FrequencyMonths>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cartError, setCartError] = useState<string | null>(null);
  const prefetchedUrls = useRef<Record<string, string>>({});
  const userEdited = useRef({ size: false, frequency: false });

  useEffect(() => {
    if (userEdited.current.size && userEdited.current.frequency) return;
    const suggestion = suggestSampleSubscribePlan(weightRangeId);
    if (!userEdited.current.size) {
      setBagSizeKg(clampBagSize(suggestion.bagSizeKg));
    }
    if (!userEdited.current.frequency) {
      setFrequencyMonths(suggestion.frequencyMonths);
    }
  }, [weightRangeId]);

  const selection = useMemo<SampleSubscribeCartSelection>(
    () => ({ sizeKg: bagSizeKg, frequencyMonths }),
    [bagSizeKg, frequencyMonths],
  );

  const recurringPrice = useMemo(
    () => formatRecurringPrice(bagSizeKg),
    [bagSizeKg],
  );

  const cartKey = sampleSubscribeCartKey(selection);

  useEffect(() => {
    if (prefetchedUrls.current[cartKey]) return;
    createSampleSubscribeCart(selection)
      .then((url) => { prefetchedUrls.current[cartKey] = url; })
      .catch(() => { /* fall back at click time */ });
  }, [cartKey, selection]);

  const handleWeightRangeChange = useCallback((id: string) => {
    userEdited.current = { size: false, frequency: false };
    setWeightRangeId(id);
    const suggestedSize = clampBagSize(getBagSizeForWeightRange(id));
    setBagSizeKg(suggestedSize);
    const suggestion = suggestSampleSubscribePlan(id);
    setFrequencyMonths(suggestion.frequencyMonths);
  }, []);

  const handleBagSizeChange = useCallback((kg: number) => {
    userEdited.current.size = true;
    const size = clampBagSize(kg);
    setBagSizeKg(size);
    trackPlanCustomized({ field: 'bagWeight', bagWeight: size, frequencyWeeks: frequencyMonths * 4 });
  }, [frequencyMonths]);

  const handleFrequencyChange = useCallback((months: number) => {
    userEdited.current.frequency = true;
    const freq = clampFrequency(months);
    setFrequencyMonths(freq);
    trackPlanCustomized({ field: 'frequency', bagWeight: bagSizeKg, frequencyWeeks: freq * 4 });
  }, [bagSizeKg]);

  const handleCheckout = useCallback(async (ctaLocation: CtaLocation = 'picker') => {
    trackCtaClicked(ctaLocation);
    setIsSubmitting(true);
    setCartError(null);
    try {
      trackCheckoutStarted({
        samplePrice: `$${SAMPLE_PRICE.toFixed(2)}`,
        bagWeight: bagSizeKg,
        frequencyWeeks: frequencyMonths * 4,
        addonCount: 0,
        contentIds: [shopifyGidToContentId(getSampleVariantGid(bagSizeKg))],
        value: SAMPLE_PRICE,
      });
      await createSampleSubscribeCartAndRedirect(
        selection,
        SAMPLE_PRICE,
        prefetchedUrls.current[cartKey],
      );
    } catch (err) {
      setCartError(err instanceof Error ? err.message : 'Failed to create cart');
      setIsSubmitting(false);
    }
  }, [bagSizeKg, frequencyMonths, selection, cartKey]);

  return {
    weightRangeId,
    bagSizeKg,
    frequencyMonths,
    recurringPrice,
    isSubmitting,
    cartError,
    handleWeightRangeChange,
    handleBagSizeChange,
    handleFrequencyChange,
    handleCheckout,
  };
}

interface SampleSubscribePickerProps {
  weightRangeId: string;
  bagSizeKg: SampleBagSizeKg;
  frequencyMonths: FrequencyMonths;
  recurringPrice: string;
  isSubmitting: boolean;
  cartError: string | null;
  onWeightRangeChange: (id: string) => void;
  onBagSizeChange: (kg: number) => void;
  onFrequencyChange: (months: number) => void;
  onCheckout: () => void;
}

export function SampleSubscribePicker({
  weightRangeId,
  bagSizeKg,
  frequencyMonths,
  recurringPrice,
  isSubmitting,
  cartError,
  onWeightRangeChange,
  onBagSizeChange,
  onFrequencyChange,
  onCheckout,
}: SampleSubscribePickerProps) {
  const freqLabel = frequencyMonths === 1 ? 'month' : `${frequencyMonths} months`;
  const samplePriceLabel = `$${SAMPLE_PRICE.toFixed(2)}`;
  const recurringFullPrice = formatRetailPrice(bagSizeKg);

  return (
    <section className="subscription-picker-primary" id="sample-subscribe">
      <div className="subscription-picker-inner">
        <p className="picker-eyebrow">Start with a sample</p>
        {/* How it works — process first, before any numbers are presumed */}
        <ol className="picker-how">
          <li className="picker-how-step">
            <span className="picker-how-icon" aria-hidden="true">📦</span>
            <span className="picker-how-text">
              <strong>Your 2kg sample ships now</strong> for just {samplePriceLabel}.
            </span>
          </li>
          <li className="picker-how-step">
            <span className="picker-how-icon" aria-hidden="true">🐶</span>
            <span className="picker-how-text">
              <strong>Your dog tries it.</strong> Not a fan? Cancel before your first full bag —
              no charge beyond the sample.
            </span>
          </li>
          <li className="picker-how-step">
            <span className="picker-how-icon" aria-hidden="true">🔁</span>
            <span className="picker-how-text">
              <strong>They love it? Do nothing.</strong> Your subscription begins one cycle later
              at <strong>25% off</strong> — skip, pause, or cancel anytime.
            </span>
          </li>
        </ol>

        {/* Build the subscription */}
        <div className="picker-build">
          <div className="picker-step">
            <div className="picker-step-content">
              <label className="picker-label" htmlFor="dog-weight">Select your dog&apos;s weight to see our recommendation</label>
              <select
                id="dog-weight"
                className="picker-select"
                value={weightRangeId}
                onChange={(e) => onWeightRangeChange(e.target.value)}
              >
                {DOG_WEIGHT_RANGES.map((range) => (
                  <option key={range.id} value={range.id}>
                    {range.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* What you'll pay */}
          <div className="picker-summary">
            <p className="picker-summary-heading">What you&apos;ll pay</p>
            <div className="picker-summary-rows">
              <div className="picker-summary-row picker-summary-row--now">
                <span className="picker-summary-label">2kg sample today</span>
                <span className="picker-summary-value">{samplePriceLabel}</span>
              </div>
              <div className="picker-summary-row">
                <span className="picker-summary-label">
                  Then {bagSizeKg}kg every {freqLabel}
                </span>
                <span className="picker-summary-value">
                  {recurringPrice}
                  <span className="picker-summary-discount">{DEFAULT_DISCOUNT_TIER}% off</span>
                  <span className="picker-summary-retail">{recurringFullPrice}</span>
                </span>
                <p className="picker-summary-note">
                  Cancel before it ships and you won&apos;t be charged
                </p>
              </div>
            </div>
          </div>

          <div className="picker-step">
            <div className="picker-step-content">
              <p className="picker-customize-intro">Want a different delivery? Just select below.</p>
              <div className="picker-fields-row">
                <div className="picker-field">
                  <label className="picker-label" htmlFor="bag-size">Bag size</label>
                  <select
                    id="bag-size"
                    className="picker-select"
                    value={bagSizeKg}
                    onChange={(e) => onBagSizeChange(Number(e.target.value))}
                  >
                    {SAMPLE_BAG_SIZES.map((w) => (
                      <option key={w} value={w}>
                        {w}kg
                      </option>
                    ))}
                  </select>
                </div>
                <div className="picker-field">
                  <label className="picker-label" htmlFor="frequency">Delivery frequency</label>
                  <select
                    id="frequency"
                    className="picker-select"
                    value={frequencyMonths}
                    onChange={(e) => onFrequencyChange(Number(e.target.value))}
                  >
                    {FREQUENCY_MONTHS_OPTIONS.map((m) => (
                      <option key={m} value={m}>
                        Every {m} month{m > 1 ? 's' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <p className="picker-adjust-note">
            We&apos;ve matched the size and frequency to your dog — adjust to suit how much they eat.
          </p>
        </div>

        {cartError && <p className="picker-error">{cartError}</p>}

        <button
          className="btn-order reactivation-cta"
          onClick={onCheckout}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Working…' : `Send my 2kg sample — ${samplePriceLabel}`}
        </button>
      </div>
    </section>
  );
}
