import { appendUtmToCheckoutUrl } from './utm';

const PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID as string | undefined;

const PURCHASE_EVENT_ID_KEY = '_meta_purchase_event_id';

type Fbq = {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[][];
  loaded?: boolean;
  version?: string;
  push?: Fbq;
};

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

let initialized = false;

function initFbq(): void {
  if (initialized || !PIXEL_ID) return;

  if (!window.fbq) {
    const q: unknown[][] = [];
    const fbq: Fbq = Object.assign(
      (...args: unknown[]) => {
        if (fbq.callMethod) {
          fbq.callMethod(...args);
        } else {
          q.push(args);
        }
      },
      { queue: q },
    );
    if (!window._fbq) window._fbq = fbq;
    window.fbq = fbq;
    window.fbq.push = fbq;
    window.fbq.loaded = true;
    window.fbq.version = '2.0';
  }

  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://connect.facebook.net/en_US/fbevents.js';
  document.head.appendChild(script);

  window.fbq!('init', PIXEL_ID);
  initialized = true;
}

function track(event: string, params?: Record<string, unknown>, eventId?: string): void {
  if (!PIXEL_ID) return;
  initFbq();
  if (eventId) {
    window.fbq!('track', event, params ?? {}, { eventID: eventId });
  } else {
    window.fbq!('track', event, params ?? {});
  }
}

function readCookie(name: string): string {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : '';
}

/** Numeric Shopify variant/product ID from a Storefront API GID. */
export function shopifyGidToContentId(gid: string): string {
  return gid.split('/').pop() ?? gid;
}

export function getFbp(): string {
  return readCookie('_fbp');
}

export function getFbc(): string {
  return readCookie('_fbc');
}

/** Stable per-checkout ID for CAPI deduplication with the orders webhook. */
export function getOrCreatePurchaseEventId(): string {
  let id = sessionStorage.getItem(PURCHASE_EVENT_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(PURCHASE_EVENT_ID_KEY, id);
  }
  return id;
}

export function getMetaCartAttributes(): Array<{ key: string; value: string }> {
  const attrs: Array<{ key: string; value: string }> = [
    { key: '_meta_purchase_event_id', value: getOrCreatePurchaseEventId() },
  ];
  const fbp = getFbp();
  const fbc = getFbc();
  if (fbp) attrs.push({ key: '_fbp', value: fbp });
  if (fbc) attrs.push({ key: '_fbc', value: fbc });
  return attrs;
}

export interface MetaCommerceParams {
  contentIds: string[];
  value?: number;
  currency?: string;
}

export function trackMetaPageView(): void {
  track('PageView');
}

export function trackMetaViewContent(params: MetaCommerceParams): void {
  track('ViewContent', {
    content_ids: params.contentIds,
    content_type: 'product',
    value: params.value,
    currency: params.currency ?? 'NZD',
  });
}

export function trackMetaInitiateCheckout(params: MetaCommerceParams): void {
  track('InitiateCheckout', {
    content_ids: params.contentIds,
    content_type: 'product',
    num_items: params.contentIds.length,
    value: params.value,
    currency: params.currency ?? 'NZD',
  }, getOrCreatePurchaseEventId());
}

export function trackMetaAddToCart(params: MetaCommerceParams): void {
  track('AddToCart', {
    content_ids: params.contentIds,
    content_type: 'product',
    value: params.value,
    currency: params.currency ?? 'NZD',
  }, getOrCreatePurchaseEventId());
}

/** Fire AddToCart then redirect to Shopify checkout. */
export function finishCheckoutRedirect(
  checkoutUrl: string,
  params: MetaCommerceParams,
): void {
  trackMetaAddToCart(params);
  window.location.href = appendUtmToCheckoutUrl(checkoutUrl);
}
