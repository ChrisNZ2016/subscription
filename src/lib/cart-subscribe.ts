import { storefrontQuery } from './shopify';
import { getDistinctId } from './analytics';
import {
  finishCheckoutRedirect,
  getMetaCartAttributes,
  shopifyGidToContentId,
} from './meta-pixel';
import { getUtmCartAttributes } from './utm';
import type { CartCreateResponse, CartLine } from '../types/shopify';

// The in-window early-subscriber plan (RecurPay "1 Month subscription (early
// subscriber discount)"). 25% off retail, locked in — the offer in Emails 4-6.
// Distinct from the reactivation plan so the reactivation cohort (which gets the
// free gift) stays separable. NO reactivation cart attribute here → no gift.
export const EARLY_SUBSCRIBER_SELLING_PLAN_ID = 'gid://shopify/SellingPlan/3082027157';

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

export async function createSubscribeCartAndRedirect(
  variantId: string,
  checkoutValue?: number,
): Promise<void> {
  const lines: CartLine[] = [
    {
      merchandiseId: variantId,
      quantity: 1,
      sellingPlanId: EARLY_SUBSCRIBER_SELLING_PLAN_ID,
    },
  ];

  const attributes = [
    { key: 'mp_distinct_id', value: getDistinctId() },
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

  finishCheckoutRedirect(data.cartCreate.cart.checkoutUrl, {
    contentIds: [shopifyGidToContentId(variantId)],
    value: checkoutValue,
    currency: 'NZD',
  });
}
