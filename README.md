<div align="center">

# Elysr Medical Group

**منتجات الصحة الزوجية الأصلية — شحن سري لكل محافظات مصر**

[![Live](https://img.shields.io/badge/Live-elysrmedical.store-0085ca?style=for-the-badge)](https://elysrmedical.store)
[![WhatsApp](https://img.shields.io/badge/WhatsApp-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)](https://wa.me/201098088206)

---

![React](https://img.shields.io/badge/React_19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript_5.8-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite_8-646CFF?logo=vite&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_4-38B2AC?logo=tailwindcss&logoColor=white)
![TanStack](https://img.shields.io/badge/TanStack_Router-FF4154?logo=reactrouter&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000?logo=vercel&logoColor=white)

</div>

---

## Overview

Elysr Medical is a production Arabic (RTL) e-commerce store serving Egypt. It runs entirely on the client with static pre-rendered pages — no traditional database, no server runtime. Orders flow through WhatsApp or a direct checkout form that writes to Google Sheets via a serverless API.

| Metric             | Value                                  |
| ------------------ | -------------------------------------- |
| Products           | **87** (56 men · 24 women · 7 devices) |
| Articles           | **56** educational health articles     |
| SEO Guides         | **125** long-form landing pages        |
| Pre-rendered Pages | **281** static HTML files              |
| Sitemap URLs       | **280**                                |
| Catalog Feed       | **77** items (META / Google Shopping)  |
| Redirects          | **128** (301 permanent)                |
| Image Format       | WebP only — optimized 8–55 KB each     |

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
- **Product compliance system** — each product is classified as GREEN / RED to control ad eligibility, catalog feed inclusion, badge display, and sort priority
- **Smart sort algorithm** — category pages rank by: stock → featured → popularity score → price (ascending as tie-breaker for impulse buys)

---

## Tech Stack

| Layer     | Technology                                             |
| --------- | ------------------------------------------------------ |
| Framework | React 19 + TypeScript 5.8                              |
| Build     | Vite 8                                                 |
| Routing   | TanStack Router (file-based)                           |
| Styling   | Tailwind CSS 4 (Oklch colors, full RTL)                |
| Icons     | Lucide React                                           |
| Hosting   | Vercel (Edge CDN)                                      |
| Orders    | Google Apps Script → Google Sheets                     |
| SEO       | Pre-render (262 pages) + JSON-LD + Sitemaps + Hreflang |
| Images    | WebP (sharp processing, 700–800px, q45–55)             |
| Security  | CSP headers + CORS + API rate limiting                 |

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
│   │   ├── products.ts         # 87 products with full metadata
│   │   ├── articles.ts         # 56 educational articles
│   │   ├── landing-pages.ts    # 125 SEO guide pages
│   │   ├── product-types.ts    # TypeScript interfaces
│   │   └── product-faqs.ts     # Shared FAQ schema
│   ├── lib/
│   │   ├── seo.ts              # Meta tags, JSON-LD, canonical management
│   │   ├── product-compliance.ts  # GREEN / RED classification
│   │   ├── promo.ts            # Tiered discount system
│   │   ├── governorates.ts     # 27 Egyptian governorates + shipping costs
│   │   └── whatsapp.ts         # Order message builder
│   ├── routes/                 # 19 route files (TanStack file-based)
│   ├── contexts/cart.tsx       # Cart state (localStorage-persisted)
│   └── styles.css              # Global styles + Tailwind directives
├── scripts/
│   ├── prerender-seo.mjs       # Generates static HTML for all routes
│   ├── generate-sitemap.mjs    # Builds sitemap.xml + sitemap-images.xml
│   ├── sync-vercel-redirects.mjs
│   └── data-integrity.test.mjs # Data validation tests
├── api/
│   ├── submit-order.js         # Vercel serverless → Google Sheets
│   └── csp-report.js           # CSP violation reports
├── public/
│   ├── images/                 # 87 product images (M-XX, W-XX, D-XX)
│   ├── images/thumbs/          # 88 thumbnail versions
│   ├── sitemap.xml             # 280 URLs
│   ├── sitemap-images.xml      # Product image sitemap
│   ├── sitemap-index.xml       # Sitemap index
│   └── catalog-feed.xml        # META/Google Shopping feed (78 items)
├── vercel.json                 # Headers, redirects (128), rewrites, CSP
├── google-apps-script.gs       # Google Sheets webhook receiver
└── index.html                  # SPA shell with full SEO meta
```

---

## Product Compliance System

Every product is classified into a compliance tier that controls **advertising safety** (not organic visibility):

| Tier     | Count | Catalog Feed | Organic Search | Badges     | Featured Sort | Ad Eligible |
| -------- | ----- | ------------ | -------------- | ---------- | ------------- | ----------- |
| 🟢 GREEN | 77    | ✅           | ✅ Indexed     | ✅         | Top priority  | ✅          |
| 🔴 RED   | 10    | ❌ Excluded   | ✅ Indexed     | ❌ Removed | Bottom        | ❌          |

> **نقطة مهمة:** نظام RED يحمي **الإعلانات فقط**. كل منتجات RED (بما فيها الأسماء التجارية
> مثل فياجرا/سياليس/ليفيترا) تبقى **مفهرسة في البحث العضوي (Google/Bing) وظاهرة في sitemap.xml**،
> لأن الزيارات العضوية وتحويلات واتساب قيّمة. ما يُستثنى فعلاً هو **كشتلوج الإعلانات المدفوعة**
> (Google Merchant / Facebook Catalog) لتجنّب تحذيرات سياسات الإعلانات.

Classification lives in `src/lib/product-compliance.ts` and is consumed by:

- `catalog-feed.xml` generation (excludes RED)
- `ProductCard.tsx` badge display logic
- `getProductsByCategory()` sort algorithm
- `HOME_FEATURED_ORDER` selection (zero RED)

---

## Home Page Strategy

The home page displays **20 hand-picked products** in `HOME_FEATURED_ORDER`, selected for maximum conversion:

- **Zero RED products** (compliance safe)
- **Category mix**: 12 men + 6 women + 2 devices
- **Type variety**: honey, capsules, gel, spray, drops, chocolate, devices
- **Social proof first**: highest review counts lead
- **Price range**: ج.م150 – ج.م3,800 (covers impulse + premium)

---

## Getting Started

```bash
git clone https://github.com/AhmedEideng/Elysr.git
cd Elysr
npm install
npm run dev          # → http://localhost:8080
```

### Environment Variables

Copy `.env.example` and configure in Vercel dashboard. Required variables: `GOOGLE_SHEETS_WEBHOOK_URL` (Google Apps Script URL) and `SITE_URL` (your domain).

### Commands

| Command                             | Description                            |
| ----------------------------------- | -------------------------------------- |
| `npm run dev`                       | Development server (port 8080)         |
| `npm run build`                     | Production build + sitemap + prerender |
| `npm run preview`                   | Preview production build locally       |
| `npm run lint`                      | ESLint check                           |
| `npm run format`                    | Prettier formatting                    |
| `node scripts/generate-sitemap.mjs` | Regenerate sitemaps manually           |

---

## Adding Content

### New Product

```ts
// src/data/products.ts — append to the appropriate array (men/women/devices)
{
  id: "m-68",                              // next sequential ID
  slug: "your-product-slug",               // URL-friendly English name
  name: "اسم المنتج",                      // Arabic display name
  nameEn: "Product Name",                  // English name (for catalog feed)
  category: "men",                         // men | women | devices
  price: 300,                              // EGP
  description: "وصف تفصيلي للمنتج...",     // ≥200 chars
  benefits: ["فائدة 1", "فائدة 2"],        // 5–7 benefits
  ingredients: "المكونات مع أدوارها...",
  usage: "طريقة الاستخدام + تحذيرات...",
  image: "/images/M-68.webp",              // must match ID prefix
  stock: 100,
  rating: 4.7,
  reviews: 50,
}
```

Then add the image (800×800 WebP) to `public/images/M-68.webp` and its thumbnail (320×320) to `public/images/thumbs/M-68.webp`. Run `npm run build` — the sitemap, prerender, and catalog feed update automatically.

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
3. `prerender-seo.mjs` → generates 262 static HTML pages with full SEO meta + JSON-LD
4. Vercel deploys `dist/` to global Edge CDN

After deploying, submit `sitemap-index.xml` in Google Search Console for faster indexing.

---

## License

All rights reserved © 2026 Elysr Medical Group.
This is a private, proprietary project.

---

<div align="center">

**Built with ❤️ in Cairo, Egypt**

[Website](https://elysrmedical.store) · [WhatsApp](https://wa.me/201098088206) · [Email](mailto:info@elysrmedical.store)

</div>
