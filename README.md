# Little Green Dog — Subscription Landing

Headless Shopify storefront for Little Green Dog's NZ dog kibble subscription funnel. This app is **not** a full e-commerce site — it serves marketing landing pages that load product data from Shopify's Storefront API, build carts via GraphQL, and redirect visitors to Shopify checkout.

**Stack:** React 19, TypeScript, Vite 7, plain CSS (no UI framework). Deployed on Vercel with a serverless webhook for purchase tracking.

## Routes

Routing is pathname-based in `src/App.tsx` (no React Router).

| Route | Page | Purpose |
|-------|------|---------|
| `/` | `LandingPage` | Main funnel: hero → dog size → addons → order summary → checkout |
| `/solo` | `SoloPage` | Sample-only purchase (2 kg sample, subscription pricing + FAQ, no config step) |
| `/welcome-back` | `ReactivationPage` | Lapsed subscriber reactivation (25% off + free gift via Mechanic) |
| `/subscribe-offer` | `SubscribePage` | Early-subscriber offer from email campaigns (25% off, no gift) |
| `/subscribe-ingredients` | `SubscribeIngredientsPage` | Ingredients-led variant of the early-subscriber offer (same cart/selling plan as `/subscribe-offer`) |

Each route also matches with an optional trailing slash (e.g. `/solo/`).

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
| `VITE_ADDON_HANDLES` | Comma-separated addon product handles (default: `poop-bags,dog-treats`) |
| `VITE_MIXPANEL_TOKEN` | Mixpanel project token for client-side events |
| `VITE_META_PIXEL_ID` | Meta pixel ID — same as the Facebook & Instagram Shopify app |

### Server (Vercel only — never use `VITE_` prefix)

| Variable | Description |
|----------|-------------|
| `MIXPANEL_TOKEN` | Mixpanel token for the orders webhook |
| `SHOPIFY_WEBHOOK_SECRET` | Signing secret from the Shopify `orders/create` webhook |
| `META_PIXEL_ID` | Meta pixel ID for Conversions API (same value as `VITE_META_PIXEL_ID`) |
| `META_CAPI_ACCESS_TOKEN` | Conversions API access token from Meta Events Manager |

See [shopify/README.md](./shopify/README.md) for Mixpanel pixel and webhook setup in Shopify Admin.

## Development

```bash
npm install        # also sets git hooksPath to .githooks via prepare script
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build
npm run preview    # serve production build locally
npm run lint       # ESLint
```

### Git hooks

A **pre-commit** hook (`.githooks/pre-commit`) runs `scripts/sync-readme.mjs` before each commit. It:

1. Refreshes the **Page versions** table in this README from `src/constants/page-versions.ts`
2. Appends a dated changelog line listing staged `src/`, `api/`, or `shopify/` files when README was not already staged

Enable hooks after clone: `npm install` (via `prepare`) or manually `git config core.hooksPath .githooks`.

## Changelog

<!-- CHANGELOG_START -->
- **2026-06-25** — src/constants/page-versions.ts, src/lib/subscription-prices.ts
<!-- CHANGELOG_END -->

Static design previews are available at `/previews/*.html` during dev (served from `public/previews/` via custom Vite middleware).

## Deployment

The app is hosted on **Vercel** (`vercel.json` configures SPA rewrites — all non-API routes → `index.html` — and passes through `/api/*` to serverless functions). Route components are lazy-loaded (`React.lazy` in `src/App.tsx`) so each page ships its own JS chunk.

**This repo does not auto-deploy from Git.** Commit and push to GitHub for version control, then publish to production with the Vercel CLI:

```bash
npx vercel --prod --yes
```

Production is aliased to `https://lp.littlegreendog.co.nz`. There is no CI pipeline — the CLI is the deploy path.

**Last deployed:** `2026-06-23T02:47:34Z` — Vercel CLI deploy (`npx vercel --prod --yes`). Production: https://subscription-19oz4cat4-chris-oneills-projects.vercel.app. Aliased to `https://lp.littlegreendog.co.nz`. Inspect: https://vercel.com/chris-oneills-projects/subscription/B49WTMoHzXTBpvGyyVyiChiMhy8C.

## Project structure

