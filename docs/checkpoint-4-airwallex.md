# Checkpoint 4: orders from the new subscriptions app (`airwallex` tag)

The new subscriptions app (lgd-subscriptions) writes one Shopify order per paid Airwallex charge.
Every such order is tagged `airwallex`, plus `airwallex-sample`, `airwallex-subscription-first` or
`airwallex-subscription-renewal`. Subscription lines carry `_PlanId` (`lgd-{offer}-{n}m`) and
`_Plan` (`every {n} Month(s)`). The app sends its own Mixpanel and Meta CAPI events, the receipt
(Resend) and the Klaviyo events, so nothing in this repo or in Mechanic should act on these orders.

Nothing here is deployed or merged. Chris approves and applies.

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

| Task | Change | Why |
|---|---|---|
| Reactivation gift (auto-add LGD-60-NZ, `shopify/orders/paid`) | **Add the exclusion** | New-app subscription lines carry `_PlanId`, so condition (b) passes; only the missing `reactivation` attribute stops it today. An order edit would change the order total so it no longer matches the Airwallex charge (reconciliation flags it) |
| Post-purchase gift bundle | **Add the exclusion** | Same: order edits on new-app orders break the charge = order total check |
| UTM order tagging | None needed (optional exclusion) | New-app orders have no `utm_*` note attributes or storefront visits, so it adds no tags; attribution is stored by the new app |
| Any other task | Exclude if it edits orders, adds items, sends customer email or SMS, or tags based on subscription lines | List them for the checkpoint 4 sign-off |

**The exclusion** (paste straight after the `{% if event.topic == ... %}` line, and after any
`event.preview` block so previews still work):

```liquid
{% assign lgd_order_tags = order.tags | downcase | split: ", " %}
{% if lgd_order_tags contains "airwallex" %}
  {% log message: "Order created by the new subscriptions app (airwallex tag); skipping.", order: order.admin_graphql_api_id %}
  {% break %}
{% endif %}
```

For a task that loops over orders from a GraphQL or bulk query (e.g. a `mechanic/user/trigger`
backfill), skip inside the loop instead: `{% if node.tags contains "airwallex" %}{% continue %}{% endif %}`
(GraphQL returns `tags` as an array).

**Test each task before launch:** in the task editor, preview with an order payload whose `tags`
is `"airwallex, airwallex-subscription-first"` and a `_PlanId` line: the log shows the skip message
and no actions. Then preview with `"tags": ""`: the task behaves as before. Finally run it against a
real `airwallex`-tagged order on the demo store (`subscription-tests-yu4awbqm`).
