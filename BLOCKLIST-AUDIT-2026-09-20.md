# فحص شامل لقوائم الحظر والاستبعاد والسماح داخل المشروع

**التاريخ:** 2026-09-20
**النطاق:** ملفات المصدر والإعدادات وواجهات API وApps Script وملفات SEO والتوليد والاختبارات و`dist/` الناتج من آخر build.
**عدد الملفات المتتبعة وقت الفحص:** 680 ملفًا.

> هذا التقرير يفرّق بين **الحظر الفعلي الآن**، و**قوائم السماح/الرفض التشغيلية**، و**القوائم التاريخية الموجودة للتوافق والاختبارات**. وجود كلمة `blocked` في تعليق قديم لا يعني أن الحظر فعال.

## 1. الخلاصة التنفيذية

| المجال | الحالة الحالية |
|---|---|
| حظر منتجات Google Merchant / feed | **لا توجد منتجات محظورة فعليًا**: `GOOGLE_SHOPPING_BLOCKED = []` |
| المنتجات الحالية | 84 منتجًا: 54 رجال، 23 نساء، 7 أجهزة |
| مخزون صفر مستبعد من feed/cart | لا يوجد حاليًا؛ المنتجات الـ84 كلها `stock > 0` |
| استبعاد الصفحة الرئيسية | 3 منتجات فقط: `m-02`, `m-03`, `m-49` — استبعاد عرض، وليس حظر بيع أو SEO أو feed |
| المنتجات الدوائية المحذوفة | 4 IDs غير موجودة في الكتالوج الحالي، وروابطها القديمة تعمل Redirect إلى القسم |
| حظر Crawlers في robots.txt | `CCBot` و`Bytespider` فقط |
| صفحات noindex ثابتة | 5 ملفات ناتجة: 404، cart، order-confirmed، search، wishlist؛ دليلا Cialis/Levitra قابلان للفهرسة بعد الإصلاح |
| حظر المنتجات من noindex حاليًا | لا يوجد؛ القائمة النشطة فارغة |
| API | CORS/Origin + methods + rate limits + payload/field validation + `X-Robots-Tag` للـ API |
| مراجعات العملاء | لا تظهر إلا بعد اعتماد المالك؛ الحالة الابتدائية `قيد المراجعة` |

---

## 2. قوائم المنتجات والاستبعاد التجاري

### 2.1 قائمة Google Shopping النشطة

**المصدر:** `src/lib/product-compliance.ts:25`

```ts
export const GOOGLE_SHOPPING_BLOCKED = new Set<string>([]);
```

هذه القائمة تُستهلك في:

- `scripts/generate-sitemap.mjs` — استبعاد المنتج من `catalog-feed.xml` وsitemap.
- `scripts/prerender-seo.mjs` — تحويل صفحة المنتج إلى `noindex` وعدم وضع Product JSON-LD.
- `src/lib/seo.ts` — استبعاد المنتج من ItemList.
- `src/routes/products.$slug.tsx` — meta robots للمنتج.
- `src/components/ProductCard.tsx` — `rel="nofollow"` للروابط.
- `scripts/validate-schemas.mjs` و`data-integrity.test.mjs` — فحص عدم تسرب المنتج إلى feed/sitemap/schema.

**النتيجة:** لا يوجد أي ID داخل الحظر النشط الآن. لم تتغير قائمة Merchant/feed أو سياسة الإعلانات تلقائيًا؛ الكتالوج الحالي يولّد artifacts وفق السياسة القائمة، بينما نطاق الاستعادة هو العرض على الموقع.

### 2.2 الاستبعاد من الصفحة الرئيسية فقط

**المصدر:** `src/data/products.ts:92-96`

```text
m-02  Boost Up MAN
m-03  Powerfully Up
m-49  Power Fully Up Advanced
```

**التأثير:** لا تظهر هذه المنتجات في أقسام الصفحة الرئيسية `ProductsTabs` و`ShopByConcern`.

**لا يؤثر على:**

- صفحة القسم `/products/men`.
- البحث.
- صفحة المنتج المباشرة.
- الشراء.
- catalog feed.
- sitemap.
- Google indexing.

