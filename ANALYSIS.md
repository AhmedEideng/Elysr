# تحليل فني كامل لمشروع Elysr Medical — خط بخط

> تم استخراج المشروع وفحصه وتثبيته وتشغيله فعلياً:
> `npm ci` ✓ · `npm test` (data-integrity) ✓ · `npm run test:unit` (119 اختبار) ✓ · `npm run build` (246 صفحة) ✓ · خادم الإنتاج (200/404/health/noindex) ✓

---

## 1) الصورة العامة

متجر إلكتروني عربي (RTL) لمنتجات الصحة الزوجية في مصر (elysrmedical.store).
النموذج المعماري: **SPA + SSG + Serverless بدون قاعدة بيانات تقليدية**:

```
Browser ──→ Vercel CDN (dist/ ثابتة مسبقاً)
              ├─ index.html (SPA shell — React 19)
              ├─ /products/[slug].html  (82 منتجاً مُسبقة)
              ├─ /education/[slug].html (56 مقالاً)
              ├─ /products/guides/[slug].html (92 صفحة SEO)
              └─ /api/submit-order ──→ Google Apps Script ──→ Google Sheets
```

- البيانات كلها ملفات TypeScript تُبنى وقت الـ build (zero database).
- الطلبات إما عبر واتساب (القناة الأساسية) أو "طلب مباشر" يُسجّل في شيت Google.
- 82 منتجاً (52 رجال / 23 نساء / 7 أجهزة)، 56 مقالاً، 92 صفحة دليل، 152 إعادة توجيه.

## 2) بنية الملفات

| المجلد                                         | الدور                                                                                                                                     |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `src/routes/`                                  | 20 مسار TanStack Router (file-based)                                                                                                      |
| `src/data/`                                    | المنتجات (men/women/devices)، المقالات، صفحات اللاندينج                                                                                   |
| `src/lib/`                                     | seo، promo، governorates، whatsapp، utils، compliance، internal-links، reviews، error-tracking، cache، site-config                        |
| `src/components/` + `src/components/sections/` | Header/Footer/ProductCard/SearchBar/11 قسم للهوم                                                                                          |
| `src/contexts/cart.tsx`                        | حالة السلة (localStorage)                                                                                                                 |
| `src/hooks/`                                   | use-cart، use-wishlist، use-recently-viewed، use-scroll-tracking، use-pwa-install                                                         |
| `api/`                                         | submit-order + csp-report + delete-customer-data + rate-limiter                                                                           |
| `api/lib/`                                     | products-db.json + config-db.json (مولّدان وقت البناء — Single Source of Truth)                                                           |
| `server/index.js`                              | خادم Express 5 للـ SSG (Docker/Railway/تجربة محلية)                                                                                       |
| `scripts/`                                     | prerender-seo، generate-sitemap، data-integrity، sync-vercel-redirects، release، health-check، validate-schemas، validate-article-sources |
| `google-apps-script.gs`                        | Webhook الشيت (565 سطراً)                                                                                                                 |
| `e2e/` + `src/__tests__/`                      | Playwright + Vitest (10 ملفات)                                                                                                            |

## 3) تفاصيل الملف الرئيسي — سطراً بسطر

### 3.1 `index.html` (261 سطراً)

- `lang="ar" dir="rtl"`، 6 أحجام favicon + apple-touch + manifest.
- Meta كاملة: description، robots (`index,follow,max-image-preview:large`)، Googlebot منفصل (مهم لأن `applySeo` يحدّث الاثنين)، canonical + hreflang (ar-eg/x-default)، Open Graph، Twitter card.
- `facebook-domain-verification` لـ Meta Business.
- **خط Cairo مُضيف ذاتياً** (woff2) مع `preload` و`unicode-range` منفصل للعربية/اللاتينية — لا round-trip لـ Google Fonts.
- **Critical CSS** مضمّن: خلفية + font-face + `#root` يمنع FOUC.
- JSON-LD `@graph`: `Organization+MedicalOrganization` (اسم، شعار، عنوان العاشر من رمضان، إحداثيات، ساعات 9ص–10م سبت–خميس، هاتف +201098088206، `isAcceptingNewPatients:false`) + `LocalBusiness` (OfferCatalog بعدد الأصناف).
- GA يُحمّل عبر `/scripts/ga-loader.js` (defer) وليس سكريبت google مباشرة.
- `noscript` يعرض رسالة واتساب بديلاً.

### 3.2 `package.json`

- React 19.2 + TypeScript 6 + Vite 8 + TanStack Router 1.170 + Tailwind 4 + sonner + fuse.js + lucide-react.
- سكربتات مهمة: `prebuild` = generate-sitemap (توليد sitemaps + products-db.json + config-db.json)، `build` = vite build + prerender-seo، `test` = data-integrity، `test:unit` = vitest، `test:e2e` = playwright، `ci` = lint+typecheck+test:all.
- `engines: node 24`، `trustedDependencies: [esbuild, sharp]`.

### 3.3 `vite.config.ts`

- TanStackRouterVite مع `autoCodeSplitting`.
- alias `@ → src`، `dedupe` للراكت.
- `manualChunks` مقصودة جداً:
  - `data-catalog-men/women/devices` — كل فئة في تشانك مستقل فيُحمَّل قسم واحد فقط.
  - `data-articles` (تحت الطية فقط)، `data-landing` (مُستبعد فعلياً من الباندل — يُجلب JSON فردي).
  - vendor منفصل: react / router / icons / fuse / sonner.
- `target: es2022`، minify esbuild، `cssCodeSplit: true`، dev/preview على 0.0.0.0:8080.

### 3.4 `vercel.json` (992 سطراً)

- 14 قاعدة headers:
  - `/api/*`: noindex + no-store + nosniff.
  - assets/fonts/images + favicons: `max-age=31536000, immutable` (كسر الكاش عبر `?v=`).
  - sitemaps/robots/security.txt: content-type + cache قصير.
  - **قاعدة noindex مخصصة لـ 3 منتجات محظورة** (power-36/procomil-fort/viagra-pfizer): `X-Robots-Tag: noindex, follow, noarchive, nosnippet, noimageindex`.
  - قاعدة noimageindex لصورها (بما فيها thumbs).
  - `/(.*)`: 13 ترويسة أمنية موحدة (HSTS preload، CSP صارمة، COOP same-origin، OAC، Report-To→/api/csp-report، NEL، Permissions-Policy…) مطابقة حرفياً لما في server/index.js.
- 152 redirect: كل منتج `id→slug` (301) + legacy aliases (منتجات محذوفة → قسمها) + `/index.html`→`/` + `/product/:slug`→`/products/:slug`.
- rewrite واحد: `/api/(.*)` → serverless.

### 3.5 `src/main.tsx`

- **SW force-clear (v28)**: يسجّل `elysr_sw_force_clear_v28`؛ عند أول زيارة: unregister كل service workers + حذف Cache Storage + حذف `elysr_fallback` (هجرة خصوصية: الإصدارات القديمة كانت تخزن بيانات طلبات — لم تعد).
- mount React داخل try/catch يعرض خطأ مرئي بالعربية بدون حقن HTML.

### 3.6 `src/router.tsx` + `src/routes/__root.tsx`

- router: `scrollRestoration: true`، `defaultPreload: "intent"` (hover)، staleTime 30s، GC 5د.
- `__root.tsx`:
  - `installErrorTracking()` عند التحميل (listener عام error/unhandledrejection + breadcrumbs).
  - `RouteHeadSync`: يقرأ `head()` من آخر route مطابق، يستخرج title/desc/og:image/og:type/robots ثم `applySeo(...)` + `trackPageView` (GA عبر gtag أو dataLayer).
  - `CartProvider` → `ScrollRestoration` → `Layout` → `Outlet`، Toaster lazy (sonner 33KB خارج المسار الحرج)، `Analytics` + `SpeedInsights` (Vercel).
  - NotFound (404 noindex) + Error (إعادة محاولة عبر invalidate).

### 3.7 الصفحة الرئيسية `index.tsx`

9 أقسام، كل واحد مغلف بـ `SectionErrorBoundary` (عزل الأعطال):

1. Hero → 2. AnniversaryPromo (عدّاد دورة الخصم) → 3. RecentlyViewed → 4. FeaturedProducts (6 فقط) → 5. ShopByConcern → 6. WhyUs → 7. ProductsTabs (تبويبات الفئات) → 8. DailyAdvice → 9. ArticlesGrid.

### 3.8 صفحة المنتج `products.$slug.tsx` (892 سطراً — قلب المتجر)

- `loader`: جلب المنتج بالـ slug + crossSells + 4 منتجات مشابهة (مرتبة تقييم/ID).
- `head`: title = اسم المنتج، description من `makeProductMetaDescription` (غني بالسعر/التقييم لمنع Google إعادة كتابته)، **`robots noindex` تلقائياً إذا المنتج في GOOGLE_SHOPPING_BLOCKED**، og:type=product + og:image مطلق.
- في الـ component:
  - `clearPrerenderJsonLd()` ثم `injectJsonLd("product", productSchema(product))` (يُتخطى للمحظور) + breadcrumb.
  - تتبع recently-viewed، scroll tracking (`Product_slug`)، lazy import للمقالات المرتبطة.
  - **نموذج طلب سريع (quick order)**: focus trap، تحقق `isValidEgyptianPhone`، sanitize + normalize، `generateOrderId()`، حساب كامل (subtotal→tier→discount→shipping→total)، `void submitToGoogleSheets(payload)` (غير محدد — الـ redirect فوري)، فتح `wa.me/201098088206` برابط `<a target=_blank rel=noopener>`.
  - `getProductSafetyNotice`: كشف دوائي (sildenafil/tadalafil/… أو "130/60") → تنبيه طبي قوي، كشف موضعي (lidocaine/spray/تأخير) → تنبيه موضعي، وإلا تنبيه عام.
  - عرض: breadcrumbs، صورة (ProductImage)، badges (متوفر/نفد)، السعر + شريط الخصم، تنبيه "باقي X فقط" (≤5)، الوصف + 4 مميزات، "لماذا تطلب من اليسر"، تنبيه الأمان، صندوق الشحن السري، المكونات/الاستخدام، كمية + زرا (واتساب/سلة)، Trust icons، CrossSellBundle، ProductReviews، FAQ، مشابهة، RecentlyViewed، مقالات مرتبطة، وشريط سفلي ثابت للموبايل.

### 3.9 السلة والـ checkout `cart.tsx` (534 سطراً)

- الشحن يُحسب حسب المحافظة (`getShippingCost`) مع **شحن مجاني ≥2000**.
- محفزات: "أضف X لتحصل على خصم Y" (الشريحة التالية) و"أضف X للشحن المجاني".
- `syncCatalog`: يعيد تسعير/إسقاط أي سلة قديمة مقابل الكتالوج الحي.
- التحقق: الحقول، `isValidEgyptianPhone`، `qty ≤ stock` لكل عنصر.
- **طريقتان**:
  - واتساب: buildOrderMessage (PII كاملة في الرسالة) + `void submitToGoogleSheets` + حفظ **orderId فقط** في sessionStorage (تم حذف تخزين رابط الواتساب الذي يحتوي PII) + فتح واتساب + مسح السلة → `/thank-you`.
  - مباشر: نفس التسجيل في الخلفية (فوري بدون انتظار 10 ثوانٍ) → `/order-confirmed`.

