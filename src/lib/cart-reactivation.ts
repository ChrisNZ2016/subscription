import { storefrontQuery } from './shopify';
import { getDistinctId } from './analytics';
import {
  finishCheckoutRedirect,
  getMetaCartAttributes,
  shopifyGidToContentId,
} from './meta-pixel';
import { getPageAttributionCartAttributes } from './page-attribution';
import { getUtmCartAttributes } from './utm';
import type { CartCreateResponse, CartLine } from '../types/shopify';

// The reactivation subscription plan (RecurPay "1 Month subscription (reactivation)").
// Carries 25% off retail, the same as the early-subscriber plan, but is a distinct
// plan so the reactivation cohort is identifiable by selling plan if ever needed.
export const REACTIVATION_SELLING_PLAN_ID = 'gid://shopify/SellingPlan/3096215701';

// The 25%-off reactivation plans, keyed by delivery frequency (months). All
// three live in the same RecurPay group as the monthly plan above and are 25%
// off retail at every bag size.
//
// Match by ID, never by name: a separate 20%-off group carries plans with the
// identical names "Deliver every two/three months" (3145498773 / 3145531541),
// so a name lookup silently downgrades the customer's discount.
export const REACTIVATION_SELLING_PLAN_IDS: Record<1 | 2 | 3, string> = {
  1: REACTIVATION_SELLING_PLAN_ID,
  2: 'gid://shopify/SellingPlan/3145433237',
  3: 'gid://shopify/SellingPlan/3145466005',
};

export function reactivationCartKey(variantId: string, sellingPlanId: string): string {
  return `${variantId}:${sellingPlanId}`;
}

// Cart-level attribute that flags this as a reactivation order. Lands on
// order.note_attributes, which the Mechanic task reads to add the free
// LGD-60-NZ poop bags to the first delivery. This is what actually delivers the
// gift — keep name/value in sync with the Mechanic task options
// (reactivation_attribute_name / _value).
const REACTIVATION_FLAG = { key: 'reactivation', value: 'true' };

// The free 60-pack of compostable poop bags is NOT added as a cart line.
//
// A $0 line needs a discount to zero it, and every product-scoped Shopify
// discount keys off cart contents, not the landing page the customer arrived
// from — so any shopper adding the same SKU would get it free too. (Verified:
// a 100%-off automatic discount on LGD-60-NZ gave the pack away store-wide,
// and BXGY would give it to every kibble buyer.) The Mechanic task stays the
// mechanism: it reads the `reactivation` attribute below and adds LGD-60-NZ
// after the order is placed, which is the only path scoped to this funnel.
//
// Instead the promise is made VISIBLE at checkout by a line-item property on
// the kibble line (see GIFT_CHECKOUT_NOTE). Properties whose key does NOT start
// with "_" render under the product in Shopify's order summary, on every plan —
// checkout UI extensions would need Shopify Plus.
const GIFT_CHECKOUT_NOTE = {
  key: 'Your welcome-back gift',
  value: 'FREE 60-pack compostable poop bags (added to your first delivery)',
};

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

/**
 * Create the reactivation cart and return its checkout URL, WITHOUT redirecting.
 * Lets the page warm the cart ahead of the click so checkout is instant.
 */
export async function createReactivationCart(
  variantId: string,
  sellingPlanId: string = REACTIVATION_SELLING_PLAN_ID,
): Promise<string> {
  const lines: CartLine[] = [
    {
      merchandiseId: variantId,
      quantity: 1,
      sellingPlanId,
      attributes: [GIFT_CHECKOUT_NOTE],
    },
  ];

  const attributes = [
    REACTIVATION_FLAG,
    { key: 'mp_distinct_id', value: getDistinctId() },
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

export async function createReactivationCartAndRedirect(
  variantId: string,
  checkoutValue?: number,
  prefetchedCheckoutUrl?: string,
  sellingPlanId: string = REACTIVATION_SELLING_PLAN_ID,
): Promise<void> {
  const checkoutUrl =
    prefetchedCheckoutUrl ?? (await createReactivationCart(variantId, sellingPlanId));

  finishCheckoutRedirect(checkoutUrl, {
    contentIds: [shopifyGidToContentId(variantId)],
    value: checkoutValue,
    currency: 'NZD',
  });
}
