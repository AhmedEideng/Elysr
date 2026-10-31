# اليسر ميديكال — Elysr Medical Group

<div align="center">

**منتجات الصحة الزوجية الأصلية — شحن سري لكل محافظات مصر**

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

## 🎯 عن المشروع

**اليسر ميديكال** متجر إلكتروني عربي (RTL) متخصص في منتجات الصحة الزوجية الأصلية، يخدم جمهورية مصر العربية. واجهة المتجر **صفحات ثابتة مولّدة مسبقًا** بلا قاعدة بيانات تطبيقية، مع وظائف API على الخادم للطلبات والمراجعات وتقارير الأخطاء. الطلبات تمر عبر **API محصّن** إلى Google Sheets، ومراجعات العملاء تمر عبر نفس الـ webhook إلى شيت مراجعات **بإشراف يدوي**.

### لماذا "بلا قاعدة بيانات"؟

- ✅ كل البيانات (منتجات، مقالات، صفحات SEO) في ملفات **TypeScript** ثابتة
- ✅ توليد **277 صفحة تطبيقية** كاملة في وقت البناء
- ✅ استضافة على **Vercel Edge CDN** (سرعة + تكلفة منخفضة) + بديل **Express + Docker** للنشر الذاتي
- ✅ الطلبات والمراجعات تُرسل إلى **Google Sheets** عبر Google Apps Script (ScriptLock + فحص تكرار كامل)

---

## 📊 الأرقام

| المقياس             | القيمة                                                                                                                                                           |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 📦 المنتجات         | **88** (56 رجال · 24 نساء · 8 أجهزة) — 4 عناصر تاريخية ما زالت محذوفة؛ تمت إعادة 6 منتجات بقرار المالك                                                           |
| 🛒 تغطية الكتالوج   | **88** في كتالوج الموقع · **81** في Merchant feed (7 منتجات بمواد دوائية موصوفة مستثناة من الـ feed فقط — قرار المالك 2026-09-28؛ صفحاتها منشورة وقابلة للفهرسة) |
| 📚 المقالات         | **63** مقالًا توعويًا بمصادر طبية موثوقة (NIH/Mayo/NHS/…)                                                                                                        |
| 🎯 صفحات الدليل     | **106** صفحة دليل (قوائم أسعار ومقارنات منتجات وصفحات توصيل للمناطق؛ مع تحذيرات طبية للأدلة الدوائية)                                                            |
| 📄 الصفحات المولّدة | **277** (16 ثابتة + 88 صفحة منتج + 63 مقالًا + 106 دليلًا + 4 صفحات إنجليزية)                                                                                    |
| 🗺️ روابط sitemap    | **273** (البحث الشامل مشمول عبر `SearchAction` في JSON-LD، مش قالب sitemap)                                                                                      |
| 🛍️ كتالوج التجار    | **81** منتجًا (RSS + CSV + TXT) مع `product_type` لكل منتج                                                                                                       |
| ↪️ Redirects        | **182** تحويلًا دائمًا (HTTP 308 على Vercel) (معرّفات قديمة + منتجات محذوفة + slugs معاد تسميتها + 404s اللي طلعت من GSC)                                        |
| 🖼️ الصور            | 147 صورة WebP أساسية + 266 مصغّرة عبر 3 مقاسات                                                                                                                   |
| 🧪 الاختبارات       | **303** وحدة (Vitest) + **19** E2E (Playwright) + data-integrity + schema validation                                                                             |

---

## 🏗️ البنية

```
المتصفح ──→ Vercel Edge CDN (dist/ ثابت)
                │
                ├── 277 صفحة مولّدة مسبقًا (SEO meta + JSON-LD كاملة)
                ├── /search?q=…          (SPA — بحث الكتالوج)
                │
                ├── /api/submit-order  ──┐
                ├── /api/submit-review ──┼──→ Google Apps Script ──→ Google Sheets
                └── /api/reviews       ──┘   ▲ محمي: HMAC بتواقيع single-use
                                             │ + سر كتابة اختياري (WEBHOOK_SECRET)

بديل النشر الذاتي: server/index.js (Express) يقدّم نفس dist/
ونفس معالجات الـ API — نفس السلوك تمامًا بدون اعتماد على Vercel.
```

### قرارات تصميم جوهرية

