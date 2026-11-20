# Checkpoint 4: orders from the new subscriptions app (`airwallex` tag)

The new subscriptions app (lgd-subscriptions) writes one Shopify order per paid Airwallex charge.
Every such order is tagged `airwallex`, plus `airwallex-sample`, `airwallex-subscription-first` or
`airwallex-subscription-renewal`. Subscription lines carry `_PlanId` (`lgd-{offer}-{n}m`) and
`_Plan` (`every {n} Month(s)`). The app sends its own Mixpanel and Meta CAPI events, the receipt
(Resend) and the Klaviyo events, so nothing in this repo or in Mechanic should act on these orders.

Merged 21 Nov (PR #4); live after the next production deploy of this repo. Mechanic changes are
made by hand in Mechanic.

## (a) `api/webhooks/orders-create.ts` (this branch)

**What it affects:** only orders tagged exactly `airwallex`. After the HMAC check and JSON parse,
those orders get `200 {"ok":true,"skipped":"airwallex"}` and nothing else: no Mixpanel
"Purchase Completed (Server)", no Mixpanel profile updates, no Meta CAPI Purchase. Every other order
(RecurPay, storefront, `airwallex-sample` alone without `airwallex`) runs exactly as before.
Returning 200 stops Shopify retrying. The HMAC check still runs first, so an unsigned request can't
use the tag to get a 200.

`subscription-contracts-create.ts` needs no change: new-app orders have no Shopify selling plan, so
no subscription contract is created and that webhook never fires for them.

Takes effect on the next production deploy of this repo. Deploy it **before** the first live
`airwallex` order (the live pilot), or the pilot's purchases are counted twice in Mixpanel and Meta.

## (b) Mechanic tasks (Shopify admin → Apps → Mechanic; not in this repo)

The repo only has copies of two tasks (`mechanic-reactivation-gift.liquid`,
`mechanic-utm-tags.liquid`); the live tasks and any others are in Mechanic. For each task:

**Live tasks checked 21 Nov.** Code read for the first four rows; the rest from the task list.
What a new-app order carries: tags `airwallex` + one kind tag, lines with `_PlanId`/`_Plan`
(sample lines SKU `LGD-KBL-SAM`), attributes `charge_id`, `airwallex_payment_intent_id`,
`subscription_id`, `offer_key`; no discount codes, no `utm_*`, no `reactivation` attribute.

| Task | Change | Why |
|---|---|---|
| Subscription Activation Gift (reactivation gift, `orders/paid`) | None | It fires only on the `reactivation=true` note attribute (set by /welcome-back, which stays on Shopify). New-app orders never carry it |
| Send email when an order is tagged | None | Watches tag `morepork` and emails staff only. New-app orders never get that tag |
| Release the sample hold | None | Acts only when staff add `sample-abuse-release` by hand |
| Sample re-order hold | None: **keep it running on new-app orders** | It tags the customer `sample_purchased` and records the address in the shop ledger, so the old cart still catches repeats after a new-app sample, and it catches repeats the new app misses (the new app doesn't read this ledger). A flagged new-app order is held and gets an Intercom ticket: **refund it in the new app's console, never in Shopify** (a Shopify refund doesn't refund the Airwallex charge) |
| Back-fill, Task Sweeper | To check | Code not seen yet |
| Auto-tag tasks (customer tags, discount code, country, UTM, subscription products), KPP routing tags, Copy tags to customers | None | Tags only; tags don't change the order total. KPP: check on the demo store that a new-app order gets the right routing tag |
| Manual address hash, Ticket failure watcher, out-of-stock report, Webhook Test | None | Manual or not order triggered |

**If a task ever needs to skip these orders**, wrap the part that acts in a condition. Don't use
`{% break %}` to stop early: at the top level of a Mechanic task it does nothing (it only ends a
`for` loop), so the task would carry on.

```liquid
{% assign lgd_order_tags = order.tags | downcase | split: ", " %}
{% if lgd_order_tags contains "airwallex" %}
  {% log message: "Order created by the new subscriptions app (airwallex tag); skipping.", order: order.admin_graphql_api_id %}
{% else %}
  … the task's existing code …
{% endif %}
```

Put it after any `event.preview` block so previews still work. For a task that loops over orders
from a GraphQL or bulk query, skip inside the loop instead:
`{% if node.tags contains "airwallex" %}{% continue %}{% endif %}` (GraphQL returns `tags` as an
array).

**Testing a task that has the skip:** in the task editor, preview with an order payload whose `tags`
is `"airwallex, airwallex-subscription-first"` and a `_PlanId` line: the log shows the skip message
and no actions. Then preview with `"tags": ""`: the task behaves as before. Finally run it against a
real `airwallex`-tagged order on the demo store (`subscription-tests-yu4awbqm`).
