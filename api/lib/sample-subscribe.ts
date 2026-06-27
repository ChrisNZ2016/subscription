/**
 * Sample-to-subscription webhook (MVP — native Shopify subscription only).
 *
 * The two-tier Shopify selling plan creates a real subscription contract at
 * checkout (sample SKU, "$19.99 then $X discounted"). We listen for
 * `subscription_contracts/create` (which fires once the contract exists, after
 * the order) and swap the contract's line from the sample variant to the REAL
 * kibble-pack variant at the same discounted price, so renewals ship the right
 * SKU.
 *
 * No RecurPay API call (that triggers a non-suppressible customer email) and no
 * contract cancellation — the Shopify contract is kept and corrected in place.
 * See docs/sample-to-subscription-mvp.md.
 */

import {
  getContractFirstLine,
  swapSubscriptionProduct,
  orderHasProcessedTag,
  tagOrderProcessed,
} from './shopify-admin.js';

const REAL_VARIANT_IDS: Record<number, number> = {
  2: 46960290136213,
  4: 46960290168981,
  6: 46960290234517,
  8: 46960290201749,
  12: 47483433746581,
  24: 47483433779349,
};

/**
 * Reverse map: sample ProductVariant numeric id → size kg. Lets us derive the
 * size from the contract's own line (the sample variant) without note attributes.
 * Keep in sync with src/constants/sample-subscribe.ts SAMPLE_VARIANT_GIDS.
 */
const SAMPLE_VARIANT_TO_SIZE: Record<string, number> = {
  '46938321223829': 2,
  '46938321256597': 4,
  '46938321322133': 6,
  '46938321289365': 8,
  '47496832352405': 12,
  '47496832385173': 24,
};

const DISCOUNTED_25: Record<number, number> = {
  2: 41.25,
  4: 72,
  6: 94.5,
  8: 111,
  12: 148.5,
  24: 262.5,
};

const DISCOUNTED_20: Record<number, number> = {
  2: 44,
  4: 76.8,
  6: 100.8,
  8: 118.4,
  12: 158.4,
  24: 280,
};

function getDiscountedPrice(sizeKg: number, tier: '25' | '20'): number {
  const table = tier === '25' ? DISCOUNTED_25 : DISCOUNTED_20;
  const price = table[sizeKg];
  if (price === undefined) throw new Error(`No discounted price for ${sizeKg}kg tier ${tier}`);
  return price;
}

/** Numeric id from a ProductVariant gid (or a bare numeric string). */
function variantNumericId(gidOrId: string | null): string | null {
  if (!gidOrId) return null;
  const m = gidOrId.match(/(\d+)$/);
  return m ? m[1] : null;
}

export interface SubscriptionContractCreated {
  /** gid://shopify/SubscriptionContract/... */
  contractGid: string;
  /** numeric origin order id (for idempotency tag + tier lookup) */
  originOrderId: number | null;
}

/**
 * Handle subscription_contracts/create: if the contract's line is one of our
 * sample variants, swap it to the real kibble-pack bag at the discounted price.
 * Idempotent via the origin order's `sample_subscribe_processed` tag.
 */
export async function processSampleSubscribeContract(
  event: SubscriptionContractCreated,
): Promise<{ skipped: boolean; reason?: string; contractId?: string; realVariantId?: number }> {
  const line = await getContractFirstLine(event.contractGid);
  if (!line) return { skipped: true, reason: 'no contract line' };

  const sampleVariantId = variantNumericId(line.variantId);
  const sizeKg = sampleVariantId ? SAMPLE_VARIANT_TO_SIZE[sampleVariantId] : undefined;
  if (!sizeKg) {
    // Not one of our sample variants — some other subscription. Ignore.
    return { skipped: true, reason: 'not a sample-subscribe contract' };
  }

  // Idempotency: tag the origin order once swapped (re-deliveries are no-ops).
  if (event.originOrderId && (await orderHasProcessedTag(event.originOrderId))) {
    return { skipped: true, reason: 'already processed' };
  }

  // The /sample-subscribe page is always 25% off, so the tier is fixed here.
  // (If a 20% page is added later, read ss_tier off the order — requires the
  // read_orders scope and getOrderSampleSubscribeAttrs.)
  const tier: '25' | '20' = '25';

  const realVariantId = REAL_VARIANT_IDS[sizeKg];
  if (!realVariantId) throw new Error(`No real variant for ${sizeKg}kg`);
  const discountedPrice = getDiscountedPrice(sizeKg, tier);

  await swapSubscriptionProduct(line.contractId, line.lineId, realVariantId, discountedPrice);
  console.log(
    `Swapped contract ${line.contractId} (order ${event.originOrderId}) → real ${sizeKg}kg variant ${realVariantId} @ ${discountedPrice} (${tier}% tier)`,
  );

  if (event.originOrderId) await tagOrderProcessed(event.originOrderId);

  return { skipped: false, contractId: line.contractId, realVariantId };
}
