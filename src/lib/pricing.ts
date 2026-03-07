import type { Product, MoneyV2 } from '../types/shopify';

export interface SubscriptionPricing {
  /** Per-delivery subscription price */
  price: MoneyV2;
  /** Retail / compare-at price (before subscription discount) */
  retailPrice: MoneyV2 | null;
  /** Dollar amount saved per delivery */
  savingsAmount: number;
  /** Percentage saved vs retail */
  savingsPercent: number;
}

/**
 * Finds the variant on the subscription product that matches the given bag weight.
 * Matches by variant title containing the weight (e.g. "2kg", "6kg").
 */
function findVariantByWeight(product: Product, bagWeight: number) {
  const weightStr = `${bagWeight}kg`;
  return product.variants.nodes.find(
    (v) => v.title.toLowerCase().includes(weightStr.toLowerCase()),
  );
}

/**
 * Gets subscription pricing for a given bag weight from the ongoing subscription product.
 * Returns price, retail price, and savings info.
 */
export function getSubscriptionPricing(
  subscriptionProduct: Product,
  bagWeight: number,
): SubscriptionPricing | null {
  const variant = findVariantByWeight(subscriptionProduct, bagWeight);
  if (!variant) return null;

  // Prefer the selling plan allocation price (subscription discount applied)
  const allocation = variant.sellingPlanAllocations.nodes[0];

  const price = allocation
    ? allocation.priceAdjustments[0].perDeliveryPrice
    : variant.price;

  // Retail price: compareAtPrice from allocation, then variant compareAtPrice, then variant base price
  const retailPrice = allocation
    ? allocation.priceAdjustments[0].compareAtPrice
    : variant.compareAtPrice ?? variant.price;

  const priceNum = parseFloat(price.amount);
  const retailNum = retailPrice ? parseFloat(retailPrice.amount) : priceNum;

  const savingsAmount = retailNum - priceNum;
  const savingsPercent = retailNum > 0 ? Math.round((savingsAmount / retailNum) * 100) : 0;

  return {
    price,
    retailPrice: savingsAmount > 0 ? retailPrice : null,
    savingsAmount,
    savingsPercent,
  };
}

/** Format a MoneyV2 value for display */
export function formatMoney(money: MoneyV2): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: money.currencyCode,
  }).format(parseFloat(money.amount));
}
