# Changelog

All notable changes to **Elysr Medical** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] — 2026-Q3

### 🔄 Catalog / Product changes

- **Kreva Gel (`m-60`)**: price **300 EGP**, historical rating **5/5** from
  **73 ratings**, with exactly five visible 5-star customer comments.
- **Homepage selection**: Lady Era Drops (`w-02`) replaced Boost Up MAN (`m-02`) in
  the top six, and Hard-On (`m-34`), both Powerfully Up variants (`m-03`/`m-49`),
  Viagra Men (`m-45`), and Viagra Women (`w-17`) are excluded from every homepage
  product section and replaced automatically by the next eligible catalog items.
- **Product price updates** (`src/data/products/women.ts`):
  - Golden Gum (`w-13`): 200 → **250 EGP**
  - Lovezone Drops (`w-18`): 180 → **200 EGP**
  - Paxtone Max Filler (`w-20`): 350 → **450 EGP**
- **Removed deleted product references**: cleaned up dead references to `m-51`
  (Overtime) and `m-10` across pinned-order lists, category tabs, concern cards,
  internal-links, and compliance lists. Kept the **301 redirects** to protect SEO.
- **2026-09-06/07 catalog decisions (owner)**: all blocks lifted on
  m-38/m-43/m-45, then `m-43 Procomil Fort`, `m-38 Power 36`, `m-45
  Viagra Pfizer` (Viagra for men) and `w-24 Black Widow Drops` deleted
  permanently (301 → category, dangling references cleaned, tests updated).
  Current catalog: **78 products** (49 men · 22 women · 7 devices) —
  **zero prescription products**; 9 items permanently deleted in total
  (8 pharma + w-24).
- **GSC 404 cleanup (2026-09-07)**: 7 legacy URLs from the GSC "removed:
  404" report (5 merged doorway guides + 2 removed products) now 301 to
  their live destinations; 13 further URLs already had redirects
  (self-heal on recrawl).
- **Honest content pass (2026-09-06/07)**: unified article authorship
  voice (no fake human-review claims — AI-generated content is labeled as
  such), doctor name corrected to د. أحمد عابد, all marketing counts
  (products/articles/guides) made dynamic from the data sources with
  data-integrity drift guards, sitemap search template removed (GSC
  reports it as an invalid tag — site-wide search is covered by the
  SearchAction JSON-LD).
- Articles count is **56** (51 via the `a()` helper + 5 authored as literal objects).
- **Stock baseline (owner direction)**: all **78 products** set to `stock: 5000` —
  the owner confirmed real inventory is in the thousands, so the old 50–200
  values under-stated availability. Effect: the artificial low-stock urgency
  badge ("باقي X فقط", shown at ≤ 5) no longer renders, the Google Shopping feed
  reports `in stock` for every eligible product, and order quantity validation
  now uses the true baseline. When exact per-SKU counts become known, replace
  the baseline with the real number per product (single edit each).

### 🔒 Security hardening

- **Phone pipeline parity**: frontend, WhatsApp message generation, Node API, and
  Google Apps Script now preserve the full 16-character E.164 value. Apps Script
  logical failures are converted from HTTP 200 into an explicit HTTP 502 at the API boundary.
- **Main CI unit coverage**: every push and PR now runs the Vitest API, CSP, compliance,
  promo, shipping, and utility suites before the build job can start.
- **Generated DB drift guards**: data-integrity tests compare tracked product/config JSON
  with their TypeScript sources and fail with a build instruction when either is stale.
- **Single cache-version source**: frontend helpers, prerender, sitemap/feed generation,
  and the release script now read only `config/cache-version.json`; CI rejects reintroduced literals.
- **Promotion transparency/config cleanup**: removed unused generated/fallback
  `PROMO_END_ISO` values; the only countdown source is `getPromoEndIso()`, and the UI
  now labels it truthfully as the next recurring cycle refresh rather than offer expiry.
- **Prescription-product commercial copy**: rewrote descriptions, benefits, ingredients,
  and usage for all eight protected medicine products to state the main customer purpose
  clearly (erection support, timing control, extended flexibility, or female response)
  while retaining concise nitrate/medicine suitability guidance.
- **Strict order validation**: API rejects null/array payloads, fractional quantities,
  quantities above current stock, and governorates outside the shared whitelist.
- **API test coverage**: added checkout calculation/validation and CSP endpoint tests,
  bringing the unit suite to 119 tests, plus three Playwright browser tests.
- **CSP report parsing**: self-hosted Express now accepts both
  `application/csp-report` and `application/reports+json` with the 4 KB endpoint limit.
