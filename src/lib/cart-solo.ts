import { storefrontQuery } from './shopify';
import { getDistinctId } from './analytics';
import {
  finishCheckoutRedirect,
  getMetaCartAttributes,
  shopifyGidToContentId,
} from './meta-pixel';
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

export async function createSoloCartAndRedirect(
  sampleVariantId: string,
  checkoutValue?: number,
): Promise<void> {
  const lines = [{ merchandiseId: sampleVariantId, quantity: 1 }];
  const attributes = [
    { key: 'mp_distinct_id', value: getDistinctId() },
    ...getMetaCartAttributes(),
    ...getUtmCartAttributes(),
  ];

  const data = await storefrontQuery<CartCreateResponse>(CART_CREATE_MUTATION, { lines, attributes });

  if (data.cartCreate.userErrors.length > 0) {
    throw new Error(data.cartCreate.userErrors.map((e) => e.message).join(', '));
  }

  finishCheckoutRedirect(data.cartCreate.cart.checkoutUrl, {
    contentIds: [shopifyGidToContentId(sampleVariantId)],
    value: checkoutValue,
    currency: 'NZD',
  });
}