هذه قائمة **تجارية/عرضية** وليست قائمة حظر أمنية أو امتثالية.

### 2.3 حظر المخزون

المنتج يُرفض أو يُستبعد عندما:

- `stock <= 0` في `src/lib/cart-normalization.ts:64-67`.
- feed يستعمل `isCatalogFeedEligible` ويشترط `stock > 0`.
- بطاقة المنتج تعطل الإضافة عند نفاد المخزون في `src/components/ProductCard.tsx`.
- API الطلب يرفض المنتج غير الموجود أو الذي مخزونه أقل من 1 في `api/submit-order.js:301-308`.

**الحالة الحالية:** `api/lib/products-db.json` يحتوي 84 منتجًا، وجميعها `stock > 0`؛ لذلك لا يوجد حاليًا منتج مستبعد بسبب المخزون.

### 2.4 المنتجات المحذوفة نهائيًا من الكتالوج

هذه IDs غير موجودة ضمن الكتالوج الحالي، ولذلك لا يمكن طلبها من API ولا تظهر في feed أو sitemap:

```text
m-36  Vegal
m-43  Procomil Fort
m-47  Levitra
w-24  Black Widow Drops
```

مصادر التحقق:

- `src/data/products.ts` — الكتالوج الحالي.
- `src/lib/product-compliance.ts` — السجل التاريخي.
- `scripts/sync-vercel-redirects.mjs` — redirects إلى `/products/men` أو `/products/women`.
- `vercel.json` — redirects المنشورة.

### 2.5 قائمة ملفات المنتجات التاريخية التي يمنعها Schema Validator

**المصدر:** `scripts/validate-schemas.mjs:43-55`

هذه ليست قائمة runtime تمنع الزائر، بل قائمة CI تمنع إعادة ظهور URL/Schema لمنتجات محذوفة:

```text
products/vegal-extra-sildenafil-130mg-cobra.html
products/levitra-100mg.html
products/procomil-fort-tablet.html
products/black-widow-drops.html
products/viagra-1-2-3-2-10-tablets.html
```

أي ظهور لها في ItemList أو Product JSON-LD يفشل `test:schemas`. أما slugs المنتجات الخمسة المُعادة فأزيلت من هذه القائمة وأصبحت صفحات حية.

### 2.6 Redirects للروابط القديمة

يوجد 171 redirect في `vercel.json`، منها:

- IDs قديمة لكل المنتجات.
- slugs لمنتجات محذوفة.
- slugs تاريخية للمنتجات المحذوفة مثل Vegal وLevitra وProcomil Fort وBlack Widow، مع redirects product-ID للمنتجات المُعادة إلى صفحاتها الحية.
- `/thank-you` إلى `/order-confirmed`.
- مسارات `/blog` و`/articles` القديمة إلى `/education`.

المنتجات المحذوفة لا تُحوّل إلى منتج بديل؛ تُحوّل إلى القسم العام لتجنب إسناد منتج مختلف إلى URL القديم.

---

## 3. حظر محركات البحث والروبوتات

### 3.1 `robots.txt`

**المصدر:** `public/robots.txt`، والمولد `scripts/generate-sitemap.mjs:642-679`

#### مسموحون صراحةً

```text
GPTBot
ChatGPT-User
Google-Extended
PerplexityBot
anthropic-ai
Claude-Web
```

وجميعهم `Allow: /`.

#### محظورون صراحةً

```text
CCBot       Disallow: /
Bytespider  Disallow: /
```

#### Googlebot-Image

مسموح له فقط:

```text
/images/
/logo.png
/og-default.webp
/apple-touch-icon.png
```

لا توجد قاعدة `Disallow` عامة لـ Googlebot؛ الصفحات الخاصة تعتمد على `noindex` حتى يتمكن Google من قراءة الوسم.

### 3.2 صفحات noindex الحالية

كان الفحص الأولي قد سجّل 7 ملفات تحمل noindex. بعد تنفيذ الإصلاح وإعادة البناء، أصبح العدد 5 ملفات؛ دليلا Cialis وLevitra أزيلا من القائمة وأضيفا إلى sitemap:

