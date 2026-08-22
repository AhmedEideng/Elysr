# Changelog

All notable changes to **Elysr Medical** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] — 2026-Q3

### 🔄 Catalog / Product changes

- **Kreva Gel (`m-60`)** price updated to **300 EGP**.
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
- Current catalog: **87 products** (56 men · 24 women · 7 devices).
- Articles count is **56** (51 via the `a()` helper + 5 authored as literal objects).

### 🔒 Security hardening

- **Prescription-product copy**: the eight sildenafil/tadalafil/vardenafil/dapoxetine
  products now use neutral medicine-specific descriptions, no guaranteed safety/results,
  and stronger prescription, nitrate-interaction, and urgent-warning language.
- **Strict order validation**: API rejects null/array payloads, fractional quantities,
  quantities above current stock, and governorates outside the shared whitelist.
- **API test coverage**: added checkout calculation/validation and CSP endpoint tests,
  bringing the unit suite to 112 tests, plus two Playwright browser tests.
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

### 🎯 SEO / Indexation

- **Historical customer ratings restored**: product cards, product pages, wishlist,
  prerendered HTML, and Product JSON-LD show the catalog's historical customer rating
  and review count. Schema validation enforces a 1–5 rating and positive review count.
- **Real HTTP 404s**: the production server serves `404.html` with status 404 instead
  of returning the SPA shell with status 200 for unknown paths.
- **Shipping/returns structured data** now uses the checkout governorate bands
  (50–120 EGP) and the documented customer-paid return shipping policy.
- **SPA metadata sync** now carries route-specific Open Graph type and image on
  product/article client navigation.
- **Redirect cleanup**: 148 unique redirects; duplicate sources are now rejected by
  data-integrity tests and prevented by the sync generator.
- **Title tags** truncated to ~62 chars (was 81 pages > 65) — full display in Google.
- **Meta descriptions** truncated to ~155 chars (was 87 pages > 160).
- **Fixed duplicate `<h1>`** on every page (the template `<noscript>` `<h1>` → `<p>`);
  every page now has exactly one unique H1.
- **`robots.txt`** now also disallows `/wishlist`.

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
