import { storefrontQuery } from './shopify';
import { getDistinctId } from './analytics';
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

export async function createSoloCartAndRedirect(sampleVariantId: string): Promise<void> {
  const lines = [{ merchandiseId: sampleVariantId, quantity: 1 }];
  const attributes = [{ key: '_mp_distinct_id', value: getDistinctId() }];

  const data = await storefrontQuery<CartCreateResponse>(CART_CREATE_MUTATION, { lines, attributes });

  if (data.cartCreate.userErrors.length > 0) {
    throw new Error(data.cartCreate.userErrors.map((e) => e.message).join(', '));
  }

  window.location.href = data.cartCreate.cart.checkoutUrl;
}
