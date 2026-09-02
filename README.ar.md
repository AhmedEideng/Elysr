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

**اليسر ميديكال** متجر إلكتروني عربي (RTL) متخصص في منتجات الصحة الزوجية الأصلية، يخدم جمهورية مصر العربية. يعمل بالكامل على **صفحات ثابتة مولّدة مسبقًا** — بلا قاعدة بيانات وبلا خادم runtime. الطلبات تمر عبر **API محصّن** إلى Google Sheets، ومراجعات العملاء تمر عبر نفس الـ webhook إلى شيت مراجعات **بإشراف يدوي**.

### لماذا "بلا قاعدة بيانات"؟

- ✅ كل البيانات (منتجات، مقالات، صفحات SEO) في ملفات **TypeScript** ثابتة
- ✅ توليد **248 صفحة تطبيقية** كاملة في وقت البناء
- ✅ استضافة على **Vercel Edge CDN** (سرعة + تكلفة منخفضة) + بديل **Express + Docker** للنشر الذاتي
- ✅ الطلبات والمراجعات تُرسل إلى **Google Sheets** عبر Google Apps Script (ScriptLock + فحص تكرار كامل)

---

## 📊 الأرقام

| المقياس | القيمة |
| --- | --- |
| 📦 المنتجات | **82** (52 رجال · 23 نساء · 7 أجهزة) — 5 أدوية محذوفة نهائيًا per Merchant report |
| 🛒 المؤهلة (feed/sitemap) | **79** — 3 أدوية متبقية (m-38, m-43, m-45) محمية noindex ومستبعدة من كل القنوات الخارجية |
| 📚 المقالات | **56** مقالًا توعويًا بمصادر طبية موثوقة (NIH/Mayo/NHS/…) |
| 🎯 صفحات الدليل | **93** صفحة هبوط (91 مفهرسة + 2 noindex) |
| 📄 الصفحات المولّدة | **248** (17 ثابتة + 82 منتج + 56 مقال + 93 دليل) |
| 🗺️ روابط sitemap | **238** (+ قالب بحث جوجل `/search?q=`) |
| 🛍️ كتالوج التجار | **79** منتجًا (RSS + CSV + TXT) |
| ↪️ Redirects | **162** قاعده 301 دائمة (معرّفات قديمة + أدوية محذوفة + slugs معاد تسميتها) |
| 🖼️ الصور | **138** WebP (8–55 KB، متوسط 26 KB) + 84 مصغّرة |
| 🧪 الاختبارات | **170** وحدة (Vitest) + **18** E2E (Playwright) + data-integrity + schema validation |

---

## 🏗️ البنية

