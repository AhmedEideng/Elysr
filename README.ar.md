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
- ✅ توليد **247 صفحة تطبيقية** كاملة في وقت البناء (249 ملف HTML مع 404 وoffline)
- ✅ استضافة على **Vercel Edge CDN** (سرعة + تكلفة منخفضة)
- ✅ الطلبات تُرسل إلى **Google Sheets** عبر Google Apps Script (لا حاجة لـ DB server)

### المميزات الرئيسية

- 🔍 **SEO ممتاز** — schema.org JSON-LD لكل صفحة (1157 schema valid)، sitemap.xml (239 رابط)، catalog-feed.xml (79 منتج) + وصف غني بسعر وتقييم
- 🛒 **سلة ذكية** — localStorage مع auto-sync + حماية من تجاوز المخزون
- 🏆 **خصم متدرج** — 15% / 20% / 25% حسب قيمة الطلب
- 🛡️ **توافق حسب القناة** — 83 منتج في DB (4 محذوفة نهائياً per Merchant: m-34,m-36,m-37,m-47)، 4 متبقية محظورة (m-38,m-43,m-45,w-17) ظاهرة برابط مباشر فقط مع حماية noindex كاملة، فتضم الخلاصة 79 منتجًا مؤهلًا. 0 عبارات محظورة (كان 55).
- 📱 **متجاوب بالكامل** — Mobile-first مع Cairo font self-hosted
- 📊 **Google Analytics** — تتبع الزيارات
- 📱 **تطبيق ويب قابل للتثبيت** — Web App Manifest؛ التخزين دون اتصال معطّل مؤقتاً لمنع الكاش القديم
- ♿ **إمكانية وصول** — Focus traps، ARIA live regions، skip-to-content

---

## 📊 الأرقام

| المقياس              | القيمة                                                       |
| -------------------- | ------------------------------------------------------------ |
| 📦 المنتجات          | **83** (52 رجال · 24 نساء · 7 أجهزة) - 4 محذوفة per Merchant |
| 📚 المقالات الطبية   | **56** بمصادر NIH/Mayo/NHS                                   |
| 🎯 صفحات SEO         | **92** صفحة landing                                          |
| 📄 صفحات prerendered | **247** صفحة تطبيقية (249 ملفاً مع 404 وoffline)             |
| 🗺️ روابط sitemap     | **239**                                                      |
| ↪️ Redirects         | **152 فريداً** (4 محذوفة → /products/men)                    |
| 🖼️ الصور             | **141** WebP + 88 thumbs (متوسط 26KB) محمية بـ alt/title     |

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
│   │   ├── product-compliance.ts  # استبعاد القنوات الخارجية فقط
│   │   ├── promo.ts             # Diamond Care Initiative dynamic tier discount
│   │   ├── error-tracking.ts    # Sentry-compatible sink
│   ├── hooks/
│   │   ├── use-cart.ts
│   │   ├── use-wishlist.ts       # 🆕 localStorage favourites
│   │   └── use-recently-viewed.ts # 🆕 آخر 12 منتج شوهدت
│   ├── contexts/cart.tsx
│   └── styles.css
├── api/
│   ├── submit-order.js    # محصن: CORS صارم، rate limit hashed IP، تحقق سعري، IP hash
│   ├── csp-report.js      # محصن: hashed IP، origin whitelist
│   ├── delete-customer-data.js # GDPR حق النسيان
│   └── lib/ # rate-limiter + encryption (تم إزالة التشفير بناء على طلب العميل)
├── scripts/
│   ├── prerender-seo.mjs       # يولّد 247 صفحة + صور مشابهة بـ alt/title (يصلح لخبطة صور جوجل)
│   ├── generate-sitemap.mjs    # يبني sitemap + feed + robots + security.txt (79 منتج متنوع في الهبوط)
│   ├── validate-schemas.mjs    # يتحقق من 1157 schema
│   └── data-integrity.test.mjs # يتحقق من 83 منتج + 0 عبارات محظورة
├── public/
│   ├── sw.js              # kill-switch بيمسح الكاش ويلغي نفسه
│   ├── scripts/ga-loader.js # تحميل GA بعد 2 ثانية + scroll (يمنع other)
│   ├── .well-known/security.txt # RFC 9116
│   ├── sitemap.xml        # 239 URL (79 منتج + 56 مقال + 92 دليل)
│   ├── catalog-feed.xml   # 79 منتج مؤهل (4 محظورة مستبعدة)
│   └── images/            # 141 WebP (26KB) + 88 thumbs
├── vercel.json            # 152 redirect + 14 header أمان (HSTS,CSP,COOP,Report-To,NEL)
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

### 📱 تطبيق الويب القابل للتثبيت

- `public/site.webmanifest` يوفّر بيانات التثبيت والاختصارات والأيقونات.
- وضع التشغيل الحالي **network-only**: لا يتم تسجيل Service Worker ولا يوجد offline cache.
- `public/sw.js` باقٍ مؤقتاً كـ kill-switch لمسح Service Workers والكاش القديمين ثم يلغي تسجيل نفسه.
- هذا القرار مقصود لمنع تقديم HTML/CSS/JS قديم؛ لا ينبغي وصف الوضع الحالي كدعم offline كامل.

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
