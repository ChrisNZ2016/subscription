import type { OverridedMixpanel } from 'mixpanel-browser';
import { trackGaEvent, trackGaPageView } from './google-analytics';
import {
  trackMetaInitiateCheckout,
  trackMetaPageView,
  trackMetaViewContent,
} from './meta-pixel';

const TOKEN = import.meta.env.VITE_MIXPANEL_TOKEN as string;

function getPageLabel(): string {
  const path = window.location.pathname;
  if (path === '/solo' || path === '/solo/') return 'solo';
  if (path === '/welcome-back' || path === '/welcome-back/') return 'reactivation';
  if (path === '/subscribe-offer' || path === '/subscribe-offer/') return 'subscribe-offer';
  if (path === '/subscribe-ingredients' || path === '/subscribe-ingredients/') return 'subscribe-ingredients';
  return 'landing';
}

// ─── Lazy Mixpanel loading ─────────────────────────────────────────────────────
// mixpanel-browser is ~340 KB and is not needed for first paint, so we load it
// off the critical path (browser idle) and queue any events fired beforehand.

const DISTINCT_ID_KEY = 'lgd_distinct_id';

let mp: OverridedMixpanel | null = null;
let loadPromise: Promise<void> | null = null;
let loadScheduled = false;
const pending: Array<(m: OverridedMixpanel) => void> = [];

/**
 * A stable per-browser id we own. It is shared with Shopify (cart attribute)
 * and forced onto Mixpanel via identify(), so server-side stitching keeps
 * working even though Mixpanel itself loads asynchronously.
 */
function getOrCreateDistinctId(): string {
  try {
    let id = localStorage.getItem(DISTINCT_ID_KEY);
    if (!id) {
      id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `lgd-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(DISTINCT_ID_KEY, id);
    }
    return id;
  } catch {
    return `lgd-${Date.now()}`;
  }
}

function loadMixpanel(): Promise<void> {
  if (loadPromise) return loadPromise;
  loadPromise = import('mixpanel-browser')
    .then(({ default: m }) => {
      // persistence='localStorage' avoids third-party cookie issues.
      m.init(TOKEN, { persistence: 'localStorage', track_pageview: false });
      m.identify(getOrCreateDistinctId());
      mp = m;
      while (pending.length) pending.shift()!(m);
    })
    .catch(() => {
      // Analytics must never break the page.
    });
  return loadPromise;
}

function scheduleLoad(): void {
  if (loadScheduled || loadPromise) return;
  loadScheduled = true;
  const start = () => void loadMixpanel();
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(start, { timeout: 3000 });
  } else {
    setTimeout(start, 1200);
  }
}

function withMixpanel(fn: (m: OverridedMixpanel) => void): void {
  if (mp) {
    fn(mp);
    return;
  }
  pending.push(fn);
  scheduleLoad();
}

// ─── Identity ────────────────────────────────────────────────────────────────

/**
 * Returns the distinct_id passed to Shopify as a cart attribute, enabling
 * identity stitching through the checkout pixel and the server-side webhook.
 * Mixpanel is forced to adopt this same id once it loads.
 */
export function getDistinctId(): string {
  scheduleLoad();
  return getOrCreateDistinctId();
}

// ─── Landing-page funnel events ───────────────────────────────────────────────

export function trackPageViewed(meta?: { contentIds?: string[]; value?: number }): void {
  const page = getPageLabel();
  withMixpanel((m) => m.track('Page Viewed', { page }));
  trackGaPageView(window.location.pathname + window.location.search);
  trackMetaPageView();
  if (meta?.contentIds?.length) {
    trackMetaViewContent({
      contentIds: meta.contentIds,
      value: meta.value,
      currency: 'NZD',
    });
  }
}

export type CtaLocation =
  | 'hero'
  | 'nav'
  | 'sticky'
  | 'why-you-love-it'
  | 'faq'
  | 'picker'
  | 'subscribe';

export function trackCtaClicked(location: CtaLocation): void {
  const page = getPageLabel();
  withMixpanel((m) => m.track('CTA Clicked', { location, page }));
  trackGaEvent('cta_clicked', { location, page });
}

export function trackVariantSelected(props: {
  bagWeight: number;
  price: string;
  frequencyWeeks: number;
  source: 'default' | 'user';
}): void {
  withMixpanel((m) => m.track('Variant Selected', { ...props, page: getPageLabel() }));
}

export function trackSectionViewed(props: { section: string }): void {
  withMixpanel((m) => m.track('Section Viewed', { ...props, page: getPageLabel() }));
}

export function trackProductTabChanged(props: { tab: 'info' | 'ingredients' }): void {
  withMixpanel((m) => m.track('Product Tab Changed', { ...props, page: getPageLabel() }));
}

export function trackBenefitExpanded(props: { title: string }): void {
  withMixpanel((m) => m.track('Benefit Expanded', { ...props, page: getPageLabel() }));
}

export function trackIngredientExpanded(props: { name: string }): void {
  withMixpanel((m) => m.track('Ingredient Expanded', { ...props, page: getPageLabel() }));
}

export function trackFaqExpanded(props: { question: string }): void {
  withMixpanel((m) => m.track('FAQ Expanded', { ...props, page: getPageLabel() }));
}

export function trackNavAnchorClicked(props: { target: string }): void {
  withMixpanel((m) => m.track('Nav Anchor Clicked', { ...props, page: getPageLabel() }));
}

export function trackDogSizeSelected(props: {
  size: string;
  bagWeight: number;
  frequencyWeeks: number;
}): void {
  withMixpanel((m) => m.track('Dog Size Selected', props));
}

export function trackPlanCustomized(props: {
  field: 'bagWeight' | 'frequency';
  bagWeight: number;
  frequencyWeeks: number;
}): void {
  withMixpanel((m) => m.track('Plan Customized', props));
}

export function trackAddonsStepViewed(): void {
  withMixpanel((m) => m.track('Addons Step Viewed'));
}

export function trackAddonAdded(props: {
  productTitle: string;
  price: string | null;
}): void {
  withMixpanel((m) => m.track('Addon Added', props));
}

export function trackAddonRemoved(props: { productTitle: string }): void {
  withMixpanel((m) => m.track('Addon Removed', props));
}

export function trackOrderSummaryViewed(props: {
  bagWeight: number;
  frequencyWeeks: number;
  addonCount: number;
}): void {
  withMixpanel((m) => m.track('Order Summary Viewed', props));
}

export function trackCheckoutStarted(props: {
  samplePrice: string;
  bagWeight: number;
  frequencyWeeks: number;
  addonCount: number;
  contentIds?: string[];
  value?: number;
}): void {
  withMixpanel((m) => m.track('Checkout Started', props));
  const { contentIds, value, ...gaProps } = props;
  trackGaEvent('begin_checkout', { ...gaProps, page: getPageLabel(), currency: 'NZD', value });
  if (props.contentIds?.length) {
    trackMetaInitiateCheckout({
      contentIds: props.contentIds,
      value: props.value,
      currency: 'NZD',
    });
  }
}
