/**
 * Self-check for api/lib/subscription-panel.ts and api/lib/intercom-canvas.ts.
 * Not a test framework: run with `npx tsx scripts/check-subscription-panel.mts`.
 * Exits non-zero on the first failed assertion.
 */
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import {
  dataTable,
  readAdmin,
  readContact,
  readConversationId,
  verifyIntercomSignature,
} from '../api/lib/intercom-canvas.js';
import {
  buildConfirmCard,
  buildNoSubscriptionsCard,
  buildOrderResultCard,
  buildSubscriptionCard,
  estimatedNextOrder,
  estimatedTotal,
  formatMoney,
  formatNzDate,
  formatNzTime,
  frequencyLabel,
  isPrepaid,
  orderEligibility,
  parseComponentId,
  recentOrderGuard,
  sortSubscriptions,
  SKIPPED_WARNING,
  type PanelSubscription,
} from '../api/lib/subscription-panel.js';

const now = new Date('2026-09-29T02:00:00Z');
const base = {
  delivery_policy: { frequency: 2, interval: 'months' },
  billing_policy: { frequency: 2, interval: 'months' },
  line_items: [{ id: 1, title: 'Kibble 6kg', quantity: 2, price: '50.40' }],
  delivery_method: { title: 'Standard', price: '0.00', currency: 'NZD' },
  payment_method: { gateway: 'Shopify Payments' },
  next_billing_at: '2026-10-13T11:00:00Z',
  last_billing_at: '2026-08-14T11:00:00Z',
  subscribed_at: '2026-06-19T01:00:00Z',
  orders_count: 3,
};
const mk = (id: number, status: string, extra: Partial<PanelSubscription> = {}): PanelSubscription => ({
  ...base,
  id,
  status,
  ...extra,
});

const active = mk(41, 'active');
const skipped = mk(42, 'Active', { is_skipped: true });
const paused = mk(43, 'paused');
const halted = mk(44, 'halted', { halted_reason: 'Card declined', halted_retries_count: 3 });
const cancelled = mk(45, 'cancelled', { cancelled_at: '2026-08-11T20:00:00Z', cancelled_reason: 'Too expensive' });
const prepaid = mk(46, 'active', { billing_policy: { frequency: 6, interval: 'months' } });

// Dates and money (NZ time). 2026-10-13T11:00Z is 00:00 on 14 Oct NZDT (Wednesday).
assert.equal(formatNzDate('2026-10-13T11:00:00Z'), 'Wed 14 Oct 2026');
assert.equal(formatNzDate('2026-10-13T11:00:00Z', { weekday: false }), '14 Oct 2026');
assert.equal(formatNzDate('2026-09-15T00:00:00Z'), 'Tue 15 Sep 2026');
assert.equal(formatNzDate('2026-06-15T00:00:00Z'), 'Mon 15 Jun 2026');
assert.equal(formatNzDate(undefined), undefined);
assert.equal(formatNzDate('not a date'), undefined);
assert.equal(formatNzTime('2026-10-14T21:42:00Z'), '10:42am'); // NZDT is UTC+13
assert.equal(formatNzTime('2026-10-14T09:05:00Z'), '10:05pm');
assert.equal(formatNzTime(null), undefined);
assert.equal(formatMoney(100.8), '$100.80');
assert.equal(formatMoney('100.8'), '$100.80');
assert.equal(formatMoney(undefined), undefined);
assert.equal(formatMoney('abc'), undefined);

// Frequency
assert.equal(frequencyLabel(mk(1, 'active', { delivery_policy: { frequency: 1, interval: 'month' } })), 'Every month');
assert.equal(frequencyLabel(active), 'Every 2 months');
assert.equal(frequencyLabel(mk(1, 'active', { delivery_policy: { frequency: 'week', interval: 6 } })), 'Every 6 weeks');
assert.equal(frequencyLabel(mk(1, 'active', { delivery_policy: { frequency: 1, interval: 'day' } })), 'Every day');
assert.equal(frequencyLabel(mk(1, 'active', { delivery_policy: null })), undefined);

// Prepaid
assert.equal(isPrepaid(active), false);
assert.equal(isPrepaid(prepaid), true);
assert.equal(isPrepaid(mk(1, 'active', { billing_policy: null })), false);