```
المتصفح ──→ Vercel Edge CDN (dist/ ثابت)
                │
                ├── 248 صفحة مولّدة مسبقًا (SEO meta + JSON-LD كاملة)
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
- **توافق حسب القناة** — الـ 3 أدوية المتبقية تبقى قابلة للشراء برابط مباشر للعملاء الحاليين، لكنها مستبعدة من كل قناة خارجية (sitemap، image sitemap، Shopping feed، الرئيسية، قوائم الفئات، JSON-LD) ومحمية noindex متعدد الطبقات.
- **المراجعات بإشراف بالضرورة** — كل مراجعة تصل بحالة "قيد المراجعة"؛ لا يُعرض إلا ما اعتمده المالك. مسار القراءة موقّع بـ HMAC-SHA256 بتواقيع قصيرة العمر وnonces أحادية الاستخدام.
- **حارس الامتثال في CI** — فحص حتمي للعبارات المطلقة ("نتائج مضمونة"، "آمن كلياً"، أي ادعاء "100%"، ادعاءات فريق طبي…) في **كل** المقالات والمنتجات وصفحات الدليل؛ أي انتهاك يفشل البناء.
- **فرز ذكي** — صفحات الفئات ترتب حسب: المخزون → مميز → درجة الشعبية → السعر.

---

## 🧰 التقنيات

| الطبقة | التقنية |
| --- | --- |
| Framework | React 19 + TypeScript 6 |
| Build | Vite 8 (تقسيم كود: vendor-react/router/icons/search/toast + كتالوجات منفصلة) |
| Routing | TanStack Router (file-based، 21 مسارًا) |
| Styling | Tailwind CSS 4 (ألوان Oklch، RTL كامل) |
| البحث | Fuse.js (fuzzy، تحميل كسول) + مرادفات اللهجة المصرية (نقط ⇄ قطرات) |
| الاختبارات | Vitest (170) + Playwright (18 E2E) + data-integrity + JSON-LD validator |
| الاستضافة | Vercel Edge CDN (أساسي) · Express + Docker (نشر ذاتي مدعوم) |
| الطلبات | Google Apps Script → Google Sheets (ScriptLock + فحص تكرار كامل + هواتف دولية) |
| SEO | 248 صفحة مولّدة · JSON-LD (Product/FAQ/Article/Breadcrumb/SearchAction) · 3 sitemaps + feed |
| الصور | WebP فقط (sharp، 700–800px، q45–55) + alt/title وصفية |
| الأمان | CSP · HSTS · COOP/COEP · Report-To · NEL · CORS صارم · rate limits بمعرّفات IP مُجزّأة · HMAC لقراءة المراجعات · error tracking بلا PII |

---

##  التشغيل المحلي

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

| المتغير | مطلوب | الغرض |
| --- | --- | --- |
| `GOOGLE_SHEETS_WEBHOOK_URL` | ✅ | رابط Web App الخاص بـ Apps Script (طلبات + مراجعات) |
| `SITE_URL` | ✅ | الأصل الرسمي (canonicals، feeds، OG tags) |
| `GOOGLE_SHEETS_REVIEWS_TOKEN` | ⚠️ للمراجعات | مفتاح HMAC لقراءة المراجعات (يجب أن يطابق `REVIEW_READ_TOKEN` في السكريبت؛ بدونها قسم المراجعات معطّل بصمت) |
| `GOOGLE_SHEETS_WEBHOOK_SECRET` | اختياري | سر كتابة مشترك (يجب أن يطابق `WEBHOOK_SECRET` في السكريبت) |
| `VITE_ERROR_SINK_URL` | اختياري | منفذ أخطاء متوافق مع Sentry (console فقط في dev) |

### الأوامر

| الأمر | الوصف |
| --- | --- |
| `npm run dev` | خادم التطوير (port 8080) |
| `npm run build` | بناء الإنتاج + sitemaps/feeds + prerender لـ 248 صفحة |
| `npm run preview` | معاينة بناء الإنتاج محليًا |
| `npm run build:ssr` | بناء + prerender لـ Express الخادم الذاتي |
| `npm start` / `start:dev` | تشغيل الخادم الذاتي (إنتاج / watch) |
| `npm run test` | حارس data-integrity (كتالوج، امتثال، عبارات، شبكة redirects) |
| `npm run test:unit` | اختبارات Vitest + أمان الـ API (170) |
| `npm run test:e2e` | باقة Playwright E2E (18) |
| `npm run test:schemas` | مجرّب JSON-LD لكل صفحة مولّدة |
| `npm run test:sources` | فحص دعم الادعاءات بالمصادر للمقالات الجديدة |
| `npm run test:all` | integrity + unit + build + schemas |
| `npm run ci` | lint + typecheck + test:all |
| `npm run audit:deps` | `npm audit --audit-level=high` |
| `npm run release` | سير bump الإصدار ورقم الكاش |

---

## ✨ المميزات

### 🔍 بحث شامل في الموقع (`/search?q=`)

- اقتراحات فورية فاصلة (Fuse.js، Ctrl/Cmd+K) في مربع الهيدر + رابط **"عرض كل النتائج"**.
- صفحة نتائج مخصصة `/search?q=…` لكل الفئات — مفهرسة عبر `SearchAction` (JSON-LD)
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

- **مبادرة الرعاية الماسية** — خصم متدرج 15% / 20% / 25% عند 1,000 / 1,500 / 2,000 ج.م.
- **خصم الباقة 20%** — باقة البيع المتقاطع المكتملة تحصل على 20% من إجمالي الباقة؛
  الخصمان **متبادلا الاستبعاد** (الباقة لها الأولوية).
- كلاهما يعاد حسابه وتفرضه **السيرفر** من `bundles-db.json` — قيم العميل لا تُثق.

### 🛡️ امتثال المنتجات والمحتوى

- **سياسة حسب القناة** — الـ 3 أدوية المتبقية مخفية عن كل قناة خارجية ومحمية noindex
  متعدد الطبقات، وقابلة للشراء برابط مباشر للعملاء الحاليين.
- **حارس العبارات الطبية في CI** — قائمة محكّمة من العبارات المطلقة تُفحص عبر
  كل المقالات والمنتجات وصفحات الدليل في كل بناء؛ أي ارتداد يفشل CI.
- **حيوية المصادر في CI** — الـ 54 رابط مصدر فريدًا في المقالات تُعاد فحوصتها كل push
  (3 محاولات بتراجع تصاعدي؛ تصنيف "السلطات المرجعية غير المستقرة"، و404 حقيقي يفشل).

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
│   ├── features/product/     # ProductReviews (المراجعات المعتمدة) + مكونات المنتج
│   ├── data/
│   │   ├── products.ts       # 82 منتجًا + محددات البحث والمرادفات
│   │   ├── products/         # men.ts · women.ts · devices.ts (مصدر الكتالوج)
│   │   ├── articles.ts       # 56 مقالًا بمصادر موثوقة
│   │   ├── landing-pages.ts  # 93 صفحة دليل (مصدر build؛ تُقدّم JSON لكل slug وقت التشغيل)
│   │   ├── product-types.ts  # واجهات TypeScript
│   │   └── product-faqs.ts   # مخططات الأسئلة الشائعة المشتركة
│   ├── lib/
│   │   ├── seo.ts                    # meta + JSON-LD builders + canonical
│   │   ├── product-compliance.ts     # استبعاد القنوات الخارجية (سياسة noindex)
│   │   ├── bundle-discount.ts        # خصم الباقة 20% (مستبعد متبادل مع الشرائح)
│   │   ├── promo.ts                  # شرائح الرعاية الماسية 15/20/25%
│   │   ├── governorates.ts           # 27 محافظة + شحن + submitToGoogleSheets
│   │   ├── search-terms.ts           # توسيع مرادفات اللهجة (نقط ⇄ قطرات)
│   │   ├── product-reviews.ts        # تقييمات العرض الحتمية لكل منتج
│   │   ├── error-tracking.ts         # sink أخطاء بلا PII (allowlist context)
│   │   ├── internal-links.ts         # محرك الربط المتقاطع (منتجات ↔ مقالات ↔ أدلة)
│   │   ├── cache.ts                  # رقم كاش مركزي (config/cache-version.json)
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
│   └── lib/rate-limiter.js   # rate limiter داخل العملية بمعرّفات مُجزأة + تنظيف
├── scripts/
│   ├── prerender-seo.mjs           # 248 صفحة HTML + JSON-LD (Product/ItemList/FAQ/Breadcrumb)
│   ├── generate-sitemap.mjs        # sitemaps (238) + feed (79) + robots + security.txt + قالب بحث
│   ├── check-source-links.mjs      # حيوية المصادر الكاملة (3 محاولات + تصنيف السلطات)
│   ├── validate-schemas.mjs        # مجرّب JSON-LD لكل مخططات كل الصفحات
│   ├── validate-article-sources.mjs # فحص دعم الادعاءات بالمصادر (مقالات جديدة)
│   ├── data-integrity.test.mjs     # حارس الكتالوج/الامتثال/العبارات/شبكة redirects (بوابة البناء)
│   ├── auto-generate-article.mjs   # خط مقالات Gemini (تشغيل يدوي)
│   ├── optimize-images.mjs         # خط sharp WebP
│   ├── process-hero.mjs            # معالجة صور الهيرو
│   ├── release.mjs                 # سير bump الإصدار
│   ├── sync-vercel-redirects.mjs   # مزامنة redirects مع الكتالوج
│   └── health-check.mjs            # تدقيق أحجام الحزم والصور
├── e2e/checkout.spec.ts      # 18 اختبار Playwright (checkout، بحث، مراجعات، 404s)
├── server/index.js           # خادم Express للنشر الذاتي (نفس dist/ + نفس الـ API)
├── .github/workflows/ci.yml  # 5 وظائف CI (أدناه)
├── public/
│   ├── images/               # 138 WebP + thumbs/ + thumbs-180/
│   ├── landing-pages/        # 93 JSON لكل slug (مصدر بيانات وقت التشغيل)
│   ├── sitemap.xml           # 238 رابط + قالب بحث جوجل
│   ├── sitemap-images.xml    # 135 رابط صورة
│   ├── sitemap-index.xml
│   ├── catalog-feed.xml      # Google Shopping (79) + مرآة CSV/TXT
│   ├── sw.js                 # kill-switch هجرة PWA (يلغي نفسه، network-only)
│   ├── scripts/ga-loader.js  # تحميل GA4 مؤجل (2ث + تفاعل، send_page_view:false)
│   └── .well-known/security.txt
├── google-apps-script.gs     # الـ webhook: طلبات + مراجعات + تحقق HMAC + سر كتابة
│                             # + دالة trigger التنظيف اليومي (setupAutoCleanupTrigger)
├── vercel.json               # 14 مجموعة headers أمان + 162 redirect + rewrites
├── Dockerfile · docker-compose.yml
├── SECURITY.md · CHANGELOG.md · ANALYSIS.md
└── index.html
```

