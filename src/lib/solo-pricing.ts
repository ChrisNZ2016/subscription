import type { MoneyV2 } from '../types/shopify';

/**
 * URL-driven sample price for /solo.
 *
 * Each tier maps a `price_tier` value to a dedicated Shopify variant of the
 * sample product priced for that test. Selecting a tier swaps BOTH the displayed
 * price and the variant added to the cart, so the customer is charged the tier
 * price natively at checkout — the base `2kg` variant's own price is never touched.
 *
 * The tier is read from the `price_tier` query param, a dedicated key that does
 * NOT collide with the campaign's real utm_* parameters. It's read from the live
 * URL each time (not persisted), so the price always matches the clicked link.
 * Missing / unknown value → base variant (returns null).
 *
 *   /solo?price_tier=a  → $27.50 (50% off)
 *   /solo?price_tier=b  → $38.50 (30% off)
 */

/** Query param that selects the tier. */
const TIER_PARAM_KEY = 'price_tier' as const;

const CURRENCY = 'NZD';

/** Compare-at anchor shown across the page for all tiers. */
export const SOLO_COMPARE_AT_PRICE: MoneyV2 = { amount: '55.00', currencyCode: CURRENCY };

export interface SoloPriceTier {
  /** price_tier value that activates this tier (case-insensitive). */
  key: string;
  /** Price charged & displayed for this tier. */
  price: MoneyV2;
  /** Strike-through anchor (always $55 for these tests). */
  compareAtPrice: MoneyV2;
  /** Percentage off the compare-at price, for "N% off" copy. */
  percentOff: number;
  /**
   * Shopify variant GID that carries `price`. This REPLACES the default sample
   * variant in the cart line, so checkout charges the tier price.
   */
  variantId: string;
}

function money(amount: number): MoneyV2 {
  return { amount: amount.toFixed(2), currencyCode: CURRENCY };
}

/**
 * The two test prices, each a dedicated variant on the sample product.
 * Both discount off the fixed $55 compare-at.
 */
export const SOLO_PRICE_TIERS: SoloPriceTier[] = [
  {
    key: 'a',
    price: money(27.5),
    compareAtPrice: SOLO_COMPARE_AT_PRICE,
    percentOff: 50,
    variantId: 'gid://shopify/ProductVariant/47536166895765',
  },
  {
    key: 'b',
    price: money(38.5),
    compareAtPrice: SOLO_COMPARE_AT_PRICE,
    percentOff: 30,
    variantId: 'gid://shopify/ProductVariant/47536166928533',
  },
];

/**
 * Resolve the active tier from the live `price_tier` URL param, or null for base
 * pricing. Read fresh from the URL (not persisted) so the price always matches
 * the clicked link and re-testing a different tier works immediately.
 */
export function resolveSoloPriceTier(): SoloPriceTier | null {
  const value = new URLSearchParams(window.location.search).get(TIER_PARAM_KEY)?.trim().toLowerCase();
  if (!value) return null;
  return SOLO_PRICE_TIERS.find((t) => t.key.toLowerCase() === value) ?? null;
}
