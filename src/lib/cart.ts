import { storefrontQuery } from './shopify';
import type { CartCreateResponse, CartLine } from '../types/shopify';

const CART_CREATE_MUTATION = `
  mutation CartCreate($lines: [CartLineInput!]!) {
    cartCreate(input: { lines: $lines }) {
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
): Promise<void> {
  const lines: CartLine[] = [
    {
      merchandiseId: sampleVariantId,
      quantity: 1,
      sellingPlanId: sampleSellingPlanId,
      attributes: [
        { key: 'Subscription Bag Size', value: `${subscription.bagWeight}kg` },
        { key: 'Subscription Frequency', value: `${subscription.frequencyWeeks} weeks` },
      ],
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

  const data = await storefrontQuery<CartCreateResponse>(CART_CREATE_MUTATION, { lines });

  if (data.cartCreate.userErrors.length > 0) {
    throw new Error(
      data.cartCreate.userErrors.map((e) => e.message).join(', '),
    );
  }

  window.location.href = data.cartCreate.cart.checkoutUrl;
}