```
src/
  App.tsx         Pathname routing (lazy-loaded page components)
  components/     Funnel pages (LandingPage, SoloPage, ReactivationPage, SubscribePage,
                  SubscribeIngredientsPage) and shared sections (HeroSection, BenefitsBar,
                  ProductTabs, SubscriptionPricingSection, SubscriptionPricingTable,
                  TestimonialsSection, FAQSection, DogSizeCalculator, OrderSummary,
                  StickyCTA, Footer, etc.)
  hooks/          Product fetching, cart state, scroll/section-view tracking, hash scrolling
  lib/            Shopify client, cart builders, pricing, subscription-prices, analytics,
                  meta-pixel, UTM capture, page-attribution
  constants/      Dog size presets, page-versions (attribution semver)
  types/          Shopify GraphQL types
api/
  webhooks/       Vercel serverless functions (orders-create.ts → Mixpanel + Meta CAPI)
  lib/            Shared serverless helpers (meta-capi.ts)
scripts/          One-off maintenance scripts (backfill-utm.mjs, sync-readme.mjs)
.githooks/        Git hooks (pre-commit → sync README page versions + changelog)
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
  → cartCreate (Storefront API) + mp_distinct_id + page_name + page_version + _fbp/_fbc/_meta_purchase_event_id + utm_*
  → redirect to checkoutUrl (UTMs appended to query string)
  → Shopify checkout (Facebook app pixel → Purchase)
  → orders/create webhook (Vercel) → Mixpanel + Meta CAPI Purchase
  → Mechanic UTM task → tags order from note_attributes + customerJourneySummary
```

Cart attributes (bag size, frequency, `mp_distinct_id`, `page_name`, `page_version`, `utm_*`, etc.) flow to `order.note_attributes` and are used by the webhook, checkout pixel, and Mechanic tasks.

### Landing page attribution

Each funnel page has a **name** and **semver version** defined in `src/constants/page-versions.ts`. At checkout these are written as cart attributes (`page_name`, `page_version`) and included on Mixpanel events:

| Surface | Properties |
|---------|------------|
| Client events (`src/lib/analytics.ts`) | `page_name`, `page_version` (and legacy `page` alias) |
| Cart → order (`note_attributes`) | `page_name`, `page_version` |
| Webhook (`Purchase Completed (Server)`) | `page_name`, `page_version`; `initial_page_*` on profile |
| Checkout pixel (`Purchase Completed`) | `page_name`, `page_version`; `initial_page_*` on profile |

Current versions (auto-synced on commit):

<!-- PAGE_VERSIONS_START -->
| Page name | Version |
|-----------|---------|
| `landing` | 1.0.0 |
| `landing-simple` | 1.0.0 |
| `landing-solo` | 1.0.0 |
| `solo` | 1.0.1 |
| `reactivation` | 1.0.0 |
| `subscribe-offer` | 1.0.0 |
| `subscribe-ingredients` | 1.0.0 |
<!-- PAGE_VERSIONS_END -->

#### Page versioning (when to bump)

Versions use **semver** (`MAJOR.MINOR.PATCH`) per page name in `src/constants/page-versions.ts`:

| Bump | When |
|------|------|
| **Major** (`x.0.0`) | New route, removed funnel step, different checkout flow, or pricing model change that makes prior conversion data incomparable |
| **Minor** (`x.y.0`) | Meaningful funnel change — new section, copy/layout test, addon step change, or anything you want to segment in Mixpanel |
| **Patch** (`x.y.z`) | Bug fixes, typos, CSS-only tweaks with no funnel or reporting impact |

Bump the version **before** running `npx vercel --prod --yes` so carts created after deploy carry the new label. After updating `page-versions.ts`, commit — the pre-commit hook refreshes the table above in this README.

Re-copy `shopify/mixpanel-pixel.js` into Shopify Admin when the pixel changes (see [shopify/README.md](./shopify/README.md)).

### UTM order tags

Meta ad UTMs are captured on landing (`src/lib/utm.ts`), stored in sessionStorage (first-touch), passed as cart attributes, and appended to the checkout URL. Install `mechanic-utm-tags.liquid` in Mechanic (replacing your existing UTM tagging task) so orders are tagged from both Shopify's customer journey and headless funnel `note_attributes`.

The Shopify checkout domain strips UTM params from the URL, so the purchase events lose attribution. Both post-purchase scripts recover it from the cart attributes: `api/webhooks/orders-create.ts` reads `utm_*` from `note_attributes`, and `shopify/mixpanel-pixel.js` reads them from `checkout.attributes`. Each attaches `utm_*` to the purchase event and persists `initial_utm_*` (first-touch) on the Mixpanel profile.

For purchases recorded **before** this fix, run the one-off backfill in `scripts/backfill-utm.mjs`. It joins each `Purchase Completed` to that buyer's earliest UTM-bearing event by `distinct_id` and writes `initial_utm_*` to their profile via the Mixpanel `/engage` API (events are immutable, so attribution is recovered at the profile level). Defaults to a dry run; pass `--commit` to write. See the header comment for usage.

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