| الملف | التوجيه |
|---|---|
| `dist/404.html` | `noindex,nofollow` |
| `dist/cart.html` | `noindex,follow,noarchive,nosnippet,noimageindex` |
| `dist/order-confirmed.html` | نفس التوجيه الكامل |
| `dist/search.html` | نفس التوجيه الكامل |
| `dist/wishlist.html` | نفس التوجيه الكامل |

المصادر:

- `src/routes/cart.tsx`
- `src/routes/order-confirmed.tsx`
- `src/routes/search.tsx`
- `src/routes/wishlist.tsx`
- `src/data/landing-pages.ts`
- `src/lib/seo.ts`
- `scripts/prerender-seo.mjs`

### 3.3 API noindex

كل مسارات `/api/*` تحمل:

```text
X-Robots-Tag: noindex, nofollow, noarchive, nosnippet
Cache-Control: no-store
```

وذلك من `vercel.json` ومن `server/index.js`، مع تكرار header داخل handlers الحساسة:

- `/api/submit-order`
- `/api/submit-review`
- `/api/reviews`
- `/api/csp-report`
- `/api/errors`

### 3.4 صفحات noindex الديناميكية

`src/routes/__root.tsx` يقرأ meta robots من route ثم يعيد تطبيقها أثناء SPA navigation. وعند Error/NotFound يتم تطبيق noindex لمنع فهرسة صفحات الخطأ.

---

## 4. حظر المتصفح عبر CSP وSecurity Headers

**المصدر الأساسي:** `config/security-headers.mjs`.

### 4.1 CSP: المسموح فقط

أي مصدر غير موجود في القوائم التالية محظور افتراضيًا بسبب `default-src 'self'`.

| النوع | المصادر المسموحة |
|---|---|
| `script-src` | `'self'`, `www.googletagmanager.com`, `www.google-analytics.com` |
| `script-src-attr` | `'none'` — كل inline event attributes محظورة |
| `style-src` | `'self'`, `'unsafe-inline'` |
| `font-src` | `'self'`, `data:` |
| `img-src` | `'self'`, `data:`, `blob:`, Google Tag Manager، Google Analytics، `*.g.doubleclick.net` |
| `connect-src` | `'self'`, Google Apps Script، Google Analytics، Google Tag Manager، DoubleClick، `*.google.com` |
| `worker-src` | `'self'` |
| `frame-ancestors` | `'self'` فقط؛ منع embedding من origins أخرى |
| `form-action` | `'self'` فقط؛ النماذج لا تُرسل إلى origin خارجي مباشرة |
| `base-uri` | `'self'` |
| `object-src` | `'none'` — plugins/objects محظورة بالكامل |
| `manifest-src` | `'self'` |
| `media-src` | `'self'` |

كما يوجد `upgrade-insecure-requests` و`report-uri /api/csp-report`.

### 4.2 Headers تمنع الاستخدام أو التسريب

في `vercel.json` و`server/index.js`:

- `X-Frame-Options: SAMEORIGIN`.
- `X-Content-Type-Options: nosniff`.
- `Permissions-Policy`: منع `camera`, `microphone`, `geolocation`, `payment`, `usb`.
- `X-Permitted-Cross-Domain-Policies: none`.
- `Cross-Origin-Opener-Policy: same-origin`.
- `Origin-Agent-Cluster: ?1`.
- HSTS في الإنتاج: `max-age=63072000; includeSubDomains; preload`.
- `X-XSS-Protection: 0` وفق الممارسة الحديثة، مع الاعتماد على CSP.

---

## 5. قوائم السماح والرفض في CORS/API

### 5.1 Origins المسموحة للطلب والمراجعات

في `api/submit-order.js`, `api/submit-review.js`, و`api/reviews.js`:

```text
https://elysrmedical.store
https://www.elysrmedical.store
```

ويُضاف حسب البيئة:

- `SITE_URL` إذا كان مضبوطًا.
- `https://VERCEL_URL` فقط عندما لا تكون البيئة production.
- `http://localhost:8080` فقط خارج production.

في `submit-order` و`submit-review` يوجد رفض فعلي `403` إذا لم يطابق Origin/Referer القائمة، مع fallback same-origin مشروط بـ `Host` و`Sec-Fetch-Site`.

