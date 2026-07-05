import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ProductVariant } from '../types/shopify';
import {
  DOG_WEIGHT_RANGES,
  getBagSizeForWeightRange,
  parseVariantBagKg,
  suggestSampleSubscribePlan,
} from '../lib/feedingGuide';
import {
  createSubscribeCart,
  createSubscribeCartAndRedirect,
  subscribeOfferCartKey,
} from '../lib/cart-subscribe';
import { findEarlySubscriberAllocation, getEarlySubscriberSellingPlanId } from '../lib/subscribe-offer-plans';
import { trackCheckoutStarted, trackCtaClicked, trackPlanCustomized, trackVariantSelected } from '../lib/analytics';
import { shopifyGidToContentId, trackMetaViewContent } from '../lib/meta-pixel';
import { formatMoney } from '../lib/pricing';
import {
  FREQUENCY_MONTHS_OPTIONS,
  type FrequencyMonths,
} from '../constants/sample-subscribe';

function clampBagSize(kg: number, availableSizes: number[]): number {
  if (availableSizes.includes(kg)) return kg;
  const adequate = availableSizes.find((size) => size >= kg);
  return adequate ?? availableSizes[availableSizes.length - 1];
}

function clampFrequency(months: number): FrequencyMonths {
  if (months === 2 || months === 3) return months;
  return 1;
}

function findVariantForBagSize(variants: ProductVariant[], bagSizeKg: number): ProductVariant | null {
  const exact = variants.find((variant) => parseVariantBagKg(variant.title) === bagSizeKg);
  if (exact) return exact;
  const sorted = [...variants].sort(
    (a, b) => parseVariantBagKg(a.title) - parseVariantBagKg(b.title),
  );
  const adequate = sorted.find((variant) => parseVariantBagKg(variant.title) >= bagSizeKg);
  return adequate ?? sorted[sorted.length - 1] ?? null;
}

export interface SubscribeOfferPricing {
  price: string;
  retail?: string;
  savings?: string;
  priceAmount?: number;
}

function getOfferPricing(
  variant: ProductVariant,
  frequencyMonths: FrequencyMonths,
): SubscribeOfferPricing | null {
  const allocation = findEarlySubscriberAllocation(variant, frequencyMonths);
  if (!allocation) return null;

  const subPrice = allocation.priceAdjustments[0].perDeliveryPrice;
  const retailMoney = allocation.priceAdjustments[0].compareAtPrice ?? variant.price;
  const retailAmount = parseFloat(retailMoney.amount);
  const subAmount = parseFloat(subPrice.amount);

  return {
    price: formatMoney(subPrice),
    retail: retailAmount > subAmount ? formatMoney(retailMoney) : undefined,
    savings:
      retailAmount > subAmount
        ? formatMoney({ amount: String(retailAmount - subAmount), currencyCode: 'NZD' })
        : undefined,
    priceAmount: subAmount,
  };
}

interface UseSubscribeOfferSelectionOptions {
  variants: ProductVariant[];
}

