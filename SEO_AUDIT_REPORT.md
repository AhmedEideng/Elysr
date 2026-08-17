# 🔍 تقرير الفحص الشامل — مشروع "اليسر ميديكال" (Elysr)

> **التاريخ:** 2026-08-13
> **النطاق:** SEO · السرعة (Core Web Vitals) · الأرشفة · الأمان · سلامة الكود
> **الحالة العامة (بعد التنفيذ):** ✅ **كل الإصلاحات (1–5) تم تنفيذها والتحقق منها**
> - البناء ينجح (284 صفحة) · الـ JSON-LD سليمة (1659 schema) · كل الاختبارات (85) تمر
> - `typecheck` ✅ صار نظيفاً · `npm audit` ✅ 0 ثغرات · السيرفر الذاتي ✅ يعمل
> - **chunk البيانات في المسار الحرج للهوم انخفض من 879 kB → 254 kB (−71%)**

---

## ✅ تحديث: ما تم تنفيذه (2026-08-13)

| # | التعديل | الحالة | الأثر المُقاس |
|---|---------|--------|--------------|
| 1 | حذف dead code في `ProductCardImage.tsx` (`thumbSrc`/`thumb180Src`) | ✅ | `typecheck` صار نظيفاً → الـ CI يعمل |
| 2 | فصل `articles.ts` عن chunk المنتجات (split chunk) | ✅ | `data-catalog`: 879 kB → **254 kB** (gzip 174 → **49.8 kB**) |
| 3 | صفحات guides تجلب JSON فردي (`fetch /landing-pages/{slug}.json`) | ✅ | `landing-pages.ts` (465 kB) خرج من كل bundle نهائياً |
| 4 | تحميل كسول لمقالات الهوم (`ArticlesGrid` → dynamic import + skeleton) | ✅ | `articles.ts` صار chunk مستقل (data-articles) يُحمّل تحت الطيّة فقط |
| 5 | `npm audit fix` (ثغرات devDeps) | ✅ | **0 vulnerabilities** |
| بونص | إصلاح انهيار `server/index.js` مع Express 5 (`app.get("*")`) | ✅ | السيرفر الذاتي يعمل (كل المسارات HTTP 200) |

### قبل / بعد — المسار الحرج للهوم (gzip)
| المكوّن | قبل | بعد |
|---------|-----|-----|
| `data-catalog` | 174 kB (منتجات+مقالات+لاندينج) | **49.8 kB** (منتجات فقط) |
| `data-articles` | — (مدمج في الكتالوج) | chunk منفصل كسول 60 kB |
| `landing-pages` | مدمج في الكتالوج | **غير مدمج نهائياً** (JSON فردي) |
| **إجمالي JS الحرج للهوم** | ~292 kB | **~168 kB** |

> ✅ في `dist/index.html` أصبحت الهوم تحمّل: `index + vendor-react + vendor-router + vendor-icons + data-catalog` فقط — **لا تُحمّل المقالات ولا اللاندينجات** في أول زيارة.

---

## ملخص التنفيذ (ما الذي يعمل الآن بعد الإصلاح)

| الفحص | النتيجة |
|-------|---------|
| `npm run build` | ✅ ينجح (284 صفحة pre-render) |
| `npm run test:all` | ✅ 85/85 اختبار يمر |
| `npm run test:schemas` | ✅ 1659 JSON-LD — 0 أخطاء |
| `npm run lint` | ✅ 0 أخطاء / 36 تحذير (benign) |
| `npm run typecheck` | ✅ **نظيف (كان يفشل — تم إصلاحه)** |
| `npm audit` | ✅ **0 ثغرات (كان 3 عالية — تم إصلاحه)** |

---

## 🔴 أولوية عالية — تم الإصلاح ✅

### 1. خطأ TypeScript يكسر CI (`ProductCardImage.tsx`)
- **المشكلة:** دالتان `thumbSrc()` و `thumb180Src()` أصبحتا **dead code**.
- **الحل المُنفَّذ:** حذف الدالتين غير المستخدمتين (إصلاح آمن 100% — لا يغيّر أي سلوك). ✅

