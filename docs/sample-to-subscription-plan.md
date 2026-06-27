# Sample‑to‑Subscription Funnel — Build Plan

**Status:** Architecture fully validated on the live store (2026‑06‑27). Ready to build.
**Goal:** A landing page where the customer pays **$19.99 for a 2 kg sample today**, and is set up on a
**RecurPay subscription** for the **bag size & frequency they choose**, billed at the **25 %‑off price**
starting **one billing cycle later**. Shopify checkout must honestly show *"First payment $19.99, then $X every N months."*

---

## 1. How it works (validated end‑to‑end)

```
Landing page (NEW, based on /solo)
  → calculator suggests size + frequency; customer can change both
  → "Order sample now, then subscribe" CTA
        │  cart = ONE line:
        │     SAMPLE variant (size‑matched) on a TWO‑TIER Shopify selling plan
        │     "First $19.99, then $<discounted>/<freq>"
        ▼
Shopify checkout  → charges $19.99 today, vaults the customer's card
        │            creates Shopify SubscriptionContract A
        ▼
orders/create webhook (Vercel /api)
   1. Create RecurPay subscription via API  (Contract B):
        • REAL kibble‑pack variant for the chosen size
        • recurring price = full × 0.75 (25 %)  [× 0.80 for 20 %]
        • billing + delivery frequency = chosen (1 / 2 / 3 months)
        • next charge = +1 cycle (no charge today)
        • card auto‑attaches from the customer's vaulted Shopify card
   2. Cancel Shopify Contract A via subscriptionContractCancel
      (only if step 1 succeeded)
        ▼
Result: customer paid $19.99, gets the sample now; RecurPay bills the
        discounted real bag every N months, first delivery N months later.
```

**Why two contracts:** RecurPay only manages contracts **it** creates. The Shopify two‑tier plan is required for the
honest *"$19.99 then $X"* checkout + to collect $19.99 and vault the card; RecurPay's API then creates the contract it
will actually manage; the Shopify one is cancelled so the customer is billed once.

---

## 2. Proven facts (don't re‑test)

| Fact | Evidence |
|---|---|
| Two‑tier Shopify plan shows "First $19.99, then $126/mo", charges $19.99 | Live checkout screenshot; order #LGD5506 |
| `sellingPlanGroupCreate` with `fixed` PRICE $19.99 + `recurring` PRICE afterCycle:1 works | Created plan 3145564309 |
| RecurPay create‑sub API works, no immediate charge, next charge +1 month | sub 755190, `orders_count:0` |
| API sub auto‑attaches the customer's vaulted card | UI: "Card ending 1006, Expires 10/2027" |
| Discount via `pricing_polices: type:"price", value:<dollars>` | UI: ~~$126~~ → **Next Order Amount $94.50** (sub 755205) |
| `subscriptionContractCancel` cancels Contract A cleanly | Contract 75062902933 → CANCELLED |
| RecurPay create‑sub does NOT accept `plan_id` / a Shopify selling plan ref | API schema |
| RecurPay does NOT surface its contracts as Shopify‑readable contracts | Only our app's contracts visible to our token |

---

## 3. Key IDs & data

**Products**
- Sample product: `gid://shopify/Product/9054926373013` (handle `kibble`), variants all $19.99,
  SKU `LGD-KBL-SAM`: 2 kg `46938321223829`, 4 kg `46938321256597`, 6 kg `46938321322133`, 8 kg `46938321289365`.
  ⚠️ Sample product currently only has 2/4/6/8 kg variants — need 12 kg & 24 kg sample variants if those sizes are offered.
- Real subscription product: `gid://shopify/Product/9062017368213` (handle `kibble-pack`):
  2 kg `46960290136213` $55 · 4 kg `46960290168981` $96 · 6 kg `46960290234517` $126 ·
  8 kg `46960290201749` $148 · 12 kg `47483433746581` $198 · 24 kg `47483433779349` $350.

**RecurPay plan groups (discount lives in the Shopify selling plan)**
- 25 % → Shopify SellingPlanGroup `1873739925`; 1mo `3096215701`, 2mo `3145433237`, 3mo `3145466005`.
- 20 % → Shopify SellingPlanGroup `1696759957`; 1mo `2905571477`, 2mo `3145498773`, 3mo `3145531541`.
  (20 % is main‑store only — build capability, default the new page to 25 %.)

**Pricing rule:** recurring net = full price × 0.75 (25 %) or × 0.80 (20 %).
Frequency does **not** change the per‑delivery price (same price, billed every 1/2/3 months).
Discounted 25 % per delivery: 2 kg $41.25 · 4 kg $72.00 · 6 kg $94.50 · 8 kg $111.00 · 12 kg $148.50 · 24 kg $262.50.

**Credentials (in `.env`, gitignored)**
- `SHOPIFY_CLIENT_ID` / `SHOPIFY_CLIENT_SECRET` — Dev Dashboard app; client_credentials grant at
  `POST https://little-green-dog.myshopify.com/admin/oauth/access_token` → `shpat_` token (~24h).
  Scopes: `write_products, write_purchase_options, read_own_subscription_contracts, write_own_subscription_contracts`.
- `RECURPAY_ACCESS_TOKEN` (`rcpat_`) — header `X-Recurpay-Access-Token`; base `https://little-green-dog.recurpay.com/admin/api/2024-07`.
- Reference scripts (validated): `scratchpad/admin.mjs`, `scratchpad/recurpay-create-sub.mjs`.

---

## 4. Build steps