// Eligibility
assert.deepEqual(orderEligibility(active, now), { eligible: true });
assert.deepEqual(orderEligibility(skipped, now), { eligible: true, warning: SKIPPED_WARNING });
for (const s of [paused, halted, cancelled, mk(1, 'draft'), mk(1, '')]) {
  const e = orderEligibility(s, now);
  assert.equal(e.eligible, false, s.status);
  assert.ok(e.reason && e.reason.length > 0);
}
assert.equal(orderEligibility(prepaid, now).eligible, false);

// Recent-order guard
const recent = mk(1, 'active', { last_billing_at: '2026-09-29T01:50:00Z' }); // 10 min ago
const older = mk(1, 'active', { last_billing_at: '2026-09-29T01:40:00Z' }); // 20 min ago
const future = mk(1, 'active', { last_billing_at: '2026-09-29T02:10:00Z' });
assert.equal(recentOrderGuard(recent, now), '2:50pm');
assert.equal(recentOrderGuard(older, now), undefined);
assert.equal(recentOrderGuard(older, now, 30), '2:40pm');
assert.equal(recentOrderGuard(future, now), undefined);
assert.equal(recentOrderGuard(mk(1, 'active', { last_billing_at: null }), now), undefined);

// Sort order
assert.deepEqual(
  sortSubscriptions([cancelled, active, paused, halted, skipped, mk(50, 'draft'), mk(60, 'cancelled')]).map((s) => s.id),
  [44, 42, 41, 43, 60, 45, 50],
);

// Totals
assert.equal(estimatedTotal(active), 100.8);
assert.equal(estimatedTotal(mk(1, 'active', { delivery_method: { price: '9.5' } })), 110.3);
assert.equal(estimatedTotal(mk(1, 'active', { line_items: null, delivery_method: null })), 0);
assert.equal(estimatedNextOrder(active, now)?.slice(0, 10), '2026-11-29');
assert.equal(
  estimatedNextOrder(mk(1, 'active', { delivery_policy: { frequency: 1, interval: 'week' } }), now)?.slice(0, 10),
  '2026-10-06',
);
assert.equal(estimatedNextOrder(mk(1, 'active', { delivery_policy: null }), now), undefined);

// Component ids
assert.deepEqual(parseComponentId('refresh'), { kind: 'refresh' });
assert.deepEqual(parseComponentId('show_all'), { kind: 'show_all' });
assert.deepEqual(parseComponentId('cancel'), { kind: 'cancel' });
assert.deepEqual(parseComponentId('back'), { kind: 'back' });
assert.deepEqual(parseComponentId('order:123'), { kind: 'order', subscriptionId: 123 });
assert.deepEqual(parseComponentId('confirm_order:9'), { kind: 'confirm_order', subscriptionId: 9 });
assert.deepEqual(parseComponentId('order:abc'), { kind: 'unknown' });
assert.deepEqual(parseComponentId('order:'), { kind: 'unknown' });
assert.deepEqual(parseComponentId(undefined), { kind: 'unknown' });

// dataTable skips empty rows
assert.deepEqual(dataTable([['A', 'x'], ['B', undefined], ['C', ''], ['D', '  '], ['E', null]]).items, [
  { type: 'field-value', field: 'A', value: 'x' },
]);

// Card structure
const card = buildSubscriptionCard({ email: 'a@b.co', subscriptions: [active], adminUrlTemplate: 'https://x/{id}', now });
const comps = card.canvas.content.components;
assert.equal(comps[0]?.type, 'text');
assert.ok(comps.some((c) => c.type === 'button' && c.id === 'order:41'));
assert.ok(
  comps.some((c) => c.type === 'button' && c.id === 'open:41' && c.action.type === 'url' && c.action.url === 'https://x/41'),
);
assert.ok(comps.some((c) => c.type === 'button' && c.id === 'refresh'));
assert.deepEqual(card.canvas.stored_data, { contact_email: 'a@b.co', show_all: false });
const table = comps.find((c) => c.type === 'data-table');
assert.ok(table && table.type === 'data-table');
assert.deepEqual(
  table.items.map((i) => i.field),
  ['Status', 'Items', 'Delivery', 'Every', 'Next order', 'Last order', 'Orders so far', 'Customer since', 'Card'],
);