- **No local order persistence**: customer names, phones, addresses, notes, and order
  payloads are no longer written to localStorage. The app deletes the legacy
  `elysr_fallback` key on startup; failed direct checkouts keep the cart for an explicit retry.
- **Prototype Pollution / payload whitelist**: `api/submit-order.js` now forwards
  only an explicit allow-list of order fields to Google Sheets (no arbitrary keys).
- **`doGet()` in Google Apps Script no longer leaks order-count stats** publicly.
- **Google Apps Script returns generic error messages** instead of `err.toString()`.
- **Google Sheets timeout**: the server aborts a hanging Apps Script request after
  10 seconds and returns a controlled HTTP 504 response.
- **Durable order idempotency**: Google Apps Script now searches the complete order-ID
  column under a ScriptLock instead of checking only the last 50 rows.
- **Strict checkout fields**: server-side allow-lists and limits now cover address,
  notes, payment method, order type, and the promo flag.
- **Dependency-free rate limiting**: removed the Redis requirement and `ioredis`
  dependency. Checkout now uses an in-process IP limit plus the existing Google Apps
  Script per-phone limit, so no external account or environment variable is needed.
- **`submit-order` response restricted** to `{ success, orderId }`.
- **`/health` endpoint trimmed** to `{ status: "ok" }` (no deploy internals).
- **CSP report endpoint hardened**: 4 KB body limit + field sanitisation against
  Log Injection.
- **Server log hygiene**: Google Sheets error text truncated to 200 chars.
- **`npm audit`** → 0 vulnerabilities (removed `brace-expansion`, `nanoid`,
  `undici` issues via `npm audit fix`).
- **Removed unused `web-vitals` dependency**.

### ⚡ Performance

- **PWA mode clarified**: manifest/install UI remain active, while runtime is explicitly
  network-only; legacy Service Workers are purged and no offline cache is advertised.
- **Split data chunks**: `articles.ts` moved to its own lazy chunk and
  `landing-pages.ts` removed from bundles entirely (guides now fetch individual
  JSON). Home critical-path data chunk: **879 kB → 254 kB** (gzip 174 → ~50 kB).
- **Homepage articles load lazily** with a skeleton + error fallback.
- **Recently Viewed now validates against current catalog** (no 404 links / stale
  prices for deleted products).
- **Homepage stops loading the full articles chunk (2026-09-10)**: the home
  ArticlesGrid now reads a build-generated `articles-cards.generated.ts`
  (4 conversion cards + `ARTICLE_COUNT`, no `content`/`sources`) instead of
  importing all 56 articles' full text. Home critical-path data drops ~78 kB;
  cards still render on first paint (static import — no CLS). Drift guard in
  the data-integrity tests fails if the generated file goes stale, and the
  hardcoded "51 مقالة" count became dynamic (`ARTICLE_COUNT`).
- **GA loads after the LCP window (2026-09-10)**: the `scroll` trigger in
  `ga-loader.js` was removed — TanStack Router's scroll restoration
  (`scrollTo(0)`) fired it on every load with no user action, pulling the
  167 kB `gtag.js` into the LCP bandwidth window (measured: t≈450–520 ms).
  GA now loads on a real gesture (`pointerdown`/`touchstart`/`keydown`/
  `click`) or after a 3 s fallback. Pageviews pushed before load stay queued
  in `dataLayer` and are sent on load — no analytics loss.
- **Preconnect restored** for `googletagmanager.com` + `google-analytics.com`
  (GA loads within the 10 s preconnect TTL; Lighthouse audit: ~300 ms).
  Local Lighthouse (mobile, throttled): perf **64 → 74**, FCP 3.3 → 2.7 s,
  TBT 310 → 240 ms, CLS 0.
- **Article content split out of the client bundles (2026-09-11)**: the
  build now also generates `articles-meta.generated.ts` (all 56 articles
  minus `content`/`sources`) and `article-content.generated.ts`
  (content + sources only). Every client page (home preload, /education,
  internal links, product pages, guides) now imports meta — the wire size
  for article data dropped from ~78 KiB to ~10 KiB (brotli); full article
  text loads only on the article detail page. `landing-pages.ts` stopped
  importing the whole catalog just for a count (`ARTICLE_COUNT`), which
  removed the last hidden 78 KiB pull. Drift guards verify both generated
  files field-by-field against `articles.ts`.
