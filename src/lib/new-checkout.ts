import { getDistinctId } from './analytics';
import { trackMetaAddToCart, shopifyGidToContentId } from './meta-pixel';
import { resolveSoloSale } from './solo-sale';

/**
 * Handoff to the new checkout (lgd-subscriptions). `/checkout` on this site is rewritten to that
 * app (vercel.json), so the customer stays on lp.littlegreendog.co.nz.
 *
 * Each page asks `/checkout/switch` whether to use it. The answer defaults to the old Shopify cart:
 * a slow, failed or malformed answer means "old", so a problem in the new app never stops a sale.
 * `?checkout=new` or `?checkout=old` on the landing URL overrides the switch (pilot and testing).
 */

export type NewCheckoutPage = 'solo' | 'subscribe-offer';
export type CheckoutMode = 'old' | 'new';

const SWITCH_TIMEOUT_MS = 1500;
const UTM_STORAGE_KEY = 'lgd_utm';
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;

let switchPromise: Promise<Record<string, unknown> | null> | null = null;

function urlOverride(): CheckoutMode | null {
  const value = new URLSearchParams(window.location.search).get('checkout')?.trim().toLowerCase();
  return value === 'new' || value === 'old' ? value : null;
}

function fetchSwitch(): Promise<Record<string, unknown> | null> {
  if (!switchPromise) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), SWITCH_TIMEOUT_MS);
    switchPromise = fetch('/checkout/switch', { signal: controller.signal, credentials: 'same-origin' })
      .then((res) => (res.ok ? (res.json() as Promise<Record<string, unknown>>) : null))
      .catch(() => null)
      .finally(() => window.clearTimeout(timer));
  }
  return switchPromise;
}

/** Start the lookup early (on page load) so the button click doesn't wait for it. */
export function prefetchCheckoutMode(): void {
  if (!urlOverride()) void fetchSwitch();
}

/** "new" only when the switch (or the URL override) says so for this page. */
export async function resolveCheckoutMode(page: NewCheckoutPage): Promise<CheckoutMode> {
  const override = urlOverride();
  if (override) return override;
  const value = await fetchSwitch();
  return value && value[page] === 'new' ? 'new' : 'old';
}

function storedUtms(): Partial<Record<(typeof UTM_KEYS)[number], string>> {
  try {
    return JSON.parse(sessionStorage.getItem(UTM_STORAGE_KEY) ?? '{}') ?? {};
  } catch {
    return {};
  }
}

/** Attribution the new checkout stores on the charge: UTMs (first touch), fbclid, Mixpanel id. */
function attributionParams(params: URLSearchParams): void {
  const current = new URLSearchParams(window.location.search);
  const utms = storedUtms();
  for (const key of UTM_KEYS) {
    const value = utms[key] ?? current.get(key)?.trim();
    if (value) params.set(key, value);
  }
  const fbclid = current.get('fbclid')?.trim();
  if (fbclid) params.set('fbclid', fbclid);
  try {
    const mp = getDistinctId();
    if (mp) params.set('mp', mp);
  } catch {
    /* Mixpanel not loaded: the checkout works without it */
  }
}

/** /checkout?offer=solo&sample=<variant id>&… (plus `sale=blackfriday` on the Black Friday page). */
export function soloCheckoutUrl(sampleVariantGid: string): string {
  const params = new URLSearchParams({ offer: 'solo', sample: shopifyGidToContentId(sampleVariantGid) });
  const sale = resolveSoloSale();
  if (sale) params.set('sale', sale);
  attributionParams(params);
  return `/checkout?${params.toString()}`;
}

/** /checkout?offer=subscribe-offer&size=6&freq=1&qty=1&… (freq in months, as on the page). */
export function subscribeOfferCheckoutUrl(sizeKg: number, frequencyMonths: number, quantity = 1): string {
  const params = new URLSearchParams({
    offer: 'subscribe-offer',
    size: String(sizeKg),
    freq: String(frequencyMonths),
    qty: String(quantity),
  });
  attributionParams(params);
  return `/checkout?${params.toString()}`;
}

/** Same Meta AddToCart as the Shopify path, then go to the new checkout. */
export function goToNewCheckout(url: string, meta: { contentIds: string[]; value?: number }): void {
  trackMetaAddToCart({ ...meta, currency: 'NZD' });
  window.location.href = url;
}
