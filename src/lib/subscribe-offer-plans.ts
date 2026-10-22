import type { ProductVariant, SellingPlanAllocation } from '../types/shopify';
import { EARLY_SUBSCRIBER_SELLING_PLAN_IDS } from './cart-subscribe';
import type { FrequencyMonths } from '../constants/sample-subscribe';

/** Map of delivery interval (months) to the selling plan that backs an offer. */
export type OfferPlanIds = Record<FrequencyMonths, string>;

export function findEarlySubscriberAllocation(
  variant: ProductVariant,
  frequencyMonths: FrequencyMonths,
  planIds: OfferPlanIds = EARLY_SUBSCRIBER_SELLING_PLAN_IDS,
): SellingPlanAllocation | undefined {
  // Match by explicit plan ID per frequency. The 25%-off plans that back this
  // offer can't be matched by name: only the 1-month plan is named "early
  // subscriber", and the 2-/3-month legs share names with a 20%-off group.
  const planId = planIds[frequencyMonths];
  return variant.sellingPlanAllocations.nodes.find(
    (node) => node.sellingPlan.id === planId,
  );
}

export function getEarlySubscriberSellingPlanId(
  variant: ProductVariant,
  frequencyMonths: FrequencyMonths,
  planIds: OfferPlanIds = EARLY_SUBSCRIBER_SELLING_PLAN_IDS,
): string | undefined {
  return findEarlySubscriberAllocation(variant, frequencyMonths, planIds)?.sellingPlan.id;
}
