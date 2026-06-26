import type { OverridedMixpanel } from 'mixpanel-browser';
import {
  trackMetaInitiateCheckout,
  trackMetaPageView,
  trackMetaViewContent,
} from './meta-pixel';
import { getPageAttribution } from './page-attribution';

const TOKEN = import.meta.env.VITE_MIXPANEL_TOKEN as string;

function pageProps() {
  const { page_name, page_version } = getPageAttribution();
  return { page: page_name, page_name, page_version };
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
  // Load Mixpanel as soon as the page has finished loading, so it's ready
  // quickly without competing with critical resources (LCP/FCP).
  const start = () => void loadMixpanel();
  if (typeof document !== 'undefined' && document.readyState === 'complete') {
    start();
  } else {
    window.addEventListener('load', start, { once: true });
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
  withMixpanel((m) => m.track('Page Viewed', pageProps()));
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
  withMixpanel((m) => m.track('CTA Clicked', { location, ...pageProps() }));
}

export function trackVariantSelected(props: {
  bagWeight: number;
  price: string;
  frequencyWeeks: number;
  source: 'default' | 'user';
}): void {
  withMixpanel((m) => m.track('Variant Selected', { ...props, ...pageProps() }));
}

export function trackSectionViewed(props: { section: string }): void {
  withMixpanel((m) => m.track('Section Viewed', { ...props, ...pageProps() }));
}

export function trackProductTabChanged(props: { tab: 'info' | 'ingredients' }): void {
  withMixpanel((m) => m.track('Product Tab Changed', { ...props, ...pageProps() }));
}

export function trackBenefitExpanded(props: { title: string }): void {
  withMixpanel((m) => m.track('Benefit Expanded', { ...props, ...pageProps() }));
}

export function trackIngredientExpanded(props: { name: string }): void {
  withMixpanel((m) => m.track('Ingredient Expanded', { ...props, ...pageProps() }));
}

export function trackFaqExpanded(props: { question: string }): void {
  withMixpanel((m) => m.track('FAQ Expanded', { ...props, ...pageProps() }));
}

export function trackNavAnchorClicked(props: { target: string }): void {
  withMixpanel((m) => m.track('Nav Anchor Clicked', { ...props, ...pageProps() }));
}

export function trackInternalLinkClicked(props: {
  destination: string;
  location: string;
  label?: string;
}): void {
  withMixpanel((m) => m.track('Internal Link Clicked', { ...props, ...pageProps() }));
}

export function trackExternalLinkClicked(props: {
  destination: string;
  location: string;
  label?: string;
  link_kind?: 'url' | 'email';
}): void {
  withMixpanel((m) => m.track('External Link Clicked', { ...props, ...pageProps() }));
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
  withMixpanel((m) => m.track('Checkout Started', { ...props, ...pageProps() }));
  if (props.contentIds?.length) {
    trackMetaInitiateCheckout({
      contentIds: props.contentIds,
      value: props.value,
      currency: 'NZD',
    });
  }
}