- **GA fallback 3 s → 5 s**: the latest PSI run still caught gtag.js
  (168 KiB) inside the LCP window; 5 s clears both the lab (3.3 s) and
  field (2.8 s) LCP windows. Pre-load `dataLayer` events are still sent
  on GA boot — no pageviews lost.

### 🎯 SEO / Indexation

- **Layered noindex protection for prescription products**: the eight blocked medicine
  pages remain publicly visible but now use matching `robots` + `googlebot` directives,
  Vercel/self-hosted `X-Robots-Tag` headers, `noimageindex` on product images, nofollow
  category links, and no Product/ItemList JSON-LD. They are excluded from regular and
  image sitemaps plus the Merchant feed, with CI guards preventing regressions.
- **Historical customer ratings restored**: product cards, product pages, wishlist,
  prerendered HTML, and Product JSON-LD show the catalog's historical customer rating
  and review count. Schema validation enforces a 1–5 rating and positive review count.
- **Real HTTP 404s**: the production server serves `404.html` with status 404 instead
  of returning the SPA shell with status 200 for unknown paths.
- **Shipping/returns structured data** now uses the checkout governorate bands
  (50–120 EGP) and `ReturnFeesCustomerResponsibility` for the documented customer-paid
  carrier return cost, removing Google's `returnShippingFeesAmount` warning.
- **SPA metadata sync** now carries route-specific Open Graph type and image on
  product/article client navigation.
- **Redirect cleanup**: 148 unique redirects; duplicate sources are now rejected by
  data-integrity tests and prevented by the sync generator.
- **Title tags** truncated to ~62 chars (was 81 pages > 65) — full display in Google.
- **Meta descriptions** truncated to ~155 chars (was 87 pages > 160).
- **Fixed duplicate `<h1>`** on every page (the template `<noscript>` `<h1>` → `<p>`);
  every page now has exactly one unique H1.
- **`robots.txt`** now also disallows `/wishlist`.

### 🔍 2026-08 deep audit (8 rounds) — findings and fixes

**Compliance / Catalog**

- **Unified blocked-pharma homepage policy**: `m-38`/`m-43` added to
  `HOMEPAGE_EXCLUDED_PRODUCT_IDS` — no prescription product appears in any
  homepage section (still visible and purchasable on category/direct pages
  with the existing layered noindex).
- **Real 10% bundle discount**: cross-sell bundles now apply an actual
  discount, recalculated and enforced server-side from the build-generated
  `bundles-db.json` (zero client trust; fail-closed if the map is missing).
  Google Sheets gains a "خصم الباقة" column. The bundle UI no longer
  advertises a discount that was never applied.

**SEO / Indexation**

- **12 dead medical source links replaced** with verified-live equivalents
  (Cleveland Clinic renumbered IDs, NHS restructure, MedlinePlus/Mayo/NIH
  renames). Re-audit: 54 unique sources, 0 dead.
- **Corpus-wide source liveness CI job** (`scripts/check-source-links.mjs`):
  checks every source of every article on each push/PR and weekly — the
  auto-publish pipeline previously validated only the freshly generated
  article, so dead links could accumulate silently.
- **Real `?q` URL search on `/products/men`** (the SearchAction target) with
  results banner, empty state, and filtered ItemList schema. Also fixed a
  TanStack Router v1.170 behaviour where loaders do not re-run on search-only
  navigations (`shouldReload: () => true`; verified against the router source).
- **Self-hosted `/education` inverted 301 fixed** (Vercel parity: 200 direct +
  trailing-slash normalisation) — it contradicted the canonical/indexed URL
  structure. E2E-locked.
- **Hero 480w variant generated** (designed by `process-hero.mjs` but never
  produced) and wired into the Hero srcSet + home-only preload.
- Full indexing audit (real crawl): 239/239 sitemap URLs 200, 82/82 product
  pages 200, 0 noindex leaks, 0 canonical mismatches, 1154 JSON-LD schemas
  valid.

**Reliability**

- **No silent order loss**: failed direct checkout now keeps the cart
  (previously cleared with a success toast) and offers a WhatsApp fallback
  with the full prebuilt order message. E2E covers 502 → retry → success.
- **CSV feed UTF-8 BOM** so Arabic survives Excel on Windows (Google Merchant
  handles the BOM natively).

**Performance / Accessibility**

- Lighthouse with the exact CI desktop throttling: **99/100/100/100** on
  home/men/PDP, LCP ~1s, CLS 0 (budgets: LCP ≤ 3.5s error, CLS ≤ 0.25 error).
- Fixed PDP heading order (h1→h3 skip) and redundant alt on concern tiles;
  `aria-label`s on PDP quantity controls.
