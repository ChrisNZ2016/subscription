import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import type { ProductVariant } from '../types/shopify';
import { formatMoney } from '../lib/pricing';
import {
  DOG_WEIGHT_RANGES,
  getBagSizeForWeightRange,
  parseVariantBagKg,
} from '../lib/feedingGuide';
import { trackVariantSelected, trackCheckoutStarted, trackCtaClicked } from '../lib/analytics';
import { shopifyGidToContentId, trackMetaViewContent } from '../lib/meta-pixel';

interface UseSubscriptionBagSelectionOptions {
  variants: ProductVariant[];
  getPrice: (variant: ProductVariant) => string | undefined;
  getPriceAmount: (variant: ProductVariant) => number | undefined;
  createCart: (variantId: string) => Promise<string>;
  createCartAndRedirect: (
    variantId: string,
    value?: number,
    prefetchedUrl?: string,
  ) => Promise<void>;
}

export function useSubscriptionBagSelection({
  variants,
  getPrice,
  getPriceAmount,
  createCart,
  createCartAndRedirect,
}: UseSubscriptionBagSelectionOptions) {
  const [weightRangeId, setWeightRangeId] = useState(DOG_WEIGHT_RANGES[2].id);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cartError, setCartError] = useState<string | null>(null);
  const prefetchedUrls = useRef<Record<string, string>>({});
  const isFirstSelection = useRef(true);

  const recommendedBagKg = useMemo(
    () => getBagSizeForWeightRange(weightRangeId),
    [weightRangeId],
  );

  const selectedVariant = useMemo(() => {
    const sorted = [...variants].sort(
      (a, b) => parseVariantBagKg(a.title) - parseVariantBagKg(b.title),
    );
    const exact = sorted.find((v) => parseVariantBagKg(v.title) === recommendedBagKg);
    if (exact) return exact;
    const adequate = sorted.find((v) => parseVariantBagKg(v.title) >= recommendedBagKg);
    return adequate ?? sorted[sorted.length - 1] ?? null;
  }, [variants, recommendedBagKg]);

  const selectedPrice = selectedVariant ? getPrice(selectedVariant) : undefined;
  const selectedRetail = selectedVariant ? formatMoney(selectedVariant.price) : undefined;
  const selectedBagKg = selectedVariant ? parseVariantBagKg(selectedVariant.title) : recommendedBagKg;

  const savingsFormatted = useMemo(() => {
    if (!selectedVariant) return undefined;
    const retail = parseFloat(selectedVariant.price.amount);
    const sub = getPriceAmount(selectedVariant);
    if (sub === undefined || retail <= sub) return undefined;
    return formatMoney({ amount: String(retail - sub), currencyCode: 'NZD' });
  }, [selectedVariant, getPriceAmount]);

  useEffect(() => {
    if (!selectedVariant) return;
    trackVariantSelected({
      bagWeight: parseVariantBagKg(selectedVariant.title),
      price: getPrice(selectedVariant) ?? '',
      frequencyWeeks: 4,
      source: isFirstSelection.current ? 'default' : 'user',
    });
    isFirstSelection.current = false;
  }, [weightRangeId, selectedVariant, getPrice]);

  useEffect(() => {
    if (!selectedVariant || prefetchedUrls.current[selectedVariant.id]) return;
    const id = selectedVariant.id;
    createCart(id)
      .then((url) => { prefetchedUrls.current[id] = url; })
      .catch(() => { /* fall back to creating the cart at click time */ });
  }, [selectedVariant, createCart]);

  useEffect(() => {
    if (!selectedVariant) return;
    trackMetaViewContent({
      contentIds: [shopifyGidToContentId(selectedVariant.id)],
      value: getPriceAmount(selectedVariant),
      currency: 'NZD',
    });
  }, [selectedVariant, getPriceAmount]);

  const handleCheckout = useCallback(async () => {
    if (!selectedVariant) return;
    trackCtaClicked('picker');
    setIsSubmitting(true);
    setCartError(null);
    try {
      const checkoutValue = getPriceAmount(selectedVariant);
      trackCheckoutStarted({
        samplePrice: selectedPrice ?? '',
        bagWeight: parseVariantBagKg(selectedVariant.title),
        frequencyWeeks: 4,
        addonCount: 0,
        contentIds: [shopifyGidToContentId(selectedVariant.id)],
        value: checkoutValue,
      });
      await createCartAndRedirect(
        selectedVariant.id,
        checkoutValue,
        prefetchedUrls.current[selectedVariant.id],
      );
    } catch (err) {
      setCartError(err instanceof Error ? err.message : 'Failed to create cart');
      setIsSubmitting(false);
    }
  }, [selectedVariant, selectedPrice, getPriceAmount, createCartAndRedirect]);

  return {
    weightRangeId,
    setWeightRangeId,
    selectedBagKg,
    selectedPrice,
    selectedRetail,
    savingsFormatted,
    isSubmitting,
    cartError,
    handleCheckout,
  };
}

interface SubscriptionBagPickerProps {
  weightRangeId: string;
  setWeightRangeId: (id: string) => void;
  selectedBagKg: number;
  selectedPrice?: string;
  selectedRetail?: string;
  savingsFormatted?: string;
  isSubmitting: boolean;
  cartError: string | null;
  onCheckout: () => void;
  finePrint: string;
}

function StepNumber({ n }: { n: number }) {
  return <span className="picker-step-num" aria-hidden="true">{n}</span>;
}

export function SubscriptionBagPicker({
  weightRangeId,
  setWeightRangeId,
  selectedBagKg,
  selectedPrice,
  selectedRetail,
  savingsFormatted,
  isSubmitting,
  cartError,
  onCheckout,
  finePrint,
}: SubscriptionBagPickerProps) {
  return (
    <section className="subscription-picker-primary" id="subscribe">
      <div className="subscription-picker-inner">
        <h2>Build your subscription</h2>
        <p className="picker-subtitle">
          Pick your dog's weight and we'll recommend the right bag for a 4-week delivery.
        </p>

        <div className="picker-step">
          <StepNumber n={1} />
          <div className="picker-step-content">
            <label className="picker-label" htmlFor="dog-weight">Your Dog's Weight</label>
            <select
              id="dog-weight"
              className="picker-select"
              value={weightRangeId}
              onChange={(e) => setWeightRangeId(e.target.value)}
            >
              {DOG_WEIGHT_RANGES.map((range) => (
                <option key={range.id} value={range.id}>
                  {range.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="picker-step picker-step--cta">
          <StepNumber n={2} />
          <div className="picker-step-content">
            {selectedPrice && (
              <div className="picker-recommendation">
                <p className="picker-rec-label">Your plan</p>
                <div className="picker-rec-card">
                  <span className="picker-rec-title">
                    {selectedBagKg}kg bag · every 4 weeks
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