export function useSubscribeOfferSelection({ variants }: UseSubscribeOfferSelectionOptions) {
  const availableSizes = useMemo(
    () => [...new Set(variants.map((variant) => parseVariantBagKg(variant.title)))].sort((a, b) => a - b),
    [variants],
  );

  const [weightRangeId, setWeightRangeId] = useState(DOG_WEIGHT_RANGES[2].id);
  const [bagSizeKg, setBagSizeKg] = useState(() => clampBagSize(6, availableSizes));
  const [frequencyMonths, setFrequencyMonths] = useState<FrequencyMonths>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cartError, setCartError] = useState<string | null>(null);
  const prefetchedUrls = useRef<Record<string, string>>({});
  const userEdited = useRef({ size: false, frequency: false });
  const isFirstSelection = useRef(true);

  useEffect(() => {
    if (availableSizes.length === 0) return;
    setBagSizeKg((current) => clampBagSize(current, availableSizes));
  }, [availableSizes]);

  useEffect(() => {
    if (userEdited.current.size && userEdited.current.frequency) return;
    const suggestion = suggestSampleSubscribePlan(weightRangeId);
    if (!userEdited.current.size) {
      setBagSizeKg(clampBagSize(suggestion.bagSizeKg, availableSizes));
    }
    if (!userEdited.current.frequency) {
      setFrequencyMonths(suggestion.frequencyMonths);
    }
  }, [weightRangeId, availableSizes]);

  const selectedVariant = useMemo(
    () => findVariantForBagSize(variants, bagSizeKg),
    [variants, bagSizeKg],
  );

  const pricing = useMemo(
    () => (selectedVariant ? getOfferPricing(selectedVariant, frequencyMonths) : null),
    [selectedVariant, frequencyMonths],
  );

  const availableFrequencies = useMemo(() => {
    if (!selectedVariant) return FREQUENCY_MONTHS_OPTIONS;
    return FREQUENCY_MONTHS_OPTIONS.filter(
      (months) => getEarlySubscriberSellingPlanId(selectedVariant, months) !== undefined,
    );
  }, [selectedVariant]);

  useEffect(() => {
    if (availableFrequencies.includes(frequencyMonths)) return;
    setFrequencyMonths(availableFrequencies[0] ?? 1);
  }, [availableFrequencies, frequencyMonths]);

  const sellingPlanId = useMemo(
    () => (selectedVariant ? getEarlySubscriberSellingPlanId(selectedVariant, frequencyMonths) : undefined),
    [selectedVariant, frequencyMonths],
  );

  const cartKey = useMemo(
    () => (selectedVariant && sellingPlanId ? subscribeOfferCartKey(selectedVariant.id, sellingPlanId) : ''),
    [selectedVariant, sellingPlanId],
  );

  useEffect(() => {
    if (!selectedVariant || !pricing) return;
    trackVariantSelected({
      bagWeight: parseVariantBagKg(selectedVariant.title),
      price: pricing.price,
      frequencyWeeks: frequencyMonths * 4,
      source: isFirstSelection.current ? 'default' : 'user',
    });
    isFirstSelection.current = false;
  }, [selectedVariant, pricing, frequencyMonths]);

  useEffect(() => {
    if (!selectedVariant || !sellingPlanId || !cartKey || prefetchedUrls.current[cartKey]) return;
    createSubscribeCart(selectedVariant.id, sellingPlanId)
      .then((url) => { prefetchedUrls.current[cartKey] = url; })
      .catch(() => { /* fall back at click time */ });
  }, [cartKey, selectedVariant, sellingPlanId]);

  useEffect(() => {
    if (!selectedVariant || !pricing?.priceAmount) return;
    trackMetaViewContent({
      contentIds: [shopifyGidToContentId(selectedVariant.id)],
      value: pricing.priceAmount,
      currency: 'NZD',
    });
  }, [selectedVariant, pricing]);

  const handleWeightRangeChange = useCallback((id: string) => {
    userEdited.current = { size: false, frequency: false };
    setWeightRangeId(id);
    const suggestedSize = clampBagSize(getBagSizeForWeightRange(id), availableSizes);
    setBagSizeKg(suggestedSize);
    const suggestion = suggestSampleSubscribePlan(id);
    setFrequencyMonths(suggestion.frequencyMonths);
  }, [availableSizes]);

  const handleBagSizeChange = useCallback((kg: number) => {
    userEdited.current.size = true;
    const size = clampBagSize(kg, availableSizes);
    setBagSizeKg(size);
    trackPlanCustomized({ field: 'bagWeight', bagWeight: size, frequencyWeeks: frequencyMonths * 4 });
  }, [availableSizes, frequencyMonths]);

  const handleFrequencyChange = useCallback((months: number) => {
    userEdited.current.frequency = true;
    const freq = clampFrequency(months);
    setFrequencyMonths(freq);
    trackPlanCustomized({ field: 'frequency', bagWeight: bagSizeKg, frequencyWeeks: freq * 4 });
  }, [bagSizeKg]);

  const handleCheckout = useCallback(async () => {
    if (!selectedVariant || !sellingPlanId || !pricing) return;
    trackCtaClicked('picker');
    setIsSubmitting(true);
    setCartError(null);
    try {
      trackCheckoutStarted({
        samplePrice: pricing.price,
        bagWeight: parseVariantBagKg(selectedVariant.title),
        frequencyWeeks: frequencyMonths * 4,
        addonCount: 0,
        contentIds: [shopifyGidToContentId(selectedVariant.id)],
        value: pricing.priceAmount,
      });
      await createSubscribeCartAndRedirect(
        selectedVariant.id,
        pricing.priceAmount,
        prefetchedUrls.current[cartKey],
        sellingPlanId,
      );
    } catch (err) {
      setCartError(err instanceof Error ? err.message : 'Failed to create cart');
      setIsSubmitting(false);
    }
  }, [selectedVariant, sellingPlanId, pricing, frequencyMonths, cartKey]);

  return {
    weightRangeId,
    bagSizeKg,
    frequencyMonths,
    availableSizes,
    availableFrequencies,
    pricing,
    isSubmitting,
    cartError,
    handleWeightRangeChange,
    handleBagSizeChange,
    handleFrequencyChange,
    handleCheckout,
  };
}

