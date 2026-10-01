# Spec: RecurPay subscriptions in the Intercom Details panel

Status: **built, not deployed** (decisions recorded 29 Sep 2026, see section 11). Verified offline with `scripts/check-intercom-endpoints.mts`; live steps in section 10 are still to do.

## 1. Why

When a customer emails Intercom, the Details panel already shows their Shopify orders, but not their RecurPay subscription. Questions like "did my subscription go through?" (Mel Barnett, conversation 215476147059073) mean opening RecurPay separately and searching by email.

This adds a **RecurPay card** to the Intercom Details panel. It shows the customer's subscriptions, and has a **Create order now** button that ships and charges their next order immediately, after a confirmation step.

## 2. Scope

**In v1**
- A read-only card listing every RecurPay subscription for the contact's email, newest and most relevant first.
- **Create order now**, with a confirmation step, an internal note on the conversation recording who did it, and double-click protection.
- **Refresh** and **Open in RecurPay** links.

**Not in v1** (possible later, each changes a customer's subscription)
- Skip, pause, resume, cancel, change size or frequency, retry a halted payment.
- Copying subscription status onto the Intercom contact via RecurPay webhooks, so it's filterable and Fin can answer "am I subscribed?" (see section 12).

## 3. How it works

```
Teammate opens a conversation
  → Intercom POSTs  /api/intercom/initialize  (contact email, conversation, teammate)
      → verify X-Body-Signature
      → RecurPay  GET /subscriptions?email=…   (all statuses)
      → return the card (Canvas Kit JSON)
Teammate clicks a button
  → Intercom POSTs  /api/intercom/submit      (component_id, stored_data, contact)
      → confirm screen, or RecurPay  PUT /subscriptions/{id}/renew, or refresh
```

- **Intercom side:** a private Developer Hub app in workspace `argvrv71` with Canvas Kit enabled for **Conversation details**. There's no App Store review. Each teammate pins it once to their Details panel, and it then loads on every conversation they open.
- **Backend:** two new Vercel functions in this repo, deployed to `lp.littlegreendog.co.nz` with the existing project. They reuse `api/lib/recurpay.ts`.

## 4. Files

| File | Change |
|---|---|
| `api/intercom/initialize.ts` | **New.** POST only. Verifies the signature, looks up subscriptions, returns the card. |
| `api/intercom/submit.ts` | **New.** POST only. Verifies the signature and routes on `component_id` to refresh, the confirm screen, the order, or cancel. |
| `api/lib/intercom-canvas.ts` | **New.** Signature check, component builders (`text`, `dataTable`, `button`, `divider`, `spacer`) and the card and screen layouts. |
| `api/lib/raw-body.ts` | **New.** Shared `getRawBody()`, moved out of the two webhook files (which then import it). |
| `api/lib/recurpay.ts` | **Extend.** Widen `RecurpaySubscription` to the fields in section 6. Add `listSubscriptionsByEmail(email)` (all statuses, paginated) and `renewSubscription(id)` (`PUT /subscriptions/{id}/renew`). Existing functions are unchanged. |
| `api/lib/intercom-feedback.ts` | **Reuse** its `headers()`/`intercomFetch()` pattern for the internal note. Either export a small `addConversationNote()` or put it in a new `api/lib/intercom-rest.ts`. |
| `api/lib/order-lock.ts` | **New.** Upstash Redis lock (`SET NX EX 900`) so one subscription cannot get two instant orders. Fails closed when unconfigured. |
| `api/lib/intercom-request.ts`, `api/lib/panel-cards.ts` | **New.** Shared raw-body signature check and the card lookup used by both endpoints. |
| `README.md`, `.env.example` | Document the new endpoints and env vars. The pre-commit hook updates the README changelog automatically. |

Conventions to follow: Vercel `VercelRequest/VercelResponse` default-export handlers, `.js` import suffixes, a doc comment at the top listing the route and env vars, strict TS with no enums.

## 5. Security

- **Every request is signed.** Intercom sends `X-Body-Signature`, the HMAC-SHA256 hex digest of the **raw request body**, keyed with the app's **client secret** (Developer Hub → Basic info).
  - Read the raw body before any JSON parsing and compare with `timingSafeEqual`. Anything unsigned or mismatched gets 401 and no RecurPay call.
  - Intercom's docs contradict themselves on the digest length, so confirm the algorithm against a real request during setup (step 10.3).
- **Any teammate can create orders** (Chris, 29 Sep 2026). The confirmation step and audit note are the controls, not a permission list.
- **The order button is never on the first screen.** It opens a confirmation screen; only **Confirm** charges the card.
- **The RecurPay token stays server-side**, as it does today.
- **Audit trail:** every order attempt, successful or not, adds an **internal note** to the conversation with the teammate, subscription, order number and amount. Notes are never visible to the customer.

## 6. The card (initial screen)

Intercom's guidance: keep the first screen under about 400px tall, and use secondary buttons.

**Lookup:** `GET /subscriptions?email={contact.email}&sort_key=id&sort_by=desc&limit=100`, with no status filter.
- Sort order: Halted, then Active, then Paused, then Cancelled. Within each group, newest first.
- Show the first **two** in full. Collapse the rest into one line: "+ 3 cancelled subscriptions" (a link button that expands them).

**Per subscription (data-table)**

| Row | Source | Example |
|---|---|---|
| Status | `status`, plus `is_skipped` | **Active**. "Active, next order skipped". **Halted: payment failed** (error style, with `halted_reason` and `halted_retries_count`). "Cancelled 12 Aug (reason)". |
| Items | `line_items[].title`, `variant_title`, `quantity`, `price`, `pricing_polices` | Kibble 6kg × 1, $99.00 (25% off $132.00) |
| Price per order | Discounted line totals + `delivery_method.price` | $104.00 incl. $5.00 delivery. "$99.00, free delivery" when delivery is 0. Item total only when delivery is unknown. |
| Delivery | `delivery_method.title`, `price` | Standard, $0.00 |
| Every | `delivery_policy.frequency` + `interval` | Every 2 months |
| Next order | `next_billing_at` | Wed 14 Oct 2026 |
| Last order | `last_billing_at` | 14 Aug 2026 |
| Orders so far | `orders_count` | 3 |
| Customer since | `subscribed_at` | 19 Aug 2026 |
| Discount | `line_items[].pricing_polices`, `discount_codes` | 25% subscriber discount; Code SAVE10 |
| Card | `payment_method.gateway` | Shopify Payments |

- Dates in NZ format and Pacific/Auckland time. Money in NZD.
- **Pricing: `line_items[].price` is the FULL RETAIL price, not what the subscriber pays.** The subscriber discount lives in `line_items[].pricing_polices` (RecurPay's spelling), e.g. `[{"discount":{"type":"percentage","value":25,"currency":"NZD"}}]` on `price: 132` means $99.00. Everywhere money is shown or summed (Items, Price per order, the confirm screen's per-line rows and Estimated total) the code uses the discounted unit price from `subscriptionUnitPrice()`:
  - Policy choice: if any policy has `after_cycle`, use the one with the highest `after_cycle` <= `orders_count` (the next order is cycle `orders_count + 1`; a policy applies after N cycles, and one with no `after_cycle` counts as 0). Otherwise the first policy.
  - `percentage`: price x (1 - value/100). `price`: the fixed unit price (used when this repo creates subscriptions, see `docs/sample-to-subscription-plan.md`). `fixed_amount` / `amount`: max(0, price - value). Rounded to cents, half up.
  - Unknown discount type: the full price is shown with "(price before discount)" rather than a guess.
  - `discount_codes` are listed on the Discount row but are not subtracted from any total.
- Omit empty rows.
- **Buttons** under each subscription: **Create order now** (secondary, only for eligible subscriptions) and **Open in RecurPay** (URL action).
- **Footer:** **Refresh** (link style).

**Other states**

| State | Card shows |
|---|---|
| Contact has no email | "No email on this contact, so RecurPay can't be searched." |
| No subscriptions | "No RecurPay subscription for {email}." Plus a muted line: "If they subscribed with a different email, search RecurPay directly." |
| RecurPay error or timeout | "Couldn't reach RecurPay just now." Plus a **Try again** button. Logged with the error. |
| Bad signature | 401, no card |

## 7. Create order now

**What it does (from RecurPay's help centre):**
- It "charge[s] and process[es] a subscription order immediately without waiting for the next renewal date".
- "The customer will be charged immediately using their saved payment method."
- "The next renewal date will automatically adjust based on the subscription frequency."
- "Instant orders cannot be reversed once created."

The API call is `PUT /subscriptions/{id}/renew`. Its documented response includes the new Shopify order (`id`, `name`, `financial_status`), with a `_renewal_order` note attribute.

**Eligibility (v1 default: Active only)**

| Status | v1 | Why |
|---|---|---|
| Active | Allowed | The normal case |
| Active, next order skipped | Allowed, with a warning on the confirm screen | Undocumented how renew interacts with a skip |
| Paused | Not offered | Renew's behaviour on paused is undocumented, and an order would contradict the pause |
| Halted (payment failing) | Not offered | That's a payment-retry case, not an extra order |
| Cancelled | Not offered | |
| Prepaid (`billing_policy` ≠ `delivery_policy`) | Not offered | Items are locked; renew behaviour undocumented |

**Flow**
1. **Create order now** (`component_id: order:{subId}`) returns the **confirmation screen**, with `stored_data: {subscription_id, contact_email, nonce}`:
   - Heading: "Create an order now?"
   - A data-table of exactly what will be charged: items, quantities, prices, delivery, **estimated total**.
   - "Charges the saved card ({gateway}) immediately and ships the order."
   - "Next order moves to about {today + frequency}." Marked as an estimate until the live test (step 10.5) confirms it.
   - "This can't be undone."
   - Buttons: **Confirm and charge** (primary, `confirm_order:{subId}`) and **Cancel** (link, `cancel`).
2. **Confirm and charge:**
   1. Re-fetch the subscription (`GET /subscriptions/{id}`). Re-check eligibility, and that its email still matches the contact.
   2. **Double-order guards** (RecurPay has no idempotency key), both must pass:
      - **`last_billing_at` check:** refuse if it is within the last **15 minutes**. The card says "An order was already created for this subscription at 10:42".
      - **Distributed lock (Upstash Redis):** `SET instant-order:{subId} <timestamp> NX EX 900`, taken after the checks above and before the renew call. If it is already held the card says "An order for this subscription is already being processed or was just created. Try again in 15 minutes." This covers concurrent requests, such as Intercom retrying a submit after about 15 seconds while the first renew is still running and `last_billing_at` has not moved yet.
      - The lock is **never released**. After a success its 15-minute TTL is a second guard alongside `last_billing_at`. After a failed renew the outcome may be unknown (for example a timeout after RecurPay charged the card), so releasing could allow a real double charge; the teammate retries once the TTL expires.
      - **Fails closed:** if `KV_REST_API_URL` / `KV_REST_API_TOKEN` are not set, or the store errors, no order is created. The card and confirm screen still work, and the blocked card says "Instant orders aren't switched on yet: the order lock store isn't configured."
   3. Call `PUT /subscriptions/{id}/renew`, then re-fetch to read the new `next_billing_at`.
   4. **Success screen:** "Order #LGD6801 created, $100.80, payment {financial_status}." "Next order: {new next_billing_at}." Links: **View in Shopify** (`admin.shopify.com/store/little-green-dog/orders/{order.id}`) and **Back**.
   5. Add an **internal note** to the conversation, e.g. "Chris created order #LGD6801 ($100.80) for RecurPay subscription 41 from Intercom. Next order now 14 Dec 2026."
3. **Failure:**
   - Show RecurPay's `message` verbatim, e.g. "Card declined".
   - Add an internal note of the failure.
   - Don't retry automatically. The teammate can press the button again.
   - A card decline may move the subscription to **Halted**, which the refreshed card then shows.
4. **Timeouts:** Intercom gives up at around 15 seconds (community reports; undocumented). Renew creates the Shopify order synchronously, so it may be slow.
   - Set `maxDuration: 30` on the function so the renew call finishes even if Intercom stops waiting.
   - If Intercom shows its generic error, **Refresh** will show the order via `last_billing_at`, and the double-order guard stops a second charge.

## 8. Env vars (Vercel, production)

| Name | Purpose |
|---|---|
| `RECURPAY_ACCESS_TOKEN`, `RECURPAY_API_BASE` | Existing. The token needs subscription write scope for renew; confirm in step 10.4. |
| `INTERCOM_CANVAS_CLIENT_SECRET` | **New.** Client secret of the new Developer Hub app, used for signature checks |
| `INTERCOM_ACCESS_TOKEN` | Existing name. For the internal note it needs conversations write access. Use the new app's token, or the existing one if it has that scope. |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | **New.** Upstash Redis REST credentials (set by the Vercel/Upstash integration). Backs the order lock in section 7. Without them, **Create order now** is refused (fail closed). |
| `RECURPAY_ADMIN_URL_TEMPLATE` | Set to `https://little-green-dog.recurpay.com/subscriptions/{id}` (confirmed 1 Oct 2026: the dashboard URL uses the API subscription id). Drives the **Open in RecurPay** button. |

## 9. Intercom setup (one-off, Chris)

1. **Create the app:** Developer Hub → **New app**, named "RecurPay subscriptions", in the Little Green Dog workspace.
2. **Canvas Kit:** For teammates → tick **Add to conversation details**. Set:
   - Initialize URL: `https://lp.littlegreendog.co.nz/api/intercom/initialize`
   - Submit URL: `https://lp.littlegreendog.co.nz/api/intercom/submit`
   - Then Save.
3. **Install:** Test & Publish → install to the workspace. Copy the **client secret** (Basic info) into Vercel.
4. **Pin the card:** each teammate opens any conversation, clicks **Edit apps** in the Details panel, and pins **RecurPay subscriptions** under the Shopify card.

## 10. Build order and verification

1. **Read-only card first.** Build `initialize` plus the card behind the signature check. Deploy. Pin the card and check it against three real contacts: active, cancelled, and none. Compare each field with the RecurPay dashboard.
2. **Timing.** Initialize should respond in under 2 seconds, measured in Vercel logs.
3. **Signature check.** A request with a wrong signature gets 401. A real Intercom request passes. This confirms the algorithm and encoding.
4. **Token scope.** Confirm the RecurPay token can call renew, by testing with the 403 path on a non-existent subscription, not a real one.
5. **One live test of renew, with Chris's explicit go-ahead.** It charges a real card and creates a real Shopify order, so it runs on a **test subscription created for the purpose** (Chris, 29 Sep 2026). How to create it is still to be worked out; `docs/sample-to-subscription-plan.md` notes that creating a subscription through the RecurPay API sends the customer an "update your payment method" email. Record:
   - `next_billing_at` before and after, which settles how the date moves
   - whether RecurPay or Shopify emails the customer
   - response time
   - that the Shopify order is correct

   Then update section 7 and the confirm-screen wording with the real behaviour.
6. **Guard.** Press Confirm twice on the same subscription. The second press must be refused by the 15-minute guard.
7. **Eligibility.** Paused, halted, cancelled and prepaid subscriptions show no order button, and a forged submit for one is refused after the re-fetch.
8. `npm run build` (typecheck) and `npm run lint` pass. The repo has no test framework.

## 11. Decisions (Chris, 29 Sep 2026)

| Question | Decision |
|---|---|
| Who can create orders | **Any teammate.** No permission list; the confirm step, double-order guard and internal note are the controls. |
| Paused subscriptions | **Excluded.** No order button on paused subscriptions. |
| Customer emails on an instant order | **Acceptable.** |
| Live test of renew | **Use a test subscription** made for the purpose. Method to be decided before step 10.5. |

## 12. Later (not in v1)

- **Contact attributes via webhooks.** Subscribe to `subscription_created`, `subscription_renewed`, `subscription_paused`, `subscription_cancelled`, `subscription_halted` and `subscription_renewal_updated`. Write `recurpay_status`, `recurpay_next_order` and `recurpay_items` onto the Intercom contact.
  - This makes subscribers filterable in Intercom.
  - Fin can answer "am I subscribed / when's my next order?" using help article 25.
  - Workflows can route halted-payment customers to a teammate.
- **More buttons,** each needing the same confirm and audit pattern: skip next order, change frequency, retry a halted payment, pause.

## Sources

- RecurPay instant orders: https://help.recurpay.com/en/articles/12673310-how-to-create-an-instant-order-in-recurpay
- RecurPay renew endpoint: https://docs.recurpay.com/reference/renew-a-subscription
- RecurPay list and filters: https://docs.recurpay.com/reference/retrieve-a-list-of-subscriptions
- RecurPay renewal run time: https://help.recurpay.com/en/articles/9902458-setting-subscription-renewal-time
- RecurPay webhooks: https://docs.recurpay.com/reference/webhooks
- Intercom Canvas Kit: https://developers.intercom.com/docs/canvas-kit
- Intercom inbox apps: https://developers.intercom.com/docs/build-an-integration/getting-started/build-an-app-for-your-inbox
- Intercom inbox best practices: https://developers.intercom.com/docs/canvas-kit/canvas-kit-inbox-best-practices
