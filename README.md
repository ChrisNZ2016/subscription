# Little Green Dog — Subscription Landing

Headless Shopify storefront for Little Green Dog's NZ dog kibble subscription funnel. This app is **not** a full e-commerce site — it serves marketing landing pages that load product data from Shopify's Storefront API, build carts via GraphQL, and redirect visitors to Shopify checkout.

**Stack:** React 19, TypeScript, Vite 7, plain CSS (no UI framework). Deployed on Vercel with a serverless webhook for purchase tracking.

## Routes

Routing is pathname-based in `src/App.tsx` (no React Router).

| Route | Page | Purpose |
|-------|------|---------|
| `/` | `SoloPage` | Defaults to the solo funnel (same page as `/solo`). Reports as `page_name: solo` |
| `/solo` | `SoloPage` | Sample-only purchase (2 kg sample, subscription pricing + FAQ, no config step) |
| `/welcome-back` | `ReactivationPage` | Lapsed subscriber reactivation (25% off + free gift via Mechanic) |
| `/subscribe-offer` | `SubscribePage` | Early-subscriber offer from email campaigns (25% off, no gift) |
| `/subscribe-ingredients` | `SubscribeIngredientsPage` | Ingredients-led variant of the early-subscriber offer (same cart/selling plan as `/subscribe-offer`) |
| `/keep-going` | `KeepGoingPage` | Neutral sample check-in: contact form opens an Intercom conversation |
| `/get-feedback` | `GetFeedbackPage` | Negative sample check-in: reasons + comment, opens an Intercom conversation |

Each route also matches with an optional trailing slash (e.g. `/solo/`).