- Self-hosted Vercel Analytics endpoints served as valid no-op stubs
  (404/MIME console errors gone in Docker deployments).
- Homepage "87 منتج أصلي" stat was stale → now dynamic from the catalog.

**Docs / Hygiene**

- CHANGELOG catalog-count line corrected (87→82 after the five pharma
  deletions); README HTML counts updated (`offline.html` removed with the
  network-only PWA policy).
- Suite totals: **124 unit tests, 8 Playwright e2e, 246 prerendered pages**.

### ✨ Added

- **Validated automatic article publishing**: the weekly article workflow runs the
  full CI pipeline and publishes to `main` only when lint, TypeScript, tests, build,
  and JSON-LD validation pass. It also requires at least three distinct live sources
  from trusted medical domains, verifies title/page consistency, and performs a
  claim-to-source evidence check before publishing.
- **`useWishlist()` hook** (`src/hooks/use-wishlist.ts`) — localStorage-persisted
  favourites with cross-tab sync via custom event + storage events. Up to 100 items.
- **`useRecentlyViewed()` hook** (`src/hooks/use-recently-viewed.ts`) — tracks
  the last 12 PDPs viewed by the visitor for personalisation.
- **Accessibility utilities** (`src/components/Accessibility.tsx`):
  - `<SkipToContent />` — keyboard-only skip link (WCAG 2.4.1)
  - `<LiveRegion />` + `<AssertiveLiveRegion />` — screen-reader announcements
  - `useFocusTrap()` — focus trap for modals/dialogs
- **Playwright E2E** — validates add-to-cart, quantity changes, governorate shipping,
  direct checkout submission, confirmation navigation, and real HTTP 404 responses.
- **`scripts/validate-article-sources.mjs`** — blocks generated articles with dead,
  duplicated, untrusted, mismatched, or claim-insufficient sources.
- **`scripts/validate-schemas.mjs`** — JSON-LD schema.org validator that runs
  against `dist/`. Catches missing fields, wrong types, broken URLs, etc.
- **`scripts/health-check.mjs`** — post-build report: HTML distribution, image
  stats, sitemap URL counts, missing thumbnails, largest files.
- **Lighthouse CI** (`.lighthouserc.json` + enhanced `.github/workflows/ci.yml`)
  enforcing the configured hard budgets: LCP ≤ 3.5s and CLS ≤ 0.25, with warnings
  for performance/accessibility/SEO and TBT ≤ 300ms.
- **Pre-commit hooks** (`.husky/pre-commit` + `.lintstagedrc.json`) — runs
  ESLint + Prettier on staged files and typecheck on any `.ts` change.
- **`SECURITY.md`** — public vulnerability disclosure policy with SLA.
- **`.nvmrc`** — pins Node 24.
- **`CHANGELOG.md`** — this file.

### 🛠 Scripts

| Command                | Description                                  |
| ---------------------- | -------------------------------------------- |
| `npm run test:schemas` | Run JSON-LD schema validator                 |
| `npm run test:all`     | Data integrity + schema validation           |
| `npm run ci`           | Full CI pipeline (lint+typecheck+test+build) |
| `npm run audit:deps`   | `npm audit --audit-level=high`               |
| `npm run audit:perf`   | Lighthouse CI autorun                        |

### ⚡ Performance

- CI now runs Lighthouse on 5 key URLs (home + 4 category pages) in parallel.
- Build artifact uploaded to GitHub Actions (7-day retention) for debugging.

### 🔒 Security

- Documented vulnerability reporting process in `SECURITY.md`.
- In CI, `npm ci --no-audit --prefer-offline` prevents accidental install
  of compromised packages from cache.

---

## [1.0.0] — 2026-Q2

### Initial Production Release

- **89 products** (59 men · 23 women · 7 devices) across 3 categories
- **51 medical articles** with NIH/Mayo/NHS citations
- **125 SEO landing pages** (4-phase rollout plan)
- **264 prerendered HTML pages** with full SEO meta + JSON-LD
- **128 permanent 301 redirects** for URL migrations
- **Cart** with localStorage persistence + promo tiers
- **WhatsApp + Google Sheets** order pipeline
- **Meta Pixel + CAPI** with SHA-256 PII hashing and external_id stitching
- **3-tier Product Compliance system** (GREEN/AMBER/RED)
- **Tiered promo system** linked to World Cup 2026
- **Mobile-first RTL** with self-hosted Cairo font
- **Vercel Edge CDN** deployment
