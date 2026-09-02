<div align="center">

# Elysr Medical Group

**أصلي — شحن سري لكل محافظات مصر**
*Original marital & sexual-health products for Egypt — discreet shipping to all 27 governorates*

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

</div>

---

## Overview

Elysr Medical is a production Arabic (RTL) e-commerce store serving Egypt. It runs
entirely on static pre-rendered pages — no database, no server runtime required.
Orders flow through a hardened serverless API into Google Sheets; customer reviews
flow through the same webhook into a moderated reviews sheet.

| Metric                 | Value                                                                                          |
| ---------------------- | ---------------------------------------------------------------------------------------------- |
| Products               | **82** (52 men · 23 women · 7 devices) — 5 pharma items permanently deleted per Merchant report |
| Eligible (feed/sitemap)| **79** — 3 remaining prescription items (m-38, m-43, m-45) are noindex-protected & excluded    |
| Articles               | **56** educational health articles with trusted medical sources (NIH/Mayo/NHS/…)                |
| SEO landing pages      | **93** long-form guide pages (91 indexed, 2 noindex)                                            |
| Pre-rendered pages     | **248** (17 static + 82 products + 56 articles + 93 guides)                                     |
| Sitemap URLs           | **238** (+ Google search template for `/search?q=`)                                             |
| Catalog feed           | **79** items (Google Shopping RSS, price + availability per product)                            |
| Redirects              | **162** permanent 301s (legacy IDs, deleted pharma, renamed slugs, typo variants)               |
| Images                 | **138** WebP (8–55 KB, avg 26 KB) + 84 thumbnails                                               |
| Tests                  | **170** unit (Vitest) + **18** E2E (Playwright) + data-integrity + schema validation            |

---

## Architecture