- **صفر قاعدة بيانات** — كل البيانات في ملفات TypeScript تُبنى وقت البناء؛ وGoogle Sheets هو الـ backend الوحيد ذي حالة (طلبات + مراجعات) عبر webhook محصّن.
- **السيرفر لا يثق بالعميل** — الـ API يعيد التحقق من الأسعار والمخزون والخصومات (بما فيها خصم الباقة 20%) وتكوين الباقات من `products-db.json` / `bundles-db.json` المولّدة وقت البناء قبل كتابة أي شيء في الشيت.
- **حالة الكتالوج الحالية** — المنتجات المحذوفة نهائيًا هي m-36 وm-43 وm-47 وw-24؛ أعاد المالك m-08 وm-34 وm-37 وm-38 وm-45 وw-17 للعرض. منتجات المواد الدوائية الموصوفة مستثناة من Merchant feed فقط (قرار المالك 2026-09-28) وتبقى منشورة وقابلة للفهرسة على الموقع.
- **المراجعات بإشراف بالضرورة** — كل مراجعة تصل بحالة "قيد المراجعة"؛ لا يُعرض إلا ما اعتمده المالك. مسار القراءة موقّع بـ HMAC-SHA256 بتواقيع قصيرة العمر وnonces أحادية الاستخدام.
- **فحوصات التكامل في CI** — تتحقق من الكتالوج والـ metadata المولّدة والـ redirects
  وأهلية الـ feed واتساق schema؛ لا توجد قائمة كلمات ثابتة تمنع صياغة المحتوى الطبي.
- **فرز ذكي** — صفحات الفئات ترتب حسب: المخزون → مميز → درجة الشعبية → السعر.

---

## 🧰 التقنيات

| الطبقة     | التقنية                                                                                                                                |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Framework  | React 19 + TypeScript 6                                                                                                                |
| Build      | Vite 8 (تقسيم كود: vendor-react/router/icons/search/toast + كتالوجات منفصلة)                                                           |
| Routing    | TanStack Router (file-based، 21 مسارًا)                                                                                                |
| Styling    | Tailwind CSS 4 (ألوان Oklch، RTL كامل)                                                                                                 |
| البحث      | Fuse.js (fuzzy، تحميل كسول) + مرادفات اللهجة المصرية (نقط ⇄ قطرات)                                                                     |
| الاختبارات | Vitest (303) + Playwright (19 E2E) + data-integrity + JSON-LD validator                                                                |
| الاستضافة  | Vercel Edge CDN (أساسي) · Express + Docker (نشر ذاتي مدعوم)                                                                            |
| الطلبات    | Google Apps Script → Google Sheets (ScriptLock + فحص تكرار كامل + هواتف دولية)                                                         |
| SEO        | 277 صفحة مولّدة · JSON-LD (Product/FAQ/Article/Breadcrumb/SearchAction) · 3 sitemaps                                                   |
| الصور      | WebP فقط (sharp، 700–800px، q45–55) + alt/title وصفية                                                                                  |
| الأمان     | CSP · HSTS · COOP/OAC · Report-To · NEL · CORS صارم · rate limits بمعرّفات IP مُجزّأة · HMAC لقراءة المراجعات · error tracking بلا PII |

---

## التشغيل المحلي

```bash
# المتطلبات: Node 24.x
git clone https://github.com/AhmedEideng/Elysr.git
cd Elysr
nvm use                  # يقرأ من .nvmrc

npm install
npm run dev              # → http://localhost:8080
```

### متغيرات البيئة

المتغيران الوحيدان المطلوبان: `GOOGLE_SHEETS_WEBHOOK_URL` و`SITE_URL`.
لا حاجة لـ Redis أو خدمة rate-limit خارجية: الـ API يطبّق حدودًا داخلية بمعرّفات IP مُجزّأة، وApps Script يطبّق حدًا ثانيًا لكل هاتف قبل كتابة الطلب.

