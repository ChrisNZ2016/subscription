import { PAGE_VERSIONS, type PageName } from '../constants/page-versions';

export type LandingVariant = 'simple' | 'solo';

/**
 * Root-path `?variant=` opt-in to the older LandingPage funnel. The root path
 * otherwise renders SoloPage, so App.tsx and getPageName() must read the
 * variant through this one helper or attribution will describe a page that
 * never rendered.
 */
export function getLandingVariant(): LandingVariant | null {
  const variant = new URLSearchParams(window.location.search).get('variant');
  if (variant === 'simple') return 'simple';
  if (variant === 'solo') return 'solo';
  return null;
}

/** Resolve the funnel page name from the current URL (path + landing query variants). */
export function getPageName(): PageName {
  const path = window.location.pathname;
  if (path === '/solo' || path === '/solo/') return 'solo';
  if (path === '/sample-subscribe' || path === '/sample-subscribe/') return 'sample-subscribe';
  if (path === '/welcome-back' || path === '/welcome-back/') return 'reactivation';
  if (path === '/subscribe-offer' || path === '/subscribe-offer/') return 'subscribe-offer';
  if (path === '/subscribe-ingredients' || path === '/subscribe-ingredients/') {
    return 'subscribe-ingredients';
  }
  if (path === '/wholesale' || path === '/wholesale/') return 'wholesale';

  const variant = getLandingVariant();
  if (variant === 'simple') return 'landing-simple';
  if (variant === 'solo') return 'landing-solo';
  // Root renders SoloPage, so it reports as 'solo' — this also gates the
  // price_tier property in analytics.ts pageProps().
  return 'solo';
}

export function getPageVersion(): string {
  return PAGE_VERSIONS[getPageName()].version;
}

export function getPageAttribution(): { page_name: PageName; page_version: string } {
  const page_name = getPageName();
  return { page_name, page_version: PAGE_VERSIONS[page_name].version };
}

/** Cart attributes that flow to order.note_attributes and checkout.attributes. */
export function getPageAttributionCartAttributes(): Array<{ key: string; value: string }> {
  const { page_name, page_version } = getPageAttribution();
  return [
    { key: 'page_name', value: page_name },
    { key: 'page_version', value: page_version },
  ];
}