```
Browser ──→ Vercel Edge CDN (static dist/)
                │
                ├── index.html / 248 pre-rendered pages (full SEO meta + JSON-LD)
                ├── /search?q=…          (SPA — client-side catalog search)
                │
                ├── /api/submit-order  ──┐
                ├── /api/submit-review ──┼──→ Google Apps Script (webhook) ──→ Google Sheets
                └── /api/reviews       ──┘        ▲ protected: HMAC single-use
                                                  │ signatures / optional write secret

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
- **Channel-level product compliance** — the 3 remaining prescription products stay
  purchasable via direct link for existing customers, but are excluded from every
  external channel (sitemap, image sitemap, Shopping feed, homepage, category
  listings, JSON-LD) and protected with layered noindex
  (`X-Robots-Tag` + `<meta robots>` + no Product schema + nofollow + noimageindex).
- **Reviews are moderated by design** — submissions land in a "قيد المراجعة"
  (pending) state; only owner-approved rows are ever served. The read endpoint is
  signed with short-lived HMAC-SHA256 single-use nonces; the write path is
  optionally gated by a shared webhook secret.
- **Compliance guardrails in CI** — a deterministic medical-claims guard fails the
  build if absolute claims ("نتائج مضمونة", "آمن كلياً", any "100%" efficacy claim,
  medical-team claims…) appear in **any** article, product, or landing page.
- **Smart sort** — category pages rank by stock → featured → popularity score →
  price (ascending as tie-breaker for impulse buys).

---

## Tech Stack

| Layer     | Technology                                                                                       |
| --------- | ------------------------------------------------------------------------------------------------ |
| Framework | React 19 + TypeScript 6                                                                          |
| Build     | Vite 8 (code-split: vendor-react / router / icons / search / toast + per-catalog data chunks)    |
| Routing   | TanStack Router (file-based, 21 routes)                                                          |
| Styling   | Tailwind CSS 4 (Oklch colors, full RTL)                                                          |
| Search    | Fuse.js (fuzzy, lazy-loaded) + Egyptian dialect synonyms (نقط ⇄ قطرات)                          |
| Tests     | Vitest (170 unit) + Playwright (18 E2E) + data-integrity + JSON-LD schema validator              |
| Hosting   | Vercel Edge CDN (primary) · self-hosted Express + Docker (supported)                             |
| Orders    | Google Apps Script → Google Sheets (ScriptLock, full duplicate scan, intl phones)                 |
| SEO       | 248 pre-rendered pages · JSON-LD (Product/FAQ/Article/Breadcrumb/SearchAction) · 3 sitemaps + feed |
| Images    | WebP only (sharp pipeline, 700–800 px, q45–55) + descriptive alt/title                           |
| Security  | CSP · HSTS · COOP/COEP · Report-To · NEL · CORS strict · hashed-IP rate limits · HMAC review reads · PII-safe error tracking |

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
│   │   └── components/         # ProductReviews (approved live reviews), ProductImage, …
│   ├── data/
│   │   ├── products.ts         # 82 products (52 men · 23 women · 7 devices) + search helpers
│   │   ├── products/           # men.ts · women.ts · devices.ts (catalog source of truth)
│   │   ├── articles.ts         # 56 articles with trusted sources
│   │   ├── landing-pages.ts    # 93 SEO guide pages (build-time source; served as per-slug JSON at runtime)
│   │   ├── product-types.ts    # TypeScript interfaces
│   │   └── product-faqs.ts     # Shared product FAQ schema
│   ├── lib/
│   │   ├── seo.ts              # Meta tags, JSON-LD builders, canonical, meta descriptions
│   │   ├── product-compliance.ts # Channel-level exclusions (feed/sitemap noindex policy)
│   │   ├── bundle-discount.ts  # 20% bundle discount (exclusive with promo tiers)
│   │   ├── promo.ts            # Diamond Care tiered discount (15/20/25%)
│   │   ├── governorates.ts     # 27 governorates + shipping + submitToGoogleSheets
│   │   ├── search-terms.ts     # Dialect synonym expansion (نقط ⇄ قطرات)
│   │   ├── product-reviews.ts  # Deterministic display reviews per product
│   │   ├── error-tracking.ts   # PII-safe error sink (allowlist context, hashed correlation)
│   │   ├── internal-links.ts   # Cross-linking engine (products ↔ articles ↔ guides)
│   │   ├── cache.ts            # Centralized asset cache version (config/cache-version.json)
│   │   └── whatsapp.ts         # Order message builder (full PII for chat, minimal for URL)
│   ├── routes/                 # 21 file-based routes (incl. /search, /order-confirmed)
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
│   └── lib/rate-limiter.js     # In-process hashed-IP rate limiter with cleanup
├── scripts/
│   ├── prerender-seo.mjs       # 248 static HTML pages + Product/ItemList/FAQ/Breadcrumb JSON-LD
│   ├── generate-sitemap.mjs    # sitemap.xml (238) + sitemap-images.xml + catalog feed +
│   │                           # robots.txt + security.txt + search template
│   ├── check-source-links.mjs  # Corpus-wide source liveness (3-attempt backoff, flaky-authority class)
│   ├── validate-schemas.mjs    # JSON-LD validator (every schema in every pre-rendered page)
│   ├── validate-article-sources.mjs # New-article claim→source support check
│   ├── data-integrity.test.mjs # Catalog/compliance/claims/redirect-graph guard (build gate)
│   ├── auto-generate-article.mjs   # Gemini article pipeline (manual trigger)
│   ├── optimize-images.mjs     # sharp WebP pipeline
│   ├── process-hero.mjs        # Hero image processing
│   ├── release.mjs             # Version + cache-version bump workflow
│   ├── sync-vercel-redirects.mjs # vercel.json ⇄ catalog redirect sync
│   └── health-check.mjs        # Bundle + image size audit
├── e2e/
│   └── checkout.spec.ts        # 18 Playwright E2E tests (checkout, search, reviews, 404s)
├── server/
│   └── index.js                # Self-hosted Express server (same dist/ + same API handlers)
├── .github/workflows/ci.yml    # 5 CI jobs (see Testing & CI)
├── public/
│   ├── images/                 # 138 WebP + thumbs/ + thumbs-180/
│   ├── landing-pages/          # 93 per-slug JSON (runtime data source for guide pages)
│   ├── sitemap.xml             # 238 URLs + Google search template
│   ├── sitemap-images.xml      # 135 image URLs
│   ├── sitemap-index.xml       # Sitemap index
│   ├── catalog-feed.xml        # Google Shopping feed (79 items) + .csv/.txt mirrors
│   ├── sw.js                   # PWA migration kill-switch (self-unregistering, network-only)
│   ├── scripts/ga-loader.js    # Delayed GA4 loader (2s + interaction, send_page_view:false)
│   └── .well-known/security.txt # RFC 9116 security policy
├── google-apps-script.gs       # Webhook: orders + reviews + HMAC verification +
│                               # write-secret gate + daily auto-cleanup trigger helper
├── vercel.json                 # 14 security header sets + 162 redirects + rewrites
├── Dockerfile / docker-compose.yml
├── SECURITY.md · CHANGELOG.md · ANALYSIS.md
└── index.html                  # SPA shell with SEO meta + delayed GA loader
```

