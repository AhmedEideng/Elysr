# 🛡️ المراجعة الأمنية العميقة (سطر-سطر / ملف-ملف) — "اليسر ميديكال"

> **التاريخ:** 2026-08-13
> **المنهجية:** مراجعة سطر-سطر عبر كل الملفات على 8+ جولات، بحثاً عن:
> أسرار مكشوفة · ملفات خبيثة · حقن (XSS/SQLi/Command/SSRF/CSV) · Prototype Pollution · Path Traversal · تسريب بيانات · اعتماديات خبيثة

---

## 🔑 الخلاصة

| المحور | الحالة |
|--------|--------|
| **أسرار مكشوفة** | ✅ **لا يوجد** — لا مفاتيح/tokens حقيقية في الكود أو الملفات الملتَزَمة |
| **ملفات خبيثة** | ✅ **لا يوجد** — كل الملفات شرعية (husky/CI/sw كلها طبيعية) |
| **XSS / حقن DOM** | ✅ **لا يوجد** — صفر `innerHTML`/`eval`/`dangerouslySetInnerHTML` |
| **Command Injection** | ✅ آمن — `execSync` بمسارات ثابتة فقط (لا إدخال مستخدم) |
| **SSRF** | ✅ آمن — كل `fetch` الخادمي إلى env/URLs ثابتة |
| **CSV/Formula Injection** | ✅ محمي — `sanitizeInput` يضيف `'` للقيم الحسابية |
| **Prototype Pollution** | 🔴 **اكتُشف → أُصلح** (قائمة بيضاء للحقول المرسلة للشيت) |
| **اعتماديات خبيثة** | ✅ كلها مشهورة/شرعية، لا install hooks خبيث |
| **npm audit** | ✅ 0 ثغرات |

---

## 🔴 الاكتشاف الجديد الذي أصلحته في هذه المراجعة

### Prototype Pollution / حقن حقول زائدة في طلبات الطلب
- **المشكلة:** `submit-order.js` كان يستخدم `const safePayload = { ...payload }` — ينسخ **كل** المفاتيح التي يرسلها العميل ويُمرّرها إلى Google Sheets. رغم أن الشيت يقرأ حقولاً محددة، فإن تمرير مفاتيح تحكمية (`__proto__`، `constructor`، `toString`) أو حقول زائدة من العميل هو **ممارسة غير آمنة** (قد يسبب مشاكل، ويوسّع سطح الهجوم).
- **الحل المُنفَّذ:** أضفت **قائمة بيضاء صارمة** `ALLOWED_ORDER_FIELDS` (15 حقلاً معروفاً) — يُمرَّر للشيت فقط ما هو ضروري.
- **التحقق:** القائمة البيضاء تغطي **كل** الحقول الـ 15 التي يقرؤها الشيت (`google-apps-script.gs`) — لا فقدان للوظيفة.

---

## ✅ نتائج الفحص التفصيلي (بالمحور)

### 1. الأسرار المكشوفة
- فحصت `grep` لكل أنماط الأسرار (API key, secret, token, password, AWS, sk-, Bearer, RSA keys).
- **النتيجة:** لا أسرار حقيقية. `.env.example` يستخدم **placeholders فقط** (`replace-with-deployment-id`).
- `.gitignore` يمنع `.env`/`.env.local`/`node_modules`/`dist`/logs. **لا يوجد ملف `.env` حقيقي مُلتَزَم.**
- `ci.yml` و`auto-publish-articles.yml` يستخدمان `${{ secrets.GEMINI_API_KEY }}` — لا يُطبع المفتاح.

### 2. الملفات الخبيثة / المشبوهة
- **لا ملفات باينري/executables/أرشيفات** (فقط `husky.sh` الشرعي في git hooks).
- **لا امتدادات غير معتادة.**
- `sw.js` (Service Worker) شرعي تماماً — يمسح الكاش ويُلغّي نفسه (استراتيجية تحديث آمنة).
- ملفات `.github/workflows` شرعية (CI + نشر مقالات آلي).
- `.husky/pre-commit` شرعي (lint-staged + typecheck).

