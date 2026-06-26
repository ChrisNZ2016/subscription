import { PAGE_VERSIONS, type PageName } from '../constants/page-versions';

/** Resolve the funnel page name from the current URL (path + landing query variants). */
export function getPageName(): PageName {
  const path = window.location.pathname;
  if (path === '/solo' || path === '/solo/') return 'solo';
  if (path === '/welcome-back' || path === '/welcome-back/') return 'reactivation';
  if (path === '/subscribe-offer' || path === '/subscribe-offer/') return 'subscribe-offer';
  if (path === '/subscribe-ingredients' || path === '/subscribe-ingredients/') {
    return 'subscribe-ingredients';
  }
  if (path === '/wholesale' || path === '/wholesale/') return 'wholesale';

  const variant = new URLSearchParams(window.location.search).get('variant');
  if (variant === 'simple') return 'landing-simple';
  if (variant === 'solo') return 'landing-solo';
  return 'landing';
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