### 5.2 Origins الخاصة بتقارير الأخطاء وCSP

`api/errors.js` و`api/csp-report.js` يسمحان في CORS بعرض الرد للنطاقين الرسميين فقط. Origin آخر لا يحصل على CORS origin الخاص به، لكن handler لا يرفض POST بـ403؛ الحماية هنا logging/rate-limit/حجم body، وليس Origin gate كاملًا.

### 5.3 HTTP Methods

| Endpoint | المسموح |
|---|---|
| `/api/submit-order` | `POST`, `OPTIONS` |
| `/api/submit-review` | `POST`, `OPTIONS` |
| `/api/reviews` | `GET`, `OPTIONS` |
| `/api/errors` | `POST`, `OPTIONS` |
| `/api/csp-report` | `POST`, `OPTIONS` |
| `/api/health` | `GET`, `HEAD` |
| `/health` self-hosted | `GET` |

أي method آخر يرفض غالبًا بـ405.

### 5.4 حقول الطلب المسموحة إلى Sheets

**المصدر:** `api/submit-order.js:454-472`

```text
orderId
orderType
paymentMethod
customerName
customerPhone
governorate
address
notes
items
subtotalBeforeDiscount
discount
bundleDiscount
subtotal
shipping
total
promoApplied
referralCode
```

أي حقل آخر لا يمر إلى Sheets. كما أن مفاتيح prototype pollution التالية مرفوضة صراحةً:

```text
__proto__
constructor
prototype
```

### 5.5 أنواع الطلب والدفع

القيم المقبولة فقط:

```text
orderType:     cart | شراء فوري
paymentMethod: واتساب | طلب مباشر
```

### 5.6 المنتجات والأسعار والخصومات

يُرفض الطلب إذا:

- المنتج غير موجود في الكتالوج الرسمي.
- المنتج نفد مخزونه.
- يوجد نفس المنتج أكثر من مرة داخل الطلب.
- السعر المرسل لا يساوي السعر الرسمي.
- subtotal أو discount أو bundle discount أو shipping أو total لا يطابق الحساب السيرفري.
- المحافظة ليست ضمن `GOVERNORATE_SHIPPING`.
- كود الإحالة لا يطابق `EL-[A-Z0-9]{4,8}`.
- الهاتف ليس رقمًا مصريًا صحيحًا أو E.164 دوليًا.

### 5.7 حدود الطلب

| القيد | القيمة |
|---|---:|
| body API للطلب | 64KB |
| عدد أسطر المنتجات | 1 إلى 50 |
| كمية المنتج في API | integer من 1 إلى 9999، ثم فحص stock |
| إجمالي الوحدات | 100 كحد أقصى |
| السلة في الواجهة | 50 منتجًا مختلفًا كحد أقصى |
| كمية المنتج في السلة | `min(stock, 99)` |
| مهلة Google Sheets | 10 ثوانٍ |

---

## 6. Rate Limits والرفض التشغيلي

### 6.1 طبقة Node/Vercel

| المسار | الحد | المفتاح |
|---|---:|---|
| submit order | 30/دقيقة لكل instance/IP | IP hash |
| submit review | 3/دقيقة لكل IP | IP hash |
| read reviews | 10/دقيقة لكل IP | IP hash |
| CSP reports | 50/دقيقة لكل IP | IP hash |
| error reports | 30/دقيقة لكل IP | IP hash |

كل memory limiter له حد أقصى 20,000 entry مع تنظيف دوري، وIP يُهشّ قبل التخزين.

### 6.2 Google Apps Script

- الطلبات: 15/دقيقة لكل هاتف، مع استخدام IP بدل الهاتف لرقم الاختبار `01000000000` في طلب الشراء الفوري.
- المراجعات: 15/دقيقة لكل هاتف أو IP.
- `ScriptLock` ينتظر 10 ثوانٍ؛ يمنع السباق وتكرار orderId.
- الطلب المكرر بنفس orderId لا يُسجل مرة ثانية، ويعيد نجاحًا مع note duplicate.
- السر `WEBHOOK_SECRET` إلزامي؛ غيابه أو عدم مطابقته يرفض كل الكتابة `Forbidden`.

