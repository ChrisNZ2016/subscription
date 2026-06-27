import { storefrontQuery } from './shopify';
import { getDistinctId } from './analytics';
import {
  finishCheckoutRedirect,
  getMetaCartAttributes,
  shopifyGidToContentId,
} from './meta-pixel';
import { getPageAttributionCartAttributes } from './page-attribution';
import { getUtmCartAttributes } from './utm';
import type { CartCreateResponse } from '../types/shopify';
import type { DiscountTier, FrequencyMonths, SampleBagSizeKg } from '../constants/sample-subscribe';
import {
  DEFAULT_DISCOUNT_TIER,
  getSampleVariantGid,
  getSellingPlanGid,
} from '../constants/sample-subscribe';

const CART_CREATE_MUTATION = `
  mutation CartCreate($lines: [CartLineInput!]!, $attributes: [AttributeInput!]) {
    cartCreate(input: { lines: $lines, attributes: $attributes }) {
      cart {
        id
        checkoutUrl
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export interface SampleSubscribeCartSelection {
  sizeKg: SampleBagSizeKg;
  frequencyMonths: FrequencyMonths;
  tier?: DiscountTier;
}

// Cart-level attributes flow privately to order.note_attributes (not shown to the
// customer). We do NOT also attach these to the line item: Shopify renders
// line-item attributes as visible properties in the cart/checkout, and the
// subscription webhook derives size/tier from the contract's own variant, so the
// line-item copy was leaking internal metadata into the UI for no functional gain.
function buildCartAttributes(selection: SampleSubscribeCartSelection) {
  const tier = selection.tier ?? DEFAULT_DISCOUNT_TIER;
  return [
    { key: 'sample_subscribe', value: 'v1' },
    { key: 'ss_size', value: `${selection.sizeKg}kg` },
    { key: 'ss_frequency_months', value: String(selection.frequencyMonths) },
    { key: 'ss_tier', value: tier },
    { key: 'mp_distinct_id', value: getDistinctId() },
    ...getPageAttributionCartAttributes(),
    ...getMetaCartAttributes(),
    ...getUtmCartAttributes(),
  ];
}

export function sampleSubscribeCartKey(selection: SampleSubscribeCartSelection): string {
  const tier = selection.tier ?? DEFAULT_DISCOUNT_TIER;
  return `${selection.sizeKg}-${selection.frequencyMonths}-${tier}`;
}

export async function createSampleSubscribeCart(
  selection: SampleSubscribeCartSelection,
): Promise<string> {
  const tier = selection.tier ?? DEFAULT_DISCOUNT_TIER;
  const sampleVariantId = getSampleVariantGid(selection.sizeKg);
  const sellingPlanId = getSellingPlanGid(selection.sizeKg, selection.frequencyMonths, tier);
  const attributes = buildCartAttributes(selection);

  const lines = [{
    merchandiseId: sampleVariantId,
    quantity: 1,
    sellingPlanId,
  }];

  const data = await storefrontQuery<CartCreateResponse>(CART_CREATE_MUTATION, { lines, attributes });

  if (data.cartCreate.userErrors.length > 0) {
    throw new Error(data.cartCreate.userErrors.map((e) => e.message).join(', '));
  }

  return data.cartCreate.cart.checkoutUrl;
}

export async function createSampleSubscribeCartAndRedirect(
  selection: SampleSubscribeCartSelection,
  checkoutValue?: number,
  prefetchedCheckoutUrl?: string,
): Promise<void> {
  const checkoutUrl = prefetchedCheckoutUrl ?? (await createSampleSubscribeCart(selection));
  const sampleVariantId = getSampleVariantGid(selection.sizeKg);

  finishCheckoutRedirect(checkoutUrl, {
    contentIds: [shopifyGidToContentId(sampleVariantId)],
    value: checkoutValue,
    currency: 'NZD',
  });
}
