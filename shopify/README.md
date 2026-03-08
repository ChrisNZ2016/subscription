# Shopify Tracking Setup

Two manual steps are required inside Shopify Admin to complete the Mixpanel integration:
1. Install the Custom Pixel (client-side checkout events)
2. Configure the orders/create Webhook (server-side purchase confirmation)

---

## Step 1 — Custom Pixel (Checkout Events)

The Custom Pixel runs inside Shopify's sandboxed checkout and tracks every checkout
step as well as the final purchase. It also stitches the Shopify session to the
visitor's landing-page Mixpanel profile via the `_mp_distinct_id` cart attribute.

### Install

1. Go to **Shopify Admin → Settings → Customer Events**
2. Click **Add Custom Pixel**
3. Give it a name, e.g. `Mixpanel`
4. Copy the entire contents of `shopify/mixpanel-pixel.js` and paste it into the editor
5. Click **Save** then **Connect**

### Events tracked

| Shopify event | Mixpanel event | Key properties |
|---|---|---|
| `checkout_started` | `Checkout Step Viewed` | `step: 1`, `total_price`, `line_items` |
| `checkout_contact_info_submitted` | `Checkout Step Completed` | `step: 2` |
| `checkout_address_info_submitted` | `Checkout Step Completed` | `step: 3` |
| `checkout_shipping_info_submitted` | `Checkout Step Completed` | `step: 4`, `shipping_method` |
| `payment_info_submitted` | `Checkout Step Completed` | `step: 5` |
| `checkout_completed` | `Purchase Completed` | `revenue`, `order_id`, `line_items` |

> The `checkout_completed` event also calls `mixpanel.people.track_charge()` to
> update the user's lifetime revenue in Mixpanel People.

---

## Step 2 — Server-Side Webhook (Reliable Purchase Tracking)

The webhook provides a second, ad-blocker-proof record of every purchase. It fires
the `Purchase Completed (Server)` event from your Vercel serverless function using
Mixpanel's Node.js SDK.

### Configure in Shopify Admin

1. Go to **Shopify Admin → Settings → Notifications → Webhooks**
2. Click **Create webhook**
   - **Event:** Order creation
   - **Format:** JSON
   - **URL:** `https://<your-vercel-domain>/api/webhooks/orders-create`
   - **API version:** 2025-01 (or latest)
3. Click **Save**
4. Copy the **Signing secret** shown on the webhook row

### Set environment variables in Vercel

In your Vercel project dashboard → **Settings → Environment Variables**, add:

| Variable | Value |
|---|---|
| `MIXPANEL_TOKEN` | `cc67318fe82b66a1b37843f09348fa4b` |
| `SHOPIFY_WEBHOOK_SECRET` | *(paste the signing secret from step 4 above)* |

> `MIXPANEL_TOKEN` (no `VITE_` prefix) is used only by the serverless function and
> is never exposed to the browser.

### Verify

After deploying, place a test order. Within a few seconds you should see a
`Purchase Completed (Server)` event appear in your Mixpanel Live View. It will be
associated with the same `distinct_id` as the visitor's landing-page session.
