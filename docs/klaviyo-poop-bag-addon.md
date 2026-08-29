# Agent brief — one-click poop-bag add-on (Klaviyo)

Hand this to the agent building the Klaviyo flow / email. The Vercel + Recurpay side is already implemented in the `subscription` repo. **Do not rebuild the landing-page API.** Wire links and flow actions only.

Read first: `lgd-klaviyo` skill (`SKILL.md`, `references/api-gotchas.md`, `references/subscriber-and-trigger-signals.md`, `references/voice-and-style.md`).

## Hard rules

- **Do not put a bare** `subscription_id` **or** `variant_id` **in the email URL.** Unsigned query params can add a charge to someone else's subscription. Use the signed URLs below only.
- **Do not HMAC in Klaviyo** — templates cannot sign. The confirm page verifies `sid` + `sig` server-side.

## What already exists (do not recreate)

Customer click path (already live once env vars are on the Vercel `subscription` project):

```
Email link → GET https://lp.littlegreendog.co.nz/add-to-subscription/{campaign}?sid=…&sig=…
  → confirm page (“Yes, add it”)
  → POST → Recurpay PUT .../subscriptions/{id}/lines  { line_items: { add: [...] } }
```

GET does **not** add the product (Gmail/Klaviyo prefetch). Recurpay runs on POST only. Replay of the same campaign shows “already on your next order”. The item is added as a **recurring** subscription line (`is_onetime: false`) — it stays on every delivery until they remove it.

Public origin: `https://lp.littlegreendog.co.nz`  
Mint/webhook endpoint: `POST https://lp.littlegreendog.co.nz/api/addon-link`

## The two products (Shopify, 2026-08-29)


| Pack               | Campaign slug   | Variant id       | SKU          | Price (NZD) | Handle                           |
| ------------------ | --------------- | ---------------- | ------------ | ----------- | -------------------------------- |
| 5-pack / 60 bags   | `poop-bags-60`  | `10597438849060` | `LGD-60-NZ`  | $15.99      | `compostable-poop-bags-60-pack`  |
| 10-pack / 120 bags | `poop-bags-120` | `10597447106596` | `LGD-120-NZ` | $26.99      | `compostable-poop-bags-120-pack` |


Exact Shopify titles (use these if you filter `Items` / `Ordered Product` — **not** the SKU):

- `Compostable Poop Bags - 5-Pack (60 Bags)`
- `Compostable Poop Bags - 10-Pack (120 Bags)`

Positioning from the product copy: 60-pack is for the once-a-day pooper (~two months). 120-pack is the upsell SKU (Shopify tag `Upsell`) — more poop, better unit price. 

Confirmation-page labels (already coded): “Compostable poop bags (60-pack)” / “(120-pack)”.

## CTA URLs — paste these

Klaviyo cannot compute `sig`. Same `sid` + `sig` work for **both** pack sizes; only the path slug changes.

**60-pack (primary href if you lead with the smaller pack):**

```
https://lp.littlegreendog.co.nz/add-to-subscription/poop-bags-60?sid={{ person.recurpay_subscription_id }}&sig={{ person.recurpay_link_sig }}
```

**120-pack (recommended primary CTA — it's the upsell SKU):**

```
https://lp.littlegreendog.co.nz/add-to-subscription/poop-bags-120?sid={{ person.recurpay_subscription_id }}&sig={{ person.recurpay_link_sig }}
```

After the mint webhook, these also resolve (hyphens in the slug become underscores in the property name):

```
{{ person.addon_link_poop_bags_60 }}
{{ person.addon_link_poop_bags_120 }}
```

Prefer the `sid`/`sig` URL in the template so a preview still works if the prebuilt property is empty. Button label ideas (voice): “Add the 120-pack to my next delivery” / “Add the 60-pack instead”. Do **not** say “checkout” or “buy now” — there is no checkout; they confirm on our page and Recurpay charges with the next subscription order.

If merge tags render blank in preview, the webhook has not written the profile yet (or `KLAVIYO_API_KEY` is missing on Vercel). Fix that before sending.

## Klaviyo actions required

Build a **new** flow (or give Chris UI steps for an existing one). Suggested shape:

1. **Webhook** (before the email) so `sid`/`sig` land on the profile:
  - URL: `https://lp.littlegreendog.co.nz/add-to-subscription` is **wrong** for this step.
  - URL: `https://lp.littlegreendog.co.nz/api/addon-link`
  - Method: `POST`
  - Header: `X-Addon-Link-Secret` = value of Vercel env `ADDON_LINK_SECRET` (ask Chris; do not invent one, do not put it in the email).
  - Body:

```json
{
  "email": "{{ person.email }}",
  "campaign": "poop-bags-120"
}
```

   One webhook is enough for **both** pack sizes. It writes `recurpay_subscription_id`, `recurpay_link_sig`, `addon_link_poop_bags_60`, and `addon_link_poop_bags_120`. The `campaign` field only picks which expiring `?t=` token is also minted; the durable `sid`/`sig` URLs above are what the email should use.

1. **Delay ~10 minutes** after the webhook so the profile update is in before send.
2. **Do not** add a second webhook per pack size.

CTA copy must not promise an instant charge. Next Recurpay billing date is shown on the confirm page.

## What the webhook needs from Vercel (Chris / deploy agent)

If the webhook 401s, `ADDON_LINK_SECRET` is missing or mismatched. If it 404s “No active Recurpay subscription”, the profile email does not match an active Recurpay sub. If merge tags stay empty, `KLAVIYO_API_KEY` is not set on the Vercel project or the 10-minute delay is too short.

Required Vercel env (same project as the landing pages): `RECURPAY_ACCESS_TOKEN`, `RECURPAY_API_BASE`, `LINK_SIGNING_SECRET`, `ADDON_LINK_SECRET`, `KLAVIYO_API_KEY`, optional `ADDON_PUBLIC_BASE_URL=https://lp.littlegreendog.co.nz`. Campaign slugs/variant ids are built into the app; no `ADDON_CAMPAIGNS` JSON required unless overriding.

## Test plan before live

1. Preview the email on a profile that has been through the webhook. Confirm both URLs contain numeric `sid=` and a long `sig=` (not empty, not `{{ person.... }}`).
2. Open the 120-pack link in a browser: confirm page, product label “Compostable poop bags (120-pack)”, button “Yes, add it”. Do not rely on a screenshot of the email alone.
3. Click through on a **test** Recurpay subscription. Recurpay admin should show the new line. Second click → already-added page, not a duplicate line.
4. Repeat once for the 60-pack path.
5. Confirm the flow is not filtering on `_PlanId` or `Active Subscriber`