---

## Features

### 🔍 Site-wide search (`/search?q=`)

- Fuzzy instant suggestions in the header dialog (Fuse.js, lazy-loaded, Ctrl/Cmd+K)
  with an **"عرض كل النتائج"** (show all results) link.
- Dedicated results page `/search?q=…` across **all categories** — indexed via the
  `SearchAction` JSON-LD and the sitemap search template, so Google search results
  land on real result pages.
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

- **Diamond Care Initiative** — tiered discount 15% / 20% / 25% at 1,000 / 1,500 /
  2,000 EGP thresholds.
- **Bundle discount 20%** — a completed cross-sell bundle gets a flat 20% off the
  bundle total; the two discounts are **mutually exclusive** (bundle wins).
- Both are recomputed and enforced server-side from `bundles-db.json` — client-side
  values are never trusted.

### 🛡️ Product & content compliance

- **Channel-level policy** — the 3 remaining prescription products are hidden from
  every external channel (feed, sitemaps, JSON-LD, category listings) with layered
  noindex, yet remain purchasable by direct link for existing customers.
- **Medical-claims CI guard** — a curated list of absolute claims (guaranteed
  results, "100%" efficacy, no-side-effects, complete-safety, medical-team claims)
  is scanned across **all articles, all products, and all landing pages** on every
  build; any regression fails CI.
- **Source liveness CI** — all 54 unique article source URLs are re-checked on every
  push (3-attempt backoff; flaky primary authorities classified, true 404s fail).

---

## Getting Started

```bash
git clone https://github.com/AhmedEideng/Elysr.git
cd Elysr
nvm use                 # Node 24.x (pinned in .nvmrc / engines)
npm install
npm run dev             # → http://localhost:8080
```

### Environment Variables

The only required variables are `GOOGLE_SHEETS_WEBHOOK_URL` and `SITE_URL`.
No Redis or external rate-limit service is required: the API applies in-process
hashed-IP limits, and Google Apps Script applies a second per-phone limit before
writing an order.

| Variable                         | Required | Purpose                                                            |
| -------------------------------- | -------- | ------------------------------------------------------------------ |
| `GOOGLE_SHEETS_WEBHOOK_URL`      | ✅       | Apps Script Web App `/exec` URL (orders + reviews)                  |
| `SITE_URL`                       | ✅       | Canonical origin (canonicals, feeds, OG tags)                       |
| `GOOGLE_SHEETS_REVIEWS_TOKEN`    | ⚠️ revs  | HMAC key for the reviews read endpoint (must match `REVIEW_READ_TOKEN` in the script; unset = reviews section silently off) |
| `GOOGLE_SHEETS_WEBHOOK_SECRET`   | optional | Optional shared write-secret (must match `WEBHOOK_SECRET` in the script) |
| `VITE_ERROR_SINK_URL`            | optional | Sentry-compatible error sink (console-only in dev)                  |

### Commands