### 3.10 `contexts/cart.tsx`

- key `elysr_cart_v3`، 50 عنصراً كحد أقصى، qty مقصوص بحد المخزون.
- **لا PII في الـ storage**: id/slug/name/price/emoji/image/qty فقط.
- مزامنة تبويبات عبر `storage` event.
- الخصم **basket-level** (وليس per-item): `getPromoTier(subtotal)` ثم round — متطابق رياضياً مع حساب السيرفر (نفس config-db.json).

### 3.11 `src/lib/site-config.ts` — "الجسر"

يستورد `api/lib/config-db.json` مباشرة: الواجهة والسيرفر يقرآن نفس القيم (شحن المحافظات، حد الشحن المجاني، شرائح الخصم) — أي تعديل في مكان واحد.

### 3.12 `src/lib/promo.ts`

- "مبادرة الرعاية الماسية": 1000→15% / 1500→20% / 2000→25%.
- دورة 3 أيام من epoch `2026-01-01T00:00Z` (عدّاد "يتجدد" بدون ادعاء انتهاء).
- `isPromoActive()` دائماً true؛ `getPromoTier` يبحث أول شريحة (مرتبة نزولياً)؛ `getNextTier` للترويج.

### 3.13 `src/lib/utils.ts`

- `isValidEgyptianPhone`: مصري (01[0125]XXXXXXXX محلياً أو +20/0020) أو أجنبي 7–15 رقماً يبدأ +/00.
- `normalizeEgyptianPhone`: توحيد للصيغة المحلية أو E.164.
- `generateOrderId`: `#EL-<base36 timestamp>-<8 random>` (يتطابق مع regex السيرفر `#?EL-[A-Z0-9-]{4,60}`).
- `sanitizeInput`: قص + حذف `<>\"'&\`` + `javascript:`+`data:`+`on*=`+ **حماية Formula/CSV injection** ( بادئة`'`إذا بدأ بـ`=+-@\t\r` — يمنع تنفيذ معادلات في الشيت).
- `sanitizeForMsg`: نفس الشيء + حذف `*~|#{}[]` (تنسيق واتساب).

### 3.14 `src/lib/whatsapp.ts`

- `buildOrderMessage`: رسالة منظمة (رقم الطلب، اسم/هاتف/محافظة/عنوان sanitized، كل منتج بسعره الفرعي + رابط منتج مطلق، المجموع/الخصم/الشحن/الإجمالي).

### 3.15 `src/lib/seo.ts`

- `applySeo`: يحدّث title/description/robots/**googlebot**/og/twitter/canonical (يخلق العناصر إن لم توجد).
- noindex → `noindex,follow,noarchive,nosnippet,noimageindex` (follow ممتدة حتى لا تنقطع قيمة الروابط الداخلة).
- `productSchema`: Product + aggregateRating (فقط إن reviews>0) + Offer (EGP، InStock، priceValidUntil سنة، 14 يوم إرجاع) + **`merchantShippingDetails()` مولّدة من نفس config الشحن** (باندات 50/70/80/100/120) + Brand.
- `articleSchema`: Article + author (د. أحمد عيد) + reviewedBy (هيئة المراجعة) + **citation من sources** + publisher.
- `itemListSchema`: **يستبعد المحظورين** من ItemList.
- `clearPrerenderJsonLd`: يزيل `data-prerender` schemas قبل إعادة الحقن (يمنع التكرار بعد hydration).

### 3.16 `src/lib/product-compliance.ts`

- `GOOGLE_SHOPPING_BLOCKED = {m-38, m-43, m-45}` (Power 36 / Procomil Fort / Viagra Pfizer).
- `isCatalogFeedEligible`: غير محظور وstock>0.
- `RED_PRODUCT_IDS` فارغ (توافق قديم).

### 3.17 `src/lib/product-reviews.ts`

- توليد **حتمي** (deterministic) للتقييمات: `hashCode(slug)` → `mulberry32` → خلط Fisher-Yates.
- 10 تقييمات رجال / 9 نساء / 8 أجهزة (نصوص واقعية: سرية التغليف، دعم واتساب…).
- عدد المعروض = عدد الـ schema بالضبط، والمتوسط = متوسط المعروض — **تطابق دائم** بين الواجهة وJSON-LD (مطلوب سياسياً لنجوم Google).
- حالة خاصة `kreva-gel`: 73 تقييماً تاريخياً → يعرض 5 شهادات 5★ فقط.

### 3.18 `src/lib/internal-links.ts` (655 سطراً)

- محرك ترابط ثلاثي الاتجاهات:
  - منتج→مقال: 29 قاعدة regex (عربي/إنجليزي) + fallback حسب الفئة، يعيد مقالين.
  - مقال→منتج: ~50 قاعدة hardcoded + **مسار ديناميكي** (فئة المقال ثم كلمات مفتاحية في النص) + fallback نهائي.
  - مقال→مقالات: خريطة RELATED_CATS (نفس الفئة أولاً ثم 3).
  - لاندينج→مقال: 28 قاعدة regex.

### 3.19 `src/lib/error-tracking.ts`

- <2KB بديل Sentry: correlation ID (sessionStorage)، breadcrumbs (clicks/نقلات history، أخيراً 20)، سياق المتصفح، POST إلى `VITE_ERROR_SINK_URL` (keepalive) أو console في dev.

### 3.20 `src/lib/cache.ts` + `config/cache-version.json`

- إصدار الكاش المركزي (v28): `assetUrl`/`thumbUrl` يبدلان أي `?v=` قديم بالتحديث — مصدره الوحيد `config/cache-version.json` (تتحقق منه data-integrity) ويرفعه `release.mjs`.

### 3.21 بيانات المنتجات `src/data/`

- `product-types.ts`: الواجهة (id/slug/name/nameEn/category/price/description/benefits/ingredients/usage/badge/emoji/image/rating/reviews/stock/featured/crossSell).
- `products/men.ts` (52) · `women.ts` (23) · `devices.ts` (7) — بيانات كاملة (وصف ≥80 حرف، 5–7 فوائد، مكونات، طريقة استخدام، سعر، مخزون).
- `products.ts` (المنسّق):
  - ترتيب الفئات: مخزون أولاً → pinned-last (3 منتجات نساء) → pinned-top (6 رجال / 10 نساء) → featured/badge → popularity (`rating×reviews` بفارق سماحية 50) → سعر تصاعدي.
  - `HOMEPAGE_EXCLUDED_PRODUCT_IDS = {m-02, m-03, m-49, m-45}`.
  - `HOME_FEATURED_ORDER`: 6 منتجات VIP أعلى + pool ثانوي (m-11, m-01, m-44, m-60, w-15, w-02).
  - `getCrossSellsForProduct`: crossSell محددة أو خوارزمية (حبوب→تأخير+عسل، تأخير→صلابة+عسل، عسل→صلابة+كريم، نساء→ثلاثي ثابت، أجهزة→ثابت).
  - `productIdToSlug`: خريطة legacy ID→slug للـ redirects.
- `articles.ts` (56): كاتش أب `a(...)`، **تاريخ نشر حتمي** (hash(slug) % 360 يوماً من 2025-07-01)، updatedAt ≥ 2026-08-15، مصادر per-category (Mayo/Cleveland/NHS/NIH)، مؤلف + مرشد ثابتان + 6 إشارات ثقة تحريرية.
- `landing-pages.ts` (92): كل صفحة = slug/metaTitle/metaDescription/eyebrow/heroDescription/intro/sections/productIds/links/faqs/primaryKeyword/relatedKeywords/noindex.

### 3.22 المكونات

- `Header.tsx` (448): هيدر fixed يختفي عند النزول (بعد 60px)، Ctrl/Cmd+K لفتح البحث (lazy)، درج موبايل (يُحفظ scroll + قفل body + تعويض scrollbar)، عدادات السلة/المفضلة، زر تثبيت PWA، رابط "تتبع طلبك" واتساب، روابط دعم.
- `SearchBar.tsx`: Fuse.js (threshold 0.4، وزن name=2/nameEn=1/description=0.5) — **الكتالوج 254KB لا يُحمّل حتى أول حرف**.
- `ProductCard.tsx`: شارة "الاستخدام" مولّدة regex (تأخير/انتصاب/ترطيب/تكبير/طاقة…)، قلب مفضلة، شارات مخزون، `rel=nofollow` للمحظور، صورة lazy مع fallback إيموجي.
- `Accessibility.tsx`: focus trap (Tab cycle + إعادة الفوكس عند الإغلاق).
- `SectionErrorBoundary`: يعزل كل قسم في الهوم.
- Sections: Hero (preload صورة hero فقط في الهوم)، AnniversaryPromo (عدّاد `getTimeLeft` كل ثانية)، CrossSellBundle (باقات ثلاثية)، ArticleContentWithAds (حقن منتجات داخل فقرات المقال)، DailyAdvice، ProductsTabs، ArticlesGrid، RecentlyViewed، WhyUs، ShopByConcern.
- `ProductImage`/`ProductCardImage`: srcset (main + thumbs + thumbs-180) مع `assetUrl`.

### 3.23 الـ hooks

- `use-wishlist`: `elysr_wishlist_v1`، 100، أحداث custom + storage + focus.
- `use-recently-viewed`: 12، إعادة ترتيب (الأحدث أولاً).
- `use-scroll-tracking`: 50%/90% (rAF throttled).
- `use-pwa-install`: beforeinstallprompt defer + standalone detection.

## 4) طبقة الأمان (API)

### 4.1 `api/submit-order.js` (359 سطراً)

1. **CORS/Origin**: whitelist (store + www + VERCEL_URL + localhost في dev)؛ يقبل أيضاً same-origin/none عبر `sec-fetch-site` + host.
2. **Rate limit**: 30/دقيقة/IP — المفتاح **hashed** (sha256 → 16 hex).
3. **Body**: ≤64KB.
4. `validateOrderPayload` (صرامة كاملة):
   - رفض null/arrays/primitives + **حماية prototype pollution** (`__proto__`/constructor/prototype).
   - orderId: `#?EL-[A-Z0-9-]{4,60}`.
   - هاتف: مصري محلي أو دولي `+\d`.
   - orderType ∈ {cart, شراء فوري}، paymentMethod ∈ {واتساب, طلب مباشر}.
   - governorate يجب أن يوجد حرفياً في config-db.
   - items: 1–50، qty صحيح 1–999، **كل منتج يجب أن يوجد في products-db.json** (مولّد من نفس الكود وقت البناء)، stock>0، qty≤stock.
   - **اسم المنتج يُستبدل بالاسم الرسمي** (منع حقن أسماء).
   - **السعر يُتحقق منه رياضياً** مقابل الكتالوج + subtotal + discount (بنفس دوال الخصم) + shipping (بنفس دوال الشحن) + total — أي تلاعب = رفض.