const many = buildSubscriptionCard({ email: 'a@b.co', subscriptions: [cancelled, active, paused, halted], now });
const manyComps = many.canvas.content.components;
assert.equal(manyComps.filter((c) => c.type === 'data-table').length, 2);
assert.ok(manyComps.some((c) => c.type === 'text' && c.style === 'error')); // halted goes first
assert.ok(manyComps.some((c) => c.type === 'button' && c.id === 'show_all' && c.label === '+ 2 more subscriptions'));
assert.ok(!manyComps.some((c) => c.type === 'button' && c.id === 'order:44')); // halted: no order button
const all = buildSubscriptionCard({
  email: 'a@b.co',
  subscriptions: [cancelled, active, paused, halted],
  showAll: true,
  now,
});
assert.equal(all.canvas.content.components.filter((c) => c.type === 'data-table').length, 4);
assert.ok(!all.canvas.content.components.some((c) => c.type === 'button' && c.id === 'show_all'));
assert.equal(
  all.canvas.content.components.filter((c) => c.type === 'button' && c.id.startsWith('order:')).length,
  1,
);

const statuses = (s: PanelSubscription) =>
  buildSubscriptionCard({ email: 'a@b.co', subscriptions: [s], now })
    .canvas.content.components.flatMap((c) => (c.type === 'data-table' ? c.items : []))
    .find((i) => i.field === 'Status')?.value;
assert.equal(statuses(active), 'Active');
assert.equal(statuses(skipped), 'Active, next order skipped');
assert.equal(statuses(halted), 'Halted: payment failed (Card declined, 3 retries)');
assert.equal(statuses(paused), 'Paused');
assert.equal(statuses(cancelled), 'Cancelled 12 Aug 2026 (Too expensive)');

assert.ok(JSON.stringify(buildNoSubscriptionsCard('a@b.co')).includes('search RecurPay directly'));

const confirm = buildConfirmCard({ sub: skipped, email: 'a@b.co', now, nonce: 'n1' });
assert.deepEqual(confirm.canvas.stored_data, { subscription_id: 42, contact_email: 'a@b.co', nonce: 'n1' });
assert.ok(JSON.stringify(confirm).includes(SKIPPED_WARNING));
assert.ok(JSON.stringify(confirm).includes('$100.80'));
assert.ok(JSON.stringify(confirm).includes('confirm_order:42'));

const result = buildOrderResultCard({
  order: { id: 9, name: '#LGD6801', financial_status: 'paid', total_price: '100.80' },
  sub: active,
  shopifyOrderUrl: 'https://s/9',
});
assert.ok(JSON.stringify(result).includes('#LGD6801'));
assert.ok(JSON.stringify(result).includes('View in Shopify'));

// Signatures
const body = Buffer.from('{"component_id":"refresh"}');
const secret = 's3cret';
const sha256 = createHmac('sha256', secret).update(body).digest('hex');
const sha1 = createHmac('sha1', secret).update(body).digest('hex');
assert.equal(sha256.length, 64);
assert.equal(sha1.length, 40);
assert.equal(verifyIntercomSignature(body, sha256, secret), true);
assert.equal(verifyIntercomSignature(body, sha1, secret), true);
assert.equal(verifyIntercomSignature(body, sha256.toUpperCase(), secret), true);
assert.equal(verifyIntercomSignature(body, sha256, 'wrong'), false);
assert.equal(verifyIntercomSignature(Buffer.from('{"tampered":1}'), sha256, secret), false);
assert.equal(verifyIntercomSignature(body, undefined, secret), false);
assert.equal(verifyIntercomSignature(body, sha256, undefined), false);
assert.equal(verifyIntercomSignature(body, sha256.slice(0, 50), secret), false);
assert.equal(verifyIntercomSignature(body, 'z'.repeat(64), secret), false);
assert.equal(verifyIntercomSignature(body, '', secret), false);

// Body readers
assert.deepEqual(readContact({ contact: { email: 'a@b.co', name: 'A', id: 'c1' } }), {
  email: 'a@b.co',
  name: 'A',
  id: 'c1',
});
assert.deepEqual(readContact({ customer: { email: 'x@y.co' } }), { email: 'x@y.co' });
assert.deepEqual(readContact({}), {});
assert.deepEqual(readContact(null), {});
assert.deepEqual(readAdmin({ admin: { id: 7, name: 'Chris' } }), { id: '7', name: 'Chris' });
assert.deepEqual(readAdmin({}), {});
assert.equal(readConversationId({ conversation: { id: 215476147059073 } }), '215476147059073');
assert.equal(readConversationId({ conversation: { id: '55' } }), '55');
assert.equal(readConversationId({}), undefined);

console.log('check-subscription-panel: all assertions passed');
