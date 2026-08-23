import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import type { ProductVariant } from '../types/shopify';
import { formatMoney } from '../lib/pricing';
import {
  DOG_WEIGHT_RANGES,
  getBagSizeForWeightRange,
  parseVariantBagKg,
} from '../lib/feedingGuide';
import {
  trackVariantSelected,
  trackCheckoutStarted,
  trackCtaClicked,
  trackPlanCustomized,
} from '../lib/analytics';
import { shopifyGidToContentId, trackMetaViewContent } from '../lib/meta-pixel';
import {
  FREQUENCY_MONTHS_OPTIONS,
  type FrequencyMonths,
} from '../constants/sample-subscribe';

interface UseSubscriptionBagSelectionOptions {
  variants: ProductVariant[];
  getPrice: (variant: ProductVariant, frequencyMonths: FrequencyMonths) => string | undefined;
  getPriceAmount: (variant: ProductVariant, frequencyMonths: FrequencyMonths) => number | undefined;
  createCart: (variantId: string, sellingPlanId?: string) => Promise<string>;
  createCartAndRedirect: (
    variantId: string,
    value?: number,
    prefetchedUrl?: string,
    sellingPlanId?: string,
  ) => Promise<void>;
  /**
   * Resolves the selling plan for a variant at a given frequency. Supply this to
   * offer a delivery-frequency choice; omit it and the picker stays single-plan
   * (frequency fixed at monthly) and renders no frequency control.
   */
  getSellingPlanId?: (
    variant: ProductVariant,
    frequencyMonths: FrequencyMonths,
  ) => string | undefined;
}

