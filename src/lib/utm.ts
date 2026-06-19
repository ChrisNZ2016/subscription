const UTM_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
] as const;

const STORAGE_KEY = 'lgd_utm';

type UtmParams = Partial<Record<(typeof UTM_KEYS)[number], string>>;

function readStoredUtms(): UtmParams {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as UtmParams;
  } catch {
    return {};
  }
}

/** Persist first-touch UTMs from the landing URL for the checkout session. */
export function captureUtmParams(): void {
  const params = new URLSearchParams(window.location.search);
  const stored = readStoredUtms();
  const updated = { ...stored };

  for (const key of UTM_KEYS) {
    const value = params.get(key)?.trim();
    if (value && !updated[key]) {
      updated[key] = value;
    }
  }

  if (JSON.stringify(updated) !== JSON.stringify(stored)) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }
}

/** Cart attributes that flow to order.note_attributes for Mechanic order tagging. */
export function getUtmCartAttributes(): Array<{ key: string; value: string }> {
  const utms = readStoredUtms();
  return UTM_KEYS.flatMap((key) => {
    const value = utms[key];
    return value ? [{ key, value }] : [];
  });
}

/** Append stored UTMs to the Shopify checkout URL for Shopify journey attribution. */
export function appendUtmToCheckoutUrl(checkoutUrl: string): string {
  const utms = readStoredUtms();
  const url = new URL(checkoutUrl);

  for (const key of UTM_KEYS) {
    const value = utms[key];
    if (value && !url.searchParams.has(key)) {
      url.searchParams.set(key, value);
    }
  }

  return url.toString();
}
