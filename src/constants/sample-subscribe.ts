/** Sample-to-subscription funnel IDs and pricing (see docs/sample-to-subscription-plan.md). */

export const SAMPLE_PRICE = 19.99;
export const DEFAULT_DISCOUNT_TIER = '25' as const;

export type DiscountTier = '25' | '20';
export type FrequencyMonths = 1 | 2 | 3;

/** Sample variants on the kibble product (2/4/6/8/12/24 kg). */
export const SAMPLE_BAG_SIZES = [2, 4, 6, 8, 12, 24] as const;
export type SampleBagSizeKg = (typeof SAMPLE_BAG_SIZES)[number];

export const FREQUENCY_MONTHS_OPTIONS: FrequencyMonths[] = [1, 2, 3];

export const SAMPLE_VARIANT_GIDS: Record<SampleBagSizeKg, string> = {
  2: 'gid://shopify/ProductVariant/46938321223829',
  4: 'gid://shopify/ProductVariant/46938321256597',
  6: 'gid://shopify/ProductVariant/46938321322133',
  8: 'gid://shopify/ProductVariant/46938321289365',
  12: 'gid://shopify/ProductVariant/47496832352405',
  24: 'gid://shopify/ProductVariant/47496832385173',
};

/** Real kibble-pack variant IDs (numeric) for RecurPay API. */
export const REAL_VARIANT_IDS: Record<number, number> = {
  2: 46960290136213,
  4: 46960290168981,
  6: 46960290234517,
  8: 46960290201749,
  12: 47483433746581,
  24: 47483433779349,
};

const DISCOUNTED_PRICES_25: Record<number, number> = {
  2: 41.25,
  4: 72,
  6: 94.5,
  8: 111,
  12: 148.5,
  24: 262.5,
};

const DISCOUNTED_PRICES_20: Record<number, number> = {
  2: 44,
  4: 76.8,
  6: 100.8,
  8: 118.4,
  12: 158.4,
  24: 280,
};

export function getDiscountedPrice(sizeKg: number, tier: DiscountTier = DEFAULT_DISCOUNT_TIER): number {
  const table = tier === '25' ? DISCOUNTED_PRICES_25 : DISCOUNTED_PRICES_20;
  const price = table[sizeKg];
  if (price === undefined) {
    throw new Error(`No discounted price for ${sizeKg}kg tier ${tier}`);
  }
  return price;
}

export function formatSampleSubscribeKey(
  sizeKg: number,
  frequencyMonths: FrequencyMonths,
  tier: DiscountTier = DEFAULT_DISCOUNT_TIER,
): string {
  return `${sizeKg}-${frequencyMonths}-${tier}`;
}

/**
 * Two-tier Shopify selling plans on sample variants.
 * Populated by `node scripts/create-sample-subscribe-plans.mjs`.
 */
export const SELLING_PLAN_GIDS: Record<string, string> = {
  '2-1-25': 'gid://shopify/SellingPlan/3145859221',
  '2-2-25': 'gid://shopify/SellingPlan/3145891989',
  '2-3-25': 'gid://shopify/SellingPlan/3145924757',
  '4-1-25': 'gid://shopify/SellingPlan/3145957525',
  '4-2-25': 'gid://shopify/SellingPlan/3145990293',
  '4-3-25': 'gid://shopify/SellingPlan/3146023061',
  '6-1-25': 'gid://shopify/SellingPlan/3146055829',
  '6-2-25': 'gid://shopify/SellingPlan/3146088597',
  '6-3-25': 'gid://shopify/SellingPlan/3146121365',
  '8-1-25': 'gid://shopify/SellingPlan/3146154133',
  '8-2-25': 'gid://shopify/SellingPlan/3146186901',
  '8-3-25': 'gid://shopify/SellingPlan/3146219669',
  '12-1-25': 'gid://shopify/SellingPlan/3146252437',
  '12-2-25': 'gid://shopify/SellingPlan/3146285205',
  '12-3-25': 'gid://shopify/SellingPlan/3146317973',
  '24-1-25': 'gid://shopify/SellingPlan/3146350741',
  '24-2-25': 'gid://shopify/SellingPlan/3146383509',
  '24-3-25': 'gid://shopify/SellingPlan/3146416277',
};

export interface SampleSubscribeSelection {
  sizeKg: SampleBagSizeKg;
  frequencyMonths: FrequencyMonths;
  tier?: DiscountTier;
}

export function getSampleVariantGid(sizeKg: SampleBagSizeKg): string {
  return SAMPLE_VARIANT_GIDS[sizeKg];
}

export function getSellingPlanGid(
  sizeKg: SampleBagSizeKg,
  frequencyMonths: FrequencyMonths,
  tier: DiscountTier = DEFAULT_DISCOUNT_TIER,
): string {
  const key = formatSampleSubscribeKey(sizeKg, frequencyMonths, tier);
  const gid = SELLING_PLAN_GIDS[key];
  if (!gid) {
    throw new Error(`Missing selling plan for ${sizeKg}kg every ${frequencyMonths} month(s)`);
  }
  return gid;
}

function formatPrice(amount: number): string {
  const isWhole = amount % 1 === 0;
  return `$${isWhole ? amount.toFixed(0) : amount.toFixed(2)}`;
}

export function getRetailPrice(sizeKg: number, tier: DiscountTier = DEFAULT_DISCOUNT_TIER): number {
  const discountRate = tier === '25' ? 0.25 : 0.2;
  return getDiscountedPrice(sizeKg, tier) / (1 - discountRate);
}

export function formatRecurringPrice(sizeKg: number, tier: DiscountTier = DEFAULT_DISCOUNT_TIER): string {
  return formatPrice(getDiscountedPrice(sizeKg, tier));
}

export function formatRetailPrice(sizeKg: number, tier: DiscountTier = DEFAULT_DISCOUNT_TIER): string {
  return formatPrice(getRetailPrice(sizeKg, tier));
}

export function formatRecurringSavings(sizeKg: number, tier: DiscountTier = DEFAULT_DISCOUNT_TIER): string {
  return formatPrice(getRetailPrice(sizeKg, tier) - getDiscountedPrice(sizeKg, tier));
}

export function formatCheckoutSummary(
  sizeKg: number,
  frequencyMonths: FrequencyMonths,
  tier: DiscountTier = DEFAULT_DISCOUNT_TIER,
): string {
  const recurring = formatRecurringPrice(sizeKg, tier);
  const freqLabel = frequencyMonths === 1 ? 'month' : `${frequencyMonths} months`;
  return `First $${SAMPLE_PRICE.toFixed(2)}, then ${recurring} every ${freqLabel}`;
}