export function useSubscriptionBagSelection({
  variants,
  getPrice,
  getPriceAmount,
  createCart,
  createCartAndRedirect,
  getSellingPlanId,
}: UseSubscriptionBagSelectionOptions) {
  const [weightRangeId, setWeightRangeId] = useState(DOG_WEIGHT_RANGES[2].id);
  const [frequencyMonths, setFrequencyMonths] = useState<FrequencyMonths>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cartError, setCartError] = useState<string | null>(null);
  const prefetchedUrls = useRef<Record<string, string>>({});
  const isFirstSelection = useRef(true);
  // Set once the customer overrides the recommendation, so a later weight change
  // still re-recommends but their explicit pick is never silently overwritten.
  const [overrideBagKg, setOverrideBagKg] = useState<number | null>(null);

  const availableSizes = useMemo(
    () => [...new Set(variants.map((v) => parseVariantBagKg(v.title)))].sort((a, b) => a - b),
    [variants],
  );

  const recommendedBagKg = useMemo(
    () => getBagSizeForWeightRange(weightRangeId),
    [weightRangeId],
  );

  const targetBagKg = overrideBagKg ?? recommendedBagKg;

  const selectedVariant = useMemo(() => {
    const sorted = [...variants].sort(
      (a, b) => parseVariantBagKg(a.title) - parseVariantBagKg(b.title),
    );
    const exact = sorted.find((v) => parseVariantBagKg(v.title) === targetBagKg);
    if (exact) return exact;
    const adequate = sorted.find((v) => parseVariantBagKg(v.title) >= targetBagKg);
    return adequate ?? sorted[sorted.length - 1] ?? null;
  }, [variants, targetBagKg]);

  const handleWeightRangeChange = useCallback((id: string) => {
    setOverrideBagKg(null);
    setWeightRangeId(id);
  }, []);

  const handleBagSizeChange = useCallback((kg: number) => {
    setOverrideBagKg(kg);
    trackPlanCustomized({ field: 'bagWeight', bagWeight: kg, frequencyWeeks: frequencyMonths * 4 });
  }, [frequencyMonths]);

  const handleFrequencyChange = useCallback((months: number) => {
    const freq: FrequencyMonths = months === 2 || months === 3 ? months : 1;
    setFrequencyMonths(freq);
    trackPlanCustomized({ field: 'frequency', bagWeight: targetBagKg, frequencyWeeks: freq * 4 });
  }, [targetBagKg]);

  // Frequencies this variant actually has a plan for. With no getSellingPlanId
  // the picker is single-plan, so there is nothing to choose between.
  const availableFrequencies = useMemo(() => {
    if (!getSellingPlanId || !selectedVariant) return [];
    return FREQUENCY_MONTHS_OPTIONS.filter(
      (months) => getSellingPlanId(selectedVariant, months) !== undefined,
    );
  }, [getSellingPlanId, selectedVariant]);

  // Never leave a frequency selected that this variant can't fulfil.
  useEffect(() => {
    if (availableFrequencies.length === 0) return;
    if (availableFrequencies.includes(frequencyMonths)) return;
    setFrequencyMonths(availableFrequencies[0]);
  }, [availableFrequencies, frequencyMonths]);

  const sellingPlanId = useMemo(
    () => (getSellingPlanId && selectedVariant
      ? getSellingPlanId(selectedVariant, frequencyMonths)
      : undefined),
    [getSellingPlanId, selectedVariant, frequencyMonths],
  );

  // Key the warmed cart by plan as well as variant, so switching frequency can
  // never redirect to a cart built for the previous plan.
  const cartKey = selectedVariant ? `${selectedVariant.id}:${sellingPlanId ?? 'default'}` : '';

  const selectedPrice = selectedVariant ? getPrice(selectedVariant, frequencyMonths) : undefined;
  const selectedRetail = selectedVariant ? formatMoney(selectedVariant.price) : undefined;
  const selectedBagKg = selectedVariant ? parseVariantBagKg(selectedVariant.title) : recommendedBagKg;

  const savingsFormatted = useMemo(() => {
    if (!selectedVariant) return undefined;
    const retail = parseFloat(selectedVariant.price.amount);
    const sub = getPriceAmount(selectedVariant, frequencyMonths);
    if (sub === undefined || retail <= sub) return undefined;
    return formatMoney({ amount: String(retail - sub), currencyCode: 'NZD' });
  }, [selectedVariant, getPriceAmount, frequencyMonths]);

  useEffect(() => {
    if (!selectedVariant) return;
    trackVariantSelected({
      bagWeight: parseVariantBagKg(selectedVariant.title),
      price: getPrice(selectedVariant, frequencyMonths) ?? '',
      frequencyWeeks: frequencyMonths * 4,
      source: isFirstSelection.current ? 'default' : 'user',
    });
    isFirstSelection.current = false;
  }, [weightRangeId, selectedVariant, getPrice, frequencyMonths]);

  useEffect(() => {
    if (!selectedVariant || !cartKey || prefetchedUrls.current[cartKey]) return;
    const id = selectedVariant.id;
    createCart(id, sellingPlanId)
      .then((url) => { prefetchedUrls.current[cartKey] = url; })
      .catch(() => { /* fall back to creating the cart at click time */ });
  }, [selectedVariant, createCart, cartKey, sellingPlanId]);

  useEffect(() => {
    if (!selectedVariant) return;
    trackMetaViewContent({
      contentIds: [shopifyGidToContentId(selectedVariant.id)],
      value: getPriceAmount(selectedVariant, frequencyMonths),
      currency: 'NZD',
    });
  }, [selectedVariant, getPriceAmount, frequencyMonths]);

  const handleCheckout = useCallback(async () => {
    if (!selectedVariant) return;
    trackCtaClicked('picker');
    setIsSubmitting(true);
    setCartError(null);
    try {
      const checkoutValue = getPriceAmount(selectedVariant, frequencyMonths);
      trackCheckoutStarted({
        samplePrice: selectedPrice ?? '',
        bagWeight: parseVariantBagKg(selectedVariant.title),
        frequencyWeeks: frequencyMonths * 4,
        addonCount: 0,
        contentIds: [shopifyGidToContentId(selectedVariant.id)],
        value: checkoutValue,
      });
      await createCartAndRedirect(
        selectedVariant.id,
        checkoutValue,
        prefetchedUrls.current[cartKey],
        sellingPlanId,
      );
    } catch (err) {
      setCartError(err instanceof Error ? err.message : 'Failed to create cart');
      setIsSubmitting(false);
    }
  }, [selectedVariant, selectedPrice, getPriceAmount, createCartAndRedirect, frequencyMonths, cartKey, sellingPlanId]);

  return {
    weightRangeId,
    setWeightRangeId,
    availableSizes,
    availableFrequencies,
    frequencyMonths,
    selectedBagKg,
    selectedPrice,
    selectedRetail,
    savingsFormatted,
    isSubmitting,
    cartError,
    handleWeightRangeChange,
    handleBagSizeChange,
    handleFrequencyChange,
    handleCheckout,
  };
}

