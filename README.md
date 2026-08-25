<div align="center">

# Elysr Medical Group

**منتجات الصحة الزوجية الأصلية — شحن سري لكل محافظات مصر**

[![Live](https://img.shields.io/badge/Live-elysrmedical.store-0085ca?style=for-the-badge)](https://elysrmedical.store)
[![WhatsApp](https://img.shields.io/badge/WhatsApp-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)](https://wa.me/201098088206)

---

![React](https://img.shields.io/badge/React_19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript_6-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite_8-646CFF?logo=vite&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_4-38B2AC?logo=tailwindcss&logoColor=white)
![TanStack](https://img.shields.io/badge/TanStack_Router-FF4154?logo=reactrouter&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000?logo=vercel&logoColor=white)

</div>

---

## Overview

Elysr Medical is a production Arabic (RTL) e-commerce store serving Egypt. It runs entirely on the client with static pre-rendered pages — no traditional database, no server runtime. Orders flow through WhatsApp or a direct checkout form that writes to Google Sheets via a serverless API.

| Metric             | Value                                                                                                       |
| ------------------ | ----------------------------------------------------------------------------------------------------------- |
| Products           | **82** (52 men · 23 women · 7 devices) - 5 pharma deleted per Merchant report (including w-17)              |
| Articles           | **56** educational health articles                                                                          |
| SEO Guides         | **92** long-form landing pages (79 unique products, diversified)                                            |
| Pre-rendered Pages | **246** application pages (248 HTML incl. 404/offline)                                                      |
| Sitemap URLs       | **239** (12 static + 79 products + 56 articles + 92 guides) - 79 eligible = 82 total - 3 blocked            |
| Catalog Feed       | **79** eligible items (3 prescription products excluded - m-38,m-43,m-45) - w-17 deleted                    |
| Redirects          | **152** unique (301 permanent) - includes 5 deleted pharma (m-34,m-36,m-37,m-47,w-17) → /products/men/women |
| Image Format       | WebP only — optimized 8–55 KB each, avg 26KB                                                                |

---

## Architecture

```
Browser ──→ Vercel CDN (static dist/)
                │
                ├── index.html (SPA shell)
                ├── /products/[slug].html (pre-rendered)
                ├── /education/[slug].html (pre-rendered)
                ├── /products/guides/[slug].html (pre-rendered)
                │
                └── /api/submit-order ──→ Google Apps Script ──→ Google Sheets
```

**Key design decisions:**

- **Zero database** — all product/article data lives in TypeScript files, pre-rendered at build time
- **Google Sheets as backend** — orders are pushed via a serverless proxy with CSRF protection and rate limiting
- **Channel-level product compliance** — 82 products in DB (5 pharma deleted per Merchant report: m-34,m-36,m-37,m-47,w-17); 3 remaining prescription products (m-38,m-43,m-45) stay visible via direct link only with full noindex protection, excluded from sitemap/feed/JSON-LD/homepage/category listings
- **Smart sort algorithm** — category pages rank by: stock → featured → popularity score → price (ascending as tie-breaker for impulse buys)

---

## Tech Stack

| Layer     | Technology                                                                                                                                       |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Framework | React 19 + TypeScript 6                                                                                                                          |
| Build     | Vite 8                                                                                                                                           |
| Routing   | TanStack Router (file-based)                                                                                                                     |
| Styling   | Tailwind CSS 4 (Oklch colors, full RTL)                                                                                                          |
| Icons     | Lucide React                                                                                                                                     |
| Hosting   | Vercel (Edge CDN)                                                                                                                                |
| Orders    | Google Apps Script → Google Sheets                                                                                                               |
| SEO       | Pre-render (246 application pages) + JSON-LD + Sitemaps + Hreflang + rich meta with price/rating                                                 |
| Images    | WebP (sharp processing, 700–800px, q45–55, avg 26KB) + proper alt/title                                                                          |
| Security  | CSP + HSTS + COOP + Report-To + NEL + CORS strict + Rate limiting (hashed IP) + PII protection (orderId only in storage, IP hash) + security.txt |

---

## Project Structure

```
├── src/
│   ├── components/
│   │   ├── sections/           # Hero, FeaturedProducts, ShopByConcern,
│   │   │                       # DailyAdvice, ArticlesGrid, WhyUs, etc.
│   │   ├── layout/             # Header, Footer, Layout
│   │   ├── ProductCard.tsx     # Product display with compliance badges
│   │   └── SearchBar.tsx       # Client-side product search
│   ├── data/
│   │   ├── products.ts         # 82 products (52 men, 23 women, 7 devices) - diversified landing pages - 5 deleted per Merchant
│   │   ├── articles.ts         # 56 educational articles with trusted sources
│   │   ├── landing-pages.ts    # 92 SEO guide pages - 79 unique products (3-13x each, no blocked)
│   │   ├── product-types.ts    # TypeScript interfaces
│   │   └── product-faqs.ts     # Shared FAQ schema
│   ├── lib/
│   │   ├── seo.ts              # Meta tags, JSON-LD, canonical + makeProductMetaDescription (price/rating)
│   │   ├── product-compliance.ts  # Merchant/sitemap - 3 blocked (m-38,m-43,m-45) noindex - w-17 deleted
│   │   ├── promo.ts            # Tiered discount system
│   │   ├── governorates.ts     # 27 Egyptian governorates + shipping + submitToGoogleSheets
│   │   ├── cache.ts            # Centralized cache version (v28) + assetUrl/thumbUrl
│   │   └── whatsapp.ts         # Order message builder (full PII for WhatsApp + minimal for URL)
│   ├── routes/                 # 20 route files (including order-view for encrypted links - now removed)
│   ├── contexts/cart.tsx       # Cart state (localStorage IDs only, sessionStorage orderId only)
│   └── styles.css              # Global styles + Tailwind directives
├── scripts/
│   ├── prerender-seo.mjs       # Generates 247 static HTML with Product/ItemList/FAQ + related images alt
│   ├── generate-sitemap.mjs    # Builds sitemap.xml (239) + sitemap-images.xml + catalog-feed + robots + security.txt
│   ├── sync-vercel-redirects.mjs
│   ├── data-integrity.test.mjs # Data validation (82 products, no banned claims, no blocked in sitemap)
│   └── health-check.mjs        # Bundle and image size audit
├── api/
│   ├── submit-order.js         # Hardened: CORS strict, rate limit 30/min hashed IP, price/stock validation, IP hash
│   ├── csp-report.js           # Hardened: hashed IP, origin whitelist, 4KB limit
│   ├── delete-customer-data.js # GDPR: right to be forgotten, 5/min/IP
│   └── lib/rate-limiter.js     # In-process hashed rate limiter with cleanup
├── public/
│   ├── images/                 # 140 WebP (avg 26KB) + 87 thumbs (avg 16KB) - 4+1 pharma images removed
│   ├── images/thumbs/          # Thumbnail versions
│   ├── sitemap.xml             # 239 URLs (12 static + 79 products (82-3 blocked) + 56 articles + 92 guides)
│   ├── sitemap-images.xml      # 135 image URLs with titles
│   ├── sitemap-index.xml       # Sitemap index
│   ├── catalog-feed.xml        # Google Shopping feed (79 eligible, 3 blocked excluded - m-38,m-43,m-45)
│   ├── robots.txt              # Allows AI bots GPTBot, Perplexity, Claude, blocks CCBot/Bytespider
│   └── .well-known/security.txt # RFC 9116 security policy
├── vercel.json                 # 14 headers (HSTS, CSP, COOP, Report-To, NEL) + 152 redirects + rewrites
├── google-apps-script.gs       # Hardened: ScriptLock, full duplicate search, intl phones, GDPR cleanup
└── index.html                  # SPA shell with SEO meta + GA loader (2s + scroll, send_page_view:false)
```

---

## Installable Web App / PWA status

The manifest, icons, shortcuts, and install UI are active. Runtime mode is intentionally **network-only**: the app does not register a caching Service Worker and does not currently promise offline browsing. `public/sw.js` remains temporarily as a migration kill-switch that clears legacy caches and unregisters itself, preventing old HTML/CSS/JS from being served.

---

## Product Compliance (Updated August 2026)

**Current state after Merchant Center report:**

- **82 products** in DB (52 men · 23 women · 7 devices) - 5 pharma products deleted permanently per Merchant report:
  - Deleted: m-34 Hard-On, m-36 Vegal Extra, m-37 Cialis, m-47 Levitra, w-17 Viagra Women (404 + redirect)
- **3 remaining prescription products** (m-38 Power 36, m-43 Procomil Fort, m-45 Viagra Pfizer) have **zero effect** on site:
  - Excluded from: homepage, category pages (/products/men/women), sitemap.xml, sitemap-images.xml, catalog-feed.xml
  - Protected with layered noindex: `X-Robots-Tag: noindex` (vercel.json + server/index.js) + `meta robots noindex` + no Product JSON-LD + `rel=nofollow` + `noimageindex` on images
  - Still purchasable via direct link `/products/power-36-...` etc. for existing customers
- **79 eligible products** in feed/sitemap (82 - 3 blocked)
- **Zero banned absolute claims** site-wide (previously 55 phrases like "آمن تمام" replaced with compliant)

`src/lib/product-compliance.ts` + `src/data/products.ts` (getPublicProductsByCategory, HOMEPAGE_EXCLUDED) are single source for this policy.

**Why this is best vs deleting all 8:** Keeps revenue from remaining 3 via direct WhatsApp links while having zero SEO/Merchant impact. Deleting all 8 would be 100% safe but lose sales.

---

## Home Page Strategy

The home page displays **6 hand-picked products** at the top (`HOME_FEATURED_ORDER` first 6), backed by a larger pool of related/suggestion products:

- **No on-site product exclusion** — all products can appear in on-site recommendations; external feeds follow the channel compliance list
- **Category mix**: 16 men + 6 women in the pool
- **Type variety**: honey, capsules, gel, spray, drops, chocolate
- **Social proof first**: highest review counts lead
- **Price range**: ج.م150 – ج.م590 (covers impulse + premium)

---

## Getting Started

```bash
git clone https://github.com/AhmedEideng/Elysr.git
cd Elysr
npm install
npm run dev          # → http://localhost:8080
```

### Environment Variables

Copy `.env.example` and configure it in the Vercel dashboard. The only required variables are `GOOGLE_SHEETS_WEBHOOK_URL` and `SITE_URL`. No Redis account or external rate-limit service is required: the API applies an in-process IP limit, and Google Apps Script applies a second per-phone limit before writing an order.

### Commands

| Command                             | Description                                                           |
| ----------------------------------- | --------------------------------------------------------------------- |
| `npm run dev`                       | Development server (port 8080)                                        |
| `npm run build`                     | Production build + sitemap + prerender                                |
| `npm run preview`                   | Preview production build locally                                      |
| `npm run lint`                      | ESLint check                                                          |
| `npm run format`                    | Prettier formatting                                                   |
| `npm run test:e2e`                  | Playwright checkout + HTTP 404 tests                                  |
| `npm run test:sources`              | Validate the newly generated article's live sources and claim support |
| `node scripts/generate-sitemap.mjs` | Regenerate sitemaps manually                                          |

---

## Adding Content

### New Product

```ts
// src/data/products/men.ts (or women.ts / devices.ts) — append to the array
{
  id: "m-68",                              // next sequential ID
  slug: "your-product-slug",               // URL-friendly English name
  name: "اسم المنتج",                      // Arabic display name
  nameEn: "Product Name",                  // English name (for catalog feed)
  category: "men",                         // men | women | devices
  price: 300,                              // EGP
  description: "وصف تفصيلي للمنتج...",     // ≥80 chars
  benefits: ["فائدة 1", "فائدة 2"],        // 5–7 benefits
  ingredients: "المكونات مع أدوارها...",
  usage: "طريقة الاستخدام + تحذيرات...",
  image: "/images/your-product-slug.webp", // slug-based (must match slug)
  stock: 100,
  rating: 0,                                // keep 0 until genuine order-backed reviews exist
  reviews: 0,
}
```

Then add the image (800×800 WebP) to `public/images/your-product-slug.webp` and its thumbnail (320×320) to `public/images/thumbs/your-product-slug.webp`. Run `npm run build` — the sitemap, prerender, and catalog feed update automatically.

### New Article

```ts
// src/data/articles.ts — append to the articles array
a(
  "article-slug",
  "عنوان المقال",
  "مقتطف قصير...",
  "فئة", // e.g. "صحة الرجل", "صحة المرأة", "تغذية"
  7, // reading time (minutes)
  "💡", // emoji
  `محتوى المقال الكامل...`,
  "/images/article-slug-hero.webp",
);
```

---

## Deployment

Hosted on **Vercel** with automatic CI/CD on every push to `main`.

```
https://elysrmedical.store
```

The build pipeline:

1. `vite build` → generates optimized `dist/`
2. `generate-sitemap.mjs` → creates sitemap.xml, sitemap-images.xml, catalog-feed.xml
3. `prerender-seo.mjs` → generates 246 application pages with full SEO meta + JSON-LD + related product images with proper alt/title (fixes Google Images confusion)
4. Vercel deploys `dist/` to global Edge CDN with 14 security headers (HSTS, CSP, COOP, Report-To, NEL)

After deploying, submit `sitemap-index.xml` + `sitemap-images.xml` in Google Search Console and check GA4 DebugView for accurate tracking (GA loader now loads after 2s + scroll with send_page_view:false to prevent (other)).

---

## License

All rights reserved © 2026 Elysr Medical Group.
This is a private, proprietary project.

---

<div align="center">

**Built with ❤️ in Cairo, Egypt**

[Website](https://elysrmedical.store) · [WhatsApp](https://wa.me/201098088206) · [Email](mailto:info@elysrmedical.store)

</div>
