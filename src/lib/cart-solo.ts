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
 * Create the Shopify cart and return its checkout URL, WITHOUT redirecting.
 * Lets the page warm the cart ahead of the click so checkout is instant.
 */
export async function createSoloCart(sampleVariantId: string): Promise<string> {
  const lines = [{ merchandiseId: sampleVariantId, quantity: 1 }];
  const attributes = [
    { key: 'mp_distinct_id', value: getDistinctId() },
    ...getPageAttributionCartAttributes(),
    ...getMetaCartAttributes(),
    ...getUtmCartAttributes(),
  ];

  const data = await storefrontQuery<CartCreateResponse>(CART_CREATE_MUTATION, { lines, attributes });

  if (data.cartCreate.userErrors.length > 0) {
    throw new Error(data.cartCreate.userErrors.map((e) => e.message).join(', '));
  }

  return data.cartCreate.cart.checkoutUrl;
}

export async function createSoloCartAndRedirect(
  sampleVariantId: string,
  checkoutValue?: number,
  prefetchedCheckoutUrl?: string,
): Promise<void> {
  const checkoutUrl = prefetchedCheckoutUrl ?? (await createSoloCart(sampleVariantId));

  finishCheckoutRedirect(checkoutUrl, {
    contentIds: [shopifyGidToContentId(sampleVariantId)],
    value: checkoutValue,
    currency: 'NZD',
  });
}
