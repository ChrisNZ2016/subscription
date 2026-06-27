# Sample‑to‑Subscription Funnel — MVP (Demand Validation)

**Status:** Simplified build. Goal is to **test whether customers take the subscription offer** before
investing in full subscription management. Supersedes the backend half of `sample-to-subscription-plan.md`
for now; that doc remains the reference for the eventual "managed" version.

**Decision (2026‑06‑27):** Ship with the **native Shopify two‑tier subscription only**. Do **NOT** create a
RecurPay subscription via API, and do **NOT** cancel the Shopify contract. We accept **no full subscription
management** (no customer portal, limited admin editing) as a known, temporary trade‑off for this test.

---

## Why this is acceptable for the MVP

- The validated two‑tier Shopify checkout already delivers **100 % of the customer‑facing requirement**:
  honest *"First payment $19.99, then $X every N months"*, charges only $19.99 today, correct price/size/timing.
- The subscription **is real** — it's a live Shopify `SubscriptionContract` with the customer's vaulted card and
  a scheduled next billing date. It will renew.
- What we lose **temporarily**: RecurPay management (customer self‑serve portal, skip/swap/reschedule UI, dunning,
  the SKU still being the *sample* product on renewals). These matter for scale, not for proving demand.
- We are **not** doing Option B (never charge sample + first bag together) and **not** using RecurPay's own
  widget checkout (insufficient transparency). Both permanently rejected.

### ⚠️ Known limitations to accept consciously before launch
1. **Renewal ships the SAMPLE product/SKU, not the real bag.** The two‑tier plan is on the *sample* variant; it
   bills the higher recurring price but the line item is still the sample SKU (`LGD-KBL-SAM`). At renewal the
   customer would be charged $X and sent... the sample SKU. **Mitigation options for MVP (pick one):**
   a. Set the recurring price = the **real discounted bag price**, and **manually** swap fulfilment SKU when a
      renewal order appears (low volume during a test — manageable by hand).
   b. Only let the **first renewal sit ~1 month out**, and use the test window to gauge sign‑ups *before* any
      renewal actually bills (i.e. measure conversion in the first weeks; handle/upgrade before month‑2 charges).
   → For pure demand validation, (b) is enough: we're measuring **who subscribes**, not running renewals at scale.
