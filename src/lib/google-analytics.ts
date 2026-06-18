// GA4 property 326931496 — tracking uses the web stream Measurement ID (G-…), not the numeric property ID.
const MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

let initialized = false;

function initGtag(): void {
  if (initialized || !MEASUREMENT_ID) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer.push(args);
  };
  window.gtag('js', new Date());
  window.gtag('config', MEASUREMENT_ID, { send_page_view: false });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  document.head.appendChild(script);

  initialized = true;
}

export function trackGaPageView(pagePath: string, pageTitle?: string): void {
  if (!MEASUREMENT_ID) return;
  initGtag();
  window.gtag('event', 'page_view', {
    page_path: pagePath,
    page_title: pageTitle ?? document.title,
  });
}

export function trackGaEvent(
  name: string,
  params?: Record<string, string | number | boolean | undefined>,
): void {
  if (!MEASUREMENT_ID) return;
  initGtag();
  window.gtag('event', name, params);
}