5. **Whitelist حقول** (15 حقلاً) فقط ما يمر للشيت.
6. IP العميل **يُرسل hash فقط** (آخر 16 hex) — مع ملاحظة في الكود أن hash لا يضمن كشف الاحتيال الكامل لكنه يحفظ الخصوصية.
7. POST للشيت `x-www-form-urlencoded` بـ timeout 10s (AbortController)؛ خطأ Apps Script المنطقي (200 مع success:false) → **502** حتى لا يظن العميل أن الطلب اكتمل؛ رسائل الخطأ مقطوعة 200 حرف (منع log flooding/تسريب).

### 4.2 `api/csp-report.js`

- 50/دقيقة/IP (hashed)، body ≤4KB، يدعم formatين (csp-report و reporting-api array).
- **sanitize حقول الـ log** (حذف \r\n\t\0 + قص 160) — منع Log Injection.
- يتجاهل eval/inline (ضجيج إضافات المتصفح).

### 4.3 `api/delete-customer-data.js`

- حق النسيان (GDPR): 5/دقيقة/IP، هاتف مُتحقق، يسجل **phone hash** فقط، الحذف الفعلي يدوياً/عبر `deleteCustomerData(phone)` في Apps Script.

### 4.4 `api/lib/rate-limiter.js`

- Fixed-window في الذاكرة، cleanup كل 5 دقائق، مفاتيح hashed — "طبقة أولى سريعة" على كل instance.

## 5) الخادم الذاتي `server/index.js` (240 سطراً)

- Express 5 + compression + trust proxy.
- **SSG-first**: أي مسار يوجد له `.html` في dist يُخدَّم (TTFB milisecondي)؛ غير الموجود → **404 حقيقي** (404.html + `no-store`).
- ملاحظة موثقة: Express 5 أزال wildcard `*` → يستخدم `app.get(/.*/)` + `fileForUrl` (مع منع path traversal `..`).
- ترويسات أمنية **مطابقة لـ vercel.json حرفياً** + noindex للمحظور + noimageindex لصورها.
- Cache: HTML `max-age=3600, s-maxage=86400, SWR`؛ static `1yr immutable`.
- `/health` → `{"status":"ok"}` فقط (لا يكشف معلومات تشغيلية).
- يركّب الـ 3 API handlers inline (نفس الكود المستخدم في Vercel).

## 6) محرك البناء

### 6.1 `scripts/generate-sitemap.mjs` (prebuild)

- عبر `vite.ssrLoadModule` (يقرأ TS بلا dev server):
  - يكتب `api/lib/products-db.json` (نسخة الكتالوج للتحقق الخلفي) و`api/lib/config-db.json` (SSOT).
  - `sitemap.xml`: 12 ثابت + 79 منتج (82−3 محظور) + 56 مقال + 92 guide = **239 URL** مع hreflang + image:image + lastmod **حقيقي من git log** (ليست "اليوم" دائماً — تجنب عقوبة lastmod).
  - `sitemap-images.xml` (صور بـ title/caption) + `sitemap-index.xml`.
  - `catalog-feed.xml` (Google Merchant): 79 مؤهل، وصف مدمج (description+ingredients+usage ≤5000).
  - `robots.txt`: يسمح Bots AI (GPTBot, ChatGPT-User, Perplexity, Claude…) ويمنع CCBot/Bytespider؛ لا Disallow لصفحات noindex (لأن Disallow يمنع قراءة وسم noindex).
  - **92 ملف JSON فردي** لصفحات اللاندينج (في public/landing-pages/) + **مسح ملفات قديمة** لم تعد في المصدر.

### 6.2 `scripts/prerender-seo.mjs` (1073 سطراً)

- يبني 246 صفحة من قالب dist/index.html:
  - استبدال/إدراج: title (قص ذكي عند حدود كلمة + إغلاق أقواس مفتوحة ≤65)، description (≤155)، og/twitter، canonical، robots/googlebot.
  - **Preload صورة الـ hero في الهوم فقط** (imagesrcset + fetchpriority high) — غير موجودة في الـ template العام لتجنب unused-preload.
  - JSON-LD `data-prerender` (Product/Article/Breadcrumb/FAQ/ItemList/WebPage) — **المحظورون: breadcrumb فقط + noindex**.
  - **محتوى crawler داخل `#root`** (div مخفي): H1 + وصف + مميزات + روابط منتجات/مقالات **ثابتة** (بدونها لا يجد الزاحف أي مسار لصفحات المنتجات لأن القوائم SPA).
  - صفحات الفئات: روابط كل المنتجات + FAQ + ItemList (المحظورون `rel=nofollow`).
  - صفحات المنتجات: related products بصور alt/title (لمنع لخبطة Google Images).

### 6.3 `scripts/data-integrity.test.mjs` (332 سطراً) — "بوابة الجودة"

يتحقق من: تطابق products-db/config-db مع الكود، **82 منتجاً بتقسيم 52/23/7**، بلا تكرار IDs/slugs، slugs `[a-z0-9-]+`، وصف ≥80، فوائد ≥3، ID prefix مطابق للفئة، **وجود الصورة والثمبنيل فعلياً**، Kreva ثابتة (300ج/5.0/73)، **الهوم بالضبط 6 featured + 12 concern + 12 tabs** بلا مستبعدين، الـ redirects تغطي كل المنتجات permanent، Apps Script يحمل بحث idempotency كامل + قبول أرقام دولية، **المحظورون خارج sitemap/image-sitemap/feed**، ترويسة noindex موجودة، cart/thank-you/order-confirmed خارج sitemap، حسابات الخصم (999→0, 1000→150, 1500→300, 2000→500)، وسلامة التوصيات الذكية.

### 6.4 سكربتات أخرى

- `sync-vercel-redirects.mjs`: يعيد توليد redirects الـ ID→slug من الكود + legacy aliases (المحذوف → قسمه).
- `release.mjs`: semver bump + **رفع cache version** + commit + tag.
- `health-check.mjs`: تدقيق أحجام bundles والصور.
- `validate-schemas.mjs`: فحص JSON-LD في dist بعد البناء.
- `validate-article-sources.mjs`: تحقق من حيوية روابط المصادر ودعم الادعاءات.
- `optimize-images.mjs`/`process-hero.mjs`: معالجة sharp (WebP 700–800px q45–55).

## 7) Google Apps Script (565 سطراً)

- `doPost`: **ScriptLock** (waitLock 10s) → parse → `normalizeItems` (50 حداً، qty 1–999، price clamp) → تحقق هاتف (مصري/دولي) → **rate limit CacheService 15/دقيقة/هاتف** (المفتاح الهاتف، أو IP لرقم الاختبار) → **idempotency**: بحث `createTextFinder(orderId)` كامل (محدود بـ 50 صف؟ لا — كل العمود، داخل الـ lock) → appendRowByHeaders (يقرأ الهيدر الموجود ولا يفترض ترتيب الأعمدة) → تلوين صف → **إشعار إيميل** (اختياري) → `{success:true}`.
- كل خطأ → رسالة عامة آمنة (لا تفاصيل داخلية).
- `doGet` لا يكشف إحصاءات.
- إنشاء/ترقية الشيت تلقائياً (أعمدة ناقصة، Data Validation لحالة الطلب من قائمة 7 حالات، تجميد هيدر، فلتر).
- `autoCleanupOldOrders`: حذف تلقائي بعد 90 يوماً (تقليل الاحتفاظ بـ PII).
- `deleteCustomerData(phone)`: حق النسيان.
- `clean()`: حذف رموز + **بادئة `'` لحماية Formula injection**.

## 8) الاختبارات

- **Vitest: 10 ملفات / 119 اختباراً** — أهمها `submit-order-api.test.ts` (310 أسطر): قبول payload صحيح + normalizing المحافظة، رفض primitives/arrays، qty كسري/فوق المخزون، حقول غير صالحة، price mismatch، subtotal mismatch، shipping mismatch، CORS رفض، rate limit، timeout 504، Apps Script reject→502…
- `compliance.test.ts`: المحظورون خارج كل القنوات.
- `promo.test.ts`/`governorates.test.ts`/`utils.test.ts` (XSS + formula injection + phones) + `catalog-contradictions` (لا تعارض بيانات) + `csp-report-api`.
- **Playwright e2e** (3 اختبارات):
  1. تدفق كامل: إضافة للسلة → زيادة كمية (2×300) → طلب مباشر (القاهرة: 600+50=650) → `/order-confirmed` + payload مطابق.
  2. منتج دوائي محظور: ظاهر + 200 + ترويسة noindex + meta robots + noimageindex للصورة + موجود في صفحة القسم.
  3. HTTP 404 حقيقي لروابط مجهولة.

## 9) CI (4 jobs)

1. **static**: lint + typecheck + data-integrity + unit (fetch-depth: 0 لازمة لـ git log في sitemaps).
2. **build**: vite build + prerender + **validate-schemas** + artifact dist (7 أيام).
3. **lighthouse**: يخدم dist عبر server/index.js الحقيقي (clean URLs) + LHCI بميزانية: LCP ≤3.5s (error)، CLS ≤0.25 (error)، perf ≥0.6، a11y/seo ≥0.9 (warn).
4. **e2e**: Playwright على Chromium.

## 10) سياسة الامتثال الدوائي (القصة الكاملة)

- **حُذفت نهائياً (5)**: m-34 Hard-On، m-36 Vegal، m-37 Cialis، m-47 Levitra، w-17 Viagra Women → من DB + من صورها، مع 301 → /products/men أو /women.
- **محظورة من Google فقط (3 متبقية)**: m-38 Power 36، m-43 Procomil Fort، m-45 Viagra Pfizer:
  - **داخل الموقع**: ظاهرة وقابلة للشراء (رابط مباشر + واتساب) — قرار تجاري موثق: الحذف الكامل يفقد مبيعات.
  - **خارج**: homepage (م-45 أصلاً)، sitemap.xml، sitemap-images.xml، catalog-feed.xml، ItemList JSON-LD، Product JSON-LD.
  - **حماية noindex متعددة الطبقات**: `X-Robots-Tag: noindex,follow,noarchive,nosnippet,noimageindex` (vercel.json + server)، `meta robots/googlebot noindex` (prerender + head runtime)، `rel=nofollow` على روابطها، و`noimageindex` على ملفات صورها.

## 11) الأداء (قائمة التحسينات الموثقة)