| المتغير                        | مطلوب        | الغرض                                                                                                                                                       |
| ------------------------------ | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GOOGLE_SHEETS_WEBHOOK_URL`    | ✅           | رابط Web App الخاص بـ Apps Script (طلبات + مراجعات)                                                                                                         |
| `SITE_URL`                     | ✅           | الأصل الرسمي (canonicals، feeds، OG tags)                                                                                                                   |
| `GOOGLE_SHEETS_REVIEWS_TOKEN`  | ⚠️ للمراجعات | مفتاح HMAC لقراءة المراجعات (يجب أن يطابق `REVIEW_READ_TOKEN` في السكريبت؛ بدونها قسم المراجعات معطّل بصمت)                                                 |
| `GOOGLE_SHEETS_WEBHOOK_SECRET` | **إلزامي**   | سر كتابة مشترك (يجب أن يطابق `WEBHOOK_SECRET` في السكريبت). Fail-closed: بدون السر، السكريبت يرفض **كل** الكتابات — اضبط الاتنين أو الموقع مش هيستقبل طلبات |
| `VITE_ERROR_SINK_URL`          | اختياري      | منفذ أخطاء متوافق مع Sentry (console فقط في dev)                                                                                                            |

### الأوامر

| الأمر                     | الوصف                                                  |
| ------------------------- | ------------------------------------------------------ |
| `npm run dev`             | خادم التطوير (port 8080)                               |
| `npm run build`           | بناء الإنتاج + sitemaps + prerender لـ 277 صفحة        |
| `npm run preview`         | معاينة بناء الإنتاج محليًا                             |
| `npm run build:ssr`       | بناء + prerender لـ Express الخادم الذاتي              |
| `npm start` / `start:dev` | تشغيل الخادم الذاتي (إنتاج / watch)                    |
| `npm run test`            | حارس data-integrity (كتالوج، metadata، شبكة redirects) |
| `npm run test:unit`       | اختبارات Vitest + أمان الـ API (303)                   |
| `npm run test:e2e`        | باقة Playwright E2E (19)                               |
| `npm run test:schemas`    | مجرّب JSON-LD لكل صفحة مولّدة                          |
| `npm run test:sources`    | فحص متطلبات المصادر للمقالات الجديدة                   |
| `npm run test:all`        | integrity + unit + build + schemas                     |
| `npm run ci`              | lint + typecheck + test:all                            |
| `npm run audit:deps`      | `npm audit --audit-level=high`                         |
| `npm run release`         | سير bump الإصدار ورقم الكاش                            |

---

## ✨ المميزات

### 🔍 بحث شامل في الموقع (`/search?q=`)

- اقتراحات فورية فاصلة (Fuse.js، Ctrl/Cmd+K) في مربع الهيدر + رابط **"عرض كل النتائج"**.
- صفحة نتائج مخصصة `/search?q=…` لكل الفئات — موصوفة عبر `SearchAction` (JSON-LD)
  وقالب البحث في الـ sitemap، فنتائج بحث جوجل تصل لصفحات نتائج حقيقية.
- مرادفات اللهجة المصرية ثنائية الاتجاه (`نقط` ⇄ `قطرات`) في مُطابق الصفحة وفهرس الاقتراحات.

### ⭐ مراجعات عملاء حقيقية بمراجعة يدوية

- صفحات المنتجات تعرض قسم **"تجارب حقيقية من عملائنا"** يغذّيه **المعتمدة فقط**
  (`/api/reviews`) — لا يُعرض شيء غير معتمد إطلاقًا.
- نموذج تقديم (نجوم + اسم + هاتف اختياري) → `/api/submit-review` → صف "قيد المراجعة"
  في شيت **المراجعات**. المالك يعتمد/يرفض من الشيت، وتظهر الصفحة خلال كاش 5 دقائق.
- شارة **"مشتري مؤكد"**: إذا طابق هاتف المراجع طلبًا مكتملًا فيه المنتج.
- الخصوصية: أرقام الهاتف لا تغادر الشيت أبداً؛ مسار القراءة موقّع HMAC بتواقيع قصيرة
  العمر وnonces أحادية الاستخدام.

### 🏷️ التسعير والخصومات

- **مبادرة الرعاية الماسية** — خصم متدرج 10% / 15% / 20% عند 1,000 / 1,500 / 2,000 ج.م.
- **خصم الباقة 20%** — باقة البيع المتقاطع المكتملة تحصل على 20% من إجمالي الباقة؛
  الخصمان **متبادلا الاستبعاد** (الباقة لها الأولوية).
- كلاهما يعاد حسابه وتفرضه **السيرفر** من `bundles-db.json` — قيم العميل لا تُثق.

### 🛡️ امتثال المنتجات والمحتوى

- **ظهور الكتالوج** — 88 منتجًا منشورًا؛ ستة منتجات أُعيدت بقرار المالك،
  وأربعة منتجات تاريخية تظل محذوفة. تُستثنى سبعة منتجات بمواد دوائية موصوفة
  من Merchant feed فقط، دون حذف صفحاتها أو روابطها من sitemap.
- **فحوص CI** — تتحقق من تكامل البيانات والميتا والتحويلات والسكيما وأهلية الخلاصة؛
  لا توجد قائمة كلمات ثابتة تمنع العبارات الطبية. المراجعة التحريرية مسؤولية مستقلة.
- **المصادر** — تُراجع متطلبات مصادر المقالات وحيوية الروابط بأدوات مخصصة؛
  نجاح الاختبار لا يُعد إثباتًا طبيًا آليًا لكل ادعاء.

---

## 📂 هيكل المشروع

```
Elysr/
├── src/
│   ├── routes/               # 21 مسارًا (file-based) — يتضمن /search
│   ├── components/
│   │   ├── sections/         # Hero, FeaturedProducts, ShopByConcern, RecentlyViewed…
│   │   ├── layout/           # Header (مربع البحث), Footer, Layout
│   │   ├── ProductCard.tsx   # بطاقة منتج بـ badges مدروسة الامتثال
│   │   ├── SearchBar.tsx     # بحث Fuzzy (Ctrl+K) + "عرض كل النتائج" → /search
│   │   └── Accessibility.tsx # Skip-to-content + Live regions + focus trap
│   ├── features/product/     # CustomerReviews + مكونات المنتج + hooks/use-product-image-state
│   ├── data/
│   │   ├── products.ts       # 88 منتجًا + محددات البحث والمرادفات
│   │   ├── products/         # men.ts · women.ts · devices.ts (مصدر الكتالوج)
│   │   ├── articles.ts       # 63 مقالًا بمصادر موثوقة
│   │   ├── landing-pages.ts  # 106 صفحة دليل (مصدر build؛ تُقدّم JSON لكل slug وقت التشغيل)
│   │   ├── product-types.ts  # واجهات TypeScript
│   │   └── product-faqs.ts   # مخططات الأسئلة الشائعة المشتركة
│   ├── lib/
│   │   ├── seo.ts                    # meta + JSON-LD builders + canonical
│ │   │   ├── bundle-discount.ts        # خصم الباقة 20% (مستبعد متبادل مع الشرائح)
│   │   ├── promo.ts                  # شرائح الرعاية الماسية 10/15/20%
│   │   ├── governorates.ts           # 27 محافظة + شحن + submitToGoogleSheets
│   │   ├── search-terms.ts           # توسيع مرادفات اللهجة (نقط ⇄ قطرات)
│   │   ├── error-tracking.ts         # sink أخطاء بلا PII (allowlist context)
│   │   ├── internal-links.ts         # محرك الربط المتقاطع (منتجات ↔ مقالات ↔ أدلة)
│   │   ├── cache.ts                  # رقم كاش مركزي (config/cache-version.json)
│   │   ├── cart-normalization.ts    # مصدر واحد لتطبيع عناصر السلة والمخزون
│   │   └── whatsapp.ts               # منشئ رسالة الطلب (PII كامل للشات، Minimal للـ URL)
│   ├── hooks/                # use-cart · use-wishlist · use-recently-viewed · use-scroll-tracking
│   ├── contexts/cart.tsx     # حالة السلة (معرفات منتجات فقط — لا PII في التخزين)
│   └── styles.css
├── api/
│   ├── submit-order.js       # استقبال الطلبات المحصّن (CORS صارم، 30/دقيقة IP مُجزأ،
│   │                         # إعادة تحقق أسعار/مخزون/باقات، IP hash فقط)
│   ├── submit-review.js      # استقبال المراجعات (المنتج يجب أن يوجد في الكتالوج، 3/دقيقة)
│   ├── reviews.js            # قراءة المعتمدة (HMAC متحقق منه، fail-soft، تحقق معرف المنتج)
│   ├── csp-report.js         # sink تقارير CSP (IP hash، origin whitelist، حد 4KB)
│   └── lib/
│       ├── rate-limiter.js           # rate limiter للطلبات والمراجعات + تنظيف
│       ├── endpoint-rate-limiter.js  # rate limiter خاص لنقاط CSP/errors
│       ├── request-guards.js         # فحوص origin وحجم payload المشتركة
│       └── request-ip.js             # استخراج IP موثوق من المنصة
├── scripts/
│   ├── prerender-seo.mjs           # 277 صفحة HTML + JSON-LD (Product/ItemList/FAQ/Breadcrumb)
│   ├── generate-sitemap.mjs        # sitemaps (273) + feed (81) + robots + security.txt
│   ├── check-source-links.mjs      # حيوية المصادر الكاملة (3 محاولات + تصنيف السلطات)
│   ├── validate-schemas.mjs        # مجرّب JSON-LD لكل مخططات كل الصفحات
│   ├── validate-article-sources.mjs # فحص متطلبات المصادر (مقالات جديدة)
│   ├── data-integrity.test.mjs     # حارس الكتالوج/البيانات/شبكة redirects (بوابة البناء)
│   ├── auto-generate-article.mjs   # خط مقالات Gemini (تشغيل يدوي)
│   ├── optimize-images.mjs         # خط sharp WebP
│   ├── process-hero.mjs            # معالجة صور الهيرو
│   ├── release.mjs                 # سير bump الإصدار
│   ├── sync-vercel-redirects.mjs   # مزامنة redirects مع الكتالوج
│   └── health-check.mjs           # تدقيق الحزم/الصور والروابط وSEO head المولّد
├── e2e/checkout.spec.ts      # 19 اختبار Playwright (checkout، بحث، مراجعات، 404s، حذفات)
├── server/index.js           # خادم Express للنشر الذاتي (نفس dist/ + نفس الـ API)
├── .github/workflows/ci.yml  # 5 وظائف CI (أدناه)
├── public/
│   ├── images/               # 147 WebP أساسية + 266 مصغّرة في thumbs/ وthumbs-180/ وthumbs-120/
│   ├── landing-pages/        # 106 JSON لكل slug (مصدر بيانات وقت التشغيل)
│   ├── sitemap.xml           # 273 رابط
│   ├── sitemap-images.xml    # 141 رابط صورة
│   ├── sitemap-index.xml
│   ├── sw.js                 # kill-switch هجرة PWA (يلغي نفسه، network-only)
│   ├── scripts/ga-loader.js  # تحميل GA4 مؤجل (2ث + تفاعل، send_page_view:false)
│   └── .well-known/security.txt
├── google-apps-script.gs     # الـ webhook: طلبات + مراجعات + تحقق HMAC + سر كتابة
│                             # + دالة trigger التنظيف اليومي (setupAutoCleanupTrigger)
├── vercel.json               # 12 مجموعة headers أمان + 182 redirect + rewrites
├── Dockerfile · docker-compose.yml
├── SECURITY.md · CHANGELOG.md · ANALYSIS.md
└── index.html
```

---

## 🧪 الاختبارات وCI

خمس وظائف على كل push (+ فحص أسبوعي يوم السبت للمصادر):

| الوظيفة                                     | البوابة                                                                      |
| ------------------------------------------- | ---------------------------------------------------------------------------- |
| 🔗 Corpus Source Liveness                   | روابط مصادر المقالات الفريدة (3 محاولات بتراجع + تصنيف السلطات غير المستقرة) |
| 🔍 Lint • Typecheck • Unit • Data Integrity | ESLint · `tsc` · 303 اختبار وحدة/API · حارس الكتالوج+البيانات+شبكة redirects |
| 🛡 Security Audit                            | `npm audit --audit-level=high` على الشجرة المقفلة                            |
| 🏗 Build • Prerender • Sitemaps              | Vite + 277 صفحة مولّدة + sitemaps                                            |
| 🚦 Lighthouse Performance Budget            | موازِن أداء LHCI على الموقع المبنى                                           |

محليًا: `npm run ci` (lint + typecheck + test:all) و`npm run test:e2e`.

---

## الإصدار الحالي وسلوك التحميل

**الإصدار 2.3.2 · الكاش 105 · آخر مراجعة للتوثيق 2026-10-31.**

- الإصدار في `package.json` و`package-lock.json`، ورقم الكاش في
  `config/cache-version.json` ويُستهلك عبر `CACHE_VERSION`.
  يجب مزامنة `ga-loader.js?v=105` في `index.html` معه.
- مع JavaScript: يظل المحتوى الثابت مخفيًا حتى يركّب React الواجهة الفعلية،
  بدون ظهور البانر منفردًا أو هياكل تحميل. تحميل البانر المسبق مستمر؛
  الصور قد تكمل التحميل بعد ظهور الواجهة، ولا ننتظر كل صورة قبل العرض.
- دون JavaScript: يبقى المحتوى الثابت وروابط التنقل متاحين. إذا لم تُضبط
  علامة بدء التطبيق خلال أربع ثوانٍ، يظهر البديل الثابت. هذا لا يضمن التعافي
  من كل أخطاء التشغيل أو الرسم.
- لوجو الهيدر شفاف 250×94، ولوجو الفوتر مربع 200×200 بدون فلتر قلب الألوان؛
  الملفات صور نقطية وليست SVG أصلية.
- الإضافات الأخيرة: استعادة أوفر تايم، تري فورس 30 كبسولة، سياليس 20 مجم
  عبوة 4 أقراص، وبينك شوت 30 مل. رابط سياليس 30 قرصًا لم يتغير.

### خطوات إصدار آمن

1. مراجعة المحتوى والمصادر والفروق المولّدة، دون استنتاج جرعات أو شهادات جودة من صورة تسويقية.
2. تشغيل الفحوص. أمر `npm run release -- patch` يحدّث الإصدار وملف القفل والكاش
   ورابط GA، وينشئ commit وtag محليين؛ **لا يبني المشروع ولا يدفعه**.
3. إعادة البناء بعد رفع الإصدار أو الكاش، ثم مراجعة المخرجات وتسجيلها في commit.
4. الدفع بموافقة المالك فقط، ثم فحص الصفحات والأسعار والصور والتحويلات والخلاصة حيًا.

## خلاصة Merchant Center

الخلاصة `public/catalog-feed.xml` ونسختا CSV/TXT تضم **81 منتجًا من 88**.
بينك شوت مشمول بموافقة المالك؛ سبعة منتجات دوائية مستثناة من الخلاصة فقط.
تحتوي البيانات على السعر والتوفر و`product_type` وروابط الصور بإصدار الكاش.
لا نختلق GTIN أو MPN؛ يُستخدم `identifier_exists=no` عند غياب المعرفات المطلوبة.

الإدراج في الخلاصة **ليس قبولًا من Google ولا إرسالًا يدويًا للحساب**.
لم يُضف `g:adult`؛ قرار سياسة المحتوى المخصص للبالغين وإرسال الخلاصة يحتاج
موافقة المالك وإعدادات الحساب المناسبة.

---

## 🚀 النشر

### Vercel (الأساسي)

CI/CD تلقائي على كل push إلى `main`:

1. `vite build` → `dist/` محسّن ومقسّم
2. `generate-sitemap.mjs` → sitemaps (273) + robots + security.txt + landing JSON
3. `prerender-seo.mjs` → 277 صفحة مولّدة بـ SEO meta + JSON-LD كامل
4. Vercel يقدّم `dist/` من Edge CDN مع 12 مجموعة headers أمان + 182 redirect

بعد النشر: قدّمي `sitemap-index.xml` + `sitemap-images.xml` في Google Search Console
واتفقي GA4 DebugView (المحمّل مؤجل 2ث + أول تفاعل مع `send_page_view:false`، والتطبيق
يتتبع تغييرات المسارات بنفسه لمنع تكرار page views).

### النشر الذاتي (Express + Docker)

```bash
npm run build:ssr
npm start          # أو: docker compose up
```

`server/index.js` يقدّم نفس `dist/` ونفس معالجات الـ API مع نفس headers الأمان
ومثل الـ rate limits، مع 404 حقيقي وتطابق Vercel في إعادة توجيهات رمز الشقّة (/).

---

## 🔐 الخصوصية ومعالجة البيانات

- **الطلبات** — الاسم/الهاتف/العنوان/المنتجات تصل شيت الطلبات عبر الـ webhook المحصّن؛
  تُستخدم لتنفيذ الطلب والتواصل حوله فقط.
- **لا PII في تخزين المتصفح** — السلة تخزن معرفات المنتجات والكميات فقط؛ معرفات الطلب
  الجلسي في sessionStorage؛ تتبع الأخطاء بمعرّف جلسة زائف (pseudonymous) وسياق
  مسموح به فقط (allowlist) بلا حقول عملاء.
- **التحليلات** — GA4 يجمع بيانات استخدام تقنية/مجمعة بمعرف زائر زائف؛ لا تُستخدم
  للتواصل أو التعريف الشخصي، والتحميل مؤجل (2ث + تفاعل). يمكن الحجب من إعدادات المتصفح.
- **حذف البيانات** — يدويًا عند الطلب عبر واتساب (مستند في صفحة الخصوصية). بقرار
  المالك لا يوجد endpoint حذف ذاتي: صفوف الطلبات مزدوجة الوظيفة بسجلات المحاسبة.
- **خصوصية IP** — تُخزَّن/تُسجَّل hashes SHA-256 لمعرّفات IP فقط.
- **سياسة الأمان** — راجعي `SECURITY.md` (نُشر `security.txt` وفق RFC 9116).

---

## 📱 حالة PWA

الـ manifest والأيقونات والاختصارات وواجهة التثبيت نشطة. وضع التشغيل **network-only**
بشكل مقصود: لا يُسجّل Service Worker تخزين ولا وعد offline. `public/sw.js` باقٍ كـ
kill-switch يمسح الكاش القديم ويلغي تسجيل نفسه لمنع تقديم HTML/CSS/JS قديم.

---

## 🤝 إضافة المحتوى

### منتج جديد

```ts
// src/data/products/men.ts (أو women.ts / devices.ts) — أضيفي للصفوف
{
  id: "m-65",                              // مثال: تأكد أن المعرف غير مستخدم
  slug: "your-product-slug",               // اسم إنجليزي مناسب للـ URL
  name: "اسم المنتج",
  nameEn: "Product Name",
  category: "men",                          // men | women | devices
  price: 300,                               // ج.م
  description: "وصف تفصيلي…",               // ≥ 80 حرفًا — صياغة خاضعة للمراجعة التحريرية
  benefits: ["فائدة 1", "فائدة 2"],
  ingredients: "المكونات مع أدوارها…",
  usage: "طريقة الاستخدام + تحذيرات…",
  image: "/images/your-product-slug.webp",
  emoji: "💊",
  stock: 100,                              // مخزون مؤكد فقط
  // searchAliases?: ["كلمة محلية شائعة"],
}
```

خطوات إكمال الإضافة:

1. صورة WebP بحجم 800×800، ومصغّرات: `thumbs/` **480×480**،
   و`thumbs-180/` **360×360**، و`thumbs-120/` **240×240**.
   أسماء المجلدات ليست أبعاد الملفات الفعلية. حافظ على نسب الصورة.
2. تعيين المنتج في `src/data/topics.ts`، وإضافة hook في `product-meta.ts`
   وأسئلة خاصة بالمنتج في `product-faqs.ts`.
3. تشغيل `npm run sync:redirects` لإنشاء تحويل المعرف إلى الرابط.
   عند استعادة صفحة قديمة، احذف تحويلها من `legacyAliases` في سكربت المزامنة
   ومن `vercel.json` قبل المزامنة، ولا تترك رابط المنتج المنشور يحوّل لصفحة أخرى.
4. تحديث اختبارات أعداد المنتجات و`OfferCatalog` في `index.html` وملفي README.
   لا تختلق تقييمات أو باركود أو مخزونًا.
5. تشغيل `npm run build` ثم `npm run ci` و`npm run health-check`.
   البناء يولّد الخرائط والصفحات والخلاصة وقاعدة منتجات API؛ راجع الفروق المولّدة.
   أي تغيير في الخلاصة يحتاج موافقة المالك قبل النشر.

> المكونات والجرعات والادعاءات تخضع لمراجعة المصادر، ولا يكفي نجاح CI لإثباتها.

### مقال جديد

```ts
// src/data/articles.ts — أضيفي للصفوف
a(
  "article-slug",
  "عنوان المقال",
  "مقتطف قصير…",
  "فئة", // "صحة الرجل" / "صحة المرأة" / "تغذية"
  7, // دقائق القراءة
  "💡",
  `محتوى المقال الكامل…`,
  "/images/article-slug-hero.webp",
);
```

عيّن كل مقال جديد في `src/data/topics.ts`.
كل مقال يحتاج **3 مصادر موثوقة https فأكثر**؛ `npm run test:sources` يتحقق من
متطلبات المصادر، وCI حيوية المصادر يعيد فحص كل الروابط كل push. لا توجد
قائمة كلمات ادعاءات طبية ثابتة تمنع build.

---

## 📄 الترخيص

كل الحقوق محفوظة © 2026 Elysr Medical Group.
مشروع خاص وملكية فكرية محفوظة.

---

<div align="center">

**صُنع بـ ❤️ في القاهرة، مصر**

[الموقع](https://elysrmedical.store) · [واتساب](https://wa.me/201098088206) · [إيميل](mailto:info@elysrmedical.store)

</div>
