import type { Product } from '../types/shopify';
import type { AddonSelection } from '../lib/cart';

interface OrderSummaryProps {
  sampleProduct: Product;
  bagWeight: number;
  frequencyWeeks: number;
  selectedAddons: AddonSelection[];
  addonProducts: Product[];
  isSubmitting: boolean;
  error: string | null;
  onCheckout: () => void;
}

function formatMoney(money: { amount: string; currencyCode: string }): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: money.currencyCode,
  }).format(parseFloat(money.amount));
}

export function OrderSummary({
  sampleProduct,
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

  return (
    <section className="step" id="summary">
      <div className="step-inner">
        <h2>Your order</h2>

        <div className="summary-promise">
          Not sure yet? Our Sensitivity Promise means you can get a full refund
          if it's not the right fit — just reach out.
        </div>

        <div className="summary-card">
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

          <div className="summary-line summary-subscription">
            <div>
              <strong>Ongoing Subscription</strong>
              <span className="summary-detail">
                {bagWeight}kg bag, every {frequencyWeeks}{' '}
                {frequencyWeeks === 1 ? 'week' : 'weeks'}
              </span>
            </div>
            <div className="summary-price">
              <span className="price-note">Starts after sample</span>
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
          className="btn btn-primary btn-lg btn-checkout"
          onClick={onCheckout}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Redirecting to checkout...' : 'Complete Checkout'}
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