2. **No customer self‑service portal** (RecurPay won't show these contracts). Cancellations/edits handled
   manually via Shopify admin or by support during the test.
3. **Limited Shopify admin editing** (contract created by our Dev Dashboard app, which has no management UI).

These limitations are the explicit cost of shipping fast to test demand. Revisit via
`sample-to-subscription-plan.md` (full managed version) if demand is proven.

---

## What we KEEP from the original plan

- **Two‑tier Shopify selling plans** on the sample product (Step A) — unchanged and required.
- **New landing page** based on `/solo` (Step B) — unchanged.
- **Size + frequency calculator** with the feeding model (Step B) — unchanged.
- Price transparency at checkout — unchanged (this is the whole point).

## What we REMOVE (the deferred complexity)

- ❌ The Vercel `orders/create` webhook that called RecurPay's create‑sub API.
- ❌ Cancelling the Shopify contract (`subscriptionContractCancel`).
- ❌ All RecurPay API integration (the create‑sub call is what triggers the non‑suppressible
  "update your payment method" email — removing it removes the email problem entirely).
- ❌ The cart attributes that existed only to drive that webhook (`sample_subscribe`, etc.) — optional to keep
  for future use / analytics, but no longer functionally required.

---

## MVP build steps

### A. Shopify selling plans (one‑time, via Admin API) — REQUIRED
Create a two‑tier selling plan **per size × frequency** (25 % tier only for the new page) on the **sample** product.
- Cycle 1: `fixed` `adjustmentType: PRICE` = `19.99`.
- Cycle 2+: `recurring` `adjustmentType: PRICE`, `afterCycle: 1` = **discounted real‑bag price** for that size
  (full × 0.75). e.g. 6 kg → $94.50. (See price table in `sample-to-subscription-plan.md` §3.)
- `billingPolicy` + `deliveryPolicy` recurring, interval MONTH, intervalCount = 1 / 2 / 3.
- Attach each plan to the matching sample variant.
- Output: `size+freq → { sampleVariantId, sellingPlanId }` map for the frontend.
- Sizes offered: **all six — 2/4/6/8/12/24 kg** (sample variants exist for all; selling plans created for all
  18 = 6 sizes × 3 freq, 25 %). The plan script is idempotent (skips sizes that already have plans).
- Reference script: `scripts/create-sample-subscribe-plans.mjs --write` (Dev Dashboard app token via client_credentials).
- ⚠️ 12 kg & 24 kg sample variants had **null SKU** — user is setting the SKU so the sample order line carries
  one for the warehouse (the 2/4/6/8 kg variants use `LGD-KBL-SAM`).

> Note on the recurring price: because there is no auto SKU‑swap in the MVP, setting cycle 2+ to the **discounted
> real‑bag price** keeps the *charge* correct. The shipped SKU stays the sample until we (manually or later
> automatically) swap it — see limitation #1.

### B. Frontend — new landing page (based on `/solo`) — REQUIRED
- New route in `src/App.tsx` (e.g. `/sample-subscribe`); copy `SoloPage.tsx`. **Leave `/solo` untouched.**
- Copy: clearly state they pay **$19.99 for the 2 kg sample today** and **subscribe** to the chosen size +
  frequency, with the ongoing price and that it starts in N months.
- Calculator: extend `src/lib/feedingGuide.ts` to also suggest a **frequency** (feeding model in
  `sample-to-subscription-plan.md` §4B). Both size and frequency editable.
- Cart: single line = `{ sampleVariantId, sellingPlanId }` for the chosen size+freq, via the `src/lib/cart.ts`
  pattern. Display "First $19.99, then $X every N months." Pre‑warm cart on size/frequency change.

### C. Backend — post-purchase SKU swap (no RecurPay)
The warehouse must ship the real bag on renewals, so after the order we swap the contract's line from the
**sample** variant to the **real** kibble-pack variant — keeping the discounted recurring price and the
Shopify-native contract. **No RecurPay API call** (avoids the email) and **no cancellation**.

Implemented as a **dedicated `subscription_contracts/create` webhook** —
`api/webhooks/subscription-contracts-create.ts` → `processSampleSubscribeContract()`
(`api/lib/sample-subscribe.ts`, `api/lib/shopify-admin.ts`). We use this trigger (not `orders/create`)
because Shopify creates the contract **asynchronously after** the order; this webhook fires once the contract
exists, so there's no race and no polling/retry loop in the function.
1. Verify HMAC; read the contract gid (`admin_graphql_api_id`) and `origin_order_id` from the payload.
2. Read the contract's first line; map its **sample variant → size**. If it's not one of our sample variants,
   ignore (it's some other subscription).
3. Idempotency: skip if the origin order already has the `sample_subscribe_processed` tag.
4. Tier: default 25 %; read the origin order's `ss_tier` attribute when present (enables 20 % later).
5. `subscriptionContractProductChange` → swap to the real variant for that size, set `currentPrice` = the
   discounted price (full × 0.75 for 25 %). One mutation, no draft/commit.
6. Tag the origin order `sample_subscribe_processed`.

(`orders/create` webhook is unchanged except it no longer does the swap — it keeps doing Mixpanel/Meta tracking.)

**Result:** customer paid $19.99 today; the live Shopify subscription now bills the discounted real bag at the
chosen frequency, ships the correct SKU, first delivery one cycle out. Cycle 1 already shipped the **sample**
(the $19.99 line) — correct.

**Deploy requirements (Dev Dashboard app scopes):**
`read_orders`, `read_own_subscription_contracts`, `write_own_subscription_contracts`
(plus existing `read/write_products`, `read/write_purchase_options`). Env: `SHOPIFY_CLIENT_ID/SECRET`,
`SHOPIFY_WEBHOOK_SECRET`, `SHOPIFY_SHOP`. (RECURPAY_* no longer needed for this flow.)
Webhooks to subscribe in Shopify admin: **`subscription_contracts/create`** (the SKU swap) and the existing
`orders/create` (tracking). Keep the reverse map `SAMPLE_VARIANT_TO_SIZE` in `api/lib/sample-subscribe.ts` in
sync with `SAMPLE_VARIANT_GIDS` in `src/constants/sample-subscribe.ts`.

### D. Measurement (the actual goal)
- Track sign‑ups via existing Mixpanel/Meta funnel events (the page already has analytics plumbing).
- Define success metric (e.g. sample→subscribe conversion rate vs `/solo` sample‑only) before launch.
- Watch the first renewals (~1 month out) — decide before then whether to build the managed version.

---

## Open items for the MVP
1. **Sizes offered** on the new page (confirm 12/24 kg sample variants exist).
2. **Recurring price choice** — confirm cycle 2+ = discounted real‑bag price (recommended) so the *charge* is
   right even though the shipped SKU is the sample until swapped.
3. **Renewal handling during the test** — confirm approach to limitation #1 (manual SKU swap on renewal orders,
   or test window short enough that renewals are handled before they bill).
4. **Cancellation/support path** — how cancellations are handled without a customer portal during the test.

## Cleanup
- Test artifacts from validation: Shopify TEST plan group `gid://shopify/SellingPlanGroup/1907032213`
  (keep for build/test, delete later via `sellingPlanGroupDelete`); active test contract `75070308501`
  (cancel when done); order #LGD5506 ($19.99 on Chris's card) refund if desired.
