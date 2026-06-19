import { storefrontQuery } from './shopify';
import { getDistinctId } from './analytics';
import {
  finishCheckoutRedirect,
  getMetaCartAttributes,
  shopifyGidToContentId,
} from './meta-pixel';
import { getUtmCartAttributes } from './utm';
import type { CartCreateResponse, CartLine } from '../types/shopify';

// The reactivation subscription plan (RecurPay "1 Month subscription (reactivation)").
// Carries 25% off retail, the same as the early-subscriber plan, but is a distinct
// plan so the reactivation cohort is identifiable by selling plan if ever needed.
export const REACTIVATION_SELLING_PLAN_ID = 'gid://shopify/SellingPlan/3096215701';

// Cart-level attribute that flags this as a reactivation order. Lands on
// order.note_attributes, which the Mechanic task reads to add the free
// LGD-60-NZ poop bags to the first delivery. Keep name/value in sync with the
// Mechanic task options (reactivation_attribute_name / _value).
const REACTIVATION_FLAG = { key: 'reactivation', value: 'true' };

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

export async function createReactivationCartAndRedirect(
  variantId: string,
  checkoutValue?: number,
): Promise<void> {
  const lines: CartLine[] = [
    {
      merchandiseId: variantId,
      quantity: 1,
      sellingPlanId: REACTIVATION_SELLING_PLAN_ID,
    },
  ];

  const attributes = [
    REACTIVATION_FLAG,
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