The Australian demand test has its own two routes, which **replace** the table
above when the build sets `VITE_SITE=au` — see
[Australian demand test](#australian-demand-test):

| Route (AU build) | Route (NZ build, preview only) | Page | Purpose |
|------------------|-------------------------------|------|---------|
| `/` | `/au` | `SoloAuPage` | AU landing page, AUD pricing, no Shopify (`page_name: solo-au`) |
| `/sold-out` | `/au/sold-out` | `SoldOutPage` | Where every AU CTA lands: out of stock + waitlist capture (`page_name: sold-out-au`) |

The root path accepts a `?variant=` query param to opt into the older
`LandingPage` funnel (hero → dog size → addons → order summary → checkout).
Without it, `/` renders `SoloPage`:

| Value | Page | Behaviour |
|-------|------|-----------|
| _(none)_ | `SoloPage` | Default. Sample-only purchase, reports as `page_name: solo` |
| `simple` | `LandingPage` | Skips addons step; simplified funnel (`page_name: landing-simple`) |
| `solo` | `LandingPage` | Sample-only checkout (`page_name: landing-solo`) |

`App.tsx` and `getPageName()` both read the variant via `getLandingVariant()` in
`src/lib/page-attribution.ts` — keep them reading that one helper so attribution
never names a page that did not render.

The nav logo on every page links out to `https://www.littlegreendog.co.nz`
(the Shopify storefront), not to `/`. Pointing it at `/` let visitors wander
from one funnel into another and buy at a different price than the offer they
clicked.

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
| `VITE_SITE` | `au` in the Australian demand-test project only — serves the AU pages and nothing else. Unset = the NZ site. See [Australian demand test](#australian-demand-test) |
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
| `RECURPAY_ACCESS_TOKEN` | Recurpay admin token (`X-Recurpay-Access-Token`) |
| `RECURPAY_API_BASE` | e.g. `https://little-green-dog.recurpay.com/admin/api/2024-07` |
| `LINK_SIGNING_SECRET` | HMAC secret for one-click add-on links (min 16 chars) |
| `ADDON_LINK_SECRET` | Shared secret for `POST /api/addon-link` (Klaviyo webhook + CLI) |
| `ADDON_CAMPAIGNS` | Optional JSON override. Default is poop-bag 60 + 120 packs |
| `ADDON_PUBLIC_BASE_URL` | Public origin for minted links (default `https://lp.littlegreendog.co.nz`) |
| `KLAVIYO_API_KEY` | Optional. Mint endpoint writes `recurpay_subscription_id` + `recurpay_link_sig` onto the profile. Also records `/keep-going` and `/get-feedback` submissions as `Feedback Recorded` |
| `INTERCOM_ACCESS_TOKEN` | Optional. If set, `/api/feedback` opens (or updates) an Intercom inbox conversation as the customer. Create a token in Intercom Developer Hub with contacts + conversations read/write. The subscription panel also uses it to add the internal audit note (conversations write) |
| `INTERCOM_CANVAS_CLIENT_SECRET` | Client secret of the Intercom Developer Hub app for the subscription panel. Verifies `X-Body-Signature` on every request |
| `RECURPAY_ADMIN_URL_TEMPLATE` | Optional. URL for the panel's Open in RecurPay button, e.g. `https://…/subscriptions/{id}`. Button hidden if unset |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | Upstash Redis REST credentials (set by the Vercel/Upstash integration). Order lock for instant orders. Without them the panel refuses to create orders |
| `KLAVIYO_AU_WAITLIST_LIST_ID` | Australian demand-test project only. Klaviyo list that `/api/waitlist` subscribes signups to. Must be **single opt-in** |

See [shopify/README.md](./shopify/README.md) for Mixpanel pixel and webhook setup in Shopify Admin.

## One-click subscription add-on

Customers can add a product to their **next Recurpay order** from an email/SMS link. The Recurpay token stays server-side. Pretty URLs:

- Confirm + apply: `https://lp.littlegreendog.co.nz/add-to-subscription/...`
- Mint (internal): `POST https://lp.littlegreendog.co.nz/api/addon-link`

Klaviyo cannot HMAC, so the flow CTA uses profile properties the mint webhook writes.

60-pack:

```
https://lp.littlegreendog.co.nz/add-to-subscription/poop-bags-60?sid={{ person.recurpay_subscription_id }}&sig={{ person.recurpay_link_sig }}
```

120-pack:

```
https://lp.littlegreendog.co.nz/add-to-subscription/poop-bags-120?sid={{ person.recurpay_subscription_id }}&sig={{ person.recurpay_link_sig }}
```

After the webhook, `{{ person.addon_link_poop_bags_60 }}` / `{{ person.addon_link_poop_bags_120 }}` also work. GET shows a confirm button (email scanners prefetch GET; Recurpay is only called on POST).

Agent brief for the Klaviyo flow: [docs/klaviyo-poop-bag-addon.md](docs/klaviyo-poop-bag-addon.md).

## Intercom subscription panel

A Canvas Kit card in the Intercom conversation Details panel shows the contact's RecurPay subscriptions and has a **Create order now** button (confirm step, internal audit note, order lock).

| Purpose | URL |
|---------|-----|
| Initialize URL | `https://lp.littlegreendog.co.nz/api/intercom/initialize` |
| Submit URL | `https://lp.littlegreendog.co.nz/api/intercom/submit` |

Env vars: `INTERCOM_CANVAS_CLIENT_SECRET`, `INTERCOM_ACCESS_TOKEN`, `RECURPAY_ADMIN_URL_TEMPLATE` (optional), `KV_REST_API_URL`, `KV_REST_API_TOKEN`, plus the existing RecurPay vars. Full design, security and rollout steps: [docs/intercom-subscription-panel.md](./docs/intercom-subscription-panel.md). Offline checks: `npx tsx scripts/check-subscription-panel.mts` and `npx tsx scripts/check-intercom-endpoints.mts` (stubbed network, no live calls).

## Australian demand test

A paid-ads test of Australian demand at **https://lp.littlegreen-dog.com**. It
measures conversion rate; it sells nothing. There is no AU stock, so the page
never touches Shopify and every CTA lands on a sold-out page that captures an
email for the waitlist.

> **Before pointing ads at it:** advertising a product that cannot be bought is
> bait-advertising territory under ACCC rules and Meta's unavailable-product
> policy. The copy frames the stockout as real and immediate for that reason —
> keep it that way, and keep the waitlist promise honest.

### How it ships

Same repo, **two Vercel projects**. The AU project sets `VITE_SITE=au`, which
makes the build serve only `SoloAuPage` and `SoldOutPage` — no NZ funnel is
routable there, so AU traffic can never land on a page selling NZ stock at NZ
prices. Because the pixel ID and Mixpanel token are Vite build-time values, two
projects is also what lets the AU test have its own pixel and its own Mixpanel
project while sharing one codebase.

| | NZ | AU |
|--|----|----|
| Vercel project | `subscription` | `lgd-lp-au` |
| Domain | `lp.littlegreendog.co.nz` | `lp.littlegreen-dog.com` |
| `VITE_SITE` | unset | `au` |
| Meta pixel | shared with the Shopify app | its own AU pixel |
| Mixpanel | NZ project | its own AU project |
| Indexed | yes | **no** — `noindex` meta, `Disallow: /` robots.txt, `X-Robots-Tag` header |

Deploy it the same way as NZ, from a checkout linked to the AU project:

```bash
npx vercel link --project lgd-lp-au   # once
npx vercel --prod --yes
```

The env var **names** are the same as the NZ project's — only the values differ
(`VITE_META_PIXEL_ID`/`META_PIXEL_ID` = the AU pixel, `VITE_MIXPANEL_TOKEN`/
`MIXPANEL_TOKEN` = the AU project, plus `META_CAPI_ACCESS_TOKEN` and
`KLAVIYO_API_KEY`). Only `VITE_SITE` and `KLAVIYO_AU_WAITLIST_LIST_ID` are new.

Preview it on an NZ deploy at `/au` — but never advertise that URL: it runs on
the NZ pixel and the NZ Mixpanel project, so clicks there pollute live NZ data.

### Events

The CTA click is the conversion the AU campaigns optimise for; the waitlist
email is the quality signal behind it. Three Meta events in total, well inside
the per-domain Aggregated Event Measurement limit of 8.

| Step | Mixpanel | Meta |
|------|----------|------|
| Landing page view | `Page Viewed` (`page_name: solo-au`) | `PageView` (head snippet) |
| **CTA click** | `CTA Clicked` + `location` | **`Lead`** ← optimise for this |
| Sold-out page view | `Page Viewed` (`page_name: sold-out-au`) | — |
| Email submitted | `Waitlist Submitted`, `Waitlist Submitted (Server)` | `CompleteRegistration` (browser + CAPI, deduped on `eventId`) |

Moving between the two pages uses `pushState`, not a document navigation, so the
`Lead` fired on the CTA click can't be cut off by a page unload and the
campaign's UTMs survive the hop onto the waitlist signup.

### Where the emails go

`POST /api/waitlist` (`api/lib/submit-waitlist.ts`) subscribes the profile to the
Klaviyo **AU Waitlist** list (`XC2sX5`) with express email consent, tracks the
event in the AU Mixpanel project, and sends the CAPI `CompleteRegistration`.

**Only the Klaviyo write decides the response.** It is the one channel that
stores the address somewhere the waitlist email can actually be sent from, so a
signup Klaviyo rejects returns 502 and the visitor is asked to retry. Mixpanel
and the CAPI event are reported after the address is stored and can never fail
the request. Telling someone they are on a list they are not on is the failure
with no way back — they do not retry, and mid-campaign it is silent.

The Klaviyo key needs the **`subscriptions:write`** scope. The scopes the NZ
project needs (`profiles:write`, `events:write`) are not enough: subscribing a
profile to a list is a different permission, and without it the call 403s.

Offline check (stubbed network, no live calls):
`npx tsx scripts/check-waitlist.mts`.

The consent checkbox on the form is required and the endpoint rejects a payload
without it — this collects marketing consent from Australian residents under the
Spam Act 2003. The list **must stay single opt-in**: on a double opt-in list
Klaviyo only sends a confirmation email and the profile stays unconsented until
the visitor clicks it, which would silently undercount the test.

### Pricing

AUD prices are static figures in `src/lib/au-pricing.ts` — $19.99 delivered for
the 2kg sample (63% off the $54 retail anchor), plus the 2–24kg retail and
subscription table. They render with a bare `$`, not `A$` — the AU site only
quotes Australian dollars and the pricing section says so in full. Changing any
of them changes what the test measures, so bump `solo-au` in
`src/constants/page-versions.ts` at the same time.

The footer address switches per build too (`src/components/Footer.tsx`): the AU
site shows the Thomastown VIC address, the NZ funnels keep the Wellington one.

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
- **2026-10-21** — src/lib/analytics.ts
- **2026-10-12** — api/fin/subscriptions.ts
- **2026-10-12** — api/fin/subscriptions.ts
- **2026-10-06** — src/components/FAQCTA.tsx, src/components/FAQSection.tsx, src/components/HeroSection.tsx, src/components/ProductTabs.tsx, src/components/ReactivationPage.tsx, src/components/SubscribePage.tsx, src/components/WhyYoullLoveIt.tsx
- **2026-10-01** — api/lib/subscription-panel.ts
- **2026-09-09** — src/components/KeepGoingPage.tsx, src/constants/page-versions.ts
- **2026-09-09** — src/components/GetFeedbackPage.tsx, src/constants/page-versions.ts
- **2026-09-03** — src/App.css, src/components/LandingPage.tsx, src/components/SampleSubscribePage.tsx, src/components/SoloPage.tsx
- **2026-09-03** — src/App.tsx
- **2026-08-25** — src/components/SubscribePage.tsx
- **2026-08-23** — api/lib/sample-subscribe.ts, src/App.css, src/components/ReactivationPage.tsx, src/components/SubscribeIngredientsPage.tsx, src/components/SubscriptionBagPicker.tsx, src/constants/sample-subscribe.ts, src/lib/cart-reactivation.ts, src/lib/reactivation-plans.ts, src/lib/subscription-prices.ts
- **2026-07-20** — src/lib/cart-subscribe.ts, src/lib/subscribe-offer-plans.ts
- **2026-07-14** — src/App.css, src/lib/analytics.ts, src/lib/meta-pixel.ts
- **2026-07-08** — src/App.css, src/components/Footer.tsx
- **2026-07-06** — api/webhooks/orders-create.ts, shopify/README.md, shopify/mixpanel-pixel.js, src/lib/analytics.ts, src/lib/cart-solo.ts, src/lib/solo-pricing.ts
- **2026-07-06** — src/components/BenefitsBar.tsx, src/components/FAQCTA.tsx, src/components/SoloPage.tsx, src/components/SubscriptionPricingSection.tsx, src/components/WhyYoullLoveIt.tsx, src/lib/solo-pricing.ts
- **2026-07-05** — src/components/SubscribeOfferPicker.tsx, src/components/SubscribePage.tsx, src/constants/page-versions.ts, src/lib/cart-subscribe.ts, src/lib/subscribe-offer-plans.ts
- **2026-07-02** — src/App.tsx, src/lib/page-attribution.ts
- **2026-06-29** — src/components/SampleSubscribePicker.tsx
- **2026-06-29** — src/App.tsx, src/components/SampleSubscribePage.tsx, src/components/SampleSubscribePicker.tsx, src/lib/page-attribution.ts
- **2026-06-27** — src/components/SampleSubscribePicker.tsx, src/constants/page-versions.ts, src/constants/sample-subscribe.ts
- **2026-06-26** — src/components/WholesalePage.tsx, src/constants/page-versions.ts, src/lib/analytics.ts, src/lib/page-attribution.ts
- **2026-06-26** — src/App.css, src/App.tsx, src/components/IngredientList.tsx, src/components/ProductTabs.tsx, src/components/TestimonialsSection.tsx, src/components/WholesalePage.tsx
- **2026-06-25** — src/constants/page-versions.ts, src/lib/subscription-prices.ts
<!-- CHANGELOG_END -->

Static design previews are available at `/previews/*.html` during dev (served from `public/previews/` via custom Vite middleware).

## Deployment

The app is hosted on **Vercel** (`vercel.json` configures SPA rewrites — `/add-to-subscription` and `/api/*` go to serverless functions, everything else → `index.html`). Route components are lazy-loaded (`React.lazy` in `src/App.tsx`) so each page ships its own JS chunk.

**This repo does not auto-deploy from Git.** Commit and push to GitHub for version control, then publish to production with the Vercel CLI:

```bash
npx vercel --prod --yes
```

Production is aliased to `https://lp.littlegreendog.co.nz`. There is no CI pipeline — the CLI is the deploy path.

The Australian demand test deploys from this same repo as a **second** Vercel
project (`lgd-lp-au` → `lp.littlegreen-dog.com`), so check which project your
checkout is linked to before `--prod`. See
[Australian demand test](#australian-demand-test).

**AU last deployed:** `2026-10-22T02:01:54Z` — `lgd-lp-au`, production, from
branch `claude/lucid-euler-fkfcjr` (`1cae3ce`). Live on
`https://lp.littlegreen-dog.com`. Deployment `dpl_8iWqzqDcda6NgRcpAmWTE16H9xA5`.

**Last deployed:** `2026-06-26T20:52:00Z` — Vercel CLI deploy (`npx vercel --prod --yes`). Production: https://subscription-83lvb8kx7-chris-oneills-projects.vercel.app. Aliased to `https://lp.littlegreendog.co.nz`. Inspect: https://vercel.com/chris-oneills-projects/subscription/DeafD9aTqxPiQ2W7G9pP18o8nPSi.

## Project structure

```
src/
  App.tsx         Pathname routing (lazy-loaded page components)
  components/     Funnel pages (LandingPage, SoloPage, ReactivationPage, SubscribePage,
                  SubscribeIngredientsPage), the AU demand test (AuSite, SoloAuPage,
                  SoldOutPage) and shared sections (HeroSection, BenefitsBar,
                  ProductTabs, SubscriptionPricingSection, SubscriptionPricingTable,
                  TestimonialsSection, FAQSection, DogSizeCalculator, OrderSummary,
                  StickyCTA, Footer, etc.)
  hooks/          Product fetching, cart state, scroll/section-view tracking, hash scrolling
  lib/            Shopify client, cart builders, pricing, subscription-prices, analytics,
                  meta-pixel, UTM capture, page-attribution, and the AU test's
                  site/au-routes/au-pricing/waitlist-client
  constants/      Dog size presets, page-versions (attribution semver)
  types/          Shopify GraphQL types
api/
  waitlist.ts             AU waitlist signup (Klaviyo list + Mixpanel + Meta CAPI)
  add-to-subscription.ts  One-click Recurpay add-on (pretty URL `/add-to-subscription`)
  addon-link.ts           Internal URL minting (Klaviyo webhook / CLI)
  intercom/               initialize + submit (Intercom Details panel: RecurPay subscriptions card)
  webhooks/               orders-create (Mixpanel + Meta CAPI), subscription-contracts-create
  lib/                    Shared serverless helpers (Recurpay, HMAC tokens, Meta CAPI, Intercom
                          Canvas builders, order-lock, subscription-panel)
scripts/          One-off maintenance scripts (generate-addon-link.mjs, backfill-utm.mjs, sync-readme.mjs)
                  and offline checks (check-subscription-panel.mts, check-intercom-endpoints.mts,
                  check-waitlist.mts)
.githooks/        Git hooks (pre-commit → sync README page versions + changelog)
shopify/          Mixpanel custom pixel + setup docs
public/           Static assets and design previews
```

## How checkout works

Each funnel has its own cart module in `src/lib/`:

| Module | Used by |
|--------|---------|
| `cart.ts` | `LandingPage` funnel (`/?variant=simple`) |
| `cart-solo.ts` | `/solo`, root `/` default, and `?variant=solo` |
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
| `sample-subscribe` | 1.1.0 |
| `reactivation` | 1.0.0 |
| `subscribe-offer` | 1.2.0 |
| `subscribe-ingredients` | 1.0.0 |
| `wholesale` | 1.0.0 |
| `keep-going` | 1.1.0 |
| `get-feedback` | 1.1.0 |
| `solo-au` | 1.1.0 |
| `sold-out-au` | 1.1.0 |
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
