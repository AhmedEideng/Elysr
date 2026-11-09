<div align="center">

# Elysr Medical Group

**أصلي — شحن سري لكل محافظات مصر**
_Original marital & sexual-health products for Egypt — discreet shipping to all 27 governorates_

[![Live](https://img.shields.io/badge/Live-elysrmedical.store-0085ca?style=for-the-badge)](https://elysrmedical.store)
[![WhatsApp](https://img.shields.io/badge/WhatsApp-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)](https://wa.me/201098088206)

</div>

<div align="center">

![React](https://img.shields.io/badge/React_19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript_6-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite_8-646CFF?logo=vite&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_4-38B2AC?logo=tailwindcss&logoColor=white)
![TanStack](https://img.shields.io/badge/TanStack_Router-FF4154?logo=reactrouter&logoColor=white)
![Node](https://img.shields.io/badge/Node_24-339933?logo=node.js&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000?logo=vercel&logoColor=white)
![Version](https://img.shields.io/badge/Version-2.3.3-5b8def?style=flat)
![Pages](https://img.shields.io/badge/Pre--rendered_Pages-286-success?style=flat)
![Tests](https://img.shields.io/badge/Tests-387_passing-success?style=flat)

</div>

---

## Contents

[Overview](#overview) · [Architecture](#architecture) · [Tech Stack](#tech-stack) · [Project Structure](#project-structure) · [Features](#features) · [Getting Started](#getting-started) · [Adding Content](#adding-content) · [Testing & CI](#testing--ci) · [Deployment](#deployment) · [Privacy & Data Handling](#privacy--data-handling) · [Merchant Center feed](#merchant-center-feed) · [License](#license)

---

## Overview

Elysr Medical is a production Arabic (RTL) e-commerce store serving Egypt. It runs
on static pre-rendered storefront pages, with server-side API endpoints for orders,
reviews and error reporting. No application database is required.
Orders flow through a hardened serverless API into Google Sheets; customer reviews
flow through the same webhook into a moderated reviews sheet.

| Metric             | Value                                                                                                                                                                           |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Products           | **89** (56 men · 25 women · 8 devices) — 4 legacy items remain deleted; six previously removed products restored by owner decision                                              |
| Catalog coverage   | **89** in the site catalog · 82 in the Merchant feed (7 prescription-active items excluded from the feed only — owner decision 2026-09-28; their pages stay live and indexable) |
| Articles           | **64** educational health articles with trusted medical sources (NIH/Mayo/NHS/…)                                                                                                |
| SEO landing pages  | **113** long-form guide pages (price lists, product comparisons and regional delivery pages; drug-guide pages retain medical safety warnings)                                   |
| Pre-rendered pages | **286** (16 static + 89 product routes + 64 articles + 113 guides + 4 English pages)                                                                                            |
| Sitemap URLs       | **282** (site-wide search is covered by the `SearchAction` JSON-LD, not a sitemap template)                                                                                     |
| Catalog feed       | **82** items (Google Shopping RSS/CSV/TXT, price + availability + `product_type` per product)                                                                                   |
| Redirects          | **175** permanent redirects (HTTP 308 on Vercel) (legacy IDs, deleted products, renamed slugs, typo variants, GSC 404s)                                                         |
| Images             | 148 source WebP + 269 thumbnails across three sizes                                                                                                                             |
| Tests              | **387** unit (Vitest) + **50** E2E (Playwright) + data-integrity + schema validation                                                                                            |

---

## HILTI catalogue and approved copy

- Women's HILTI (`w-26`, `/products/hilti-bitter-chocolate-for-women`): **200 EGP**, stock **300**, pink **50 g** packaging; men's HILTI (`m-15`) remains **200 EGP**.
- The owner-approved “غيّري الروتين بطريقتك” description is displayed in paragraphs without a price, add-to-cart call to action, or retailer attribution inside the marketing copy.
- The separate **Ingredients / composition** section lists epimedium, ginseng extract, natural cocoa and natural flavours. The owner selected the [Beauty Expert listing](https://beauty-exprt.com/products/شوكولاتة-هيلتي-للسيدات?variant=46709814001822) as the source; this is retailer-sourced information, not independent manufacturer or laboratory verification. No concentrations, new dosage, ten-piece pack count or hormonal/safety guarantees were adopted.
- Image sizes remain **800 / 480 / 360 / 240 px WebP**. Product URL, stock, usage precautions, existing bundles, homepage selections and cache version are unchanged by this copy revision.
- Build output synchronizes the product page, API catalogue and feed files; no Merchant Center submission or account change is performed. Source history and the owner's earlier product-identity confirmation are recorded in [the operating notes](docs/organic-growth-operations.ar.md#11-متابعة-وصف-هيلتي-النسائي-وقسم-المكونات).

## Architecture

```
Browser ──→ Vercel Edge CDN (static dist/)
                │
                ├── index.html / 286 pre-rendered pages (full SEO meta + JSON-LD)
                ├── /search?q=…          (SPA — client-side catalog search)
                │
                ├── /api/submit-order  ──┐
                ├── /api/submit-review ──┼──→ Google Apps Script (webhook) ──→ Google Sheets
                └── /api/reviews       ──┘        ▲ protected: HMAC single-use
                                                  │ signatures / required write secret

Self-hosted alternative: server/index.js (Express) serves the same dist/ +
the same API handlers — identical behavior, no Vercel dependency.
```

**Key design decisions**

- **Zero database** — all product/article/landing data lives in TypeScript files,
  pre-rendered at build time. Google Sheets is the only stateful backend (orders +
  reviews), reached through a hardened webhook.
- **Server never trusts the client** — the API re-validates prices, stock,
  discounts (including the 20% bundle discount) and bundle composition against
  build-time-generated `products-db.json` / `bundles-db.json` before anything is
  written to the sheet.
- **Catalog availability policy** — m-36, m-43, m-47 and w-24 remain permanently
  deleted; m-08, m-34, m-37, m-38, m-45 and w-17 were restored by the owner.
  Prescription-active products are excluded from the Merchant feed only (owner decision 2026-09-28,
  `isMerchantFeedExcluded` in `src/lib/site-config.ts`); their pages stay
  published and indexable. The feed carries `product_type` (section × form)
  for all 82 eligible in-stock items.
- **Reviews are moderated by design** — submissions land in a "قيد المراجعة"
  (pending) state; only owner-approved rows are ever served. The read endpoint is
  signed with short-lived HMAC-SHA256 single-use nonces; the write path is
  gated by a required shared webhook secret.
- **Compliance checks in CI** — data-integrity validates catalog membership,
  generated metadata, redirects, feed eligibility, and schema consistency. Targeted
  copy-regression tests also run; passing CI is not medical verification.
- **Smart sort** — category pages rank by stock → featured → popularity score →
  price (ascending as tie-breaker for impulse buys).

---

## Tech Stack

| Layer     | Technology                                                                                                                  |
| --------- | --------------------------------------------------------------------------------------------------------------------------- |
| Framework | React 19 + TypeScript 6                                                                                                     |
| Build     | Vite 8 (code-split: vendor-react / router / icons / search / toast + per-catalog data chunks)                               |
| Routing   | TanStack Router (file-based, 25 route modules)                                                                              |
| Styling   | Tailwind CSS 4 (Oklch colors, full RTL)                                                                                     |
| Search    | Fuse.js (fuzzy, lazy-loaded) + Egyptian dialect synonyms (نقط ⇄ قطرات)                                                      |
| Tests     | Vitest (387 unit) + Playwright (50 E2E) + data-integrity + JSON-LD schema validator                                         |
| Hosting   | Vercel Edge CDN (primary) · self-hosted Express + Docker (supported)                                                        |
| Orders    | Google Apps Script → Google Sheets (ScriptLock, full duplicate scan, intl phones)                                           |
| SEO       | 286 pre-rendered pages · JSON-LD (Product/FAQ/Article/Breadcrumb/SearchAction) · 3 sitemaps                                 |
| Images    | WebP only (sharp pipeline, 700–800 px, q45–55) + descriptive alt/title                                                      |
| Security  | CSP · HSTS · COOP/OAC · Report-To · NEL · CORS strict · hashed-IP rate limits · HMAC review reads · PII-safe error tracking |

---

## Project Structure

```
├── src/
│   ├── components/
│   │   ├── sections/           # Hero, FeaturedProducts, ShopByConcern, DailyAdvice,
│   │   │                       # ArticlesGrid, WhyUs, RecentlyViewed
│   │   ├── layout/             # Header (search dialog), Footer, Layout
│   │   ├── ProductCard.tsx     # Product card with compliance-aware badges
│   │   ├── SearchBar.tsx       # Fuzzy product search (Ctrl/Cmd+K) + "show all results" → /search
│   │   └── Accessibility.tsx   # Skip-to-content + ARIA live regions + focus trap
│   ├── features/product/
│   │   ├── components/         # CustomerReviews (approved live reviews), ProductImage, …
│   │   └── hooks/use-product-image-state.ts # Shared loading/error state for product images
│   ├── data/
│   │   ├── products.ts         # 89 products (56 men · 25 women · 8 devices) + search helpers
│   │   ├── products/           # men.ts · women.ts · devices.ts (catalog source of truth)
│   │   ├── articles.ts         # 64 articles with trusted sources
│   │   ├── landing-pages.ts    # 113 SEO guide pages (build-time source; served as per-slug JSON at runtime)
│   │   ├── product-types.ts    # TypeScript interfaces
│   │   └── product-faqs.ts     # Shared product FAQ schema
│   ├── lib/
│   │   ├── seo.ts              # Meta tags, JSON-LD builders, canonical, meta descriptions
│ │   │   ├── bundle-discount.ts  # 20% bundle discount (exclusive with promo tiers)
│   │   ├── promo.ts            # Diamond Care tiered discount (10/15/20%)
│   │   ├── governorates.ts     # 27 governorates + shipping + submitToGoogleSheets
│   │   ├── search-terms.ts     # Dialect synonym expansion (نقط ⇄ قطرات)
│   │   ├── error-tracking.ts   # PII-safe error sink (allowlist context, hashed correlation)
│   │   ├── internal-links.ts   # Cross-linking engine (products ↔ articles ↔ guides)
│   │   ├── cache.ts            # Centralized asset cache version (config/cache-version.json)
│   │   ├── cart-normalization.ts # Single source of truth for stock-safe cart items
│   │   └── whatsapp.ts         # Order message builder (full PII for chat, minimal for URL)
│   ├── routes/                 # 25 file-based route modules (incl. /search, /order-confirmed)
│   ├── hooks/                  # use-cart · use-wishlist · use-recently-viewed · use-scroll-tracking
│   ├── contexts/cart.tsx       # Cart state (localStorage IDs only — no PII in storage)
│   └── styles.css              # Global styles + Tailwind directives
├── api/
│   ├── submit-order.js         # Hardened order intake (CORS strict, 30/min hashed IP,
│   │                           # price/stock/bundle re-validation, IP hash only)
│   ├── submit-review.js        # Review intake (product must exist in catalog, 3/min hashed IP)
│   ├── reviews.js              # Approved-reviews read (HMAC-verified upstream, fail-soft,
│   │                           # product-id validation, in-process cache)
│   ├── csp-report.js           # CSP violation sink (hashed IP, origin whitelist, 4KB cap)
│   └── lib/
│       ├── rate-limiter.js            # Shared order/review limiter with cleanup
│       ├── endpoint-rate-limiter.js   # Private per-endpoint limiter for CSP/errors sinks
│       ├── request-guards.js          # Shared origin and payload-size checks
│       └── request-ip.js              # Trusted platform IP extraction
├── scripts/
│   ├── prerender-seo.mjs       # 286 static HTML pages + Product/ItemList/FAQ/Breadcrumb JSON-LD
│   ├── generate-sitemap.mjs    # sitemap.xml (282) + sitemap-images.xml +
│   │                           # robots.txt + security.txt
│   ├── check-source-links.mjs  # Corpus-wide source liveness (3-attempt backoff, flaky-authority class)
│   ├── validate-schemas.mjs    # JSON-LD validator (every schema in every pre-rendered page)
│   ├── validate-article-sources.mjs # New-article claim→source support check
│   ├── data-integrity.test.mjs # Catalog/metadata/redirect-graph guard (build gate)
│   ├── auto-generate-article.mjs   # Gemini article pipeline (manual trigger)
│   ├── optimize-images.mjs     # sharp WebP pipeline
│   ├── process-hero.mjs        # Hero image processing
│   ├── release.mjs             # Version + cache-version bump workflow
│   ├── sync-vercel-redirects.mjs # vercel.json ⇄ catalog redirect sync
│   └── health-check.mjs        # Bundle/image + generated internal-link/SEO-head audit
├── e2e/
│   ├── checkout.spec.ts        # 24 E2E tests: checkout, search, reviews, prices, 404s
│   ├── restored-content.spec.ts # 9 restored-content checks
│   ├── kreva-august-restoration.spec.ts # 2 mobile/desktop content + review-form checks
│   ├── homepage-devices.spec.ts # 3 homepage selection + pump-price checks
│   ├── organic-growth.spec.ts  # 3 guide/content checks
│   ├── growth-discovery.spec.ts # 7 search/filter/checkout measurement checks
│   └── hilti-catalog.spec.ts   # 2 HILTI copy/ingredients/image/search/cart checks
├── server/
│   └── index.js                # Self-hosted Express server (same dist/ + same API handlers)
├── .github/workflows/ci.yml    # 7 CI jobs (see Testing & CI)
├── public/
│   ├── images/                 # 148 source WebP + 269 thumbnails in thumbs/, thumbs-180/, and thumbs-120/
│   ├── landing-pages/          # 113 per-slug JSON (runtime data source for guide pages)
│   ├── sitemap.xml             # 282 URLs
│   ├── sitemap-images.xml      # 153 image URLs
│   ├── sitemap-index.xml       # Sitemap index
│   ├── sw.js                   # PWA migration kill-switch (self-unregistering, network-only)
│   ├── scripts/ga-loader.js    # Delayed GA4 loader (2s + interaction, send_page_view:false)
│   └── .well-known/security.txt # RFC 9116 security policy
├── google-apps-script.gs       # Webhook: orders + reviews + HMAC verification +
│                               # write-secret gate + daily auto-cleanup trigger helper
├── vercel.json                 # 12 security header sets + 175 redirects + rewrites
├── Dockerfile / docker-compose.yml
├── SECURITY.md · CHANGELOG.md · ANALYSIS.md
└── index.html                  # SPA shell with SEO meta + delayed GA loader
```

---

## Features

### 🔍 Site-wide search (`/search?q=`)

- Fuzzy instant suggestions in the header dialog (Fuse.js, lazy-loaded, Ctrl/Cmd+K)
  with an **"عرض كل النتائج"** (show all results) link.
- Dedicated results page `/search?q=…` across **all categories** — described by the
  `SearchAction` JSON-LD. Search-result URLs are not included as a sitemap template.
- Egyptian dialect synonyms are bidirectional (`نقط` ⇄ `قطرات`) in both the page
  matcher and the suggestion index.

### ⭐ Real, moderated customer reviews

- Product pages render an **"تجارب حقيقية من عملائنا"** section fed exclusively by
  owner-approved reviews (`/api/reviews`) — nothing is ever shown unmoderated.
- Submission form (stars, name, optional phone) → `/api/submit-review` →
  "قيد المراجعة" row in the **المراجعات** sheet. Owner approves/rejects in the sheet;
  the page reflects it within the 5-minute cache.
- **Verified purchase** badge: when a reviewer's phone matches a completed order
  containing that product, the review is marked "مشتري مؤكد".
- Privacy: phone numbers never leave the sheet; the read path uses short-lived
  HMAC-SHA256 signatures with single-use nonces.

### 🏷️ Pricing & discounts

- **Diamond Care Initiative** — tiered discount 10% / 15% / 20% at 1,000 / 1,500 /
  2,000 EGP thresholds.
- **Bundle discount 20%** — a completed cross-sell bundle gets a flat 20% off the
  bundle total; the two discounts are **mutually exclusive** (bundle wins).
- Both are recomputed and enforced server-side from `bundles-db.json` — client-side
  values are never trusted.

### 🛡️ Product & content compliance

- **Catalog visibility** — 89 products are maintained in the site catalog; four
  legacy items remain deleted and the six owner-restored products are visible
  normally. Prescription-active items are excluded from the Merchant
  feed only (owner decision 2026-09-28) — never from the catalog or sitemap.
- **Medical copy policy** — wording needs editorial/source review. Targeted
  copy-regression tests are not medical certification; validation for new articles remains
  available through `npm run test:sources`.
- **Source liveness CI** — all unique article source URLs are re-checked on every
  push (3-attempt backoff; flaky primary authorities classified, true 404s fail).

---

## Getting Started

```bash
git clone https://github.com/AhmedEideng/Elysr.git
cd Elysr
nvm use                 # Node 24.x (pinned in .nvmrc / engines)
npm ci
npm run dev             # → http://localhost:8080
```

### Environment Variables

Production order/review writes require `GOOGLE_SHEETS_WEBHOOK_URL` and
`GOOGLE_SHEETS_WEBHOOK_SECRET`; configure `SITE_URL` to the production origin.
Approved review reads also require `GOOGLE_SHEETS_REVIEWS_TOKEN`.
No Redis or external rate-limit service is required: the API applies in-process
hashed-IP limits, and Google Apps Script applies a second per-phone limit before
writing an order.

| Variable                       | Required     | Purpose                                                                                                                                                                     |
| ------------------------------ | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GOOGLE_SHEETS_WEBHOOK_URL`    | ✅           | Apps Script Web App `/exec` URL (orders + reviews)                                                                                                                          |
| `SITE_URL`                     | ✅           | Canonical origin (canonicals, feeds, OG tags)                                                                                                                               |
| `GOOGLE_SHEETS_REVIEWS_TOKEN`  | ⚠️ revs      | HMAC key for the reviews read endpoint (must match `REVIEW_READ_TOKEN` in the script; unset = empty approved-review list; submission form remains visible)                  |
| `GOOGLE_SHEETS_WEBHOOK_SECRET` | **required** | Shared write-secret (must match `WEBHOOK_SECRET` in the Apps Script). Fail-closed: with no secret, the script rejects **all** writes — set both or the site takes no orders |
| `VITE_ERROR_SINK_URL`          | optional     | Sentry-compatible error sink (console-only in dev)                                                                                                                          |

### Commands

| Command                        | Description                                              |
| ------------------------------ | -------------------------------------------------------- |
| `npm run dev`                  | Development server (port 8080)                           |
| `npm run build`                | Production build + sitemaps + 286-page prerender         |
| `npm run preview`              | Preview the production build locally                     |
| `npm run build:ssr`            | Build + prerender for the self-hosted Express server     |
| `npm start` / `start:dev`      | Run the self-hosted server (production / watch)          |
| `npm run test`                 | Data-integrity guard (catalog, metadata, redirect graph) |
| `npm run test:unit`            | Vitest unit + API security tests (387)                   |
| `npm run test:e2e`             | Playwright E2E suite (50)                                |
| `npm run test:schemas`         | JSON-LD validator over every pre-rendered page           |
| `npm run test:sources`         | New-article claim→source support check                   |
| `npm run test:all`             | integrity + unit + build + schemas + health-check        |
| `npm run ci`                   | lint + typecheck + test:all                              |
| `npm audit --audit-level=high` | `npm audit --audit-level=high`                           |
| `npm run release`              | Version + cache-version bump workflow                    |

---

## Adding Content

### New Product

```ts
// src/data/products/men.ts (or women.ts / devices.ts) — append to the array
{
  id: "m-65",                              // example only: verify the ID is unused
  slug: "your-product-slug",               // URL-friendly English name
  name: "اسم المنتج",                       // Arabic display name
  nameEn: "Product Name",                   // English name (catalog data)
  category: "men",                          // men | women | devices
  price: 300,                               // EGP
  description: "وصف تفصيلي للمنتج…",        // ≥ 80 chars — reviewed product copy
  benefits: ["فائدة 1", "فائدة 2"],         // 5–7 benefits
  ingredients: "المكونات مع أدوارها…",
  usage: "طريقة الاستخدام + تحذيرات…",
  image: "/images/your-product-slug.webp",  // slug-based (must match slug)
  emoji: "💊",
  stock: 100,                               // confirmed inventory only
  // searchAliases?: ["كلمة محلية شائعة"],   // optional: dialect/search synonyms
}
```

Complete the integration before publishing:

1. Add an 800×800 WebP and thumbnails: `thumbs/` **480×480**, `thumbs-180/`
   **360×360**, `thumbs-120/` **240×240**. Directory names describe CSS use,
   not the actual file dimensions. Preserve the image proportions.
2. Assign the product ID in `src/data/topics.ts`; add a factual hook in
   `product-meta.ts` and product-specific questions in `product-faqs.ts`.
3. Run `npm run sync:redirects` to generate the ID-to-slug redirect. For a restored
   URL, remove its old redirect from both `legacyAliases` in the sync script and
   `vercel.json` before syncing. Never redirect a live product page away.
4. Update catalog-count assertions, the category `OfferCatalog` counts in
   `index.html`, and these READMEs. Do not invent ratings, identifiers or stock.
5. Run `npm run build`, then `npm run ci` and `npm run health-check`.
   Build regenerates the sitemap, page HTML, feed and API catalog files.
   Review generated diffs; feed changes require owner approval before publishing.

> ⚠️ Product copy is reviewed as part of the normal editorial/content workflow;
> Targeted copy-regression tests do not replace source verification.

### New Article

```ts
// src/data/articles.ts — append to the articles array
a(
  "article-slug",
  "عنوان المقال",
  "مقتطف قصير…",
  "فئة", // e.g. "صحة الرجل", "صحة المرأة", "تغذية"
  7, // reading time (minutes)
  "💡", // emoji
  `محتوى المقال الكامل…`,
  "/images/article-slug-hero.webp",
);
```

Assign every new article to a topic in `src/data/topics.ts`.
Every article needs **≥ 3 trusted https sources**; `npm run test:sources` validates
source requirements, and the corpus-wide liveness CI re-checks every source URL on
every push.

---

## Testing & CI

Seven jobs on every push (plus a weekly Saturday source-liveness cron):

| Job                                         | Gate                                                                                       |
| ------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 🔗 Corpus Source Liveness                   | All unique article source URLs checked (bot-blocked authorities are classified separately) |
| 🔍 Lint • Typecheck • Unit • Data Integrity | ESLint · `tsc --noEmit` · 387 unit/API tests · catalog+metadata+redirect-graph guard       |
| 🛡 Security Audit                            | `npm audit --audit-level=high` on the locked tree                                          |
| 🏗 Build • Prerender • Sitemaps              | Vite build + 286-page prerender + sitemap artifacts                                        |
| 🚦 Lighthouse Performance Budget            | LHCI performance budgets on the built site                                                 |

Additional workflow jobs are **Lighthouse Mobile** and **Playwright E2E**.

Local release checks (build first to synchronize generated catalog snapshots):

```bash
npm run build
npm run ci
npx playwright install --with-deps chromium
npm run test:e2e -- --workers=1
npm audit --audit-level=high
```

`npm run ci` does not run Playwright, Lighthouse or external source-link checks.
Run `npm run check-source-links` separately for source URL liveness.
`npm run test:sources -- <article-slug>` is a separate new-article validation
workflow, not a generic catalog test; it needs an article target and its service configuration.

---

## Current release and loading behavior

**Version 2.3.3 · asset cache 106. Documentation reflects the current catalog and homepage-device update.**

- Version lives in `package.json` and `package-lock.json`; cache version lives in
  `config/cache-version.json` and is consumed through `CACHE_VERSION`.
  Keep the explicit `ga-loader.js?v=106` in `index.html` synchronized.
- With JavaScript enabled, the initial static fallback is hidden until React
  mounts the actual UI. There is **no standalone hero or skeleton flash**.
  The hero preload remains; images may finish loading after the UI appears.
- No-JS visitors retain static content and navigation. If the initial JavaScript
  startup flag is not set within four seconds, the fallback becomes visible.
  This is not a guarantee that every runtime/render error is recoverable.
- Header uses the transparent 250×94 logo; footer uses the 200×200 square mark
  without the old invert filter. These are raster assets, not SVG originals.
- Recent catalog additions: Over Time (restored), Tri Force 30 capsules,
  Cialis 20 mg / 4 tablets, and Pink Shot 30 ml. The Cialis 30-tablet URL is
  unchanged. Pink Shot is included in the feed; prescription-active items remain excluded.

### Current prices and homepage device selection

- `d-03` / `manual-ved-pump`: **800 EGP**. Keep the price mentioned in the
  description synchronized; FAQ/meta/feed and server catalog derive from source data.
- Sotara (`m-31`): **400 EGP**; Kreva (`m-60`): **300 EGP**.
- Homepage delay cards, in order: **Sotara (`m-31`)**, **Indian Procomil spray (`m-55`)**, **Emla (`m-30`)**.
- Strength cards: **Ginseng 1650 (`m-04`)**, **Tri Force (`m-63`)**, **Powerfully Up capsules (`m-03`)** — not Power Fully Up tablets (`m-49`).
- Women's concern cards: **Pink Shot (`w-25`)**, **Beauty Love gum (`w-10`)**, **Connubial (`w-15`)**.
- Connubial moves out of the top featured grid to avoid duplication; Titan Gold (`m-32`) fills the sixth featured slot. The prior homepage exclusion for capsules `m-03` is lifted; the tablets `m-49` remain excluded.
- Homepage medical-device cards: **SAWFT (`d-05`)**, **Konsa (`d-07`)**,
  **9-speed digital pump (`d-08`)**. Selection comes from
  `HOMEPAGE_CONCERN_CANDIDATES` in `src/data/products.ts`, shared by React and prerender.
- Big Bro breast kit (`d-04`) is in `HOMEPAGE_EXCLUDED_PRODUCT_IDS`: excluded
  from all homepage product sections, not deleted from the devices category or catalog.
- Kreva retains its August 17 copy and meta exception, current price/stock, and
  the moderated review form, without restoring historical ratings.
- Build regenerates feed/API artifacts; review diffs and publish only with owner approval.
  Successful deployment is not a guarantee of Google indexing or Merchant approval.

### Safe release checklist

1. Review content, medical sources and generated artifacts; do not infer dosages
   or manufacturer certification from promotional imagery.
2. Run the checks above. `npm run release -- patch` updates package/lock versions,
   increments cache, synchronizes the GA asset URL, and creates a local commit/tag.
   It **does not build or push**; review its staged changes first.
3. Rebuild after a version/cache bump, review generated changes, and commit them.
4. Push only with owner approval. Check live URLs, prices, images, redirects and
   feed inclusion after deployment completes. Feed inclusion does not mean Google approval.

---

## Deployment

### Vercel (primary)

Automatic CI/CD on every push to `main`. The build pipeline:

1. `prebuild` runs `generate-sitemap.mjs` → sitemaps (282 URLs), feeds,
   API catalog snapshots, robots.txt, security.txt and per-slug landing JSON.
2. `vite build` → optimized, code-split `dist/`.
3. `prerender-seo.mjs` → 286 pre-rendered pages with full SEO meta + JSON-LD;
   `inject-critical-css.mjs` injects critical CSS afterward.
4. Vercel serves `dist/` from the Edge CDN with 12 security header sets
   (HSTS, CSP, COOP, Report-To, NEL, …) + 175 legacy redirects

After deploying: submit `sitemap-index.xml` + `sitemap-images.xml` in Google Search
Console and check GA4 DebugView for accurate tracking (the GA loader is delayed by
2s + first interaction with `send_page_view:false` — the app tracks route changes
itself to avoid duplicate page views).

### Self-hosted (Express + Docker)

```bash
npm run build:ssr
npm start          # or: docker compose up
```

`server/index.js` serves the same `dist/` + the same API handlers as Vercel
(including the same security headers and hashed-IP rate limits), with real 404
handling and Vercel-parity slash redirects.

---

## Privacy & Data Handling

- **Orders** — name/phone/address/items go to the orders sheet through the hardened
  webhook; they are used only to fulfill and contact about the order.
- **No PII in browser storage** — the cart stores product IDs + quantities only;
  session order IDs live in sessionStorage; error tracking uses a pseudonymous
  correlation ID and an allowlisted (PII-safe) context.
- **Analytics** — GA4 collects technical/aggregate visit data with a pseudonymous
  client identifier; it is never used to contact or identify customers. Load is
  delayed (2s + interaction). Customers can block it via browser settings.
- **Data deletion** — handled manually on request via WhatsApp (documented on the
  privacy page). By owner decision there is no automated self-service deletion
  endpoint: order rows double as the business's accounting records.
- **IP privacy** — only SHA-256 hashes of client IPs are stored/logged.
- **Security policy** — see `SECURITY.md` (RFC 9116 `security.txt` is published).

---

## PWA Status

The manifest, icons, shortcuts, and install UI are active. Runtime mode is
intentionally **network-only**: the app registers no caching Service Worker and does
not promise offline browsing. `public/sw.js` remains as a migration kill-switch that
clears legacy caches and unregisters itself, preventing old HTML/CSS/JS from being
served.

---

## Merchant Center feed

`public/catalog-feed.xml` (+ CSV/TXT twins) is generated at build time from the
catalog source of truth and carries, per item: id, title, cleaned commercial
description (usage instructions stripped), link, `image_link` (cache-versioned),
`availability`, `price` (`NNN EGP`), `condition=new`, `google_product_category`
(official taxonomy IDs), `product_type` (store taxonomy: section × product form),
and an honest `identifier_exists=no` (no GTIN/MPN is ever invented — a data-integrity
test enforces this). Seven prescription-active items are excluded from the feed only
by owner decision (2026-09-28); their pages remain live and indexable.

Still pending an explicit owner decision before any Shopping submission: the
`g:adult` policy path — (a) site-wide adult-oriented, (b) per-product classification
accepting cross-link disapprovals, or (c) organic-search-first. Do not add `g:adult`
or submit the feed without that decision.

---

## License

All rights reserved © 2026 Elysr Medical Group.
This is a private, proprietary project.

---

<div align="center">

**Built with ❤️ in Cairo, Egypt**

[Website](https://elysrmedical.store) · [WhatsApp](https://wa.me/201098088206) · [Email](mailto:info@elysrmedical.store)

</div>

### Organic discovery and conversion maintenance

- Guide selections and article recommendations are editorial matches; health-only articles have no automatic sales fallback. Do not pad lists to six products.
- Men's and women's price guides derive membership directly from the catalogue.
- GA4 purchase/checkout values exclude shipping and allocate discounts to item prices. Checkout, WhatsApp and Sheets totals are unchanged. A recorded COD order is not cash collected.
- Three ginseng/maca articles have evidence-focused editorial corrections, not independent medical review. Publication history and URLs remain unchanged.
- Operational inputs, media brief, distribution drafts and measurement requirements: [Arabic operations guide](docs/organic-growth-operations.ar.md).
- The owner authorized publishing the combined growth improvements after validation. No real orders/reviews or external account submissions are used in testing. Automatic bundles and their discounts remain unchanged by owner decision.

- Additional photos/videos and new specifications/manufacturer/barcode enrichment are excluded from the current scope at the owner’s request. Existing product images and data remain unchanged.

### Search, catalogue controls and measurement

- Search suggestions and results share one normalized, token-aware ranking engine; spelling suggestions are explicit, not automatic medical substitutes. Published names and URLs are unchanged.
- Categories have local type/price filters and price sorting; default ordering stays intact, with no new indexable filter URLs.
- Analytics list names never embed raw search input. `checkout_open`, `checkout_start`, `checkout_submit` distinguish form stages; `begin_checkout` occurs once on first editing per form session. `order_request` records duration and a fixed outcome only, never customer fields.
- Official `web-vitals` computes CLS/INP/LCP once per document. `metric_id` supports deduplication; SPA route changes are not new document measurements. The old ten-second approximation is removed.
- Bundles, their membership and 20% discount remain unchanged pending a separately approved replacement list and cost data.
