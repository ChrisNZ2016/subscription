const LINE_NONCE_PROP = '_lgd_one_click';
const LINE_CAMPAIGN_PROP = '_lgd_addon_campaign';

export interface RecurpayLineItem {
  id: number;
  variant_id: string | number;
  quantity: number;
  title?: string;
  name?: string;
  properties?: Array<{ name: string; value: string | number }>;
  is_onetime?: boolean;
}

export interface RecurpaySubscription {
  id: number;
  status: string;
  next_billing_at?: string | null;
  line_items?: RecurpayLineItem[];
  subscriber?: {
    email?: string;
    first_name?: string;
  };
}

interface RecurpayEnvelope<T> {
  success?: boolean;
  message?: string;
  data?: T;
}

function apiBase(): string {
  const base = process.env.RECURPAY_API_BASE?.replace(/\/+$/, '');
  if (!base) throw new Error('RECURPAY_API_BASE is not set');
  return base;
}

function accessToken(): string {
  const token = process.env.RECURPAY_ACCESS_TOKEN;
  if (!token) throw new Error('RECURPAY_ACCESS_TOKEN is not set');
  return token;
}

async function recurpay<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Recurpay-Access-Token': accessToken(),
      ...(init?.headers ?? {}),
    },
  });

  const text = await res.text();
  let json: RecurpayEnvelope<T> | null = null;
  try {
    json = JSON.parse(text) as RecurpayEnvelope<T>;
  } catch {
    throw new Error(`Recurpay ${res.status}: ${text.slice(0, 200)}`);
  }

  if (!res.ok || json.success === false) {
    throw new RecurpayError(
      json.message || `Recurpay request failed (${res.status})`,
      res.status,
    );
  }

  return (json.data ?? json) as T;
}

export class RecurpayError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'RecurpayError';
    this.status = status;
  }
}

export async function getSubscription(id: number): Promise<RecurpaySubscription> {
  const data = await recurpay<{ subscription: RecurpaySubscription }>(
    `/subscriptions/${id}`,
  );
  return data.subscription;
}

export async function findActiveSubscriptionByEmail(
  email: string,
): Promise<RecurpaySubscription | null> {
  const params = new URLSearchParams({
    email,
    status: 'active',
    sort_key: 'id',
    sort_by: 'desc',
  });
  const data = await recurpay<{
    subscription?: RecurpaySubscription[] | RecurpaySubscription;
    subscriptions?: RecurpaySubscription[];
  }>(`/subscriptions?${params}`);
  const list = Array.isArray(data.subscriptions)
    ? data.subscriptions
    : Array.isArray(data.subscription)
      ? data.subscription
      : data.subscription
        ? [data.subscription]
        : [];
  return list[0] ?? null;
}

export function variantAlreadyOnSubscription(
  sub: RecurpaySubscription,
  variantId: number,
): boolean {
  return (sub.line_items ?? []).some((line) => Number(line.variant_id) === variantId);
}

export function nonceAlreadyUsed(sub: RecurpaySubscription, nonce: string): boolean {
  return (sub.line_items ?? []).some((line) =>
    (line.properties ?? []).some(
      (p) => p.name === LINE_NONCE_PROP && String(p.value) === nonce,
    ),
  );
}

export function campaignAlreadyAdded(sub: RecurpaySubscription, slug: string): boolean {
  return (sub.line_items ?? []).some((line) =>
    (line.properties ?? []).some(
      (p) => p.name === LINE_CAMPAIGN_PROP && String(p.value) === slug,
    ),
  );
}

export function isAddableStatus(status: string): boolean {
  const s = status.toLowerCase();
  return s === 'active' || s === 'paused';
}

export async function addSubscriptionLine(input: {
  subscriptionId: number;
  variantId: number;
  quantity: number;
  isOnetime: boolean;
  nonce: string;
  campaign?: string;
}): Promise<RecurpayLineItem[]> {
  const properties: Array<{ name: string; value: string }> = [
    { name: LINE_NONCE_PROP, value: input.nonce },
  ];
  if (input.campaign) {
    properties.push({ name: LINE_CAMPAIGN_PROP, value: input.campaign });
  }

  const data = await recurpay<{ line_items: RecurpayLineItem[] }>(
    `/subscriptions/${input.subscriptionId}/lines`,
    {
      method: 'PUT',
      body: JSON.stringify({
        line_items: {
          add: [
            {
              variant_id: input.variantId,
              quantity: input.quantity,
              properties,
              is_onetime: input.isOnetime,
            },
          ],
        },
      }),
    },
  );
  return data.line_items ?? [];
}
