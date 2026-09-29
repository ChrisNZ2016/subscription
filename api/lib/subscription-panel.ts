/**
 * Presentation and rules for the RecurPay subscriptions panel in the Intercom Details
 * pane (see docs/intercom-subscription-panel.md, sections 5 to 7 and 11).
 *
 * Pure module: no I/O, no env access. Formats dates and money, decides whether an
 * order can be created, and builds the Canvas Kit responses for each screen.
 *
 * PanelSubscription / PanelOrder are local mirrors of the widened RecurPay types so
 * this file does not depend on api/lib/recurpay.ts. Structural typing keeps the real
 * RecurpaySubscription assignable to PanelSubscription.
 */
import {
  canvas,
  dataTable,
  divider,
  submitButton,
  text,
  urlButton,
  type CanvasComponent,
  type CanvasResponse,
} from './intercom-canvas.js';

export type PanelPolicy = { frequency?: number | string; interval?: number | string };

export type PanelLineItem = {
  id?: number | string;
  title?: string;
  name?: string;
  variant_title?: string | null;
  quantity: number | string;
  price?: number | string;
  is_onetime?: boolean;
};

export type PanelSubscription = {
  id: number;
  status: string;
  cancelled_reason?: string | null;
  cancelled_at?: string | null;
  delivery_policy?: PanelPolicy | null;
  billing_policy?: PanelPolicy | null;
  discount_codes?: unknown[] | null;
  delivery_method?: { title?: string; price?: number | string; currency?: string } | null;
  payment_method?: { gateway?: string } | null;
  orders_count?: number | null;
  last_billing_at?: string | null;
  next_billing_at?: string | null;
  subscribed_at?: string | null;
  halted_reason?: string | null;
  halted_retries_count?: number | null;
  is_skipped?: boolean | null;
  skipped_at?: string | null;
  subscriber?: { email?: string; first_name?: string; last_name?: string } | null;
  line_items?: PanelLineItem[] | null;
};

export type PanelOrder = {
  id: number | string;
  name?: string;
  financial_status?: string;
  total_price?: number | string;
};

export type Eligibility = { eligible: boolean; reason?: string; warning?: string };

export type ComponentIdKind =
  | 'refresh'
  | 'show_all'
  | 'cancel'
  | 'back'
  | 'order'
  | 'confirm_order'
  | 'unknown';

export const SKIPPED_WARNING =
  "The next order is marked as skipped. RecurPay doesn't document how an instant order interacts with a skip.";

const TZ = 'Pacific/Auckland';
const DEFAULT_VISIBLE = 2;

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

