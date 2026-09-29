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
  product_id?: number;
  variant_title?: string | null;
  price?: number;
  /** RecurPay's own spelling of "policies". */
  pricing_polices?: unknown[];
}

interface RecurpayPolicy {
  frequency?: number;
  interval?: string;
}

export interface RecurpaySubscription {
  id: number;
  contract_id?: string;
  plan_id?: number | null;
  status: string;
  cancelled_reason?: string | null;
  cancelled_at?: string | null;
  delivery_policy?: RecurpayPolicy;
  billing_policy?: RecurpayPolicy;
  discount_codes?: unknown[];
  delivery_method?: {
    type?: string;
    option?: string;
    title?: string;
    price?: number;
    currency?: string;
  };
  payment_method?: {
    gateway?: string;
    mode?: string;
    currency?: string;
    currency_symbol?: string;
  };
  orders_count?: number;
  last_billing_at?: string | null;
  next_billing_at?: string | null;
  subscribed_at?: string | null;
  halted_at?: string | null;
  halted_reason?: string | null;
  halted_retries_count?: number | null;
  is_skipped?: boolean;
  skipped_at?: string | null;
  created_at?: string;
  updated_at?: string;
  line_items?: RecurpayLineItem[];
  subscriber?: {
    id?: number;
    email?: string;
    first_name?: string;
    last_name?: string;
  };
}

export interface RecurpayOrder {
  id: number | string;
  name?: string;
  financial_status?: string;
  total_price?: number | string;
  currency?: string;
  created_at?: string;
}

interface RecurpayPageInfo {
  has_next_page?: boolean;
  /** RecurPay's docs misspell this key. */
  has_next_nage?: boolean;
}

interface RecurpayEnvelope<T> {
  success?: boolean;
  message?: string;
  data?: T;
  page_info?: RecurpayPageInfo;
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

async function recurpayEnvelope<T>(
  path: string,
  init?: RequestInit,
): Promise<RecurpayEnvelope<T>> {
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

  return json;
}

async function recurpay<T>(path: string, init?: RequestInit): Promise<T> {
  const json = await recurpayEnvelope<T>(path, init);
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
  const data = await recurpay<SubscriptionListData>(`/subscriptions?${params}`);
  return subscriptionList(data)[0] ?? null;
}

type SubscriptionListData = {
  subscription?: RecurpaySubscription[] | RecurpaySubscription;
  subscriptions?: RecurpaySubscription[];
  page_info?: RecurpayPageInfo;
};

function subscriptionList(data: SubscriptionListData | null | undefined): RecurpaySubscription[] {
  if (!data) return [];
  if (Array.isArray(data.subscriptions)) return data.subscriptions;
  if (Array.isArray(data.subscription)) return data.subscription;
  return data.subscription ? [data.subscription] : [];
}

const LIST_PAGE_SIZE = 100;
const LIST_MAX_PAGES = 5;

/**
 * Every subscription for an email, all statuses, newest first (max 500).
 * Pages while page_info says there is another page; page_info may sit at the
 * envelope top level or inside data, so both are checked.
 */
export async function listSubscriptionsByEmail(
  email: string,
): Promise<RecurpaySubscription[]> {
  const all: RecurpaySubscription[] = [];
  for (let page = 1; page <= LIST_MAX_PAGES; page++) {
    const params = new URLSearchParams({
      email,
      sort_key: 'id',
      sort_by: 'desc',
      limit: String(LIST_PAGE_SIZE),
      page: String(page),
    });
    const json = await recurpayEnvelope<SubscriptionListData>(`/subscriptions?${params}`);
    const data = json.data ?? (json as unknown as SubscriptionListData);
    const list = subscriptionList(data);
    all.push(...list);

    const info = json.page_info ?? data.page_info;
    const hasNext = info?.has_next_page ?? info?.has_next_nage ?? false;
    if (!hasNext || list.length === 0) break;
  }
  return all;
}

/**
 * RecurPay "instant order": PUT /subscriptions/{id}/renew.
 * This charges the customer's saved payment method IMMEDIATELY, creates and
 * ships a real Shopify order, and moves the next renewal date. It CANNOT be
 * undone, and RecurPay has no idempotency key, so callers must guard against
 * double calls (confirm step, recent last_billing_at check).
 */
export async function renewSubscription(
  id: number,
): Promise<{ subscription?: RecurpaySubscription; order?: RecurpayOrder }> {
  const data = await recurpay<{
    subscription?: RecurpaySubscription;
    order?: RecurpayOrder;
  }>(`/subscriptions/${id}/renew`, { method: 'PUT', body: JSON.stringify({}) });
  return { subscription: data.subscription, order: data.order };
}

/** True when billing and delivery cadence differ (items are locked, prepaid style). */
export function isPrepaid(sub: RecurpaySubscription): boolean {
  const billing = sub.billing_policy;
  const delivery = sub.delivery_policy;
  if (
    billing?.frequency == null ||
    !billing.interval ||
    delivery?.frequency == null ||
    !delivery.interval
  ) {
    return false;
  }
  return (
    billing.frequency !== delivery.frequency ||
    billing.interval.toLowerCase() !== delivery.interval.toLowerCase()
  );
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
