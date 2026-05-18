<div align="center">

# 🏥 اليسر ميديكال — Elysr Medical Group

### رقم 1 في المنتجات الطبية والصحية في مصر 🇪🇬

[![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)](https://vercel.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite)](https://vitejs.dev)
[![Tailwind](https://img.shields.io/badge/Tailwind-4-38B2AC?logo=tailwindcss)](https://tailwindcss.com)
[![TanStack Router](https://img.shields.io/badge/TanStack_Router-1.168-FF4154?logo=reactrouter)](https://tanstack.com/router)
[![Google Sheets](https://img.shields.io/badge/Backend-Google_Sheets-34A853?logo=googlesheets)](https://sheets.google.com)

متجر إلكتروني عربي (RTL) متكامل لعرض وبيع المنتجات الطبية والصحية في مصر. الطلب عبر **واتساب** مع مزامنة تلقائية لـ **Google Sheets** — بدون قاعدة بيانات خلفية (Zero-Backend).

[التشغيل المحلي](#-التشغيل-المحلي) • [النشر](#-النشر) • [بنية المشروع](#-بنية-المشروع) • [الميزات](#-الميزات-الرئيسية) • [Google Sheets](#-تكامل-google-sheets) • [الأمان](#-الأمان)

</div>

---

## 📖 نظرة عامة

**اليسر ميديكال** هو متجر إلكتروني عربي كامل (RTL) متخصص في المنتجات الطبية والصحية في مصر. مبني كتطبيق صفحة واحدة (SPA) فائق السرعة، ومُحسّن لمحركات البحث عبر توليد صفحات HTML ثابتة مسبقاً لكل منتج ومقال. التطبيق يعمل بالكامل من جانب العميل (Client-Side) مع **Google Sheets** كقاعدة بيانات خلفية للمزامنة.

### المميّزات التجارية

- 🛒 **97 منتج** في 3 تصنيفات رئيسية (رجال: 70 منتج، نساء: 23 منتج، أجهزة وأدوات: 4 منتجات)
- 📚 **20 مقالاً** توعوياً في 7 تصنيفات علمية (أساسيات، علاقات، تغذية، صحة الرجل، صحة المرأة، تمارين، نمط حياة)
- 📱 **إتمام الطلب عبر واتساب** — تجربة بسيطة بدون تسجيل ولا بطاقات ائتمان
- 🗺️ **27 محافظة مصرية** — قائمة منسدلة لاختيار المحافظة في كل صفحات الطلب
- 📊 **مزامنة تلقائية مع Google Sheets** — كل طلب يُسجل تلقائياً في شيتين منفصلين (طلبات + وكلاء)
- 🚚 **شحن سري** لجميع المحافظات مع الدفع عند الاستلام
- 🏢 **قسم الجملة** مخصص للصيدليات والموزعين مع نموذج تسجيل متكامل
- 💬 **زر واتساب عائم ذكي** — يظهر مع إشعار تشويقي بعد 5 ثوانٍ
- 📱 **متجاوب بالكامل** — تصميم مُحسّن لجميع أحجام الشاشات (320px → 4K)

---

## 🛠️ التقنيات المستخدمة

### الـ Frontend Stack

| التقنية | الإصدار | الاستخدام |
|---|---|---|
| **React** | 19.2 | المكتبة الأساسية |
| **TypeScript** | 5.8 | Type safety كامل (strict mode) |
| **Vite** | 7.3 | Build tool + dev server فائق السرعة |
| **TanStack Router** | 1.168 | File-based routing مع code-splitting تلقائي |
| **Tailwind CSS** | 4.2 | Styling utility-first باستخدام Oklch Variables |
| **Fuse.js** | 7.3 | بحث Fuzzy Search ذكي يدعم الأخطاء الإملائية العربية |
| **Lucide React** | 0.575 | أيقونات حديثة خفيفة |
| **Sonner** | 2.0 | Toast notifications |
| **clsx + tailwind-merge** | — | دمج وتحسين كلاسات CSS |

### الـ Tooling

| الأداة | الاستخدام |
|---|---|
| **SEO Prerender** | سكريبت `prerender-seo.mjs` — يولد HTML ثابت لكل منتج ومقال مع JSON-LD و Open Graph |
| **Sitemap Generator** | سكريبت `generate-sitemap.mjs` — يولد `sitemap.xml` و `robots.txt` تلقائياً |
| **ESLint 9 + Prettier 3** | نظافة وتنسيق الكود |
| **Vercel** | استضافة مجانية مع Security Headers كاملة |

---

## 🚀 التشغيل المحلي

### المتطلبات

- **Node.js** 20 أو أعلى
- **npm** 10 أو أعلى

### الخطوات

```bash
# 1. استنسخ المشروع
git clone https://github.com/AhmedEideng/Elysr.git
cd Elysr

# 2. ثبّت الاعتماديات
npm install

# 3. (اختياري) انسخ متغيرات البيئة
cp .env.example .env

# 4. شغّل بيئة التطوير
npm run dev
# → http://localhost:8080
```

### الـ Scripts المتاحة

| الأمر | الوصف |
|---|---|
| `npm run dev` | يشغّل dev server على المنفذ 8080 مع HMR |
| `npm run build` | يولّد الـ sitemap ← يبني التطبيق ← يولّد صفحات SEO ثابتة |
| `npm run preview` | يعرض الـ build المُنتَج محلياً |
| `npm run lint` | يفحص الكود بـ ESLint |
| `npm run format` | يُنسّق الكود بـ Prettier |

---

## 🏗️ بنية المشروع

```
Elysr/
├── vercel.json                    # إعدادات النشر + Security Headers + Rewrites
├── index.html                     # نقطة دخول SPA + Meta tags + Schema.org Organization
├── package.json                   # تعريف المشروع والاعتماديات
├── vite.config.ts                 # إعدادات Vite + الـ plugins + تقسيم الـ vendor chunks
│
├── scripts/
│   ├── generate-sitemap.mjs       # توليد sitemap.xml + robots.txt تلقائياً
│   └── prerender-seo.mjs          # توليد HTML ثابت + JSON-LD لكل منتج ومقال
│
├── public/                        # ملفات ثابتة (sitemap.xml، صور، manifests، favicon)
│
├── google-apps-script.gs          # 🆕 كود Google Apps Script للـ Web App
│
└── src/
    ├── main.tsx                   # نقطة دخول React
    ├── router.tsx                 # إعداد TanStack Router
    ├── routeTree.gen.ts           # شجرة التوجيه — مُولّدة تلقائياً
    ├── styles.css                 # Tailwind + متغيرات الألوان oklch + خطوط عربية
    │
    ├── routes/                    # 📄 الصفحات (File-based routing)
    │   ├── __root.tsx             # القالب الرئيسي + SEO sync + Error/404
    │   ├── index.tsx              # الصفحة الرئيسية
    │   ├── cart.tsx               # 🛒 سلة التسوق (متجاوبة + محافظات + Google Sheets)
    │   ├── wholesale.tsx          # 🏢 الجملة والتجار (متجاوب + محافظات + Google Sheets)
    │   ├── products.men.tsx       # منتجات الرجال
    │   ├── products.women.tsx     # منتجات النساء
    │   ├── products.devices.tsx   # أجهزة وأدوات
    │   ├── products.$id.tsx       # صفحة المنتج الفردية
    │   ├── education.tsx          # المكتبة التوعوية
    │   ├── education_.$slug.tsx   # المقال الفردي
    │   ├── about.tsx              # من نحن
    │   ├── contact.tsx            # تواصل معنا
    │   ├── shipping.tsx           # سياسة الشحن
    │   ├── returns.tsx            # الاستبدال والاسترجاع
    │   ├── privacy.tsx            # الخصوصية
    │   ├── terms.tsx              # الشروط والأحكام
    │   └── thank-you.tsx          # صفحة الشكر
    │
    ├── components/
    │   ├── layout/
    │   │   ├── Layout.tsx         # التخطيط العام (Header + Main + Footer)
    │   │   ├── Header.tsx         # الهيدر (شعار + قائمة + سلة + بحث + درج موبايل)
    │   │   └── Footer.tsx         # الفوتر (4 أعمدة + payment methods + حقوق)
    │   ├── sections/              # أقسام الصفحة الرئيسية
    │   │   ├── Hero.tsx           # القسم الترحيبي
    │   │   ├── FeaturedProducts.tsx # المنتجات المميزة
    │   │   ├── WhyUs.tsx          # لماذا نحن
    │   │   ├── Partners.tsx       # شركاء النجاح
    │   │   ├── WholesaleBanner.tsx # بانر الجملة
    │   │   ├── ShopByConcern.tsx  # تسوّق حسب الاحتياج
    │   │   └── DailyAdvice.tsx    # النصيحة اليومية
    │   ├── ProductCard.tsx        # بطاقة المنتج
    │   ├── SearchBar.tsx          # شريط البحث الذكي (Fuse.js)
    │   ├── BackToTop.tsx          # زر العودة للأعلى (IntersectionObserver)
    │   ├── FloatingActions.tsx    # زر واتساب العائم + الإشعار التشويقي
    │   └── FAQ.tsx                # الأسئلة الشائعة
    │
    ├── contexts/
    │   └── cart.tsx               # 🛒 سياق السلة (CartProvider + localStorage)
    │
    ├── hooks/
    │   └── use-cart.ts            # هوك السلة
    │
    ├── data/
    │   ├── products.ts            # 📦 97 منتج (بيانات كاملة)
    │   ├── articles.ts            # 📚 20 مقال توعوي
    │   ├── faq.ts                 # الأسئلة الشائعة
    │   └── product-types.ts       # أنواع المنتجات + دالة formatPrice
    │
    └── lib/
        ├── whatsapp.ts            # رابط واتساب + بناء رسالة الطلب
        ├── seo.ts                 # إدارة الـ SEO ديناميكياً (title, meta, OG, JSON-LD)
        ├── utils.ts               # دوال مساعدة (رقم مصري، UUID، تنظيف المدخلات)
        └── governorates.ts        # 🆕 27 محافظة + دوال Google Sheets
```

---

## ✨ الميزات الرئيسية

### 🔍 ١. بحث ذكي (Fuzzy Search)
- مكتبة **Fuse.js** لتصحيح الأخطاء الإملائية العربية
- يدعم البحث بالاسم العربي والإنجليزي
- نتائج فورية مع روابط مباشرة للمنتجات
- اختصار `Ctrl+K` / `Cmd+K` لفتح البحث

### 🛒 ٢. سلة تسوق متكاملة
- **تصميم متجاوب بالكامل** — تخطيط عمودي على الموبايل، أفقي على سطح المكتب
- **حفظ تلقائي** في localStorage (يدوم بين الجلسات)
- **حد أقصى للمخزون** — يمنع تجاوز الكمية المتاحة مع تنبيه واضح
- **تحديث السعر تلقائياً** عند إعادة إضافة المنتج
- **تفريغ آمن** — لا تفرغ السلة إلا بعد تأكيد إرسال واتساب (Prompt Modal)

### 🗺️ ٣. محافظات مصر (27 محافظة)
- قائمة منسدلة في **كل صفحات الطلب** (السلة، الجملة)
- تصميم متناسق مع أيقونة 📍 وسهم اختيار
- سهلة الإضافة والحذف عبر ملف `governorates.ts`

### 📊 ٤. تكامل Google Sheets
- **مزامنة تلقائية** للطلبات عند الإرسال
- **شيتين منفصلين**: "الطلبات" لسلة التسوق، "الوكلاء والتجار" لقسم الجملة
- **Fallback محلي** — يسجل آخر 50 طلب في localStorage كنسخة احتياطية
- **أمان كامل** — الطلب يُرسل عبر واتساب حتى لو فشل Google Sheets

### 📱 ٥. تصميم متجاوب كامل (Responsive)
- كل نقاط التوقف: `xs` (320px) ← `sm` ← `md` ← `lg` ← `xl`
- **هيدر متجاوب** مع قائمة همبرغر منزلقة من اليسار (RTL)
- **فوتر متجاوب**: 4 أعمدة ← 2 عمود ← عمود واحد
- **عناصر السلة**: عمودي على الموبايل (`flex-col sm:flex-row`)
- أبعاد صور ثابتة (`width`/`height` attributes) لمنع CLS

### 🔒 ٦. أمان متقدم
- **CSP Headers** في `vercel.json` — منع XSS و clickjacking
- **HSTS** + **X-Frame-Options** + **X-Content-Type-Options**
- **تنظيف المدخلات** (`sanitizeInput`): إزالة `< > " ' & \` من كل الحقول
- **توليد آمن لرقم الطلب**: `crypto.randomUUID()` بدلاً من `Math.random()`
- **التحقق من رقم الهاتف المصري**: Regex صارم `^01[0125][0-9]{8}$`
- **حد أقصى للحقول** (`maxLength`) لمنع هجمات overflow

### 🔍 ٧. تحسين محركات البحث (SEO)
- **صفحات HTML ثابتة مسبقاً** لكل منتج ومقال (مع JSON-LD Schema.org)
- **Open Graph** كامل — معاينات مثالية في واتساب وفيسبوك وتويتر
- **Sitemap.xml** و **Robots.txt** يولدان تلقائياً
- **Canonical URLs** و **Breadcrumbs Schema**
- **تتبع Google Analytics 4** — page views تلقائية لكل تنقل

### ⚡ ٨. أداء محسّن
- **تقسيم الـ vendor** إلى 5 chunks (React, Router, Icons, Search, Toast)
- **تحميل كسول** (lazy loading) للبحث
- **IntersectionObserver** لزر العودة للأعلى بدلاً من scroll listener
- **Code-splitting تلقائي** لكل صفحة عبر TanStack Router
- **خطوط محسّنة** — وزنان فقط من Cairo (600 + 800) مع `display: swap`

---

## 💬 إتمام الطلب عبر واتساب

يتم توليد رسالة منسقة تلقائياً تُرسل مباشرة لرقم الشركة:

```
🛒 *طلب جديد من موقع اليسر ميديكال*
🔖 رقم الطلب: #EL-MZXY-8F3A

👤 الاسم: محمد أحمد
📞 الهاتف: 01098882006
🗺️ المحافظة: القاهرة
📍 العنوان: مدينة نصر - شارع عباس العقاد

*المنتجات:*
1. كبسولات هامر أوف ثور × 2 = 600 ج.م
   🔗 رابط المنتج: https://elysrmedical.com/products/m-01

2. كريم فيتامين E × 1 = 180 ج.م
   🔗 رابط المنتج: https://elysrmedical.com/products/w-05

💰 *الإجمالي النهائي: 780 ج.م*
```

---

## 📊 تكامل Google Sheets

### طريقة الإعداد (مرة واحدة)

```
1. افتح sheets.new ← أنشئ Google Sheet جديد
2. Extensions > Apps Script ← الصق google-apps-script.gs
3. Deploy > New Deployment > Web App
   • Execute as: Me
   • Who has access: Anyone
4. انسخ الرابط (Deployment ID) ← ضعه في src/lib/governorates.ts
```

### هيكل البيانات

**شيت "الطلبات"** (سلة التسوق):

| A | B | C | D | E | F | G | H | I | J |
|---|---|---|---|---|---|---|---|---|---|
| التاريخ | رقم الطلب | اسم العميل | الهاتف | المحافظة | العنوان | المنتجات | الإجمالي | ملاحظات | الدفع |

**شيت "الوكلاء والتجار"** (الجملة):

| A | B | C | D | E | F | G | H | I |
|---|---|---|---|---|---|---|---|---|
| التاريخ | رقم الطلب | اسم العميل | النشاط | الهاتف | المحافظة | المدينة | ملاحظات | الحالة |

### اختبار الاتصال

```
GET https://script.google.com/macros/s/XXXXX/exec
→ {"status":"✅ Elysr Webhook Active","version":"2.0","sheets":{"orders":true,"wholesale":true}}
```

---

## 🧩 إضافة منتج جديد

افتح `src/data/products.ts` وأضف داخل التصنيف المناسب:

```typescript
{
  id: "m-71",                              // تنسيق: {category}-{رقم_تسلسلي}
  name: "اسم المنتج بالعربي",
  nameEn: "Product Name in English",
  category: "men",                         // "men" | "women" | "devices"
  price: 650,                              // السعر بالجنيه المصري
  oldPrice: 800,                           // (اختياري) السعر القديم للخصم
  description: "وصف المنتج الكامل بالعربية",
  benefits: ["فائدة ١", "فائدة ٢", "فائدة ٣"],
  ingredients: "المكونات الرئيسية",
  usage: "طريقة الاستخدام",
  badge: "الأكثر طلباً",                   // (اختياري) وسام على البطاقة
  emoji: "💊",
  image: "/images/m-71.webp",              // ضع الصورة في public/images/
  rating: 4.8,
  reviews: 150,
  stock: 60,
  featured: true,                          // (اختياري) يظهر في الصفحة الرئيسية
}
```

بعد `npm run build`:
- ✅ الـ Sitemap يتحدث تلقائياً
- ✅ صفحة HTML ثابتة تتولد للمنتج مع JSON-LD
- ✅ المنتج يظهر في واجهة الموقع والبحث

---

## 🌐 الصفحات والمسارات

| المسار | الصفحة | SEO |
|---|---|---|
| `/` | الصفحة الرئيسية | ✅ static HTML |
| `/products/men` | منتجات الرجال (70) | ✅ |
| `/products/women` | منتجات النساء (23) | ✅ |
| `/products/devices` | أجهزة وأدوات (4) | ✅ |
| `/products/:id` | صفحة المنتج (97 صفحة) | ✅ pre-rendered + JSON-LD |
| `/cart` | سلة التسوق | dynamic |
| `/wholesale` | الجملة والتجار | ✅ |
| `/education` | المكتبة التوعوية | ✅ |
| `/education/:slug` | المقال (20 مقال) | ✅ pre-rendered + JSON-LD |
| `/about` | من نحن | ✅ |
| `/contact` | تواصل معنا | ✅ |
| `/shipping` | سياسة الشحن | ✅ |
| `/returns` | الاستبدال والاسترجاع | ✅ |
| `/privacy` | الخصوصية | ✅ |
| `/terms` | الشروط والأحكام | ✅ |
| `/thank-you` | صفحة الشكر | noindex |

---

## 🚀 النشر (Vercel)

المشروع مُهيأ خصيصاً لـ **Vercel** مع دعم كامل لـ:

- **SPA Rewrites** — كل المسارات تُوجّه لـ `index.html`
- **Clean URLs** — بدون امتداد `.html`
- **Security Headers** — CSP, HSTS, X-Frame-Options إلخ
- **Cache Control** — تخزين مؤقت دائم للأصول الثابتة

### خطوات النشر

```bash
# 1. ادفع الكود إلى GitHub
git push origin main

# 2. اربط المستودع في Vercel
# 3. الإعدادات تُلتقط تلقائياً من vercel.json
#    • Build: npm run build
#    • Output: dist
#    • Install: npm install
```

---

## 🤝 التواصل

هذا مشروع **مجموعة اليسر الطبية** (Elysr Medical Group).

- 🌐 **الموقع:** [elysrmedical.com](https://elysrmedical.com)
- 💬 **واتساب المبيعات:** [+20 109 8088206](https://wa.me/201098088206)
- 📧 **البريد:** info@elysrmedical.com
- 🏢 **المقر:** القاهرة، جمهورية مصر العربية

---

## 📜 الترخيص

جميع الحقوق محفوظة © 2026 مجموعة اليسر الطبية (Elysr Medical Group).

هذا المشروع **خاص** ولا يُسمح بنسخه أو إعادة استخدامه أو توزيعه بدون إذن كتابي مسبق.