- Code-splitting لكل فئة + articles/landing خارج الباندل (JSON فردي عند الزيارة — 465KB لم تعد في أي bundle).
- Toaster lazy، SearchBar lazy (Fuse + كتالوج 254KB يُحمّل عند أول حرف).
- GA مؤجل (2 ثوانٍ + أول تفاعل، `send_page_view:false` + page_view يدوية في SPA + beacon).
- خط Cairo ذاتي + critical CSS + preload hero (هوم فقط).
- صور WebP 8–55KB (متوسط 26KB) + thumbs 16KB + srcset + immutable 1yr + `?v=28` مركزي.
- `defaultPreload: intent` للراوتر (hover) + staleTime 30s.
- خادم SSG: HTML ثابت (TTFB ms) + 404 حقيقي.
- ميزانية Lighthouse في CI.

## 12) ما تم التحقق منه عملياً (2026-08-26)

| الفحص                       | النتيجة                                                                                                            |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `npm ci`                    | ✓                                                                                                                  |
| `npm test` (data-integrity) | ✓ data integrity tests passed                                                                                      |
| `npm run test:unit`         | ✓ 10 ملفات / 119 اختباراً                                                                                          |
| `npm run build`             | ✓ 246 صفحة (16 ثابت + 82 منتج + 56 مقال + 92 guide)                                                                |
| `node server/index.js`      | ✓ `/` 200 · `/products/men` 200 · منتج 200 · غير موجود 404 · `/health` ok · power-36 يحمل `X-Robots-Tag: noindex…` |

## 13) ملاحظات/تناقضات مكتشفة أثناء القراءة — وحالتها

1. ✅ **تم الإصلاح (2026-08-26)**: e2e test 2 كان stale (يختبر hard-on المحذوف). الآن يختبر `power-36-power-control-for-36-hours` (المحظور المتبقي القياسي): ظاهر 200 + `X-Robots-Tag: noindex` + meta robots/googlebot noindex + `noimageindex` للصورة + موجود بروابط nofollow في صفحة القسم. واختبار 404 الحقيقي ما زال سليماً.
2. ✅ **تم الإصلاح (2026-08-26)**: `server/index.js` الآن يحمّل جدول الـ 152 redirect من `vercel.json` وينفّذه بنفس السلوك (301 للثابتة و `:param` للباراميترية — `/product/:slug`، `/blog/:slug`، `/articles/:slug`، `/category/:slug`، `/products/category/:slug`) — النشر الذاتي أصبح مطابقاً لـ Vercel. اختبار e2e جديد يثبت 301 للمحذوفات (m-34→/products/men، w-17→/products/women) بـ `fetch` مع `redirect:"manual"` (لأن fixture الـ request لـ Playwright يتبع الـ redirects).
3. ✅ **تم التنفيذ (2026-08-26)**: أُضيف m-38/m-43 إلى `HOMEPAGE_EXCLUDED_PRODUCT_IDS` لسياسة موحدة للأدوية المحظورة في الهوم (6 منتجات الآن). يعمل تلقائياً لأن `ProductsTabs` و`ShopByConcern` يفلتران بالمجموعة — المنتجات تبقى ظاهرة في صفحة القسم وصفحاتها المباشرة فقط. التحقق: data-integrity (6+12+12 بلا مستبعدين) + e2e 4/4. الإلغاء = حذف سطرين من المجموعة.
4. ⏳ **بنيوي (موثق)**: `api/delete-customer-data.js` يسجل طلب الحذف فقط؛ الحذف الفعلي يدوي/مجدول في Apps Script (`deleteCustomerData(phone)` + `autoCleanupOldOrders` كل 90 يوم).
5. ✓ **سليم**: e2e يتوقع `/products/kreva-gel` = 650 ج.م عند كميّتين (300×2+50) — مطابق لـ config الحالي (شحن القاهرة 50، لا خصم تحت 1000).

### سجل الإصلاح (2026-08-26)

| التغيير                                                                 | الملف                  | التحقق                                                                                                             |
| ----------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------ |
| e2e: noindex test → power-36 (المحظور المتبقي)                          | `e2e/checkout.spec.ts` | ✓ 4/4 e2e في متصفح حقيقي                                                                                           |
| e2e: اختبار 301 جديد للمحذوفات                                          | `e2e/checkout.spec.ts` | ✓                                                                                                                  |
| خادم ذاتي: تنفيذ جدول redirects من vercel.json (152 قاعدة + باراميترات) | `server/index.js`      | ✓ curl: m-01→slug، m-34→men، w-17→women، /blog/x→/education/x، /index.html→/                                       |
|                                                                         |                        | `npm run ci` كاملة خضراء: lint + typecheck + integrity + 119 unit + build 246 صفحة + 1154 JSON-LD schema (0 أخطاء) |

## 14) التدقيق الثاني (Audit) — اكتشافات إضافية وإصلاحها

أُجري فحص موسع للأجزاء المتبقية + **فحص تجريبي** (headless Chromium على dist: 0 مخالفات CSP على الهوم/PDP/مقال).

### أُصلحت (commit "audit"):

1. **`index.html` — JSON-LD قديم**: `OfferCatalog` كان `numberOfItems: 59` للرجال (الفعلي 52). ✓ أصبح 52/23/7.
2. **تكرار النص في feeds**: `generate-sitemap.mjs` كان يضيف "المكونات/طريقة الاستخدام" مرة ثانية رغم أن `description` تنتهي بها أصلاً → النص مكرر في كل صنف بالـ XML/CSV/TXT. ✓ دالة `buildFeedDescription` تضيف فقط إن غابت.
3. **CSV/TXT لا يُولّدان بالبناء**: كانا يُولّدان يدوياً فيبتعدان عن الكتالوج. ✓ أصبحا يُولّدان في `generate-sitemap.mjs` (نفس 79 منتجاً، CRLF، اقتباس CSV قياسي، TSV نظيف).
4. **`use-scroll-tracking` كود ميت**: كان يحسب 50%/90% ولا يرسل أي حدث. ✓ أصبح يرسل حدث GA4 `scroll` (مع page_title/percent_scrolled) عبر gtag أو dataLayer، مرة لكل milestone لكل صفحة.
5. **lastmod خاطئ للمنتجات**: sitemap كان يأخذ git-log لـ `products.ts` (المنسق) بينما البيانات في `men/women/devices.ts`. ✓ أصبح `max(git-log للملفات الأربعة)`.
6. **`public/offline.html` ملف ميت** (لم يرد له ذكر في الكود — التطبيق network-only). ✓ حُذف.
7. **تعليقات قديمة**: "87 منتج" في product-compliance.ts (الفعلي 82) · تعليق cron في auto-publish ("12:00 Cairo during daylight-saving" — مصر ألغت التوقيت الصيفي: 09:00 UTC = 11:00 دائماً). ✓ صُححتا.

### ملاحظات تشغيلية (لا تحتاج كوداً — قرار نشر):

8. **Vercel Hobby: timeout الدوال = 10 ثوانٍ** وهو يساوي `GOOGLE_SHEETS_TIMEOUT_MS` → إن تباطأ Apps Script قد تُقتل الدالة قبل إرجاع 504. Apps Script عادة <2 ثوانٍ (يعمل). إن ظهرت أعطال: حدّث الخطة أو أضف `functions: {"api/submit-order.js": {"maxDuration": 30}}` في vercel.json (متاح بـ Pro).
9. **النشر الذاتي (Docker/Railway)**: Vercel Analytics + Speed Insights يعيدان 404 (نقاط نهاية خاصة بمنصة Vercel) — التحليلات لا تعمل بالنشر الذاتي + ضجيج console. الخيارات: تجاهل، أو stub مساري `/_vercel/insights/script.js` و`/_vercel/speed-insights/script.js` في server/index.js.
10. **CORS في `delete-customer-data.js`** يتضمن localhost في الإنتاج (بريء عملياً — same-origin فقط والاستجابة بلا حساس) — يمكن ربطها بـ NODE_ENV كمواصلة.

### ملاحظات تصميم/سياسة (مقصودة — للمراجعة فقط):

11. **عرض التقييمات**: PDP تعرض "4.9 (48 تقييم)" في الهيدر + الـ schema نفسه 48، لكن قائمة التقييمات تعرض 5 عينات حتمية (من 10/9/8 نص). النمط شائع، لكن تعليق product-reviews.ts يبالغ ("عدد المعروض = عدد الـ schema بالضبط") — الرقم المعروض (48) مطابق للـ schema، أما العينة فـ 5. إن أردت مطابقة صارمة: اجعل `reviewsCount` = عدد العينة (يقلل المصداقية الظاهرة) — قرار تسويقي.
12. **CSP `img-src https:`** أوسع من اللازم (كل الصور self-hosted) — يمكن التضييق لـ `'self' data: blob:` كتصعيدي أمان إضافي.

### نتيجة الفحص التجريبي (headless Chromium على dist):

- **0 مخالفات CSP** (هوم + PDP + مقال) — بما فيها inline JSON-LD وخطوط GA والـ fonts الذاتية.
- GA4 يتحمل (مؤجل: 2 ثوانٍ + أول تفاعل) — page_view تُرسل يدوياً من `RouteHeadSync`.
- 404s الوحيدة: `/_vercel/insights` + `/_vercel/speed-insights` (متوقع محلياً — أنظر ملاحظة 9).

## 15) التدقيق الثالث (Audit 3) — مرجعيات البيانات، الـ feeds، الأداء، والمكونات المتبقية

### فحوصات آلية جديدة (سكربت مرجعيات + تزحلق dist + قياس أداء):

- **مرجعيات البيانات**: crossSell لكل المنتجات ✓، كل IDs/slugs في محرك الترابط (internal-links) ✓، الصور ✓، أهداف الـ redirects ✓.
- **تزحلق dist**: 2517 مرجع أصول عبر 247 ملف HTML — **0 مكسور** ✓
- **سطح XSS**: لا `innerHTML`/`eval`/`document.write` في الكود ✓
- **أداء حقيقي (Chromium على dist)**: هوم LCP 420ms · PDP 316ms · قسم الرجال 448ms — CLS = 0 في الكل — JS 40–132KB مضغوط — بعيد عن ميزانيات Lighthouse (3.5s/0.25) ✓

### أُصلحت (commit "audit-3"):

1. **redirect معطل (dead-end)**: `/products/viagra-for-women-20-tablets → /products/viagra-20-tablets` وكان الهدف slug قديماً للمحذوف w-17 لا يوجد له خروج (404). ✓ أصبح `→ /products/women` حسب سياسة "المحذوف → قسمه".
2. **خصم باقة وهمي في CrossSellBundle**: كان يروّج "الإجمالي العادي X → سعر الباقة 0.9X (خصم 10%)" لكن **لا يوجد أي خصم باقة في السلة** (الخصم الوحيد المعتمد هو شرائح الماسة ويتحقق منه السيرفر رياضياً) → العميل كان يرى سعراً إعلانياً لا يطابق ما يدفعه + toast كاذب "تم تطبيق الخصم". ✓ أُزيلت المطالبة الوهمية وعُرض الإجمالي الفعلي مع بيان أن خصم الماسة يُطبق في السلة تلقائياً. (إضافة خصم باقة حقيقي تتطلب تعديل نموذج السلة + التحقق الخلفي في API/Apps Script — مشروع أكبر إن أردناه.)
3. **قوائم "تسوق حسب الاحتياج" مكررة 3 مرات** (ShopByConcern + "محاكاة" في ProductsTabs + الاختبار) — أي تعديل على واحدة يبتعد صامتاً عن البواقي. ✓ أصبحت `HOMEPAGE_CONCERN_CANDIDATES` مصدر واحد في `products.ts` تستورده المواضع الثلاثة (الاختبار الآن يتحقق من القائمة الفعلية للمكونات).

