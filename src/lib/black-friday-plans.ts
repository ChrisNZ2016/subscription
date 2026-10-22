import type { FrequencyMonths } from '../constants/sample-subscribe';

/**
 * Black Friday 2026: subscribe to the kibble on the standard 20% plan and a
 * 5-pack of compostable poop bags (LGD-60-NZ) rides along free in every
 * delivery for 12 months.
 *
 * Two separate selling plans are involved, and they must share a delivery
 * interval or RecurPay builds two contracts on different schedules instead of
 * one contract with two lines.
 */

/** The public 20%-off group on the kibble-pack product (RP_PLAN_11149264 et al). */
export const BF_KIBBLE_SELLING_PLAN_IDS: Record<FrequencyMonths, string> = {
  1: 'gid://shopify/SellingPlan/2905571477',
  2: 'gid://shopify/SellingPlan/3145498773',
  3: 'gid://shopify/SellingPlan/3145531541',
};

/** The 5-pack poop bag variant that ships as the gift. */
export const BF_GIFT_VARIANT_ID = 'gid://shopify/ProductVariant/10597438849060';

/** Storefront handle for the poop bag product the gift variant belongs to. */
export const BF_GIFT_PRODUCT_HANDLE =
  import.meta.env.VITE_BF_GIFT_PRODUCT_HANDLE || 'compostable-poop-bags-5-pack-60-bags';

/**
 * The 100%-off gift plans: Shopify selling plan group 4758044821,
 * merchantCode RP_PLAN_11152968 / 11152969 / 11152970.
 *
 * Verified 23 Oct 2026: the group is attached to exactly one product, the
 * 5-pack poop bags, and NOT to the kibble. That matters, because a 100%-off
 * plan on the kibble product would give the food away. Re-check that if the
 * plan is ever edited:
 *
 *   { sellingPlanGroup(id: "gid://shopify/SellingPlanGroup/4758044821") {
 *       productsCount { count } products(first: 10) { edges { node { title } } } } }
 *
 * Billing and delivery intervals both match the kibble legs (1/2/3 months).
 * The page refuses to sell if any of these are blank, rather than quietly
 * taking a subscription without the gift attached.
 */
export const BF_GIFT_SELLING_PLAN_IDS: Record<FrequencyMonths, string> = {
  1: 'gid://shopify/SellingPlan/7345012885',
  2: 'gid://shopify/SellingPlan/7345045653',
  3: 'gid://shopify/SellingPlan/7345078421',
};

export function getGiftSellingPlanId(frequencyMonths: FrequencyMonths): string | undefined {
  return BF_GIFT_SELLING_PLAN_IDS[frequencyMonths] || undefined;
}

/** True once every interval the kibble offers has a matching gift plan. */
export function isGiftOfferConfigured(): boolean {
  return ([1, 2, 3] as FrequencyMonths[]).every((m) => Boolean(BF_GIFT_SELLING_PLAN_IDS[m]));
}
