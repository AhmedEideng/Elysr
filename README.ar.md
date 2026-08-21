# اليسر ميديكال — Elysr Medical

<div align="center">

**منتجات الصحة الزوجية الأصلية — شحن سري لكل محافظات مصر**

[![Live](https://img.shields.io/badge/Live-elysrmedical.store-0085ca?style=for-the-badge)](https://elysrmedical.store)
[![WhatsApp](https://img.shields.io/badge/WhatsApp-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)](https://wa.me/201098088206)

</div>

---

## 🎯 عن المشروع

**اليسر ميديكال** هو متجر إلكتروني عربي (RTL) متخصص في منتجات الصحة الزوجية، يخدم جمهورية مصر العربية منذ أكثر من 10 سنوات.

### لماذا "بلا قاعدة بيانات"؟

فلسفة المشروع تعتمد على:

- ✅ كل البيانات (منتجات، مقالات، صفحات SEO) في ملفات **TypeScript** ثابتة
- ✅ توليد **264 صفحة HTML** كاملة في وقت البناء
- ✅ استضافة على **Vercel Edge CDN** (سرعة + تكلفة منخفضة)
- ✅ الطلبات تُرسل إلى **Google Sheets** عبر Google Apps Script (لا حاجة لـ DB server)

### المميزات الرئيسية

- 🔍 **SEO ممتاز** — schema.org JSON-LD لكل صفحة، sitemap.xml (261 رابط)، catalog-feed.xml
- 🛒 **سلة ذكية** — localStorage مع auto-sync + حماية من تجاوز المخزون
- 🏆 **خصم متدرج** — 10% / 15% / 20% حسب قيمة الطلب
- 🛡️ **نظام Compliance مُعطّل** — تم إلغاء التصنيف والاستبعاد نهائيًا بقرار الإدارة،
  وكل المنتجات الـ 87 الآن ظاهرة في كل الأقسام ومتاحة في خلاصة المنتجات بالكامل.
- 📱 **متجاوب بالكامل** — Mobile-first مع Cairo font self-hosted
- 📊 **Google Analytics** — تتبع الزيارات
- 🌐 **دعم PWA** — Service Worker مع offline fallback
- ♿ **إمكانية وصول** — Focus traps، ARIA live regions، skip-to-content

---

## 📊 الأرقام

| المقياس              | القيمة                               |
| -------------------- | ------------------------------------ |
| 📦 المنتجات          | **87** (56 رجال · 24 نساء · 7 أجهزة) |
| 📚 المقالات الطبية   | **56** بمصادر NIH/Mayo/NHS           |
| 🎯 صفحات SEO         | **106** صفحة landing                 |
| 📄 صفحات prerendered | **267** ملف HTML                     |
| 🗺️ روابط sitemap     | **261**                              |
| ↪️ Redirects         | **154**                              |
| 🖼️ الصور             | **318** ملف WebP محسّن               |

---

## 🧰 التقنيات

| الطبقة    | التقنية                            |
| --------- | ---------------------------------- |
| Framework | React 19 + TypeScript 6            |
| Build     | Vite 8                             |
| Routing   | TanStack Router (file-based)       |
| Styling   | Tailwind CSS 4 (Oklch colors)      |
| Icons     | Lucide React                       |
| Hosting   | Vercel Edge CDN                    |
| Orders    | Google Apps Script → Google Sheets |
| Analytics | Google Analytics 4                 |
| CI/CD     | GitHub Actions + Lighthouse CI     |

---

## 🚀 التشغيل المحلي

```bash
# متطلبات: Node 24+
nvm use                  # يقرأ من .nvmrc

# تثبيت
npm install

# تشغيل dev server (http://localhost:8080)
npm run dev

# بناء للإنتاج
npm run build

# الاختبارات
npm run test             # data integrity
npm run test:schemas     # JSON-LD validator
npm run test:all         # both
```

---

## 📂 هيكل المشروع

```
Elysr/
├── src/
│   ├── routes/          # 19 ملف (TanStack file-based)
│   ├── components/
│   │   ├── sections/    # Hero, FeaturedProducts, WhyUs…
│   │   ├── layout/      # Header, Footer, Layout
│   │   ├── Accessibility.tsx  # Skip-to-content + Live regions
│   │   ├── ProductCard.tsx    # مع badge detection ذكي
│   │   └── sections/RecentlyViewed.tsx
│   ├── data/            # products.ts · articles.ts · landing-pages.ts
│   ├── lib/
│   │   ├── seo.ts               # SEO helpers + JSON-LD builders
│   │   ├── product-compliance.ts  # مُعطّل (no-op) — توافق برمجي فقط
│   │   ├── promo.ts             # Diamond Care Initiative dynamic tier discount
│   │   ├── error-tracking.ts    # Sentry-compatible sink
│   │   └── service-worker.ts    # opt-in PWA registration
│   ├── hooks/
│   │   ├── use-cart.ts
│   │   ├── use-wishlist.ts       # 🆕 localStorage favourites
│   │   └── use-recently-viewed.ts # 🆕 آخر 12 منتج شوهدت
│   ├── contexts/cart.tsx
│   └── styles.css
├── api/
│   ├── submit-order.js    # → Google Sheets
│   └── csp-report.js      # تقارير أمان CSP
├── scripts/
│   ├── prerender-seo.mjs       # يولّد 264 HTML
│   ├── generate-sitemap.mjs
│   ├── validate-schemas.mjs    # 🆕 JSON-LD validator
│   ├── health-check.mjs        # 🆕 post-build report
│   ├── optimize-images.mjs     # 🆕 sharp pipeline
│   └── data-integrity.test.mjs
├── public/
│   ├── sw.js              # 🆕 Service Worker
│   ├── offline.html       # 🆕 offline fallback
│   ├── site.webmanifest   # 🆕 PWA manifest
│   └── images/            # 318 ملف WebP
├── vercel.json            # 154 redirect + CSP + headers
├── .lighthouserc.json     # 🆕 Performance budgets
├── .github/workflows/ci.yml  # 🆕 Enhanced (Lint+Typecheck+Test+Build+Lighthouse)
├── .husky/pre-commit      # 🆕 Pre-commit hooks
├── SECURITY.md            # 🆕 Vulnerability policy
├── CHANGELOG.md           # 🆕 Version history
└── README.ar.md           # 🆕 هذا الملف
```

---

## 🆕 التحسينات الأخيرة (Unreleased)

تم إضافة:

### ⚙️ البنية التحتية

- `.nvmrc` يثبّت Node 24
- `SECURITY.md` لسياسة الإبلاغ عن الثغرات
- Enhanced `.github/workflows/ci.yml` مع Lighthouse + schema validation

### 🪝 خطافات React جديدة

- `useWishlist()` — قائمة مفضلات بـ localStorage (max 100)
- `useRecentlyViewed()` — آخر 12 منتج شوهدت
- `useIsWishlisted(id)` — variant خفيف للـ heart icon

### 🛡️ إمكانية الوصول

- `<SkipToContent />` — رابط لوحة المفاتيح (WCAG 2.4.1)
- `<LiveRegion />` و `<AssertiveLiveRegion />` — إعلانات screen reader
- `useFocusTrap()` — focus trap للـ modals

### 📱 PWA

- `public/sw.js` — Service Worker مع 3 استراتيجيات caching
- `public/offline.html` — صفحة offline جميلة
- `public/site.webmanifest` — manifest كامل مع shortcuts

### 🛠️ أدوات المطور

- `scripts/validate-schemas.mjs` — يتحقق من JSON-LD
- `scripts/health-check.mjs` — تقرير ما بعد البناء
- `scripts/optimize-images.mjs` — pipeline sharp
- `.husky/pre-commit` — pre-commit checks
- `.lintstagedrc.json` — lint/format على staged files

### 🆘 المراقبة

- `src/lib/error-tracking.ts` — Sentry-compatible error sink
- breadcrumbs trail (max 20)

---

## 🤝 المساهمة

نرحب بالمساهمات. قبل الـ PR:

```bash
npm run ci   # lint + typecheck + test + build
```

---

## 📄 الترخيص

كل الحقوق محفوظة © 2026 Elysr Medical Group.
مشروع خاص وملكية فكرية محفوظة.

---

<div align="center">

**صُنع بـ ❤️ في القاهرة، مصر**

[الموقع](https://elysrmedical.store) · [واتساب](https://wa.me/201098088206) · [إيميل](mailto:info@elysrmedical.store)

</div>