---

## 🧪 الاختبارات وCI

خمس وظائف على كل push (+ فحص أسبوعي يوم السبت للمصادر):

| الوظيفة | البوابة |
| --- | --- |
| 🔗 Corpus Source Liveness | 54 رابط مصدر فريدًا (3 محاولات بتراجع + تصنيف السلطات غير المستقرة) |
| 🔍 Lint • Typecheck • Unit • Data Integrity | ESLint · `tsc` · 170 اختبار وحدة/API · حارس الكتالوج+الامتثال+العبارات+شبكة redirects |
| 🛡 Security Audit | `npm audit --audit-level=high` على الشجرة المقفلة |
| 🏗 Build • Prerender • Sitemaps | Vite + 248 صفحة مولّدة + sitemaps/feeds |
| 🚦 Lighthouse Performance Budget | موازِن أداء LHCI على الموقع المبنى |

محليًا: `npm run ci` (lint + typecheck + test:all) و`npm run test:e2e`.

---

## 🚀 النشر

### Vercel (الأساسي)

CI/CD تلقائي على كل push إلى `main`:

1. `vite build` → `dist/` محسّن ومقسّم
2. `generate-sitemap.mjs` → sitemaps (238 + قالب بحث) + feed (79) + robots + security.txt + landing JSON
3. `prerender-seo.mjs` → 248 صفحة مولّدة بـ SEO meta + JSON-LD كامل
4. Vercel يقدّم `dist/` من Edge CDN مع 14 مجموعة headers أمان + 162 redirect

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
  id: "m-68",                              // المعرف التالي
  slug: "your-product-slug",               // اسم إنجليزي مناسب للـ URL
  name: "اسم المنتج",
  nameEn: "Product Name",
  category: "men",                          // men | women | devices
  price: 300,                               // ج.م
  description: "وصف تفصيلي…",               // ≥ 80 حرفًا — بلا عبارات مطلقة (مفروضة من CI)
  benefits: ["فائدة 1", "فائدة 2"],
  ingredients: "المكونات مع أدوارها…",
  usage: "طريقة الاستخدام + تحذيرات…",
  image: "/images/your-product-slug.webp",
  stock: 100,
  rating: 0,                                // 0 حتى توجد مراجعات حقيقية مدعومة بطلبات
  reviews: 0,
  // searchAliases?: ["كلمة محلية شائعة"],
}
```

ثم أضيفي الصورة (800×800 WebP) في `public/images/` والمصغّرات في `thumbs/` و`thumbs-180/`.
شغّلي `npm run build` — الـ sitemap والـ prerender والـ feed و`products-db.json`
يتحدثون تلقائيًا.

> ⚠️ **حارس العبارات**: الوصف والفوائد والمكونات وطريقة الاستخدام تُفحص في كل بناء
> بحثًا عن عبارات مطلقة. صياغة "دعم" ("يدعم"، "يساعد على") — وليس ضمانات
> ("يضمن"، "نتائج مضمونة"، "100%").

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

كل مقال يحتاج **مصدرين موثوقين https فأكثر**؛ `npm run test:sources` يتحقق من
دعم الادعاءات بالمصادر، وCI حيوية المصادر يعيد فحص كل الروابط كل push.

---

## 📄 الترخيص

كل الحقوق محفوظة © 2026 Elysr Medical Group.
مشروع خاص وملكية فكرية محفوظة.

---

<div align="center">

**صُنع بـ ❤️ في القاهرة، مصر**

[الموقع](https://elysrmedical.store) · [واتساب](https://wa.me/201098088206) · [إيميل](mailto:info@elysrmedical.store)

</div>