function toDate(iso: string | Date | null | undefined): Date | undefined {
  if (iso === null || iso === undefined || iso === '') return undefined;
  const d = iso instanceof Date ? iso : new Date(iso);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

const dateFormatter = new Intl.DateTimeFormat('en-NZ', {
  timeZone: TZ,
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const timeFormatter = new Intl.DateTimeFormat('en-NZ', {
  timeZone: TZ,
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

/** "Tue 14 Oct 2026" in NZ time. Pass { weekday: false } for "14 Oct 2026". */
export function formatNzDate(
  iso: string | Date | null | undefined,
  options: { weekday?: boolean } = {},
): string | undefined {
  const d = toDate(iso);
  if (!d) return undefined;
  const parts: Record<string, string> = {};
  for (const p of dateFormatter.formatToParts(d)) parts[p.type] = p.value;
  // Some ICU builds emit "Sept"; keep three letters for consistency.
  const month = (parts.month ?? '').slice(0, 3);
  const core = `${parts.day} ${month} ${parts.year}`;
  return options.weekday === false ? core : `${parts.weekday} ${core}`;
}

/** "10:42am" in NZ time. */
export function formatNzTime(iso: string | Date | null | undefined): string | undefined {
  const d = toDate(iso);
  if (!d) return undefined;
  const parts: Record<string, string> = {};
  for (const p of timeFormatter.formatToParts(d)) parts[p.type] = p.value;
  return `${parts.hour}:${parts.minute}${(parts.dayPeriod ?? '').toLowerCase()}`;
}

function toNumber(v: unknown): number | undefined {
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v.replace(/[$,\s]/g, ''));
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

/** "$100.80" (NZD). Accepts numbers or numeric strings. */
export function formatMoney(n: number | string | null | undefined): string | undefined {
  const v = toNumber(n);
  if (v === undefined) return undefined;
  const sign = v < 0 ? '-' : '';
  return `${sign}$${Math.abs(v).toFixed(2)}`;
}

// ---------------------------------------------------------------------------
// Frequency
// ---------------------------------------------------------------------------

type ParsedPolicy = { count: number; unit: 'day' | 'week' | 'month' | 'year' };

function parsePolicy(policy: PanelPolicy | null | undefined): ParsedPolicy | undefined {
  if (!policy) return undefined;
  let count: number | undefined;
  let unit: ParsedPolicy['unit'] | undefined;
  for (const raw of [policy.frequency, policy.interval]) {
    if (raw === undefined || raw === null) continue;
    if (typeof raw === 'number') {
      if (count === undefined && raw > 0) count = raw;
      continue;
    }
    const s = String(raw).trim().toLowerCase();
    if (s === '') continue;
    if (/^\d+$/.test(s)) {
      if (count === undefined && Number(s) > 0) count = Number(s);
      continue;
    }
    const m = /^(?:(\d+)\s*)?(day|week|month|year)s?$/.exec(s);
    if (m) {
      if (unit === undefined) unit = m[2] as ParsedPolicy['unit'];
      if (m[1] && count === undefined) count = Number(m[1]);
    }
  }
  if (count === undefined || unit === undefined) return undefined;
  return { count, unit };
}

/** "Every month", "Every 2 months", "Every 6 weeks". */
export function frequencyLabel(sub: PanelSubscription): string | undefined {
  const p = parsePolicy(sub.delivery_policy);
  if (!p) return undefined;
  return p.count === 1 ? `Every ${p.unit}` : `Every ${p.count} ${p.unit}s`;
}

function policySignature(policy: PanelPolicy | null | undefined): string {
  return `${String(policy?.frequency ?? '').toLowerCase()}|${String(policy?.interval ?? '').toLowerCase()}`;
}

/** Prepaid: billing and delivery policy both present and they differ. */
export function isPrepaid(sub: PanelSubscription): boolean {
  if (!sub.billing_policy || !sub.delivery_policy) return false;
  return policySignature(sub.billing_policy) !== policySignature(sub.delivery_policy);
}

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

function statusKey(sub: PanelSubscription): string {
  return String(sub.status ?? '').trim().toLowerCase();
}

export function orderEligibility(sub: PanelSubscription, now: Date): Eligibility {
  void now; // reserved: rules are status based today
  const status = statusKey(sub);
  if (status !== 'active') {
    const label = status === '' ? 'unknown' : status;
    return { eligible: false, reason: `Subscription is ${label}. Orders can only be created on active subscriptions.` };
  }
  if (isPrepaid(sub)) {
    return { eligible: false, reason: 'Prepaid subscription. Instant orders are not offered for these.' };
  }
  if (sub.is_skipped) return { eligible: true, warning: SKIPPED_WARNING };
  return { eligible: true };
}

/** Returns the formatted time of the last order if it was created within `minutes`. */
export function recentOrderGuard(sub: PanelSubscription, now: Date, minutes = 15): string | undefined {
  const last = toDate(sub.last_billing_at);
  if (!last) return undefined;
  const ageMs = now.getTime() - last.getTime();
  if (ageMs < 0 || ageMs > minutes * 60_000) return undefined;
  return formatNzTime(last);
}

const STATUS_RANK: Record<string, number> = { halted: 0, active: 1, paused: 2, cancelled: 3 };

function rank(sub: PanelSubscription): number {
  return STATUS_RANK[statusKey(sub)] ?? 4;
}

/** Halted, Active, Paused, Cancelled, others. Newest id first within each group. */
export function sortSubscriptions<T extends PanelSubscription>(subs: readonly T[]): T[] {
  return [...subs].sort((a, b) => rank(a) - rank(b) || b.id - a.id);
}

function activeLineItems(sub: PanelSubscription): PanelLineItem[] {
  return Array.isArray(sub.line_items) ? sub.line_items : [];
}

function lineTotal(li: PanelLineItem): number | undefined {
  const price = toNumber(li.price);
  if (price === undefined) return undefined;
  return price * (toNumber(li.quantity) ?? 1);
}

/** Sum of (line price x quantity) plus delivery price. Unparseable values count as 0. */
export function estimatedTotal(sub: PanelSubscription): number {
  let total = 0;
  for (const li of activeLineItems(sub)) total += lineTotal(li) ?? 0;
  total += toNumber(sub.delivery_method?.price) ?? 0;
  return Math.round(total * 100) / 100;
}

/** now + delivery interval, as an ISO string. An estimate only. */
export function estimatedNextOrder(sub: PanelSubscription, now: Date): string | undefined {
  const p = parsePolicy(sub.delivery_policy);
  if (!p) return undefined;
  const d = new Date(now.getTime());
  if (p.unit === 'day') d.setUTCDate(d.getUTCDate() + p.count);
  else if (p.unit === 'week') d.setUTCDate(d.getUTCDate() + 7 * p.count);
  else if (p.unit === 'month') d.setUTCMonth(d.getUTCMonth() + p.count);
  else d.setUTCFullYear(d.getUTCFullYear() + p.count);
  return d.toISOString();
}

// ---------------------------------------------------------------------------
// Component ids
// ---------------------------------------------------------------------------

export function parseComponentId(id: string | undefined | null): {
  kind: ComponentIdKind;
  subscriptionId?: number;
} {
  const raw = (id ?? '').trim();
  if (raw === 'refresh' || raw === 'show_all' || raw === 'cancel' || raw === 'back') return { kind: raw };
  const m = /^(order|confirm_order):(\d+)$/.exec(raw);
  if (m) {
    const n = Number(m[2]);
    if (Number.isSafeInteger(n)) return { kind: m[1] as 'order' | 'confirm_order', subscriptionId: n };
  }
  return { kind: 'unknown' };
}

// ---------------------------------------------------------------------------
// Card content helpers
// ---------------------------------------------------------------------------

function itemName(li: PanelLineItem): string {
  const base = (li.title ?? li.name ?? 'Item').trim() || 'Item';
  const variant = li.variant_title?.trim();
  if (variant && variant.toLowerCase() !== 'default title' && !base.toLowerCase().includes(variant.toLowerCase())) {
    return `${base} - ${variant}`;
  }
  return base;
}

function itemsSummary(sub: PanelSubscription): string | undefined {
  const items = activeLineItems(sub);
  if (items.length === 0) return undefined;
  return items
    .map((li) => {
      const qty = toNumber(li.quantity) ?? 1;
      const price = formatMoney(li.price);
      const oneOff = li.is_onetime ? ' (one-off)' : '';
      return `${itemName(li)} × ${qty}${price ? `, ${price}` : ''}${oneOff}`;
    })
    .join('; ');
}

function deliverySummary(sub: PanelSubscription): string | undefined {
  const dm = sub.delivery_method;
  if (!dm) return undefined;
  const price = formatMoney(dm.price);
  const title = dm.title?.trim();
  if (title && price) return `${title}, ${price}`;
  return title || price;
}

function discountSummary(sub: PanelSubscription): string | undefined {
  const codes = Array.isArray(sub.discount_codes) ? sub.discount_codes : [];
  const names: string[] = [];
  for (const c of codes) {
    if (typeof c === 'string' && c.trim()) names.push(c.trim());
    else if (typeof c === 'object' && c !== null) {
      const o = c as Record<string, unknown>;
      const v = o.code ?? o.title ?? o.name;
      if (typeof v === 'string' && v.trim()) names.push(v.trim());
    }
  }
  return names.length > 0 ? names.join(', ') : undefined;
}

function statusText(sub: PanelSubscription): string {
  const status = statusKey(sub);
  if (status === 'active') return sub.is_skipped ? 'Active, next order skipped' : 'Active';
  if (status === 'halted') {
    const detail: string[] = [];
    if (sub.halted_reason) detail.push(sub.halted_reason);
    const retries = sub.halted_retries_count;
    if (typeof retries === 'number' && retries > 0) detail.push(`${retries} ${retries === 1 ? 'retry' : 'retries'}`);
    return `Halted: payment failed${detail.length ? ` (${detail.join(', ')})` : ''}`;
  }
  if (status === 'paused') return 'Paused';
  if (status === 'cancelled') {
    const when = formatNzDate(sub.cancelled_at, { weekday: false });
    const reason = sub.cancelled_reason?.trim();
    return `Cancelled${when ? ` ${when}` : ''}${reason ? ` (${reason})` : ''}`;
  }
  const raw = String(sub.status ?? '').trim();
  return raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : 'Unknown';
}

function subscriptionTable(sub: PanelSubscription): CanvasComponent {
  const orders = sub.orders_count;
  return dataTable([
    ['Status', statusText(sub)],
    ['Items', itemsSummary(sub)],
    ['Delivery', deliverySummary(sub)],
    ['Every', frequencyLabel(sub)],
    ['Next order', formatNzDate(sub.next_billing_at)],
    ['Last order', formatNzDate(sub.last_billing_at, { weekday: false })],
    ['Orders so far', typeof orders === 'number' ? String(orders) : undefined],
    ['Customer since', formatNzDate(sub.subscribed_at, { weekday: false })],
    ['Discount', discountSummary(sub)],
    ['Card', sub.payment_method?.gateway?.trim() || undefined],
  ]);
}

// ---------------------------------------------------------------------------
// Screens
// ---------------------------------------------------------------------------

export function buildSubscriptionCard(args: {
  email: string;
  subscriptions: readonly PanelSubscription[];
  showAll?: boolean;
  adminUrlTemplate?: string;
  now: Date;
}): CanvasResponse {
  const { email, now } = args;
  const showAll = args.showAll === true;
  const sorted = sortSubscriptions(args.subscriptions);
  const shown = showAll ? sorted : sorted.slice(0, DEFAULT_VISIBLE);
  const hidden = sorted.length - shown.length;

  const components: CanvasComponent[] = [text('RecurPay subscriptions', { style: 'header' })];

  shown.forEach((sub, i) => {
    if (i > 0) components.push(divider());
    if (statusKey(sub) === 'halted') {
      components.push(text('Payment failing on this subscription', { style: 'error', bottomMargin: 'none' }));
    }
    components.push(subscriptionTable(sub));
    if (orderEligibility(sub, now).eligible) {
      components.push(submitButton(`order:${sub.id}`, 'Create order now', 'secondary'));
    }
    if (args.adminUrlTemplate) {
      components.push(
        urlButton(`open:${sub.id}`, 'Open in RecurPay', args.adminUrlTemplate.replace('{id}', String(sub.id)), 'secondary'),
      );
    }
  });

  if (hidden > 0) {
    components.push(
      submitButton('show_all', `+ ${hidden} more ${hidden === 1 ? 'subscription' : 'subscriptions'}`, 'link'),
    );
  }
  components.push(submitButton('refresh', 'Refresh', 'link'));

  return canvas(components, { contact_email: email, show_all: showAll });
}

export function buildNoEmailCard(): CanvasResponse {
  return canvas([
    text('RecurPay subscriptions', { style: 'header' }),
    text("No email on this contact, so RecurPay can't be searched."),
  ]);
}

export function buildNoSubscriptionsCard(email: string): CanvasResponse {
  return canvas(
    [
      text('RecurPay subscriptions', { style: 'header' }),
      text(`No RecurPay subscription for ${email}.`),
      text("If they subscribed with a different email, search RecurPay directly.", { style: 'muted' }),
      submitButton('refresh', 'Refresh', 'link'),
    ],
    { contact_email: email },
  );
}

export function buildErrorCard(message: string): CanvasResponse {
  return canvas([
    text('RecurPay subscriptions', { style: 'header' }),
    text(message, { style: 'error' }),
    submitButton('refresh', 'Try again', 'secondary'),
  ]);
}

export function buildConfirmCard(args: {
  sub: PanelSubscription;
  email: string;
  now: Date;
  nonce: string;
}): CanvasResponse {
  const { sub, email, now, nonce } = args;
  const elig = orderEligibility(sub, now);
  const rows: Array<[string, string | undefined]> = activeLineItems(sub).map((li) => {
    const qty = toNumber(li.quantity) ?? 1;
    return [`${itemName(li)} × ${qty}`, formatMoney(lineTotal(li))];
  });
  const dm = sub.delivery_method;
  rows.push(['Delivery', dm ? `${dm.title?.trim() ? `${dm.title.trim()}, ` : ''}${formatMoney(dm.price) ?? '$0.00'}` : undefined]);
  rows.push(['Estimated total', formatMoney(estimatedTotal(sub))]);

  const gateway = sub.payment_method?.gateway?.trim() || 'on file';
  const nextEst = formatNzDate(estimatedNextOrder(sub, now));

  const components: CanvasComponent[] = [
    text('Create an order now?', { style: 'header' }),
    dataTable(rows),
    text(`Charges the saved card (${gateway}) immediately and ships the order.`),
  ];
  if (nextEst) components.push(text(`Next order moves to about ${nextEst} (estimate).`, { style: 'muted' }));
  if (elig.warning) components.push(text(elig.warning, { style: 'error' }));
  components.push(
    text("This can't be undone.", { style: 'error' }),
    submitButton(`confirm_order:${sub.id}`, 'Confirm and charge', 'primary'),
    submitButton('cancel', 'Cancel', 'link'),
  );

  return canvas(components, { subscription_id: sub.id, contact_email: email, nonce });
}

export function buildOrderResultCard(args: {
  order: PanelOrder;
  sub: PanelSubscription;
  shopifyOrderUrl?: string;
}): CanvasResponse {
  const { order, sub, shopifyOrderUrl } = args;
  const components: CanvasComponent[] = [
    text('Order created', { style: 'header' }),
    dataTable([
      ['Order', order.name ?? (order.id !== undefined ? String(order.id) : undefined)],
      ['Amount', formatMoney(order.total_price)],
      ['Payment', order.financial_status],
      ['Next order', formatNzDate(sub.next_billing_at)],
    ]),
  ];
  if (shopifyOrderUrl) components.push(urlButton('shopify', 'View in Shopify', shopifyOrderUrl, 'secondary'));
  components.push(submitButton('back', 'Back', 'link'));
  return canvas(components);
}

export function buildOrderBlockedCard(message: string): CanvasResponse {
  return canvas([
    text('Order not created', { style: 'header' }),
    text(message, { style: 'error' }),
    submitButton('back', 'Back', 'link'),
  ]);
}

export function buildOrderFailedCard(message: string): CanvasResponse {
  return canvas([
    text('Order failed', { style: 'header' }),
    text(message, { style: 'error' }),
    submitButton('back', 'Back', 'link'),
  ]);
}