### نتيجة قراءة بقية المكونات (Footer، Hero، AnniversaryPromo، DailyAdvice، FeaturedProducts، RecentlyViewed، FAQ، PageHero، Accessibility، BackToTop، FloatingActions، SectionErrorBoundary، ProductImage، ProductCardImage، ProductReviews، wishlist، education، thank-you، order-confirmed، styles.css):

- Hero: sr-only H1 + aspect-ratio ثابت (CLS 0) + fetchpriority high + srcset ✓
- AnniversaryPromo: interval مع cleanup صحيح، العداد من promo.ts ✓
- DailyAdvice: محتوى ثابت (لا random) ✓ · styles.css: لا استيراد خارجي ✓
- thank-you/order-confirmed: يقرآن orderId فقط من sessionStorage (لا PII) ✓
- Footer: روابط واتساب/فيسبوك فقط ✓

### ملاحظة تصميم واحدة متبقية (مقصودة — لمسة أخيرة محتملة):

- عدّاد "مبادرة الرعاية الماسية" يتجدد perpetually (دورة 3 أيام من epoch) — نمط "urgency متجددة" مقصود وموثق في promo.ts ("دون الادعاء بانتهاء العرض")، لكنه يبقى في منطقة الرمادي التسويقي؛ إن أردت أماناً أكبر: اعرض "دورة متجددة" صراحةً بدل عدّاد انتهاء.

## 16) ميزة: خصم الباقة الحقيقي (10%) — commit "bundle-discount"

### القاعدة (موحّدة بين الفرونت والباك):

- كل منتج P يكوّن باقة = [P + مقترحاته (cross-sell)] (82 باقة مولّدة).
- اكتمال الباقة في السلة (كل الأعضاء بكمية ≥ 1) → **خصم 10%** من مجموع أسعار الوحدات (واحدة من كل عضو).
- تُعتمد أفضل باقة واحدة فقط (الأعلى قيمة) — حتمي ومحصّن.
- الخصم **يتراكب** مع شرائح الماسة (مثال: باقة 1370 → 15% = 206 + 10% = 137 → 1233).
- إزالة "البيان" الوارد في طلب العميل: الاستبدال أعيد للعمل (خصم حقيقي الآن) وبيان الماسة أزيل.

### المخطط (الأمان أولاً):

```
CrossSellBundle (PDP) → add ×N → cart state
   ↓ (dynamic import — chunk منفصل، لا يدخل مسار الهوم للسلات <2)
src/lib/bundle-discount.ts ← products + getCrossSellsForProduct
   ↓ cart: total = قبل − tier − bundle  |  payload.bundleDiscount
api/submit-order.js ← bundles-db.json (مولّد البناء من نفس المحرك)
   يعيد الحساب من الكتالوج: mismatch = رفض (400)
   → Apps Script (عمود "خصم الباقة" جديد — يضاف تلقائياً) → الشيت
```

### الملفات:

| الملف                                         | التغيير                                                             |
| --------------------------------------------- | ------------------------------------------------------------------- |
| `src/lib/bundle-discount.ts`                  | جديد — محرك الباقات (BUNDLE_DISCOUNT_RATE = 0.1)                    |
| `src/contexts/cart.tsx`                       | bundleDiscount/appliedBundle + total يخصمها                         |
| `src/routes/cart.tsx`                         | سطر "🎁 خصم الباقة المكتملة (10%)" + payload + رسالة واتساب         |
| `src/routes/products.$slug.tsx`               | payload.bundleDiscount = 0 (شراء فوري = منتج واحد)                  |
| `src/lib/whatsapp.ts`                         | باراميتر bundleDiscount + سطر "خصم الباقة" في الرسالة               |
| `api/submit-order.js`                         | getBundlesDb + calcBundleDiscount + تحقق mismatch + whitelist الحقل |
| `scripts/generate-sitemap.mjs`                | توليد `api/lib/bundles-db.json` (82 باقة)                           |
| `google-apps-script.gs`                       | عمود "خصم الباقة" (الترقية التلقائية للشيت تضيفه)                   |
| `src/__tests__/submit-order-api.test.ts`      | +5 اختبارات (قبول/تضخيم/إخفاء/منتج واحد/غير رقمي)                   |
| `scripts/data-integrity.test.mjs`             | سلامة أعضاء bundles-db                                              |
| `e2e/checkout.spec.ts`                        | اختبار 6: تدفق الباقة الكامل (590+580+200 → 206+137 خصم → 1077)     |
| `src/components/sections/CrossSellBundle.tsx` | استعادة العرض التسويقي (أصبح صادقاً)                                |

### ملاحظة أمنية:

- الفرونت يرسل القيمة لكن **الباك لا يثق بها أبداً** — يعيد الحساب من bundles-db + prices الرسمية.
- فشل تحميل bundles-db.json في الخادم → fail-closed (لا خصم باقة) لا fail-open.

## 17) التدقيق السادس (Audit 6) — Lighthouse حقيقي + تثبيت النشر الذاتي

### نتائج Lighthouse الحقيقي (mobile simulated throttling — أشد من CI desktop):
| الصفحة | Perf | A11y | Best Practices | SEO |
|---|---|---|---|---|
| هوم | 64 | **100** | **100** | **100** |
| PDP | 70 | **100** | **100** | **100** |
(قبل الإصلاح: 60/99/96/100 و68/99/96/100 — CI يعمل desktop + شبكة أسرع فالأرقام أعلى)

### أُصلحت:
1. **heading-order (باغ A11y حقيقي)**: صفحة المنتج كانت أول عنوان بعد h1 هو h3 (تخطي h2) → صناديق "لماذا تطلب/تنبيه الأمان/الشحن السري/المكونات/الاستخدام" أصبحت h2.
2. **image-redundant-alt**: صور "تسوق حسب الاحتياج" كانت alt = الاسم الظاهر بجوارها (قراءة مزدوجة) → `alt=""` (زخرفية، الاسم موجود).
3. **errors-in-console (self-hosted)**: `/insights/script.js` + `/speed-insights/script.js` (ميزات منصة Vercel) كانا 404+MIME error بالنشر الذاتي → stub سكريبت فارغ سليم في server/index.js (200 + application/javascript + TTL يوم).
4. **hero-banner-480.webp مفقود**: سكربت process-hero مصمم لتوليد 480/768/1200 لكن الـ 480 لم يولد أبداً → وُلّد (17.9KB مقابل 26.4 للـ 768) + srcSet الـ Hero والـ preload الخاص بالهوم يتضمناه الآن.
5. Stub TTL 1h → 24h (uses-long-cache-ttl).

### تم استبعاده (مفهمس، لا حاجة):
- "Unused JS 69KB" = **Google Analytics gtag.js** (إيجابي زائف — يُحمَّل مؤجلاً عمداً).
- render-blocking: توفير 0ms (لا أثر).
- uses-responsive-images: 21KB (تافه).
- LCP 5.4s mobile-simulated: throttle افتراضي (CPU 4x + 4G) — CI desktop أعلى، وميزانية CI هي المعيار.
- Docker: غير متاح في بيئة الفحص (Dockerfile multi-stage قياسي، يبنيه الإنتاج).

### ملاحظة بيئة:
إعادة ضبط بيئة الفحص تمسح المجلدات غير الملتزَمة (node_modules/dist/.cache) — المشروع الملتزم هو المصدر الوحيد للحقيقة، والـ build يعيد كل شيء من الصفر بنجاح (تم التحقق).

## 18) التدقيق السابع (Audit 7) — موثوقية الطلبات + سلامة ملفات البيانات

### أُصلحت:
1. **فقدان صامت للطلب المباشر (أخطر اكتشاف)**: `void submitToGoogleSheets()` — عند فشل التسجيل في الشيت كان العميل يرى "تم استلام طلبك بنجاح!" وتُطهر السلة **وينفد الطلب**. الإصلاح يحافظ على UX الفوري:
   - النجاح → تطهير السلة (العميل في صفحة التأكيد)
   - الفشل → **السلة محفوظة** + toast خطأ (10 ثوانٍ) مع زر "الطلب عبر واتساب" (يولّد الرسالة كاملة)
   - e2e جديد يثبت: فشل 502 → خطأ ظاهر + كريفا لا تزال في السلة → إعادة محاولة → نجاح.
2. **BOM UTF-8 للـ CSV**: الملف العربي بدون BOM = تخرب في Excel ويندوز → يولد الآن بـ `\uFEFF` (معايير Google Merchant تتعامل معه). تحقق: `EF BB BF` أول 3 بايتات.

### تم فحصه وسليم:
- الخطوط: cairo.woff2 (30.7KB) + cairo-latin.woff2 (33.8KB) — magic `wOF2` صحيح.
- بقية مسارات الفشل: طلب واتساب = fire-and-forget مقصود (رسالة واتساب هي السجل الأساسي + تأكيد بشري) — موثق في الكود.

### الحالة:
- e2e: **6/6** (إضافة اختبار منع الفقدان الصامت).
- كل البوابات خضراء (lint/typecheck/integrity/124 وحدة/build 246/e2e 6).

## 19) التدقيق الثامن (Audit 8) — تدقيق فهرسة شامل (SEO/Indexing)

### النتيجة الحاسمة: لا يوجد قاتل فهرسة — لكن اكتُشف وأُصلح باغ تحويل معكوس:

