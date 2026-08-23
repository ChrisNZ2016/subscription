import type { ProductVariant, SellingPlanAllocation } from '../types/shopify';
import { REACTIVATION_SELLING_PLAN_IDS } from './cart-reactivation';
import type { FrequencyMonths } from '../constants/sample-subscribe';

export function findReactivationAllocation(
  variant: ProductVariant,
  frequencyMonths: FrequencyMonths,
): SellingPlanAllocation | undefined {
  // Match by explicit plan ID per frequency. The 25%-off reactivation plans
  // can't be matched by name: the 2-/3-month legs share their names with a
  // 20%-off group, so a name lookup would quietly halve the discount.
  const planId = REACTIVATION_SELLING_PLAN_IDS[frequencyMonths];
  return variant.sellingPlanAllocations.nodes.find(
    (node) => node.sellingPlan.id === planId,
  );
}

export function getReactivationSellingPlanId(
  variant: ProductVariant,
  frequencyMonths: FrequencyMonths,
): string | undefined {
  return findReactivationAllocation(variant, frequencyMonths)?.sellingPlan.id;
}
