import { storefrontQuery } from './shopify';
import { getDistinctId } from './analytics';
import type { CartCreateResponse, CartLine } from '../types/shopify';

// Cart-level attributes (distinct from per-line attributes).
// These flow through to order.note_attributes in Shopify, which lets
// the server-side webhook and the Shopify Custom Pixel both read the
// Mixpanel distinct_id for identity stitching.
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

export interface SubscriptionSelection {
  bagWeight: number;
  frequencyWeeks: number;
}

export interface AddonSelection {
  variantId: string;
  sellingPlanId?: string;
  quantity: number;
}

export async function createCartAndRedirect(
  sampleVariantId: string,
  sampleSellingPlanId: string,
  subscription: SubscriptionSelection,
  addons: AddonSelection[],
  subscriptionPrice?: string,
): Promise<void> {
  const attributes = [
    { key: 'Subscription Bag Size', value: `${subscription.bagWeight}kg` },
    { key: 'Subscription Frequency', value: `${subscription.frequencyWeeks} weeks` },
  ];
  if (subscriptionPrice) {
    attributes.push({ key: 'Subscription Price', value: subscriptionPrice });
  }

  const lines: CartLine[] = [
    {
      merchandiseId: sampleVariantId,
      quantity: 1,
      sellingPlanId: sampleSellingPlanId,
      attributes,
    },
    ...addons
      .filter((a) => a.quantity > 0)
      .map((addon) => {
        const line: CartLine = {
          merchandiseId: addon.variantId,
          quantity: addon.quantity,
        };
        if (addon.sellingPlanId) {
          line.sellingPlanId = addon.sellingPlanId;
        }
        return line;
      }),
  ];

  // Cart-level attributes: the Mixpanel distinct_id is passed here so it
  // surfaces as a checkout customAttribute (readable by the Shopify pixel)
  // and as an order note_attribute (readable by the server-side webhook).
  const attributes = [
    { key: '_mp_distinct_id', value: getDistinctId() },
  ];

  const data = await storefrontQuery<CartCreateResponse>(CART_CREATE_MUTATION, {
    lines,
    attributes,
  });

  if (data.cartCreate.userErrors.length > 0) {
    throw new Error(
      data.cartCreate.userErrors.map((e) => e.message).join(', '),
    );
  }

  window.location.href = data.cartCreate.cart.checkoutUrl;
}