**البلاغ (self-hosted فقط)**: `/education` كان يعيد **301 → /education/** (عكس سلوك Vercel
الذي يخدم /education مباشرة ويعكس /education/ إليه 308). السبب: `dist/education.html` +
مجلد `dist/education/` (للمقالات) بنفس الاسم — `express.static` سبقت المعالج الرئيسي
بـ directory-redirect. النتيجة: URL الـ sitemap (`/education`) يُحوَّل، والقانينون
`/education` (بلا شلطة) → تناقض URL/redirect/ canonical + اختلاف عن بنية الإنتاج
المفهرسة (لو انتقل الموقع للنشر الذاتي سيحصل Google على إشارات متضاربة).

**الإصلاح** (server/index.js):
- `express.static(DIST, { redirect: false })` — لا تحويلات مجلدات.
- تطبيع الشلطة مطابقاً لـ Vercel (trailingSlash:false): أي مسار بشلطة زائدة → 301 بلا شلطة.
- e2e #4 يثبّت: `/education` → 200 مباشر، `/education/` → 301 → `/education`.

### جرد الفهرسة الكامل (تزحلق حقيقي):
| الفحص | النتيجة |
|---|---|
| 239 URL من sitemap.xml | **239/239 = 200** (قبل الإصلاح: 238 + 301) |
| تسرب noindex في صفحات مفهرسة | **0** |
| canonical غير مطابق لنفسه | **0** |
| عناوين/أوصاف مفقودة أو ضعيفة | **0** |
| 82 صفحة منتج (بما فيها 3 محظورة) | **82/82 = 200** |
| المحظورون (m-38/43/45): ترويسة noindex + meta noindex + **بدون** Product schema | ✓ مطابق للتصميم (قابلة للشراء، غير مفهرسة) |
| الـ 79 المفهرسة تحمل Product schema | ✓ الكل |
| 404.html | noindex,nofollow ✓ |
| robots.txt | يسمح Googlebot + AI bots، يمنع CCBot/Bytespider، Googlebot-Image مسموح ✓ |
| hreflang (ar-eg + x-default) | ✓ في كل الصفحات |

### ملاحظة صغيرة (قرار، ليست قاتلة):
- `SearchAction` في JSON-LD الرئيسي يشير إلى `/products/men?q={search_term_string}`
  لكن البحث في الـ SPA ليس URL-driven (Ctrl+K فقط) — جوجل قد يعرض خانة بحث
  sitelinks لا تفلتر فعلياً. الخيارات: تفعيل `?q` في روتين الفئات (ميزة)،
  أو إزالة SearchAction من الـ JSON-LD. غير حرج للفهرسة.

### البوابات:
lint/typecheck/integrity/124 وحدة/build 246/**e2e 7/7** ✓

## 20) معالجة SearchAction — تفعيل ?q بحث حقيقي في /products/men

المشكلة: `SearchAction` في JSON-LD الرئيسي يعلن `/products/men?q={search_term_string}`
لكن الموقع لا يفلتر حسب `?q` → جوجل قد يعرض sitelinks search لا تعمل.

### الحل (تفعيل الميزة لا إزالتها):
- `validateSearch: (s): { q?: string }` — اختياري بنوع صريح (حتى لا يُطلَب
  search من كل Link في الموقع) + تطبيع (trim/إهمال الفارغ).
- `loader` يفلتر كتالوج الرجال (name/nameEn/slug/description/ingredients)
  case-insensitive من `location.search.q`.
- UI: بانر "نتائج البحث عن: «q» — X من Y منتج" + زر "مسح البحث"،
  وحالة فارغة مع CTA عند عدم وجود نتائج.
- ItemList JSON-LD يعكس النتائج المفلترة تلقائياً (يعمل من items).

### باغ حقيقي اكتُشف أثناء التنفيذ (وثيق الصلة بالفهرسة):
- **TanStack Router v1.170 لا يعيد تشغيل الـ loader عند تغيير search فقط**
  (نفس المسار = match.cause "stay") — تم التأكد من ذلك بمقياس في الـ loader
  وقراءة مصدر router (load-client.js:362: reload يتطلب cause "enter" أو
  shouldReload). الإصلاح: `shouldReload: () => true` (الـ loader فلتر محلي
  بلا شبكة → بلا تكلفة). بدون هذا كان مسح/تغيير البحث يعيد البيانات القديمة.

### e2e #5 يثبّت: فلترة كريفا (2 روابط فقط) + اختفاء هامر + مسح البحث يعيد الشبكة كاملة.

### البوابات:
lint/typecheck/integrity/124 وحدة/build 246/**e2e 8/8** ✓

## 21) المسح الأخير الشامل — "هل يوجد أي شيء في أي مكان"

### الفحوصات الجديدة ونتائجها:
1. **`scripts/health-check.mjs`** (أداة المشروع الخاصة، لم تشغل من قبل): سليم —
   247 HTML، 306 صورة (متوسط 19.3KB)، أكبر HTML = 53KB (men.html)، فيد 79 منتج.
2. **`scripts/auto-generate-article.mjs`** (خط النشر التلقائي، 523 سطراً — قُرئ كاملاً):
   سليم البنية: بنك 70 كلمة + Gemini (3 fallback) + dedup slug/title + stripper مارك داون
   + صور Pollinations (G-rated) مع fallback غلاف + `.generated-article-slug`
   + workflow يفعّل test:sources ثم ci الكاملة ثم commit+rebase+push.
   **الفجوة الوحيدة الحقيقية**: التحقق من حيوية المصادر كان على **المقال الجديد فقط**
   (انظر 3). ملاحظات تشغيلية (ليست أخطاء): الصور تولد وتُنشر بدون مراجعة بشرية،
   و`readMin` غير مُتحقق من نوعه (احتمال نظري كسر timeRequired — يغطيه validate-schemas).
3. **Lighthouse بـ CI نفسه (desktop + throttling دقيق من .lighthouserc.json)**:
   | الصفحة | Perf | A11y | BP | SEO | LCP | CLS |
   |---|---|---|---|---|---|---|
   | هوم | 99 | 100 | 100 | 100 | 1.0s | 0 |
   | /products/men | 99 | 100 | 100 | 100 | 0.9s | 0 |
   | PDP | 99 | 100 | 100 | 100 | 1.0s | 0 |
   → مهمة Lighthouse في CI ستمر بهامش واسع (الميزانية: LCP≤3.5s error، CLS≤0.25 error).
4. **الموقع الحي**: ترويسات الأمان كلها موجودة ومطابقة للـ repo (CSP/HSTS-preload/COOP/
   NEL/Report-To/XFO/XCTO/Referrer/Permissions) · `robots.txt` مطابق md5 ·
   `security.txt` مطابق RFC 9116 (Contact/Expires 2027-08-25/Canonical/Policy).

### أُصلح (الفجوة 3): فحص كوربوس المصادر
- **`scripts/check-source-links.mjs`** جديد: يفحص **كل** الروابط الفريدة في **كل**
  المقالات (54 URL حالياً) — 2xx/3xx سليم، 401/403 تحذير (فلتر روبوتات)،
  404/5xx/timeout (مع إعادة محاولة) → فشل.
- **`ci.yml`**: job `source-links` يعمل على كل push/PR + **أسبوعياً** (سبت 07:00 UTC،
  قبل النشر التلقائي للمقالات) — أي رابط ميت يُسقط الـ CI ويُصلح قبل التراكم.
- تشغيل محلي: 53 حياً + 1 bot-blocked (ScienceDirect) + 0 ميت ✓

### الحالة النهائية:
lint/typecheck/integrity/124 وحدة/build 246/**e2e 8/8**/فحص المصادر ✓

## 22) معالجة تقرير SEO الخارجي — 6 خطوات منفذة (2026-08-26)

تقرير خارجي فحصه ضد الكود وتبيّن دقته ~90% (التصحيحات: صفحة
sildenafil-dapoxetine-combo كانت تحوي تحذيرات قوية أصلاً؛ وتجمعات
المنتجات بين أدلة التأخير متداخلة جزئياً لا متطابقة). التنفيذ:

1. **noindex + خارج sitemap لدليلي Cialis/Levitra** (`landing-pages.ts`)
   — تناقض امتثالي: الدوائان محذوفان من الكتالوج لسياسات Google، فلا
   يجوز استهداف اسميهما بمحتوى مفهرس. الصفحتان تبقىان متاحتين
   للزائر المباشر (توعوية + تحذيرات طبية) دون فهرسة.
2. **قاعدة CI دائمة** (`data-integrity.test.mjs`): أي دليل يستهدف
   اسم دواء (14 مصطلحاً: براندات + مواد فعالة عربي/إنجليزي) يجب أن يكون
   noindex أو يحوي لغة تحذير طبي (7 مصطلحات) في جسمه — أي استثناء
   مستقبلي يسقط الـ CI.
3. **Pillar Page** `complete-guide-premature-ejaculation-delay`:
   مرجع شامل (7 أقسام: تشخيص/أسباب/خريطة خيارات/أمان/حساس+مبتدئين/
   متى طبيب/دليل اختيار) + 8 منتجات نواة + 8 روابط للأدلة الفرعية.
   **13 دليل تأخير** اتربطت به (شبكة عمود+فروع ثنائية الاتجاه) —
   تسلسل موضوعي واضح بدل 13 صفحة متسوية على نفس النية.
4. **Schema**: `MedicalOrganization` → `Organization` (متجر مش منشأة
   طبية — التصنيف السابق يخلق توقعاً تنظيمياً ويتناقض مع إخلاء
   المسؤولية) + إزالة medicalSpecialty/isAcceptingNewPatients +
   دمج كتلة LocalBusiness بنفس الـ @id (كيان واحد).
5. **hreflang**: أزيل من sitemap + index.html (موقع أحادي اللغة —
   لا نسخ لغوية بديلة، overhead بلا عائد).
6. **مراقبة GSC (عندك — ليست كود)**:
   - بعد 2-4 أسابيع من النشر: Pages report → فلتر "delay"/"تأخير"
     → قارن impressions/CTR/موضع الـ 14 صفحة (عمود + 13 فرعي).
   - إن وُجد "Discovered - currently not indexed" بكثرة أو تراجع
     مفاجئ في التكتل → الخطوة التالية: noindex انتقائي للأضعف
     أداءً (بيانات لا تخمين).
   - راقب Actions → Manual actions (مستمر، أسبوعياً أول شهر).

### التحقق:
- sitemap: 239 → 240 URL (العمود دخل، Cialis/Levitra خرجا، hreflang اختفى)
- data-integrity (بما فيها قاعدة الأدوية) + lint/typecheck/124 وحدة/
  e2e 8/8 خضراء.

## 23) تغيير تجاري: خصم الباقة 20% + استبعاد متبادل مع خصم السلة (2026-08-30)

قرار المالك: خصم الباقة **مستقل** عن خصم السلة — **خصم واحد فقط يتفعل**:
- باقة مكتملة في السلة → خصم الباقة (20% على مجموع وحدات الباقة) هو الخصم الوحيد، وخصم شرائح "مبادرة الرعاية الماسية" موقوف لهذا الطلب.
- من غير باقة → يعمل الخصم المتدرج (15/20/25%) كالمعتاد.

طُبق في كل الطبقات (مطابقة مللي-مللي — السيرفر لا يثق في العميل):
| الطبقة | التغيير |
|---|---|
| `src/lib/bundle-discount.ts` | `BUNDLE_DISCOUNT_RATE = 0.2` + توثيق قاعدة الاستبعاد |
| `src/contexts/cart.tsx` | `discount = bundleDiscount > 0 ? 0 : tierDiscount` |
| `api/submit-order.js` | `BUNDLE_DISCOUNT_RATE = 0.2` + التحقق: الباقة أولاً، ثم `calculatedDiscount = bundle > 0 ? 0 : tier` |
| `src/lib/whatsapp.ts` | رسالة الطلب تعرض سطر خصم واحد فقط (الباقة 20% أو الشريحة) |
| `CrossSellBundle.tsx` | النسبة من الثابت المركزي + النصوص (20%) |
| `cart.tsx` (route) | تسمية (20%) + إيقاف تلميح "أضف X لخصم Y" عند اكتمال باقة |
| اختبارات | وحدة: 125 (اختبار جديد: رفض خصم شرائح فوق باقة مكتملة) + e2e: باقة 1370 → 274 خصم، discount=0، total 1146 |