interface SubscribeOfferPickerProps {
  weightRangeId: string;
  bagSizeKg: number;
  frequencyMonths: FrequencyMonths;
  availableSizes: number[];
  availableFrequencies: FrequencyMonths[];
  pricing: SubscribeOfferPricing | null;
  isSubmitting: boolean;
  cartError: string | null;
  onWeightRangeChange: (id: string) => void;
  onBagSizeChange: (kg: number) => void;
  onFrequencyChange: (months: number) => void;
  onCheckout: () => void;
  finePrint: string;
}

export function SubscribeOfferPicker({
  weightRangeId,
  bagSizeKg,
  frequencyMonths,
  availableSizes,
  availableFrequencies,
  pricing,
  isSubmitting,
  cartError,
  onWeightRangeChange,
  onBagSizeChange,
  onFrequencyChange,
  onCheckout,
  finePrint,
}: SubscribeOfferPickerProps) {
  const freqLabel = frequencyMonths === 1 ? 'month' : `${frequencyMonths} months`;

  return (
    <section className="subscription-picker-primary" id="subscribe">
      <div className="subscription-picker-inner">
        <h2>Build your subscription</h2>
        <p className="picker-subtitle">
          Pick your dog&apos;s weight and we&apos;ll recommend the right bag and delivery schedule.
        </p>

        <div className="picker-build">
          <div className="picker-step">
            <div className="picker-step-content">
              <label className="picker-label" htmlFor="dog-weight">
                Select your dog&apos;s weight to see our recommendation
              </label>
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

          {pricing && (
            <div className="picker-summary">
              <p className="picker-summary-heading">Your subscription</p>
              <div className="picker-summary-rows">
                <div className="picker-summary-row">
                  <span className="picker-summary-label">
                    {bagSizeKg}kg every {freqLabel}
                  </span>
                  <span className="picker-summary-value">
                    {pricing.price}
                    {pricing.savings && (
                      <span className="picker-summary-discount">save {pricing.savings}</span>
                    )}
                  </span>
                  {pricing.retail && (
                    <span className="picker-summary-retail">was {pricing.retail}</span>
                  )}
                </div>
              </div>
            </div>
          )}

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
                    {availableSizes.map((size) => (
                      <option key={size} value={size}>
                        {size}kg
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
                    {availableFrequencies.map((months) => (
                      <option key={months} value={months}>
                        Every {months} month{months > 1 ? 's' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {cartError && <p className="picker-error">{cartError}</p>}

        <button
          className="btn-order reactivation-cta"
          onClick={onCheckout}
          disabled={isSubmitting || !pricing}
        >
          {isSubmitting ? 'Working…' : 'Buy now to save 25%'}
        </button>
        <p className="reactivation-finefoot">{finePrint}</p>
      </div>
    </section>
  );
}
