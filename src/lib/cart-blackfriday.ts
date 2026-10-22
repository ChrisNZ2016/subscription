import { storefrontQuery } from './shopify';
import { getDistinctId } from './analytics';
import {
  finishCheckoutRedirect,
  getMetaCartAttributes,
  shopifyGidToContentId,
} from './meta-pixel';
import { getPageAttributionCartAttributes } from './page-attribution';
import { getUtmCartAttributes } from './utm';
import { BF_GIFT_VARIANT_ID } from './black-friday-plans';
import type { CartCreateResponse, CartLine } from '../types/shopify';

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

export function blackFridayCartKey(
  variantId: string,
  kibbleSellingPlanId: string,
  giftSellingPlanId: string,
): string {
  return `${variantId}:${kibbleSellingPlanId}:${giftSellingPlanId}`;
}

/**
 * Build the two-line Black Friday cart: kibble on the 20% plan, plus the free
 * poop bags on the 100%-off plan at the SAME interval.
 *
 * Both lines carry a selling plan, so both land on one RecurPay contract and
 * the gift recurs with the food. Mismatched intervals split them into two
 * contracts, which is why the interval is passed through rather than defaulted.
 */
export async function createBlackFridayCart(
  variantId: string,
  kibbleSellingPlanId: string,
  giftSellingPlanId: string,
): Promise<string> {
  if (!giftSellingPlanId) {
    throw new Error('Black Friday gift plan is not configured');
  }

  const lines: CartLine[] = [
    {
      merchandiseId: variantId,
      quantity: 1,
      sellingPlanId: kibbleSellingPlanId,
    },
    {
      merchandiseId: BF_GIFT_VARIANT_ID,
      quantity: 1,
      sellingPlanId: giftSellingPlanId,
    },
  ];

  const attributes = [
    { key: 'mp_distinct_id', value: getDistinctId() },
    // Marks the cohort so the free line can be found and removed at 12 months.
    { key: 'bf_gift', value: 'poop-bags-12mo' },
    ...getPageAttributionCartAttributes(),
    ...getMetaCartAttributes(),
    ...getUtmCartAttributes(),
  ];

  const data = await storefrontQuery<CartCreateResponse>(CART_CREATE_MUTATION, {
    lines,
    attributes,
  });

  if (data.cartCreate.userErrors.length > 0) {
    throw new Error(data.cartCreate.userErrors.map((e) => e.message).join(', '));
  }

  return data.cartCreate.cart.checkoutUrl;
}

export async function createBlackFridayCartAndRedirect(
  variantId: string,
  kibbleSellingPlanId: string,
  giftSellingPlanId: string,
  checkoutValue?: number,
  prefetchedCheckoutUrl?: string,
): Promise<void> {
  const checkoutUrl =
    prefetchedCheckoutUrl ??
    (await createBlackFridayCart(variantId, kibbleSellingPlanId, giftSellingPlanId));

  finishCheckoutRedirect(checkoutUrl, {
    contentIds: [shopifyGidToContentId(variantId)],
    value: checkoutValue,
    currency: 'NZD',
  });
}