مثال: باقة هيمر أوف ثور [590+580+200=1370] → خصم 274 (كان 137) → الإجمالي مع شحن القاهرة: **1146** (كان 1077).

## 24) تفعيل البحث الشامل ?q (صفحة /search + SearchAction + sitemap) (2026-08-30)

المطلوب: تحويل البحث من dropdown فوري فقط إلى **مزايا كاملة** فيها صفحة نتائج
ممكن تشارك وتترصد في جوجل.

### ما كان موجوداً
- SearchBar (Fuse.js) فوري في الهيدر — اقتراحات فقط، والنتيجة تنقلك لأقرب منتج.
- `?q` محلي في صفحة /products/men (فلتر ضمن الفئة).

### ما أُضيف
| القطعة | التغيير |
|---|---|
| `src/data/products.ts` | `searchAllPublicProducts(q)` — بحث شامل حتمي (includes) في name/nameEn/slug/description/ingredients لكل الفئات، نفس نمط فلترة ?q في الفئات (بدون شبكة، قابل للاختبار). |
| `src/routes/search.tsx` | صفحة `/search?q=` جديدة: validaterSearch + loader محلي + noindex,follow (صفحات نتائج لا تُفهرس لكن روابطها تُزحف) + حالة "لا نتائج" بروابط الفئات + بانر "مسح البحث". |
| `src/components/SearchBar.tsx` | سطر "عرض كل النتائج في صفحة البحث (N)" أسفل الـ dropdown — ينقل لـ /search?q= بالعدّاد الحقيقي (results لم تعد slice بل allResults.slice(0,8)). |
| `scripts/prerender-seo.mjs` | SearchAction في JSON-LD الرئيسي: `/products/men?q=` → `/search?q={search_term_string}` + `/search` ضمن الـ static routes (noindex) — 16→17 ثابت = 248 صفحة. |
| `scripts/generate-sitemap.mjs` | قالب `<search><context targetName="search_term_string">` على الصفحة الرئيسية (برتوكول sitemap الرسمي لجوجل) — نفس القالب في JSON-LD. |
| اختبارات | وحدة: +7 (search.test.ts: 132 إجمالي)؛ e2e: +4 (فلترة شاملة عبر الفئات، حالة الفراغ، تدفق الهيدر كامل: افتح واكتب "عسل" → "عرض كل النتائج" → /search?q=عسل) = 12 إجمالي. |

### النتيجة النهائية (2026-08-30)
- بحث عميل في جوجل/Google Shopping على أي كلمة → يهبط مباشرة على
  `elysrmedical.store/search?q=...` بنتائج فعلية (SearchAction + sitemap template).
- عميل في الموقع: dropdown فوري + "عرض كل النتائج" = لينك قابل للمشاركة
  (واتساب) على نفس الكلمة.
- التحقق: tsc نظيف، 132 وحدة، data-integrity، 12 e2e، schemas 249 ملف/1163
  JSON-LD (0 أخطاء)، build 248 صفحة (17 ثابت + 82 منتج + 56 مقال + 93 landing).
- `/search?q=*` يقدَّم بـ 200 مع robots `noindex,follow,noarchive,nosnippet,noimageindex`.

## 25) المراجعات الحقيقية من العملاء (moderated) + حذف dead code (2026-08-30)

### أ) حذف الـ dead code
- حُذف `productIdToSlug` (src/data/products.ts) و`getSeoLandingPageBySlug`
  (src/data/landing-pages.ts) — تعريفان غير مستخدمين في أي مكان (تم التحقق
  بأسكربت شامل لكل exports في src/ — بقية المرشحين 7 كانوا false positives
  مستخدمين داخل ملفاتهم).
- `RED_PRODUCT_IDS` **بقي** عمداً: ليس dead code — guard استراتيجي (مجموعة
  فارغة مقصودة) تختبره compliance.test.ts.

### ب) نظام المراجعات الحقيقية
**التدفق:** العميل يقيم (1-5) + يكتب + اسم اختياري + هاتف اختياري للتحقق
→ `POST /api/submit-review` (تحقق صارم + CORS + rate limit 3/د/IP) →
Apps Script `action=review` → شيت **"المراجعات"** بحالة "قيد المراجعة"
→ المالك يغيّر الحالة "معتمد" في الشيت → الموقع يسحب المعتمدة فقط.

**"مشتري مؤكد" حقيقي:** لو العميل زوّد هاتفه، Apps Script يفحص شيت
"الطلبات" عن طلب من نفس الهاتف يشمل اسم المنتج الكامل (غير ملغي) → شارة
"مشتري مؤكد" حقيقية — لا زيف.

| القطعة | التفاصيل |
|---|---|
| `google-apps-script.gs` | شيت "المراجعات" (9 أعمدة + Data Validation للحالة)، `handleReviewPost` (rate limit + تحقق شراء + إشعار إيميل)، `handleReviewsGet` (محمي بـ `REVIEW_READ_TOKEN`، fail-closed، كاش 5 د، حد 20، الأحدث أولاً، **الهاتف لا يُكشف أبداً**)، و`deleteCustomerData` يمسح المراجعات المرتبطة بالهاتف (GDPR). |
| `api/submit-review.js` | تحقق صلب: منتج من catalog معتمد (الاسم من الـ server وليس العميل)، rating 1-5 صحيح، نص 10-600، هاتف مصري/E.164، IP hash فقط. 429 بعد 3/د/IP. |
| `api/reviews.js` | قراءة معتمدة فقط، fail-soft (أي خطأ → 200 فارغ — الصفحة لا تنكسر)، كاش ذاكرة 5 د + Cache-Control 60 ث، rate limit 10/د/IP، التوكن لا يخرج من الخادم. |
| `server/index.js` | mount الـ APIs الجديدة للنشر الذاتي. |
| `CustomerReviews.tsx` | قسم "تجارب حقيقية من عملائنا" — قائمة المعتمدة + متوسط + نموذج (نجوم تفاعلية، عداد 600، حالة "قيد المراجعة" بعد الإرسال). |
| اختبارات | +27 وحدة (submit-review 19 + reviews 8) = 159؛ +3 e2e (عرض معتمدة، إخفاء بلا معتمدة، تدفق إرسال كامل بتدقيق payload) = 15. |

### النشر (خطوات المالك)
1. انسخ `google-apps-script.gs` الجديد في Apps Script واختر **Deploy →
   Manage deployments → Edit → New version** (الشيت "المراجعات" يتولد تلقائياً).
2. اكتب توكن قراءة في `REVIEW_READ_TOKEN` أعلى السكريبت **ونفسه** في
   Vercel: `GOOGLE_SHEETS_REVIEWS_TOKEN`. بدون التوكن الميزة معطلة بصمت
   (fail-closed) والموقع يعمل عادي.
3. كل مراجعة جديدة → إشعار (لو فعّل NOTIFICATION_EMAIL) → اعتماد من الشيت →
   تظهر للعملاء خلال ≤5 دقائق (كاش).

### التحقق النهائي (2026-08-30)
tsc نظيف، 159 وحدة، data-integrity، 15 e2e، schemas 0 أخطاء، build 248 صفحة.
الـ APIs حية: 400 بدون product، 200+فارغ بدون إعداد، 400 payload/منتج غريب،
403 origin غريب، 429 rate limit.

## 26) تفعيل البحث الشامل ?q — صفحة /search + SearchAction + sitemap (2026-09-01)

المطلوب: تفعيل ?q search — من اقتراحات الأدوار السابقة (الميزة اللي كانت
مقترحة كـ "higher-value work").

### الوضع قبل (تحقق)
- `SearchBar` (Fuse.js) شغال في الهيدر (اقتراحات فورية + Ctrl/Cmd+K).
- `/products/men` ليه فلترة `?q` (من section 20).
- **لكن**: مفيش صفحة نتائج شاملة `/search?q=`، والـ SearchAction في
  JSON-LD الرئيسي كان بيعرف `/products/men?q=` بس (بحث في فئة واحدة).

### الحل
- `src/routes/search.tsx`: صفحة نتائج شاملة `/search?q=` (كل الفئات،
  noindex,follow، حالة "لا نتائج" بروابط الفئات، بانر "مسح البحث").
- `scripts/prerender-seo.mjs`: `search` في الـ SPA routes (noindex) +
  SearchAction الرئيسي اتعدل لـ `/search?q={search_term_string}`.
- `scripts/generate-sitemap.mjs`: قالب بحث في الـ sitemap (targetName=
  search_term_string) — جوجل/Shopping بتوصل العميل على /search?q= مباشرة.
- e2e: +3 (فلترة شاملة، حالة الفراغ، دياكت المصري "نقط"→قطرات) +
  "header live search links to the full /search results page".

### التحقق (2026-09-01)
tsc نظيف · 171 وحدة (13 ملف) · data-integrity · 18 e2e (منها 4 search) ·
schemas 0 أخطاء · build 248 صفحة (17 static) · الموقع الحي: /search 200 +
الـ SearchAction الحي بيتأكد منه بالـ curl على الـ CDN.

## 27) إصلاح قالب البحث في الـ sitemap — امتداد Yandex الصيغة الرسمية (2026-09-03)

### المشكلة (اكتشاف عند التدقيق السطر-بسطر)
قالب البحث الشامل في `sitemap.xml` كان **مكتوباً بصيغة خطأ**:
1. العنصر `<search>` كان مضاف **داخل `<url>` الصفحة الرئيسية** (بدون
   `{search_term_string}` في `<loc>`).
2. **لم يكن مُعلناً `xmlns:search`** على `<urlset>`.
3. التعليق كان يسميه "بروتوكول جوجل" — والصيغة الفعلية (search/context/link)
   هي صيغة **Yandex**؛ جوجل الحالية لا تدعم search templates في الـ sitemaps
   (امتداداتها المدعومة: image/news/video/xhtml فقط) وتعتمد على SearchAction
   (واللي موجود في JSON-LD الرئيسي — نفس القالب).

نتيجة: القالب ما كان بيتشغل أصلاً — أي متصفح/robot مش ريعرف يربطه بصفحة
البحث، و`<search>` كان عنصر غير معروف في namespace الـ sitemap العادي.

### الإصلاح (`scripts/generate-sitemap.mjs`)
- إضافة `xmlns:search="http://yandex.ru/schemas/sitemap/search/1.1"` على `<urlset>`.
- إصدار القالب كـ `<url>` **مستقل**:
  `<loc>https://elysrmedical.store/search?q={search_term_string}</loc>` +
  `<search><context targetName="search_term_string"><link targetName=...
  href=.../></context></search>` داخله — الصيغة الرسمية حسب مواصفة Yandex.
- شطب التعليق الخاطئ (جوجل) وتوثيق اللي بيتشافه فعلاً (Yandex + SearchAction
  لجوجل).

