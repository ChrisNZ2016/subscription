import mixpanel from 'mixpanel-browser';

const TOKEN = import.meta.env.VITE_MIXPANEL_TOKEN as string;

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

export function trackPageViewed(): void {
  mixpanel.track('Page Viewed', { page: 'landing' });
}

export function trackCtaClicked(location: 'hero' | 'nav' | 'sticky' | 'why-you-love-it' | 'faq'): void {
  mixpanel.track('CTA Clicked', { location });
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
}): void {
  mixpanel.track('Checkout Started', props);
}
