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

  const samplePriceMoney = sampleAllocation
    ? sampleAllocation.priceAdjustments[0].perDeliveryPrice
    : sampleVariant?.price;

  // Compare-at for the sample: use the 2kg variant price from the full-price kibble-pack product
  const kibblePack2kgVariant = subscriptionProduct?.variants.nodes.find(
    (v) => v.title.toLowerCase().includes('2kg'),
  );
  const sampleCompareMoney =
    kibblePack2kgVariant?.compareAtPrice ??
    kibblePack2kgVariant?.price ??
    (sampleAllocation
      ? sampleAllocation.priceAdjustments[0].compareAtPrice
      : sampleVariant?.compareAtPrice ?? null);

  // Compute order totals (actual + compare-at)
  let orderTotal = samplePriceMoney ? parseFloat(samplePriceMoney.amount) : 0;
  let orderCompareTotal = sampleCompareMoney ? parseFloat(sampleCompareMoney.amount) : orderTotal;

  const addonLines = selectedAddons.map((addon) => {
    const product = addonProducts.find((p) =>
      p.variants.nodes.some((v) => v.id === addon.variantId),
    );
    if (!product) return null;
    const variant = product.variants.nodes.find((v) => v.id === addon.variantId);
    const allocation = variant?.sellingPlanAllocations.nodes[0];
    const priceMoney = allocation
      ? allocation.priceAdjustments[0].perDeliveryPrice
      : variant?.price;
    // Compare-at: prefer variant.compareAtPrice, then fall back to the regular
    // variant price (when a subscription discount is applied via selling plan)
    const compareMoney =
      variant?.compareAtPrice ??
      (allocation && variant ? variant.price : null);
    const lineTotal = priceMoney ? parseFloat(priceMoney.amount) * addon.quantity : 0;
    const lineCompare = compareMoney
      ? parseFloat(compareMoney.amount) * addon.quantity
      : lineTotal;
    orderTotal += lineTotal;
    orderCompareTotal += lineCompare;
    return { product, addon, priceMoney, compareMoney };
  }).filter(Boolean) as {
    product: Product;
    addon: AddonSelection;
    priceMoney: typeof samplePriceMoney;
    compareMoney: { amount: string; currencyCode: string } | null;
  }[];

  const subscriptionPricing = subscriptionProduct
    ? getSubscriptionPricing(subscriptionProduct, bagWeight)
    : null;

  const fmt = (n: number) => '$' + (n % 1 === 0 ? n.toFixed(0) : n.toFixed(2));
  const showCompareTotal = orderCompareTotal > orderTotal;

  return (
    <section className="step" id="summary">
      <div className="step-inner">
        <h2>Your order</h2>

        <div className="summary-promise">
          Not sure yet? Our Sensitivity Promise means you can get a full refund
          if it's not the right fit — just reach out.
        </div>

        {/* ── Today's order ── */}
        <div className="summary-card">
          <p className="summary-section-label">Today's order</p>

          <div className="summary-line">
            <div>
              <strong>2kg Sample Box</strong>
              <span className="summary-detail">One-time trial at 50% off</span>
            </div>
            <div className="summary-price">
              {samplePriceMoney && (
                <span className="price-current">{formatMoney(samplePriceMoney)}</span>
              )}
              {sampleCompareMoney && (
                <span className="price-compare">{formatMoney(sampleCompareMoney)}</span>
              )}
            </div>
          </div>

          {addonLines.map(({ product, addon, priceMoney, compareMoney }) => {
            const hasDiscount = compareMoney && priceMoney &&
              parseFloat(compareMoney.amount) > parseFloat(priceMoney.amount);
            return (
              <div key={addon.variantId} className="summary-line">
                <div>
                  <strong>{product.title}</strong>
                  {addon.quantity > 1 && (
                    <span className="summary-detail">x{addon.quantity}</span>
                  )}
                  <span className="summary-detail">Added to your order</span>
                </div>
                <div className="summary-price">
                  {priceMoney && (
                    <span className="price-current">{formatMoney(priceMoney)}</span>
                  )}
                  {hasDiscount && (
                    <span className="price-compare">{formatMoney(compareMoney!)}</span>
                  )}
                </div>
              </div>
            );
          })}

          <hr />

          <div className="summary-line summary-total">
            <div>
              <strong>Today's total</strong>
              <span className="summary-detail">+ shipping calculated at checkout</span>
            </div>
            <div className="summary-price">
              <span className="price-current">{fmt(orderTotal)}</span>
              {showCompareTotal && (
                <span className="price-compare">{fmt(orderCompareTotal)}</span>
              )}
            </div>
          </div>
        </div>

        {/* ── Ongoing subscription ── */}
        <div className="summary-card summary-card--ongoing">
          <p className="summary-section-label">Ongoing subscription</p>

          <div className="summary-line">
            <div>
              <strong>{bagWeight}kg bag</strong>
              <span className="summary-detail">
                Every {frequencyWeeks} {frequencyWeeks === 1 ? 'week' : 'weeks'}, starting after your sample
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
                <span className="price-note">Price per delivery</span>
              )}
            </div>
          </div>

          {addonLines.map(({ product, addon, priceMoney, compareMoney }) => {
            const hasDiscount = compareMoney && priceMoney &&
              parseFloat(compareMoney.amount) > parseFloat(priceMoney.amount);
            return (
              <div key={addon.variantId} className="summary-line">
                <div>
                  <strong>{product.title}</strong>
                  {addon.quantity > 1 && (
                    <span className="summary-detail">x{addon.quantity}</span>
                  )}
                </div>
                <div className="summary-price">
                  {priceMoney && (
                    <span className="price-current">{formatMoney(priceMoney)}</span>
                  )}
                  {hasDiscount && (
                    <span className="price-compare">{formatMoney(compareMoney!)}</span>
                  )}
                </div>
              </div>
            );
          })}

          <p className="summary-shipping-note">+ shipping, calculated at checkout</p>
        </div>

        {error && <p className="error-message">{error}</p>}

        <button
          className="btn-order btn-checkout"
          onClick={onCheckout}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Redirecting to checkout...' : 'Checkout'}
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
