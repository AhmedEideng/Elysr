<div align="center">

# 🏥 اليسر ميديكال — Elysr Medical Group

### المنتجات الطبية والصحية في مصر 🇪🇬

[![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)](https://vercel.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite)](https://vitejs.dev)
[![Tailwind](https://img.shields.io/badge/Tailwind-4-38B2AC?logo=tailwindcss)](https://tailwindcss.com)
[![TanStack Router](https://img.shields.io/badge/TanStack_Router-1.168-FF4154?logo=reactrouter)](https://tanstack.com/router)
[![Google Sheets](https://img.shields.io/badge/Backend-Google_Sheets-34A853?logo=googlesheets)](https://sheets.google.com)
[![Google Analytics](https://img.shields.io/badge/Analytics-GA4-E37400?logo=googleanalytics)](https://analytics.google.com)

</div>

---

## 📖 ما هو اليسر ميديكال؟

متجر إلكتروني عربي متكامل (RTL) للمنتجات الطبية والصحية في مصر. يتميز بسرعة فائقة وتجربة سلسة — تصفّح المنتجات، أضف للسلة، وأتمم طلبك بضغطة واحدة.

**بدون تسجيل. بدون قواعد بيانات. بدون تعقيد.**

الطلبات تُرسل عبر **واتساب** أو **مباشرة** إلى فريق المبيعات، وتُسجل تلقائياً في **Google Sheets** للمتابعة.

---

## ✨ لماذا اليسر ميديكال؟

| الميزة | التفاصيل |
|---|---|
| 🛒 **97 منتج** | 3 تصنيفات: رجال (70)، نساء (23)، أجهزة وأدوات (4) |
| 📚 **20 مقال توعوي** | محتوى علمي موثوق في الصحة العامة |
| 📱 **إتمام الطلب بضغطة** | واتساب أو طلب مباشر — بدون تسجيل |
| 🗺️ **27 محافظة مصرية** | قائمة منسدلة في كل صفحات الطلب |
| 📊 **Google Sheets تلقائي** | كل طلب يُسجل برقم تسلسلي وتاريخ بتوقيت القاهرة |
| 🔀 **نظام طلب مزدوج** | واتساب (رسالة جاهزة) أو طلب مباشر (للشيت فقط) |
| 🏢 **قسم الجملة** | للتجار والصيدليات — واتساب فقط |
| 📱 **تصميم متجاوب** | شاشات من 320px حتى 4K |
| 🚚 **شحن سري** | لجميع المحافظات — تغليف محايد — دفع عند الاستلام |
| 💬 **زر واتساب ذكي** | يظهر بعد 5 ثوانٍ مع إشعار تشويقي |
| 🔒 **أمان كامل** | CSP، HSTS، تنظيف مدخلات، XSS Prevention |
| 📈 **Google Analytics 4** | تتبع الزوار و page views تلقائياً |

---

## 🛠️ التقنيات

| التقنية | الاستخدام |
|---|---|
| **React 19 + TypeScript 5.8** | SPA سريعة مع type safety كامل |
| **Vite 7** | بناء فائق السرعة مع HMR |
| **TanStack Router** | توجيه بالملفات مع code-splitting تلقائي |
| **Tailwind CSS 4** | تصميم utility-first بمتغيرات Oklch |
| **Fuse.js** | بحث ذكي يصحح الأخطاء الإملائية العربية |
| **Lucide React** | أيقونات حديثة خفيفة |
| **Sonner** | إشعارات Toast أنيقة |

---

## 🚀 التشغيل المحلي

```bash
git clone https://github.com/AhmedEideng/Elysr.git
cd Elysr
npm install
npm run dev        # ← http://localhost:8080
```

| الأمر | ماذا يفعل |
|---|---|
| `npm run dev` | خادم تطوير مع HMR على المنفذ 8080 |
| `npm run build` | sitemap ← بناء ← صفحات SEO ثابتة |
| `npm run preview` | معاينة البناء النهائي محلياً |
| `npm run lint` | فحص الكود |
| `npm run format` | تنسيق الكود |

---

## 🏗️ بنية المشروع

```
Elysr/
├── index.html                     # نقطة الدخول + SEO + Schema.org + GA4
├── vercel.json                    # إعدادات النشر + CSP + Security Headers
├── vite.config.ts                 # Vite + تقسيم vendor chunks
│
├── scripts/
│   ├── generate-sitemap.mjs       # sitemap.xml + robots.txt
│   └── prerender-seo.mjs          # HTML ثابت + JSON-LD لكل منتج ومقال
│
├── google-apps-script.gs          # كود Google Sheets Webhook
│
└── src/
    ├── main.tsx                   # نقطة دخول React
    ├── styles.css                 # Tailwind + ألوان + خطوط عربية
    │
    ├── routes/                    # 17 صفحة (file-based routing)
    │   ├── cart.tsx               # 🛒 السلة (متجاوبة + نظام مزدوج)
    │   ├── wholesale.tsx          # 🏢 الجملة (واتساب فقط)
    │   ├── order-confirmed.tsx    # ✅ تأكيد الطلب المباشر
    │   ├── thank-you.tsx          # ✅ تأكيد طلب واتساب
    │   ├── products.*.tsx         # صفحات المنتجات والتصنيفات
    │   └── ...                    # (about, contact, education, إلخ)
    │
    ├── components/                # مكونات واجهة المستخدم
    ├── contexts/                  # CartProvider + localStorage
    ├── hooks/                     # useCart
    ├── data/                      # 97 منتج + 20 مقال
    └── lib/                       # whatsapp, seo, utils, governorates
```

---

## 📝 نظام الطلب

### 🔀 طريقتان:

```
        ┌──────────────────────────┐
        │   [💬 واتساب] [📦 مباشر]  │
        └──────────────────────────┘
                │           │
                ▼           ▼
        رسالة واتساب    إرسال للشيت
        نافذة تأكيد     نجاح فوري
        /thank-you     /order-confirmed
                │           │
                └─────┬─────┘
                      ▼
               Google Sheets
           (في الخلفية - فوراً)
```

### 💬 واتساب

الطلب يُفتح في واتساب كرسالة منسقة جاهزة. بعد الإرسال، تظهر نافذة تأكيد لتفرغ السلة. البيانات تُسجل تلقائياً في Google Sheets.

### 📦 طلب مباشر

الطلب يُرسل للشيت فقط. يظهر Toast نجاح وينتقل العميل لصفحة التأكيد. فريق المبيعات يتواصل عبر الهاتف.

---

## 📊 تكامل Google Sheets

### ماذا يُسجل؟

| العمود | المحتوى |
|---|---|
| التاريخ | `19/5/2026 10:30 ص` بتوقيت القاهرة |
| رقم الطلب | `#EL-0001` تسلسلي تلقائي |
| اسم العميل | الاسم المدخل |
| الهاتف | رقم مصري 11 خانة |
| المحافظة | من القائمة المنسدلة |
| العنوان | تفصيلي |
| المنتجات | `اسم × كمية = سعر` |
| الإجمالي | بالجنيه المصري |
| ملاحظات | نص حر |
| طريقة الدفع | `واتساب` أو `طلب مباشر` |

### الإعداد (مرة واحدة):

```
1. افتح sheets.new
2. Extensions > Apps Script ← الصق google-apps-script.gs
3. Deploy > New Deployment > Web App
   • Execute as: Me  • Who has access: Anyone
4. انسخ Deployment ID ← ضعه في governorates.ts
```

---

## 🔒 الأمان

- **CSP Headers** — منع XSS و clickjacking
- **HSTS** + **X-Frame-Options: DENY** + **X-Content-Type-Options: nosniff**
- **تنظيف المدخلات** — إزالة `< > " ' & \` من كل الحقول
- **maxLength** على كل حقل — منع overflow
- **توليد آمن** — `crypto.randomUUID()` ورقم طلب من الشيت
- **التحقق من الهاتف** — Regex صارم `^01[0125][0-9]{8}$`
- **HTML escaping** — في صفحات SEO المسبقة

---

## 🔍 SEO

- صفحات HTML ثابتة مسبقاً لكل منتج ومقال مع **JSON-LD Schema.org**
- **Open Graph** كامل — معاينات مثالية في واتساب، فيسبوك، وتويتر
- `sitemap.xml` و `robots.txt` يولدان تلقائياً (109 URL)
- Canonical URLs + Breadcrumbs Schema
- Google Analytics 4 مع page views تلقائية

---

## ⚡ الأداء

- Vendor chunks: React، Router، Icons، Search، Toast (تحميل متوازي)
- بحث بالتحميل الكسول (lazy loading)
- IntersectionObserver بدل scroll listener
- Code-splitting تلقائي لكل صفحة
- خطوط محسّنة: وزنان فقط من Cairo مع `display: swap`
- أبعاد صور ثابتة لمنع CLS

---

## 🌐 الصفحات

| المسار | الصفحة | SEO |
|---|---|---|
| `/` | الرئيسية | ✅ |
| `/products/men` | رجال (70) | ✅ |
| `/products/women` | نساء (23) | ✅ |
| `/products/devices` | أجهزة وأدوات (4) | ✅ |
| `/products/:id` | المنتج (97 صفحة) | ✅ JSON-LD |
| `/cart` | السلة | 🔒 noindex |
| `/order-confirmed` | تأكيد الطلب المباشر | 🔒 noindex |
| `/thank-you` | شكر واتساب | 🔒 noindex |
| `/wholesale` | الجملة | ✅ |
| `/education` | المكتبة | ✅ |
| `/education/:slug` | المقال (20) | ✅ JSON-LD |

---

## 🧩 إضافة منتج

```typescript
// src/data/products.ts
{
  id: "m-71",
  name: "اسم المنتج بالعربي",
  nameEn: "Product Name in English",
  category: "men",          // "men" | "women" | "devices"
  price: 650,
  description: "وصف المنتج",
  emoji: "💊",
  image: "/images/m-71.webp",
  stock: 60,
  rating: 4.8,
  reviews: 150,
}
```

بعد `npm run build`: الـ sitemap يتحدث، صفحة SEO تتولد، المنتج يظهر.

---

## 🤝 التواصل

- 🌐 **الموقع:** [elysrmedical.com](https://elysrmedical.com)
- 💬 **واتساب:** [+20 109 8088206](https://wa.me/201098088206)
- 📧 **البريد:** info@elysrmedical.com
- 🏢 **المقر:** القاهرة، مصر

---

## 📜 الترخيص

جميع الحقوق محفوظة © 2026 مجموعة اليسر الطبية (Elysr Medical Group). هذا المشروع خاص.
