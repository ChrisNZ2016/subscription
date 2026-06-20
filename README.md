# Little Green Dog — Subscription Landing

Headless Shopify storefront for Little Green Dog's NZ dog kibble subscription funnel. This app is **not** a full e-commerce site — it serves marketing landing pages that load product data from Shopify's Storefront API, build carts via GraphQL, and redirect visitors to Shopify checkout.

**Stack:** React 19, TypeScript, Vite 7, plain CSS (no UI framework). Deployed on Vercel with a serverless webhook for purchase tracking.

## Routes

Routing is pathname-based in `src/App.tsx` (no React Router).

| Route | Page | Purpose |
|-------|------|---------|
| `/` | `LandingPage` | Main funnel: hero → dog size → addons → order summary → checkout |
| `/solo` | `SoloPage` | Sample-only purchase (2 kg sample, no subscription config) |
| `/welcome-back` | `ReactivationPage` | Lapsed subscriber reactivation (25% off + free gift via Mechanic) |
| `/subscribe-offer` | `SubscribePage` | Early-subscriber offer from email campaigns (25% off, no gift) |
| `/subscribe-ingredients` | `SubscribeIngredientsPage` | Ingredients-led variant of the early-subscriber offer (same cart/selling plan as `/subscribe-offer`) |

The main landing page also accepts a `?variant=` query param:

| Value | Behaviour |
|-------|-----------|
| `simple` | Skips addons step; simplified funnel |
| `solo` | Sample-only checkout (same as `/solo` route behaviour) |

## Prerequisites

- Node.js (LTS recommended)
- A Shopify store with Storefront API access
- Mixpanel project token
- Vercel account (for production deploy + webhook)

## Environment variables

Copy `.env.example` to `.env.local` for local development.

### Client (Vite — exposed to the browser)

| Variable | Description |
|----------|-------------|
| `VITE_SHOPIFY_STORE_DOMAIN` | Store domain, e.g. `your-store.myshopify.com` |
| `VITE_SHOPIFY_STOREFRONT_TOKEN` | Storefront API access token |
| `VITE_SHOPIFY_API_VERSION` | API version (default: `2025-01`) |
| `VITE_SAMPLE_PRODUCT_HANDLE` | Sample product handle (default: `sample-2kg`) |
| `VITE_SUBSCRIPTION_PRODUCT_HANDLE` | Subscription kibble product handle (default: `kibble-pack`) |
| `VITE_ADDON_HANDLES` | Comma-separated addon product handles |
| `VITE_MIXPANEL_TOKEN` | Mixpanel project token for client-side events |
| `VITE_GA_MEASUREMENT_ID` | GA4 web stream Measurement ID (`G-…`) for property `326931496` |
| `VITE_META_PIXEL_ID` | Meta pixel ID (same as main Shopify site) |

### Server (Vercel only — never use `VITE_` prefix)

| Variable | Description |
|----------|-------------|
| `MIXPANEL_TOKEN` | Mixpanel token for the orders webhook |
| `SHOPIFY_WEBHOOK_SECRET` | Signing secret from the Shopify `orders/create` webhook |
| `META_PIXEL_ID` | Meta pixel ID for Conversions API (same as `VITE_META_PIXEL_ID`) |
| `META_CAPI_ACCESS_TOKEN` | Conversions API access token from Meta Events Manager |

See [shopify/README.md](./shopify/README.md) for Mixpanel pixel and webhook setup in Shopify Admin.

## Development

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build
npm run preview    # serve production build locally
npm run lint       # ESLint
```

Static design previews are available at `/previews/*.html` during dev (served from `public/previews/` via custom Vite middleware).

## Deployment

The app deploys to **Vercel**. `vercel.json` configures SPA rewrites (all non-API routes → `index.html`) and passes through `/api/*` to serverless functions. Route components are lazy-loaded (`React.lazy` in `src/App.tsx`) so each page ships its own JS chunk.

There is no CI pipeline — deploys are triggered via Vercel on push to `master` (or manually).

**Last deployed:** `2026-06-20T21:23:25Z` (merge of `fix/mixpanel-purchase-funnel-identity` → `master`).

## Project structure

```
src/
  components/     Landing page sections and funnel pages (LandingPage, SoloPage,
                  ReactivationPage, SubscribePage, SubscribeIngredientsPage)
  hooks/          Product fetching, cart state, scroll/section-view tracking, hash scrolling
  lib/            Shopify client, cart builders, pricing, analytics (Mixpanel/GA/Meta), UTM capture
  constants/      Dog size presets
  types/          Shopify GraphQL types
api/
  webhooks/       Vercel serverless functions (orders/create → Mixpanel + Meta CAPI)
  lib/            Shared serverless helpers (Meta Conversions API client)
shopify/          Mixpanel custom pixel + setup docs
public/           Static assets and design previews
```

## How checkout works

Each funnel has its own cart module in `src/lib/`:

| Module | Used by |
|--------|---------|
| `cart.ts` | Main landing funnel |
| `cart-solo.ts` | `/solo` and `?variant=solo` |
| `cart-subscribe.ts` | `/subscribe-offer` and `/subscribe-ingredients` |
| `cart-reactivation.ts` | `/welcome-back` |

Flow:

```
Landing page (Mixpanel + Meta pixel)
  → cartCreate (Storefront API) + _mp_distinct_id + _fbp/_fbc/_meta_purchase_event_id + utm_*
  → redirect to checkoutUrl (UTMs appended to query string)
  → Shopify checkout (Facebook app pixel → Purchase)
  → orders/create webhook (Vercel) → Mixpanel + Meta CAPI Purchase
  → Mechanic UTM task → tags order from note_attributes + customerJourneySummary
```

Cart attributes (bag size, frequency, `_mp_distinct_id`, `utm_*`, etc.) flow to `order.note_attributes` and are used by the webhook, checkout pixel, and Mechanic tasks.

### UTM order tags

Meta ad UTMs are captured on landing (`src/lib/utm.ts`), stored in sessionStorage (first-touch), passed as cart attributes, and appended to the checkout URL. Install `mechanic-utm-tags.liquid` in Mechanic (replacing your existing UTM tagging task) so orders are tagged from both Shopify's customer journey and headless funnel `note_attributes`.

Reactivation carts set `reactivation=true`, which the Mechanic task reads to add a free gift on the first delivery.

## Shopify operations

### Selling plan IDs

Some funnels use hardcoded RecurPay selling plan GIDs that are store-specific:

- `cart-subscribe.ts` — `EARLY_SUBSCRIBER_SELLING_PLAN_ID`
- `cart-reactivation.ts` — `REACTIVATION_SELLING_PLAN_ID`

Update these if selling plans are recreated in Shopify.

### Mechanic reactivation gift

`mechanic-reactivation-gift.liquid` is a Shopify Mechanic task that adds a free gift when an order has the `reactivation=true` note attribute. Install and configure it in Mechanic; keep attribute name/value in sync with `cart-reactivation.ts`.

### Analytics

Full setup instructions (Custom Pixel + webhook) are in [shopify/README.md](./shopify/README.md). The pixel source lives at `shopify/mixpanel-pixel.js` — update it in Shopify Admin if the Mixpanel token changes.

## Other docs

| File | Purpose |
|------|---------|
| [shopify/README.md](./shopify/README.md) | Mixpanel pixel + webhook setup runbook |
| [page-copy.md](./page-copy.md) | Marketing copy reference |
| [docs/rebuy.md](./docs/rebuy.md) | Rebuy API reference (not integrated into app code) |

## Testing

There are no automated tests or test script in this project.
