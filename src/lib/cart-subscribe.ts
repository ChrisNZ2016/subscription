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

// The in-window early-subscriber plan (RecurPay "1 Month subscription (early
// subscriber discount)"). 25% off retail, locked in — the offer in Emails 4-6.
// Distinct from the reactivation plan so the reactivation cohort (which gets the
// free gift) stays separable. NO reactivation cart attribute here → no gift.
export const EARLY_SUBSCRIBER_SELLING_PLAN_ID = 'gid://shopify/SellingPlan/3082027157';

// The 25%-off selling plans that back the early-subscriber offer on the
// kibble-pack product, keyed by delivery frequency (months).
//
// Only the 1-month plan is *named* "early subscriber"; the 2- and 3-month legs
// live in a separate 25%-off group whose plans are named "Deliver every two/
// three months". A near-identical 20%-off group shares those names, so these
// must be matched by ID, never by name, to avoid grabbing the 20% plans.
export const EARLY_SUBSCRIBER_SELLING_PLAN_IDS: Record<1 | 2 | 3, string> = {
  1: EARLY_SUBSCRIBER_SELLING_PLAN_ID,
  2: 'gid://shopify/SellingPlan/3145433237',
  3: 'gid://shopify/SellingPlan/3145466005',
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

export function subscribeOfferCartKey(variantId: string, sellingPlanId: string): string {
  return `${variantId}:${sellingPlanId}`;
}

/**
 * Create the early-subscriber cart and return its checkout URL, WITHOUT
 * redirecting. Lets the page warm the cart ahead of the click for instant checkout.
 */
export async function createSubscribeCart(
  variantId: string,
  sellingPlanId: string = EARLY_SUBSCRIBER_SELLING_PLAN_ID,
): Promise<string> {
  const lines: CartLine[] = [
    {
      merchandiseId: variantId,
      quantity: 1,
      sellingPlanId,
    },
  ];

  const attributes = [
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

export async function createSubscribeCartAndRedirect(
  variantId: string,
  checkoutValue?: number,
  prefetchedCheckoutUrl?: string,
  sellingPlanId: string = EARLY_SUBSCRIBER_SELLING_PLAN_ID,
): Promise<void> {
  const checkoutUrl = prefetchedCheckoutUrl ?? (await createSubscribeCart(variantId, sellingPlanId));

  finishCheckoutRedirect(checkoutUrl, {
    contentIds: [shopifyGidToContentId(variantId)],
    value: checkoutValue,
    currency: 'NZD',
  });
}