### 6.3 حدود تقارير الأخطاء وCSP

- CSP body: 4KB.
- Error body: 32KB.
- CSP fields: تنظيف وحصر حتى 160 حرفًا، وإزالة query string.
- Error fields: allowlist مع truncation؛ لا يمرر body كاملًا.
- تقارير `eval` و`inline` في CSP تُعتبر noise وتُسقط بـ200 دون تسجيل.
- Breadcrumbs: الواجهة تحفظ حتى 20، والـAPI يسجل آخر 10 فقط.

---

## 7. المراجعات: قوائم السماح والرفض

### 7.1 مراجعة العميل

**المصدر:** `api/submit-review.js`, `src/features/product/components/CustomerReviews.tsx`

يُرفض:

- `productId` غير الموجود في الكتالوج الرسمي.
- rating خارج 1–5 أو غير integer.
- نص أقل من 10 أو أكبر من 600 حرفًا.
- اسم أطول من 60 حرفًا.
- هاتف غير مصري/دولي أو أطول من 16 حرفًا.
- body أكبر من 8KB.
- Origin غير مسموح.
- أكثر من 3 إرساليات في الدقيقة لكل IP.

### 7.2 حالة المراجعة في Google Sheets

القيم المسموحة في Data Validation:

```text
قيد المراجعة
معتمد
مرفوض
```

المراجعة الجديدة تدخل دائمًا `قيد المراجعة`. الموقع يقرأ `معتمد` فقط.

### 7.3 قراءة المراجعات

- HMAC-SHA256 قصير العمر.
- نافذة الصلاحية: 5 دقائق.
- nonce يُستخدم مرة واحدة ويُحفظ 10 دقائق.
- المنتج يجب أن يكون ضمن الكتالوج.
- التقييم 1–5.
- النص 10–600 حرف.
- الحد الأقصى المعروض: 20 مراجعة.
- الهاتف لا يخرج في API response.
- إذا كان السر/webhook ناقصًا أو حدث خطأ: قائمة فارغة، وليس بيانات غير موثوقة.

---

## 8. قوائم المحتوى والامتثال في CI

### 8.1 و8.2 قواعد الكلمات الطبية — أُلغيت بقرار المالك

كان الفحص الأولي يوثق قائمتين معجميتين داخل `scripts/data-integrity.test.mjs`:

- عبارات ادعاءات مطلقة مثل «نتائج مضمونة» و«آمن تماماً» و«فعالية كاملة».
- كلمات دوائية مثل `sildenafil` و`cialis` ومقابلاتها العربية، مع إلزام
  الصفحة بـ`noindex` أو تحذير طبي.

تم إلغاء القاعدتين من CI بناءً على قرار المالك الحالي. لا توجد الآن قائمة
كلمات ثابتة تمنع build أو تفرض noindex/تحذيرًا طبيًا. ما زالت فحوصات بنية
البيانات، metadata المولّدة، schema، redirects، وأهلية feed فعالة، كما بقي
فحص مصادر المقالات المستقلة في `scripts/validate-article-sources.mjs`.

### 8.3 مصادر المقالات المسموحة

**المصدر:** `scripts/validate-article-sources.mjs:31-55`

المصادر يجب أن تكون ضمن allowlist من 23 نطاقًا طبيًا/علميًا، منها:

```text
who.int
nih.gov
ncbi.nlm.nih.gov
medlineplus.gov
cdc.gov
nhs.uk
mayoclinic.org
clevelandclinic.org
urologyhealth.org
apa.org
bmj.com
jamanetwork.com
nejm.org
nature.com
springer.com
sciencedirect.com
wiley.com
frontiersin.org
cochranelibrary.com
thelancet.com
harvard.edu
hopkinsmedicine.org
msdmanuals.com
```

كما يرفض validator:

- URL غير HTTPS.
- أقل من 3 مصادر للمقال الآلي.
- صفحة مصدر قصيرة جدًا أو لا تطابق عنوان المصدر.
- روابط غير قابلة للتحقق حسب قواعد السكربت.

