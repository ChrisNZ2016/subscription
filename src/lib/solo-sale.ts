/**
 * URL-driven sale branding for /solo (and the root path, which renders SoloPage).
 *
 *   /solo?sale=blackfriday  → Black Friday branded page
 *
 * Branding only: the offer, price and cart variant are unchanged, so it
 * combines freely with `price_tier` (e.g. `?sale=blackfriday&price_tier=a`).
 * Read fresh from the live URL each time (not persisted), like price_tier.
 * Missing / unknown value → normal page (returns null).
 */

const SALE_PARAM_KEY = 'sale' as const;

export type SoloSale = 'blackfriday';

/** Accepted spellings of each sale, so hand-typed links still work. */
const SALE_ALIASES: Record<string, SoloSale> = {
  blackfriday: 'blackfriday',
  'black-friday': 'blackfriday',
  black_friday: 'blackfriday',
  bf: 'blackfriday',
};

export function resolveSoloSale(): SoloSale | null {
  const value = new URLSearchParams(window.location.search).get(SALE_PARAM_KEY)?.trim().toLowerCase();
  if (!value) return null;
  return SALE_ALIASES[value] ?? null;
}

/** Mixpanel / cart attribute value for the active sale (`none` = no or unknown param). */
export function getSoloSaleKey(): SoloSale | 'none' {
  return resolveSoloSale() ?? 'none';
}

/** Cart attributes that flow to order.note_attributes and checkout.attributes. */
export function getSoloSaleCartAttributes(): Array<{ key: string; value: string }> {
  return [{ key: 'sale', value: getSoloSaleKey() }];
}