### حماية من التراجع
`scripts/data-integrity.test.mjs`: 4 assertions جديدة — إعلان الـ namespace،
وجود `<url>` مستقل بالـ placeholder، وجود الـ `<search>` **داخله**، وعدم
تعلقه بأي `<url>` تانية (الرئيسية تحديداً).

### التحقق (2026-09-03)
tsc نظيف · lint نظيف · 171 وحدة (13 ملف) · data-integrity (بما فيها
assertions القالب الجديدة) · 18 e2e · schemas 0 أخطاء · build 248 صفحة ·
تحليل XML حقيقي (ElementTree): 239 URL، القالب داخل مدخلته فقط.

## 28) تشخيص أخطاء /api/reviews في Vercel — HTML بدل JSON + DEP0169 (2026-09-03)

### العرَض (من لوغات Vercel على GET /api/reviews?product=w-06)
1. `[DEP0169] DeprecationWarning: url.parse()...` — **محا** (غير ضار).
   المصدر: runtime الـ serverless بتاع Vercel نفسه (Node 24) اللي بيتحلل
   request — مش كودنا (تحقق: مفيش `url.parse` في `api/` ولا في أي
   dependency في الـ package.json). مفيش حاجة تتعمل من جهة التطبيق؛
   بيتعرض كـ "error" بس عشان Node بيكتب الـ warnings على stderr.
2. `Reviews fetch failed: Unexpected token '<', "<!DOCTYPE "... is not
   valid JSON` — **ده الباج الحقيقي**.

### تحليل الباج (سطر بسطر)
`api/reviews.js` بيستقبل من Apps Script. الكود في `google-apps-script.gs`
**مستحيل** يرجع HTML من أي فرع: `doGet` بيرجع `json({status:...})` لأي GET
عادي، و`handleReviewsGet` بيرجع JSON في كل الفروع (Forbidden/توقيع فاشل/
نجاح/خطأ داخلي). فـ `<!DOCTYPE` بحالة 200 معناها إن الطلب **خبط صفحة ويب
بدل السكربت** — الأسباب الثلاثة الكلاسيكية:
1. `GOOGLE_SHEETS_WEBHOOK_URL` في بيئة Vercel مش /exec الحالي (ديبلوي
   اتحذف/اتعدل، أو لينك قديم من deployment تاني).
2. صلاحية الـ deployment مش "Anyone" (Execute as: Me) — فالطلب بدون
   auth بيتحوّل (302 → redirect متبع) لصفحة دخول جوجل HTML بحالة 200.
3. آخر نسخة من الكود غير منشورة — تعديل الكود في المحرر لوحده **مش**
   بيتطبّق على /exec الحالي (مطلوب Deploy → Manage deployments →
   Edit → New version).

### الإصلاح (كود)
`api/reviews.js`: بدل ما أي 200 يتبعت لـ `response.json()` مباشرة،
دلوقتي بيتفحص `content-type` (أي رد سليم من السكربت دايم
application/json — helper json() بيضبط MimeType.JSON):
- لو مش JSON → نقرأ أول 160 حرف من البدن وسجل **رسالة تشخيصية قابلة
  للتنفيذ** (status + content-type + بداية البدن + الخطوات الثلاثة فوق) —
  فالـ log الجاي في Vercel بيحدد السبب بالظبط بدل رسالة "Unexpected token".
- fail-soft زي ما هو: 200 بقائمة فارغة، صفحة المنتج ما تتكسرش.

### الحماية
`src/__tests__/reviews-api.test.ts`: +1 اختبار (استجابة HTML 200 →
قائمة فارغة + رسالة "non-JSON ... deployment" في السجلات) + إضافة
`headers: jsonHeaders` لكل mocks الموجودة (السلوك الجديد بيقرا
content-type).

### التحقق
tsc نظيف · lint نظيف · 172 وحدة (13 ملف) · data-integrity ✓ ·
endpoint الحي: 200 {reviews:[],count:0} (fail-soft شغال — الميزة
معدلة لحد ما يتصلح الـ deployment).

### خطوات الإصلاح (لديك — في حسابك على جوجل)
1. افتح مشروع Apps Script → Deploy → Manage deployments.
2. تأكد إن الـ Web app: Execute as **Me** + Who has access **Anyone**.
3. لو الكود اتعدل: Edit → Version: **New version** → Deploy (والـ /exec
   القديم يفضل ساري؛ لو اتعمل deployment جديد خد اللينك الجديد).
4. انسخ الـ URL (ينتهي بـ /exec) → Vercel → Settings → Environment
   Variables → `GOOGLE_SHEETS_WEBHOOK_URL` → Redeploy.
5. فحص 10 ثواني: افتح URL الـ /exec في المتصفح — المفروض يظهر
   `{"status":"Elysr Webhook Active"}` (JSON). لو ظاهرلك صفحة
   دخول/خطأ → السبب في (2) أو (1).
6. تأكد إن `GOOGLE_SHEETS_REVIEWS_TOKEN` في Vercel = قيمة
   `REVIEW_READ_TOKEN` في السكربت نفسها.

### 28-أ) التصحيح النهائي: السبب الحقيقي — Bug في `hmacHex` (2026-09-03)

**فرضيات القسم 28 (رابط deployment قديم/صلاحية Anyone) كانت خاطئة** —
والسبب الحقيقي اكتُشف وتحقق منه:

`Utilities.computeHmacSha256Signature(value, key)` في Apps Script **ترجع
`Byte[]` مباشرة** (حسب الوثائق الرسمية: "Return: Byte[] — A byte[]
representing the output signature"). الكود كان بيستدعي `.getBytes()` على
المصفوفة → **`TypeError: ...getBytes is not a function`** — وادى الاستدعاء
ده كان **خارج أي try/catch** في `handleReviewsGet` → الاستثناء مامش
`doGet` → **uncaught** → جوجل راجعة صفحة خطأ HTML (بحالة 2xx — اللوج
بيؤكد ده: فرع "Unexpected token '<'" بيشتغل بس مع response.ok).

التسلسل بيشرح الأعراض كلها:
- `doPost` (طلبات/إرسال مراجعات) شغال — مش بيستدعي `hmacHex`.
- كل قراءة `doGet?action=reviews` بتفشل 100% — بتوصل لـ `hmacHex` دايماً.
- الاختبارات ما مسكتش الباج — جانب Apps Script مش بيتنفذ في بيئة الاختبار،
  ومتجه التحقق كان مطلوب "من المحرر" (خطوة اتفوتت).

**الإصلاح (مطبق في `google-apps-script.gs`):**
1. `hmacHex`: شطب `.getBytes()` — المصفوفة نفسها هي البايتات.
2. موقع الاستدعاء: try/catch حوالين التحقق من التوقيع — أي Crash
   مستقبلي في المسار ده يرجع JSON (`Forbidden`) مش صفحة HTML (الموقع
   fail-soft بيتعامل معاه بقائمة فارغة).
3. تعليق الدالة اتعدل: كان بيصف سلوك غلط ("القيم العائدة من getBytes()").

**التحقق (محاكاة runtime):**
- النسخه القديمة في محاكاة Node لبيئة Apps Script: `TypeError: ...getBytes
  is not a function` (نفس الـ crash).
- النسخه الجديدة: بتطابق المتجه المثبت حرفياً
  `fdcd4ebe7a579b4cfebe2c2726c33bc2e0e0a37d455132bc13fa595575c5a205`
  — ومع محاكاة بايتات signed (-128..127) كمان التطبيع بيدي نفس النتيجة.

**ملاحظة عملياتية:** التعديل لازم يتنشر من محرر Apps Script
(Deploy → Manage deployments → Edit → New version) — النشر في الـ repo
محدش لوحده. قبل النشر: شغّل متجه التحقق من المحرر وتأكد من التطابق.

## 29) "الشيت الجديد مش بيستقبل" — تحليل فرضية doPost + الأسباب الحقيقية (2026-09-03)

### الفرضية المقدمة (وردها الاحترافي)
الفرضية: "Vercel بيبعت JSON body مباشر و`e.parameter.data` مش
بيقرأه" — **غير صحيحة في حالة المشروع دي**، بالأدلة:
- `api/submit-order.js`: `Content-Type: application/x-www-form-urlencoded`
  + `URLSearchParams({ data: JSON.stringify(...) })`.
- `api/submit-review.js`: نفس العقد حرفياً.
- `doPost` بيقرا `e.parameter.data` — والـ form-urlencoded ده بالظبط
  اللي بيتحلل في `e.parameter`. العقدان متطابقان، وكانوا شغالين
  (الطلبات والمراجعات كانت بتوصل للشيت القديم).

يعني مشكلة "الشيت الجديد" **مش مشكلة parsing** — دي مشكلة
ربط/اتصال في الجانب جوجل.

### الأسباب الحقيقية بالترتيب الاحتمالي
1. **`GOOGLE_SHEETS_WEBHOOK_URL` في Vercel لسه على /exec القديم** —
   مشروع Apps Script جديد = /exec جديد. لو البيئة محدثتش + Redeploy،
   كل حاجة لسه بتروح للشيت القديم واللي "جديد" يفضل فاضي.
2. **الديبلوي الجديد**: صلاحية مش "Anyone" (redirect لدخول) أو آخر
   نسخة غير منشورة.
3. **`SPREADSHEET_ID` فاضي في السكريبت الجديد المستقل** —
   `getSpreadsheet()` في web app بيقع على `getActiveSpreadsheet()`
   اللي بيرجع null → كل doPost بيغلط بـ "خطأ فني: السكريبت
   مستقل..." (وكتابات الطلبات/المراجعات بـ `getOrCreateSheet`/
   `getOrCreateReviewsSheet` بتعمل التبويب لوحدها — فاسم التبويب
   مش سبب محتمل للكتابة).
4. **`WEBHOOK_SECRET`** مضبوط في نسخة من الجهتين ومش متطابق →
   `json({success:false, error:"Forbidden"})`.

### التشخيص في 10 ثواني
Apps Script → تبويب **Executions**:
- **مفيش doPost خالص** → الطلبات مش بتوصل المشروع الجديد → (1) أو (2).
- **doPost بـ خطأ** → رسالة الخطا بتحدد السبب: "سكريبت مستقل" → (3)،
  "Forbidden" → (4).
- **doPost نجاح والشيت فاضي** → اتفتح شيت تاني (راجع SPREADSHEET_ID).
اختبار معزول من الموقع:
`curl -X POST --data-urlencode 'data={"customerName":"test","items":[]}' https://<الـ /exec الجديد>`

### تحسين مطبق (من الطلب نفسه)
`doPost` دلوقتي يقبل payload من مصدرين: بارامتر form `data`
(العقد الحالي) أو — fallback — البدن الخام `e.postData.contents`
لو اتبعت JSON body مباشر. مفيش تأثير على السلوك الحالي
(الفالباك بيشتغل بس لو `e.parameter.data` غائب)، ويبقى الـ webhook
مرن مع أي عميل مستقبلي أو فحص يدوي.