`who.int` له استثناء `FLAKY_AUTHORITY_HOSTS` في فحص liveness: أخطاء 5xx/timeout تُصنف غير قابلة للتحقق، لكن 404 الدائم يظل فشلًا.

---

## 9. تنقية بيانات المستخدم ومنع المسارات الخطرة

**المصادر:** `src/lib/utils.ts`, `src/lib/analytics.ts`, `src/lib/error-tracking.ts`, `server/index.js`

### 9.1 النصوص

`sanitizeInput` يزيل/يمنع:

```text
< > " ' & \\ `
javascript:
data:
on*= event handlers
```

ويضيف apostrophe عند بداية النصوص التي قد تصبح Formula/CSV Injection:

```text
=  +  -  @  tab  carriage return
```

رسائل WhatsApp تزيل أيضًا رموز التنسيق:

```text
* ~ | # { } [ ]
```

### 9.2 Analytics

- لا تُرسل query/hash في URLs.
- outbound URLs يجب أن تكون HTTP/HTTPS absolute وإلا تُسقط.
- search text الذي يشبه URL/email/phone يتحول إلى `[redacted]`.
- WhatsApp `?text=` لا يصل إلى GA4.

### 9.3 مسارات الخادم

`server/index.js` يرفض mapping لأي URL يحتوي:

```text
..
segments تبدأ بنقطة
```

والملفات غير الموجودة لا تحصل على SPA fallback مفتوح؛ تعود 404 حقيقية.

---

## 10. قيود التخزين المحلي والواجهة

هذه ليست قوائم حظر منتجات، لكنها limits تمنع التضخم أو البيانات الفاسدة:

| الوظيفة | الحد |
|---|---:|
| recently viewed | 12 عنصرًا |
| wishlist | 100 عنصر |
| cart items | 50 منتجًا مختلفًا |
| cart quantity | 99 أو stock أيهما أقل |
| breadcrumbs في error tracking | 20 في الواجهة، آخر 10 في API |
| reviews المعروضة | 20 مراجعة لكل منتج |
| reviews cache | 500 product key كحد أمان، TTL خمس دقائق |

---

## 11. ملاحظات اتساق مهمة

### 11.1 حالة الاستعادة الحالية

أُعيدت المنتجات الخمسة التالية إلى الكتالوج والعرض العام من المصدر التاريخي الموثوق، دون اختلاق بيانات أو reviews:

```text
m-34  Hard-On
m-37  Cialis
m-38  Power 36
m-45  Viagra Pfizer
w-17  Viagra for Women
```

واستُعيدت صورها الأصلية ونسخ thumbnails، وأصبحت صفحاتها مفهرسة بنيويًا دون قواعد noindex خاصة بها. لم تتغير `GOOGLE_SHOPPING_BLOCKED` أو سياسة Merchant/feed تلقائيًا، لأن عدم استخدام Google Ads قرار منفصل عن نطاق الاستعادة الحالي.

### 11.2 تعليقات `product-compliance.ts`

تم فصل السجل التاريخي للمنتجات الأربعة المحذوفة حاليًا عن المنتجات الخمسة المُعادة في المصدر التنفيذي الحالي؛ `GOOGLE_SHOPPING_BLOCKED = []` بقيت كما هي.

### 11.3 `ANALYSIS.md` يحتوي نتائج تاريخية

تقرير `ANALYSIS.md` يذكر في مواضع قديمة وجود حظر نشط لبعض المنتجات، بينما المصدر الحالي والقوائم المولدة يقولان إن الحظر النشط فارغ. يجب اعتبار الكود وملفات build الحالية مصدر الحقيقة، لا التقرير القديم.

### 11.4 `SECURITY.md` يذكر COEP — تم الإصلاح

تم تصحيح `SECURITY.md` وملفات README إلى `COOP + OAC`؛ لا يوجد ادعاء بوجود COEP غير مُرسل.

### 11.5 CORS ليس رفضًا كاملًا لكل endpoints — تم الإصلاح

`submit-order` و`submit-review` و`errors` و`csp-report` ترفض الآن Origin غير المسموح بـ403 عند وجوده. الطلبات بلا Origin تظل مسموحة لتقارير المتصفح server-to-server، مع استمرار rate limits وbody limits وsanitation وعدم إرجاع بيانات حساسة.

---

## النتيجة النهائية

لا يوجد حاليًا **حظر منتجات نشط** في قائمة `GOOGLE_SHOPPING_BLOCKED` أو sitemap أو feed وفق سياسة المشروع الحالية؛ ولم يتخذ هذا التعديل قرارًا جديدًا بشأن Google Ads. الحظر الفعلي الموجود في المشروع حاليًا ينقسم إلى:

1. حظر روبوتين في `robots.txt`.
2. noindex لصفحات الحساب/البحث/التأكيد فقط؛ دليلا Cialis وLevitra قابلان للفهرسة مع تحذيرات طبية.
3. noindex لكل API.
4. CSP تمنع كل origins غير allowlisted.
5. CORS وmethods وrate limits تمنع إساءة استخدام APIs.
6. validation يمنع التلاعب بالمنتجات والأسعار والمخزون والخصومات.
7. moderation تمنع ظهور المراجعات غير المعتمدة.
8. CI يتحقق من صحة البيانات والمصادر وإعادة ظهور URLs الدوائية المحذوفة، دون قائمة كلمات ادعاءات ثابتة.
9. استبعاد عرضي فقط لثلاثة منتجات من الصفحة الرئيسية.
10. redirects تاريخية بدل تقديم المنتجات المحذوفة.

---

## ملحق التنفيذ — 2026-09-20

تم تنفيذ ملاحظات هذا الفحص والتحقق منها بعد التعديل:

1. **دليلا Cialis وLevitra قابلان للفهرسة الآن**: أزيل `noindex` من المصدر، وتولدت metadata وملفات JSON من جديد، وأصبحا ظاهرين في `public/sitemap.xml`.
2. **التحقق المباشر**: صفحات الدليلين في `dist/` تحمل `robots` و`googlebot` بقيمة `index,follow`، ولا توجد لهما `noindex` في metadata المولدة.
3. **قاعدة المحتوى الدوائي**: أُزيلت قاعدة CI التي كانت تشترط noindex أو تحذيرًا طبيًا لأسماء الأدوية، وفق قرار المالك؛ بقيت اختبارات البنية وschema والبيانات فعالة.
4. **Origin rejection**: أصبح `api/csp-report.js` و`api/errors.js` يعيدان `403` عند وجود `Origin` غير مسموح، مع إبقاء الطلبات التي لا تحمل `Origin` متوافقة مع تقارير المتصفح.
5. **توثيق COEP**: صُحح إلى `COOP + OAC` في `README.md` و`README.ar.md` و`SECURITY.md`.
6. **تعليقات القوائم**: نُظفت تعليقات `product-compliance.ts` لتفصل بين `GOOGLE_SHOPPING_BLOCKED` الفارغة حاليًا والسجل التاريخي للمنتجات المحذوفة؛ لم تتغير سياسة feed أو قائمة الحظر نفسها.

### نتائج التحقق بعد التنفيذ

- `npm run lint` ✓
- `npm run typecheck` ✓
- `npm run build` ✓ — 93 landing pages، و252 صفحة prerendered، والكتالوج 84 منتجًا
- `npm test` ✓ — data integrity + security headers
- `npm run test:unit` ✓ — 22 ملفًا، 268 اختبارًا
- `npm run test:schemas` ✓ — 253 HTML، و1183 JSON-LD، صفر أخطاء/تحذيرات
- `npm run health-check` ✓ — sitemap فيها 248 رابطًا وfeed فيها 84 منتجًا
- `npx playwright install --with-deps chromium` ✓ — تم تنزيل Chromium وتثبيت dependencies النظام.
- `npm run test:e2e` ✓ — 19/19 اختبارًا ناجحًا بعد تحديث اختبارات redirects للمنتجات المُعادة.

- تم إلغاء فحص قائمة عبارات الادعاءات الطبية وقاعدة كلمات الأدوية التي كانت تفرض noindex أو تحذيرًا طبيًا داخل `scripts/data-integrity.test.mjs`، مع إزالة اختبار العبارة المطلق المكرر من `src/__tests__/compliance.test.ts`.