interface SubscriptionBagPickerProps {
  weightRangeId: string;
  availableSizes: number[];
  availableFrequencies: FrequencyMonths[];
  frequencyMonths: FrequencyMonths;
  selectedBagKg: number;
  selectedPrice?: string;
  selectedRetail?: string;
  savingsFormatted?: string;
  isSubmitting: boolean;
  cartError: string | null;
  onWeightRangeChange: (id: string) => void;
  onBagSizeChange: (kg: number) => void;
  onFrequencyChange: (months: number) => void;
  onCheckout: () => void;
  finePrint: string;
  /**
   * Free item included with this offer, shown as a $0.00 row in the summary.
   * The line is added to the cart and zeroed by an automatic discount, so the
   * customer sees the gift before checkout rather than only after ordering.
   */
  giftLabel?: string;
}

function StepNumber({ n }: { n: number }) {
  return <span className="picker-step-num" aria-hidden="true">{n}</span>;
}

export function SubscriptionBagPicker({
  weightRangeId,
  availableSizes,
  availableFrequencies,
  frequencyMonths,
  selectedBagKg,
  selectedPrice,
  selectedRetail,
  savingsFormatted,
  isSubmitting,
  cartError,
  onWeightRangeChange,
  onBagSizeChange,
  onFrequencyChange,
  onCheckout,
  finePrint,
  giftLabel,
}: SubscriptionBagPickerProps) {
  return (
    <section className="subscription-picker-primary" id="subscribe">
      <div className="subscription-picker-inner">
        <h2>Build your subscription</h2>
        <p className="picker-subtitle">
          Pick your dog's weight and we'll recommend the right bag and delivery schedule.
        </p>

        <div className="picker-step">
          <StepNumber n={1} />
          <div className="picker-step-content">
            <label className="picker-label" htmlFor="dog-weight">Your Dog's Weight</label>
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

        {availableSizes.length > 1 && (
          <div className="picker-step">
            <div className="picker-step-content">
              <p className="picker-customize-intro">Want a different delivery? Just select below.</p>
              <div className="picker-fields-row">
                <div className="picker-field">
                  <label className="picker-label" htmlFor="bag-size">Bag size</label>
                  <select
                    id="bag-size"
                    className="picker-select"
                    value={selectedBagKg}
                    onChange={(e) => onBagSizeChange(Number(e.target.value))}
                  >
                    {availableSizes.map((size) => (
                      <option key={size} value={size}>
                        {size}kg
                      </option>
                    ))}
                  </select>
                </div>
                {availableFrequencies.length > 1 && (
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
                )}
              </div>
            </div>
          </div>
        )}

        <div className="picker-step picker-step--cta">
          <StepNumber n={2} />
          <div className="picker-step-content">
            {selectedPrice && (
              <div className="picker-recommendation">
                <p className="picker-rec-label">Your plan</p>
                <div className="picker-rec-card">
                  <span className="picker-rec-title">
                    {selectedBagKg}kg bag · every {frequencyMonths === 1 ? 'month' : `${frequencyMonths} months`}
                  </span>
                  <span className="picker-rec-price">{selectedPrice}</span>
                  {(selectedRetail || savingsFormatted) && (
                    <div className="picker-rec-savings-row">
                      {selectedRetail && (
                        <span className="picker-rec-retail">was {selectedRetail}</span>
                      )}
                      {savingsFormatted && (
                        <span className="picker-rec-save">save {savingsFormatted}</span>
                      )}
                    </div>
                  )}
                  {giftLabel && (
                    <div className="picker-rec-gift">
                      <span className="picker-rec-gift-label">🎁 {giftLabel}</span>
                      <span className="picker-rec-gift-price">INCLUDED FREE</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {cartError && <p className="picker-error">{cartError}</p>}

            <p className="picker-adjust-note">
              You know your dog's consumption best so adjust as you see fit
            </p>

            <button
              className="btn-order reactivation-cta"
              onClick={onCheckout}
              disabled={isSubmitting || !selectedPrice}
            >
              {isSubmitting ? 'Working…' : 'Buy now to save 25%'}
            </button>
            <p className="reactivation-finefoot">{finePrint}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