### A. Shopify selling plans (one‑time setup, via Admin API)
Create a two‑tier selling plan **per size × frequency × tier** on the **sample** product.
- Cycle 1: `fixed` `adjustmentType: PRICE` = `19.99`.
- Cycle 2+: `recurring` `adjustmentType: PRICE`, `afterCycle: 1` = discounted price for that size.
- `billingPolicy.recurring` + `deliveryPolicy.recurring` interval MONTH, intervalCount = 1/2/3.
- Attach to the matching sample variant.
- For the new page we need 25 % × {1,2,3 mo} × {sizes offered}. (20 % later.)
- Output: a `size+freq → { sampleVariantId, sellingPlanId }` map for the frontend.

### B. Frontend — new landing page (based on `/solo`)
- New route in `src/App.tsx` (e.g. `/sample-subscribe`); copy `SoloPage.tsx` as the base. **Leave `/solo` untouched.**
- Update language: make clear they pay **$19.99 for the sample now** and **subscribe** to the selected size + frequency.
- Calculator: extend `src/lib/feedingGuide.ts` — currently suggests a **bag size** from dog weight
  (`getBagSizeForWeightRange`). Add a **suggested frequency**, and let the user override **both** size and frequency.
  - Add a frequency suggestion fn (see **Feeding model** below) returning 1/2/3 months.
  - UI: two controls (size, frequency), pre‑filled with suggestions, both editable.

#### Feeding model (for size + frequency suggestion)
Measuring cup 237 ml = **88 g**; **301 kcal/cup**. Daily grams by dog weight (interpolate between rows):

| kg | Low g/day | High g/day |
|---|---|---|
| 1 | 27 | 31 |
| 2 | 45 | 52 |
| 3 | 61 | 72 |
| 4 | 75 | 89 |
| 5 | 89 | 105 |
| 7.5 | 122 | 143 |
| 10 | 150 | 177 |
| 15 | 204 | 240 |
| 20 | 254 | 298 |
| 25 | 299 | 352 |
| 30 | 343 | 404 |

Suggestion logic:
- Estimate **g/day** from the dog's weight (use the table; default to a mid/low‑activity figure unless we collect activity).
- A bag of `B` kg lasts `days = (B × 1000) / g_per_day`.
- **Suggested frequency** = the 1/2/3‑month option whose interval best matches one bag's duration
  (≈30 / 60 / 90 days); pick the size+frequency combo so one delivery ≈ one interval of food.
- Both size and frequency are **editable** by the customer after the suggestion.
- (Activity-level input optional; if not collected, suggest from the low/high midpoint.)
- Cart build: select `{ sampleVariantId, sellingPlanId }` from the map for the chosen size+freq; single‑line cart
  using the existing pattern in `src/lib/cart.ts`. Display "First $19.99, then $X every N months."
    - Pre-warm the cart when size/frequency adjustments are made


### C. Backend — `orders/create` webhook (`/api`, Vercel)
**Order detection (decided — most reliable):** the frontend stamps the cart with explicit **cart attributes**
(not an order tag, not the selling‑plan id — tags can be set by other apps and plan ids are brittle). Set:
`sample_subscribe="v1"`, `ss_size="6kg"`, `ss_frequency_months="1"`, `ss_tier="25"` (plus existing attrs).
These land on `order.note_attributes`; the webhook processes only orders where `sample_subscribe="v1"` and reads
size/frequency/tier straight from the attributes. (`cart.ts` already sets cart attributes, so this is the same pattern.)
1. Parse: customer id/email, address, and `ss_size` / `ss_frequency_months` / `ss_tier` from note_attributes.
2. **Create RecurPay sub** (`POST /subscriptions`, body wrapped in `{ subscription: {...} }`):
   - `customer{id,email}`, `status:"active"`
   - `billing_policy{frequency:<1|2|3>, interval:"month"}`
   - `delivery_policy{frequency:<1|2|3>, interval:"month", anchors:null, pre_anchor_behavior:null, cutoff:null}`
   - `line_items:[{ variant_id:<REAL variant>, quantity:1,
        pricing_polices:[{discount:{type:"price", value:<discounted dollars>}}], is_onetime:false }]`
   - `delivery_method`, `shipping_address`, `billing_address`, `payment_method{gateway:"shopify_payments",mode:"shopify_payments",currency:"NZD"}`
3. **Cancel Contract A**: Shopify `subscriptionContractCancel(subscriptionContractId)` for the order's contract —
   **only if step 2 returned success** (HTTP 201). Find the contract from the order.
4. Idempotency: guard against duplicate webhook deliveries (e.g. dedupe by order id; skip if RecurPay sub already exists).
5. Error handling: never cancel A unless B created OK; log + alert on failure so no customer is left double‑billed or unmanaged.

### D. RecurPay config (dashboard)
- **Disable the unwanted customer emails** (Settings → Notifications → Customer Notifications):
  the "Payment Update Link" and the subscription‑created/"make payment" notification. ⚠️ verify these can be toggled
  off (or ask RecurPay support) — see Open Items.

---


## 5. Cleanup of test artifacts (when convenient)
- Shopify TEST selling plan group `gid://shopify/SellingPlanGroup/1907032213` (plan 3145564309) — delete via `sellingPlanGroupDelete` (kept for now for build testing).
- RecurPay test subs — all deleted. Shopify Contract A 75062902933 — already CANCELLED.
- Test order #LGD5506 ($19.99 on Chris's own card) — refund if desired.
- After go‑live: consider rotating/uninstalling the Dev Dashboard app + RecurPay token.
