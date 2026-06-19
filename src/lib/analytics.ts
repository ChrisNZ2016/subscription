import mixpanel from 'mixpanel-browser';
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
  return 'landing';
}

// Initialise once. persistence='localStorage' avoids third-party cookie issues.
mixpanel.init(TOKEN, {
  persistence: 'localStorage',
  track_pageview: false, // we fire Page Viewed manually for full control
});

// ─── Identity ────────────────────────────────────────────────────────────────

/**
 * Returns the Mixpanel distinct_id so it can be passed to Shopify as a
 * cart attribute, enabling identity stitching through the checkout pixel and
 * the server-side webhook.
 */
export function getDistinctId(): string {
  return mixpanel.get_distinct_id() as string;
}

// ─── Landing-page funnel events ───────────────────────────────────────────────

export function trackPageViewed(meta?: { contentIds?: string[]; value?: number }): void {
  const page = getPageLabel();
  mixpanel.track('Page Viewed', { page });
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

export function trackCtaClicked(location: 'hero' | 'nav' | 'sticky' | 'why-you-love-it' | 'faq'): void {
  mixpanel.track('CTA Clicked', { location });
  trackGaEvent('cta_clicked', { location, page: getPageLabel() });
}

export function trackDogSizeSelected(props: {
  size: string;
  bagWeight: number;
  frequencyWeeks: number;
}): void {
  mixpanel.track('Dog Size Selected', props);
}

export function trackPlanCustomized(props: {
  field: 'bagWeight' | 'frequency';
  bagWeight: number;
  frequencyWeeks: number;
}): void {
  mixpanel.track('Plan Customized', props);
}

export function trackAddonsStepViewed(): void {
  mixpanel.track('Addons Step Viewed');
}

export function trackAddonAdded(props: {
  productTitle: string;
  price: string | null;
}): void {
  mixpanel.track('Addon Added', props);
}

export function trackAddonRemoved(props: { productTitle: string }): void {
  mixpanel.track('Addon Removed', props);
}

export function trackOrderSummaryViewed(props: {
  bagWeight: number;
  frequencyWeeks: number;
  addonCount: number;
}): void {
  mixpanel.track('Order Summary Viewed', props);
}

export function trackCheckoutStarted(props: {
  samplePrice: string;
  bagWeight: number;
  frequencyWeeks: number;
  addonCount: number;
  contentIds?: string[];
  value?: number;
}): void {
  mixpanel.track('Checkout Started', props);
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