### 3. حقن XSS / DOM
- **صفر** `innerHTML` / `outerHTML` / `document.write` / `insertAdjacentHTML` / `dangerouslySetInnerHTML` / `eval` / `new Function` في كامل `src/`.
- كل إدخالات المستخدم (السلة + النموذج السريع في صفحة المنتج) تمر عبر `sanitizeInput` الذي:
  - يزيل `<>"'&\`` · يزيل `javascript:`/`data:` URIs · يزيل `on*=`
  - يمنع **CSV/Formula Injection** (يضيف `'` للقيم التي تبدأ بـ `=+-@`)

### 4. Command Injection
- `execSync` في `generate-sitemap.mjs` — **آمن**: كل الاستدعاءات تستخدم **مسارات ثابتة مكتوبة يدوياً** (`"src/data/products.ts"` إلخ)، لا إدخال مستخدم.

### 5. SSRF
- كل `fetch` الخادمية: `submit-order` → `SHEET_URL` من `process.env` (ليست من المستخدم). سكربتات البناء → URLs ثابتة (Gemini/Pollinations). **لا SSRF.**

### 6. حقن SQL / NoSQL
- **لا قاعدة بيانات SQL** — البيانات في ملفات TS ثابتة، الطلبات في Google Sheets. لا اتصال DB في مسار الطلب.

### 7. التحقق الصارم للطلبات (`submit-order`)
- حد حجم body 64KB · Rate limit 30/دقيقة · تحقق من الهاتف (Regex مصري/دولي) · أطوال حقول محدودة · **Server-side price lookup** (يستبدل أسماء/أسعار من قاعدة بيانات الخادم) · **Server-side subtotal/discount/shipping/total calculation** · CORS + Origin check.

### 8. إشعارات/سجلات
- لا تُسجَّل بيانات عملاء في السجلات (راجع `SERVER_LOGS_REVIEW.md` — أُصلح سابقاً).
- `csp-report` الآن بحد حجم + تعقيم حقول ضد Log Injection.

### 9. الثغرات البرمجية
- `npm audit` → **0 vulnerabilities** (بعد `audit fix` السابق).

---

## 🗂️ الملفات التي فحصتها (كل ملفات المشروع)
`server/index.js` · `api/` (submit-order, csp-report, rate-limiter, lib JSON) · `src/` (كل routes, contexts, lib, hooks, components, data) · `scripts/` (كل الـ mjs) · `public/` (sw, html, JSON landing-pages, images) · `google-apps-script.gs` · `vercel.json` · `.env.example` · `.gitignore` · `package.json` · `eslint.config.js` · `.github/workflows/*` · `.husky/*`

---

## 🛠️ ما أُصلح في هذه الجولة (ملخص)
| الملف | الإصلاح |
|-------|---------|
| `api/submit-order.js` | **قائمة بيضاء صارمة** للحقول المرسلة للشيت (منع Prototype Pollution/حقن حقول زائدة) |

---

## ✅ التحقق النهائي
- `node --check api/submit-order.js` ✅
- `npm run typecheck` ✅
- (سابقاً في هذه الجلسة: `test:all` 85/85 · `build` 284 صفحة · `lint` 0 أخطاء)

## 📌 ملاحظات استباقية (اختيارية، غير حرجة)
- `api/lib/config-db.json` و`products-db.json` **مُلتَزَمان في git** وتحتويان بيانات عامة فقط (محافظات/كتالوج). لو أردت تخفيفها أكثر، يمكن توليدها وقت البناء فقط وعدم التزامها (لكنها تُستخدم في `submit-order` للتحقق الخلفي، فالأفضل إبقاؤها).
- سكربت `auto-generate-article.mjs` يضع مفتاح Gemini في **URL الطلب** (ممارسة شائعة) — يُنصح لاحقاً بالانتقال إلى header `x-goog-api-key` إن أردت، لكنه سكربت يدوي خارج مسار الطلب العام.