| Command                    | Description                                                        |
| -------------------------- | ------------------------------------------------------------------ |
| `npm run dev`              | Development server (port 8080)                                     |
| `npm run build`            | Production build + sitemaps/feeds + 248-page prerender             |
| `npm run preview`          | Preview the production build locally                                |
| `npm run build:ssr`        | Build + prerender for the self-hosted Express server                |
| `npm start` / `start:dev`  | Run the self-hosted server (production / watch)                     |
| `npm run test`             | Data-integrity guard (catalog, compliance, claims, redirect graph)  |
| `npm run test:unit`        | Vitest unit + API security tests (170)                              |
| `npm run test:e2e`         | Playwright E2E suite (18)                                           |
| `npm run test:schemas`     | JSON-LD validator over every pre-rendered page                      |
| `npm run test:sources`     | New-article claim→source support check                              |
| `npm run test:all`         | integrity + unit + build + schemas                                  |
| `npm run ci`               | lint + typecheck + test:all                                         |
| `npm run audit:deps`       | `npm audit --audit-level=high`                                      |
| `npm run release`          | Version + cache-version bump workflow                               |

---

## Adding Content

### New Product

```ts
// src/data/products/men.ts (or women.ts / devices.ts) — append to the array
{
  id: "m-68",                              // next sequential ID
  slug: "your-product-slug",               // URL-friendly English name
  name: "اسم المنتج",                       // Arabic display name
  nameEn: "Product Name",                   // English name (catalog feed)
  category: "men",                          // men | women | devices
  price: 300,                               // EGP
  description: "وصف تفصيلي للمنتج…",        // ≥ 80 chars — no absolute claims (CI-enforced)
  benefits: ["فائدة 1", "فائدة 2"],         // 5–7 benefits
  ingredients: "المكونات مع أدوارها…",
  usage: "طريقة الاستخدام + تحذيرات…",
  image: "/images/your-product-slug.webp",  // slug-based (must match slug)
  stock: 100,
  rating: 0,                                // 0 until genuine order-backed reviews exist
  reviews: 0,
  // searchAliases?: ["كلمة محلية شائعة"],   // optional: dialect/search synonyms
}
```

Then add the image (800×800 WebP) to `public/images/your-product-slug.webp` and its
thumbnails to `public/images/thumbs/` and `thumbs-180/`. Run `npm run build` —
sitemap, prerender, feed, and the API's `products-db.json` all update automatically.

> ⚠️ **Claims guard**: descriptions, benefits, ingredients, and usage are scanned by
> CI for absolute claims. Support-level phrasing ("يدعم", "يساعد على") — never
> guarantees ("يضمن", "نتائج مضمونة", "100%").

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

Every article needs **≥ 2 trusted https sources**; `npm run test:sources` validates
claim→source support, and the corpus-wide liveness CI re-checks every source URL on
every push.

---

## Testing & CI

Five jobs on every push (plus a weekly Saturday source-liveness cron):

| Job                          | Gate                                                                    |
| ---------------------------- | ----------------------------------------------------------------------- |
| 🔗 Corpus Source Liveness    | All 54 article source URLs alive (3-attempt backoff, flaky-authority class) |
| 🔍 Lint • Typecheck • Unit • Data Integrity | ESLint · `tsc --noEmit` · 170 unit/API tests · catalog+compliance+claims+redirect-graph guard |
| 🛡 Security Audit            | `npm audit --audit-level=high` on the locked tree                        |
| 🏗 Build • Prerender • Sitemaps | Vite build + 248-page prerender + sitemaps/feeds artifacts             |
| 🚦 Lighthouse Performance Budget | LHCI performance budgets on the built site                          |

Local equivalents: `npm run ci` (lint + typecheck + test:all) and `npm run test:e2e`.

---

## Deployment

### Vercel (primary)

Automatic CI/CD on every push to `main`. The build pipeline:

1. `vite build` → optimized, code-split `dist/`
2. `generate-sitemap.mjs` → sitemaps (238 URLs + search template), 79-item catalog
   feed, robots.txt, security.txt, per-slug landing JSON
3. `prerender-seo.mjs` → 248 pre-rendered pages with full SEO meta + JSON-LD
4. Vercel serves `dist/` from the Edge CDN with 14 security header sets
   (HSTS, CSP, COOP, Report-To, NEL, …) + 162 legacy redirects

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

## License

All rights reserved © 2026 Elysr Medical Group.
This is a private, proprietary project.

---

<div align="center">

**Built with ❤️ in Cairo, Egypt**

[Website](https://elysrmedical.store) · [WhatsApp](https://wa.me/201098088206) · [Email](mailto:info@elysrmedical.store)

</div>
