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

// Cart-level attributes flow to order.note_attributes (webhook) and
// checkout.attributes (pixel) for Mixpanel identity stitching. The Mixpanel id
// key must NOT start with an underscore — Shopify treats leading-underscore
// cart attributes as hidden and does not expose them to the Web Pixel, which
// previously broke identify() and the purchase funnel.
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
  sampleSellingPlanId: string | null | undefined,
  subscription: SubscriptionSelection,
  addons: AddonSelection[],
  subscriptionPrice?: string,
  dogSize?: string,
  checkoutValue?: number,
): Promise<void> {
  const attributes = [
    { key: 'Subscription Bag Size', value: `${subscription.bagWeight}kg` },
    { key: 'Subscription Frequency', value: `${subscription.frequencyWeeks} weeks` },
    { key: 'mp_distinct_id', value: getDistinctId() },
    ...getPageAttributionCartAttributes(),
    ...getMetaCartAttributes(),
    ...getUtmCartAttributes(),
    ...(dogSize ? [{ key: 'Dog Size', value: dogSize }] : []),
  ];
  if (subscriptionPrice) {
    attributes.push({ key: 'Subscription Price', value: subscriptionPrice });
  }

  const sampleLine: CartLine = {
    merchandiseId: sampleVariantId,
    quantity: 1,
    attributes,
    ...(sampleSellingPlanId ? { sellingPlanId: sampleSellingPlanId } : {}),
  };

  const lines: CartLine[] = [
    sampleLine,
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

  const data = await storefrontQuery<CartCreateResponse>(CART_CREATE_MUTATION, { lines, attributes });

  if (data.cartCreate.userErrors.length > 0) {
    throw new Error(
      data.cartCreate.userErrors.map((e) => e.message).join(', '),
    );
  }

  const contentIds = [
    shopifyGidToContentId(sampleVariantId),
    ...addons
      .filter((a) => a.quantity > 0)
      .map((a) => shopifyGidToContentId(a.variantId)),
  ];

  finishCheckoutRedirect(data.cartCreate.cart.checkoutUrl, {
    contentIds,
    value: checkoutValue,
    currency: 'NZD',
  });
}
