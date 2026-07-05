import type { ProductVariant, SellingPlanAllocation } from '../types/shopify';
import { EARLY_SUBSCRIBER_SELLING_PLAN_ID } from './cart-subscribe';
import type { FrequencyMonths } from '../constants/sample-subscribe';

export function parseFrequencyMonthsFromPlanName(name: string): number | null {
  const match = name.match(/(\d+)\s*Month/i);
  return match ? parseInt(match[1], 10) : null;
}

function isEarlySubscriberPlan(name: string): boolean {
  return name.toLowerCase().includes('early');
}

export function findEarlySubscriberAllocation(
  variant: ProductVariant,
  frequencyMonths: FrequencyMonths,
): SellingPlanAllocation | undefined {
  const byFrequency = variant.sellingPlanAllocations.nodes.find((node) => {
    if (!isEarlySubscriberPlan(node.sellingPlan.name)) return false;
    return parseFrequencyMonthsFromPlanName(node.sellingPlan.name) === frequencyMonths;
  });
  if (byFrequency) return byFrequency;

  if (frequencyMonths === 1) {
    return variant.sellingPlanAllocations.nodes.find(
      (node) => node.sellingPlan.id === EARLY_SUBSCRIBER_SELLING_PLAN_ID,
    );
  }

  return undefined;
}

export function getEarlySubscriberSellingPlanId(
  variant: ProductVariant,
  frequencyMonths: FrequencyMonths,
): string | undefined {
  return findEarlySubscriberAllocation(variant, frequencyMonths)?.sellingPlan.id;
}
