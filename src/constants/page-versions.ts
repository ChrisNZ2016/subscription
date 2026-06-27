/**
 * Landing page name + semver for attribution (Mixpanel + Shopify cart attributes).
 * Bump versions per README "Page versioning" when you ship funnel changes.
 */
export type PageName =
  | 'landing'
  | 'landing-simple'
  | 'landing-solo'
  | 'solo'
  | 'sample-subscribe'
  | 'reactivation'
  | 'subscribe-offer'
  | 'subscribe-ingredients'
  | 'wholesale';

export const PAGE_VERSIONS: Record<PageName, { name: PageName; version: string }> = {
  landing: { name: 'landing', version: '1.0.0' },
  'landing-simple': { name: 'landing-simple', version: '1.0.0' },
  'landing-solo': { name: 'landing-solo', version: '1.0.0' },
  solo: { name: 'solo', version: '1.0.1' },
  'sample-subscribe': { name: 'sample-subscribe', version: '1.0.0' },
  reactivation: { name: 'reactivation', version: '1.0.0' },
  'subscribe-offer': { name: 'subscribe-offer', version: '1.0.0' },
  'subscribe-ingredients': { name: 'subscribe-ingredients', version: '1.0.0' },
  wholesale: { name: 'wholesale', version: '1.0.0' },
};