### 2. chunk البيانات `data-catalog` ضخم في المسار الحرج للهوم — **تم الإصلاح**
- **السبب الجذري:** إعداد `manualChunks` كان يدمج **ثلاثة ملفات بيانات** (منتجات + مقالات + لاندينج) في chunk واحد.
- **الحل المُنفَّذ:** فصل `articles.ts` إلى chunk مستقل (data-articles) وإخراج `landing-pages.ts` نهائياً من البناء.
- **النتيجة:** `data-catalog` **879 kB → 254 kB** (gzip 174 → **49.8 kB**).

---

## 🟠 أولوية متوسطة — تم الإصلاح ✅

### 3. ملفات الـ JSON الـ 125 للاندينج **مولّدة لكن غير مستخدمة** — **تم الإصلاح**
- **المشكلة:** الواجهة كانت تستورد `landing-pages.ts` المدمج بدلاً من جلب الـ JSON الفردي.
- **الحل المُنفَّذ:** جعل مسار `/products/guides/$slug` يجلب `fetch('/landing-pages/{slug}.json')` (مع `type` import فقط). ✅ اختفى `landing-pages.ts` من أي bundle، وكل صفحة guide تُحمّل ملفاً صغيراً (2–4 kB) فقط.

### 4. `ArticlesGrid` في الهوم يحمّل كل الـ 51 مقال — **تم الإصلاح**
- **الحل المُنفَّذ:** تحميل كسول (`dynamic import` + skeleton) — المقالات في أسفل الصفحة تحت الطيّة، فتُسحب فقط عند اقتراب ظهورها من chunk `data-articles` المنفصل.

---

## 🟡 أمان — تم الإصلاح ✅

### 5. 3 ثغرات "عالية" في devDependencies — **تم الإصلاح**
- `npm audit fix` أعاد النتيجة إلى **0 vulnerabilities** (كلها كانت في أدوات بناء/اختبار فقط: eslint/vite/vitest — لا تمسّ الزائر).

---

## ⚪ ملاحظات أخرى (اختيارية / بعد التنفيذ)

- **36 تحذير lint** — كلها `react-refresh/only-export-components` (غير مؤثرة في الإنتاج، تنظيفها ممكن لاحقاً).
- **توافق Node:** المستودر يطلب `Node 24` (`.nvmrc`)، بيئة الفحص عندي `Node 20` — البناء نجح رغم ذلك، لكن **على خادمك استخدم Node 24** (التزاماً بـ `.nvmrc` و`engines`).
- **تحذير Vite config:** `vite.config.ts` و`vitest.config.ts` يستخدمان `__dirname` الذي سيُرفض في الإصدارات القادمة — يُنصح لاحقاً بالتحويل إلى `import.meta.dirname` (غير عاجل).
- **sitemap:** أعيد توليده وقت البناء (حدّث الـ `lastmod`). يحتوي **280 رابط**، والـ robots.txt سليم (يحجب cart/thank-you/order-confirmed، ويسمح لـ AI bots).
- **الـ JSON-LD:** كل الـ 1659 schema صحيحة بعد البناء (Product/Article/Breadcrumb/FAQ/Organization).

> ⚠️ **قبل الرفع إلى Vercel:** تأكد من أنك تدفع أيضاً ملفات `public/landing-pages/*.json` (الـ 125 ملف) — هي أساس عمل صفحات guides الآن، وهي **متتبَّعة في git** أصلاً.

---

## 📦 الملفات المُعدَّلة

| الملف | التعديل |
|-------|---------|
| `src/features/product/components/ProductCardImage.tsx` | حذف دالتين dead code (إصلاح typecheck) |
| `vite.config.ts` | تقسيم chunks (فصل المقالات، إخراج اللاندينج) |
| `src/routes/products.guides.$slug.tsx` | جلب JSON فردي بدل استيراد كل اللاندينج |
| `src/components/sections/ArticlesGrid.tsx` | تحميل كسول للمقالات + skeleton |
| `server/index.js` | إصلاح انهيار Express 5 (`app.get("*")` → RegExp) |
| `package-lock.json` | `npm audit fix` → 0 ثغرات |

---

*تم التحقق بعد كل التعديلات: `typecheck` ✅ · `test:all` (85) ✅ · `test:schemas` (1659) ✅ · `lint` ✅ · `build` (284 صفحة) ✅ · اختبار السيرفر الفعلي (HTTP 200 لكل المسارات) ✅.*
