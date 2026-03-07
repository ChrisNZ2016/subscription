import type { Product } from '../types/shopify';
import type { AddonSelection } from '../lib/cart';
import { getSubscriptionPricing, formatMoney } from '../lib/pricing';

interface OrderSummaryProps {
  sampleProduct: Product;
  subscriptionProduct: Product | null;
  bagWeight: number;
  frequencyWeeks: number;
  selectedAddons: AddonSelection[];
  addonProducts: Product[];
  isSubmitting: boolean;
  error: string | null;
  onCheckout: () => void;
}

export function OrderSummary({
  sampleProduct,
  subscriptionProduct,
  bagWeight,
  frequencyWeeks,
  selectedAddons,
  addonProducts,
  isSubmitting,
  error,
  onCheckout,
}: OrderSummaryProps) {
  const sampleVariant = sampleProduct.variants.nodes[0];
  const sampleAllocation = sampleVariant?.sellingPlanAllocations.nodes[0];

  const samplePrice = sampleAllocation
    ? formatMoney(sampleAllocation.priceAdjustments[0].perDeliveryPrice)
    : sampleVariant
      ? formatMoney(sampleVariant.price)
      : '';

  const sampleComparePrice = sampleAllocation
    ? formatMoney(sampleAllocation.priceAdjustments[0].compareAtPrice)
    : sampleVariant?.compareAtPrice
      ? formatMoney(sampleVariant.compareAtPrice)
      : null;

  const subscriptionPricing = subscriptionProduct
    ? getSubscriptionPricing(subscriptionProduct, bagWeight)
    : null;

  return (
    <section className="step" id="summary">
      <div className="step-inner">
        <h2>Your order</h2>

        <div className="summary-promise">
          Not sure yet? Our Sensitivity Promise means you can get a full refund
          if it's not the right fit — just reach out.
        </div>

        <div className="summary-card">
          <div className="summary-section-label">Today's order</div>

          <div className="summary-line">
            <div>
              <strong>2kg Sample Box</strong>
              <span className="summary-detail">One-time trial at 50% off</span>
            </div>
            <div className="summary-price">
              <span className="price-current">{samplePrice}</span>
              {sampleComparePrice && (
                <span className="price-compare">{sampleComparePrice}</span>
              )}
            </div>
          </div>

          <hr />

          <div className="summary-section-label">Ongoing subscription</div>

          <div className="summary-line summary-subscription">
            <div>
              <strong>{bagWeight}kg bag</strong>
              <span className="summary-detail">
                Every {frequencyWeeks}{' '}
                {frequencyWeeks === 1 ? 'week' : 'weeks'}, starting after your sample
              </span>
            </div>
            <div className="summary-price">
              {subscriptionPricing ? (
                <>
                  <span className="price-current">{formatMoney(subscriptionPricing.price)}</span>
                  {subscriptionPricing.retailPrice && subscriptionPricing.savingsPercent > 0 && (
                    <>
                      <span className="price-compare">{formatMoney(subscriptionPricing.retailPrice)}</span>
                      <span className="price-saving">Save {subscriptionPricing.savingsPercent}%</span>
                    </>
                  )}
                </>
              ) : (
                <span className="price-note">Starts after sample</span>
              )}
            </div>
          </div>

          {selectedAddons.length > 0 && (
            <>
              <hr />
              {selectedAddons.map((addon) => {
                const product = addonProducts.find((p) =>
                  p.variants.nodes.some((v) => v.id === addon.variantId),
                );
                if (!product) return null;

                const variant = product.variants.nodes.find(
                  (v) => v.id === addon.variantId,
                );
                const allocation = variant?.sellingPlanAllocations.nodes[0];
                const price = allocation
                  ? formatMoney(allocation.priceAdjustments[0].perDeliveryPrice)
                  : variant
                    ? formatMoney(variant.price)
                    : '';

                return (
                  <div key={addon.variantId} className="summary-line">
                    <div>
                      <strong>{product.title}</strong>
                      {addon.quantity > 1 && (
                        <span className="summary-detail">
                          x{addon.quantity}
                        </span>
                      )}
                      <span className="summary-detail">Every delivery</span>
                    </div>
                    <div className="summary-price">
                      <span className="price-current">{price}</span>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {error && <p className="error-message">{error}</p>}

        <button
          className="btn-order btn-checkout"
          onClick={onCheckout}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Redirecting to checkout...' : 'Order Now'}
        </button>

        <div className="checkout-trust">
          <span>Secure checkout</span>
          <span>Money-back guarantee</span>
          <span>Cancel anytime</span>
        </div>
      </div>
    </section>
  );
}
