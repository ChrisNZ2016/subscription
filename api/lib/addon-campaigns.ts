export interface AddonCampaign {
  slug: string;
  variantId: number;
  quantity: number;
  isOnetime: boolean;
  /** Customer-facing product name shown on the confirmation page */
  label: string;
  /** Used when minting expiring `?t=` tokens. Default 7. */
  ttlDays: number;
  /** Optional hard stop for campaign `sid`+`sig` links (ISO date). */
  expiresAt?: string;
}

/** Live poop-bag add-on offers. Env `ADDON_CAMPAIGNS` overrides this list. */
export const DEFAULT_ADDON_CAMPAIGNS: AddonCampaign[] = [
  {
    slug: 'poop-bags-60',
    variantId: 10597438849060,
    quantity: 1,
    isOnetime: false,
    label: 'Compostable poop bags (60-pack)',
    ttlDays: 14,
  },
  {
    slug: 'poop-bags-120',
    variantId: 10597447106596,
    quantity: 1,
    isOnetime: false,
    label: 'Compostable poop bags (120-pack)',
    ttlDays: 14,
  },
];

function asPositiveInt(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

export function parseCampaigns(raw = process.env.ADDON_CAMPAIGNS): AddonCampaign[] {
  if (!raw || !raw.trim()) return DEFAULT_ADDON_CAMPAIGNS;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('ADDON_CAMPAIGNS is not valid JSON');
  }
  if (!Array.isArray(parsed)) {
    throw new Error('ADDON_CAMPAIGNS must be a JSON array');
  }

  return parsed.map((item, i) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`ADDON_CAMPAIGNS[${i}] must be an object`);
    }
    const row = item as Record<string, unknown>;
    const slug = typeof row.slug === 'string' ? row.slug.trim() : '';
    const variantId = asPositiveInt(row.variantId);
    const label = typeof row.label === 'string' ? row.label.trim() : '';
    if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
      throw new Error(`ADDON_CAMPAIGNS[${i}].slug must be lowercase kebab-case`);
    }
    if (!variantId) {
      throw new Error(`ADDON_CAMPAIGNS[${i}].variantId must be a positive integer`);
    }
    if (!label) {
      throw new Error(`ADDON_CAMPAIGNS[${i}].label is required`);
    }
    const quantity = asPositiveInt(row.quantity) ?? 1;
    const ttlDays = asPositiveInt(row.ttlDays) ?? 7;
    const expiresAt = typeof row.expiresAt === 'string' ? row.expiresAt : undefined;
    return {
      slug,
      variantId,
      quantity,
      isOnetime: Boolean(row.isOnetime),
      label,
      ttlDays,
      expiresAt,
    };
  });
}

export function getCampaign(slug: string): AddonCampaign | null {
  const needle = slug.trim().toLowerCase();
  if (!needle) return null;
  return parseCampaigns().find((c) => c.slug === needle) ?? null;
}

export function campaignIsExpired(campaign: AddonCampaign, now = Date.now()): boolean {
  if (!campaign.expiresAt) return false;
  const at = Date.parse(campaign.expiresAt);
  if (Number.isNaN(at)) return false;
  return now > at;
}

export function publicBaseUrl(): string {
  const fromEnv = process.env.ADDON_PUBLIC_BASE_URL?.replace(/\/+$/, '');
  return fromEnv || 'https://lp.littlegreendog.co.nz';
}

export function tokenUrl(token: string): string {
  return `${publicBaseUrl()}/add-to-subscription?t=${encodeURIComponent(token)}`;
}

export function campaignUrl(slug: string, subscriptionId: number, sig: string): string {
  const params = new URLSearchParams({
    sid: String(subscriptionId),
    sig,
  });
  return `${publicBaseUrl()}/add-to-subscription/${encodeURIComponent(slug)}?${params}`;
}

/** Klaviyo custom-property name for a campaign's prebuilt URL. Hyphens → underscores. */
export function klaviyoLinkProperty(slug: string): string {
  return `addon_link_${slug.replace(/-/g, '_')}`;
}
