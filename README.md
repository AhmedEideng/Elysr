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

## ✨ المميزات

| الميزة | التفاصيل |
|---|---|
| 🛒 **97 منتج** | 3 تصنيفات: رجال (70)، نساء (23)، أجهزة وأدوات (4) |
| 📚 **20 مقال توعوي** | محتوى علمي موثوق في الصحة العامة |
| 📱 **إتمام الطلب بضغطة** | واتساب (رسالة جاهزة) أو طلب مباشر |
| 🗺️ **27 محافظة مصرية** | قائمة منسدلة مع حساب الشحن تلقائياً |
| 🚚 **شحن حسب المحافظة** | 40/60/75/90 ج.م حسب المنطقة |
| 📊 **Google Sheets تلقائي** | رقم تسلسلي، توقيت القاهرة، تفصيل كامل |
| 🔀 **نظام طلب مزدوج** | صفحتي تأكيد منفصلتين لكل طريقة |
| 🏢 **قسم الجملة** | للتجار والصيدليات — واتساب فقط |
| 📱 **تصميم متجاوب** | من 320px حتى 4K — بدون تجاوز أفقي |
| 💬 **زر واتساب ذكي** | يظهر بعد 5 ثوانٍ مع إشعار تشويقي |
| 🔒 **أمان كامل** | CSP، HSTS، XSS Prevention، تنظيف مدخلات |
| 📈 **Google Analytics 4** | تتبع تلقائي لكل page view |
| ⚡ **أداء محسّن** | DNS prefetch، font preload، صور WebP بأبعاد ثابتة |

---

## 🚚 نظام الشحن

يُحسب تلقائياً عند اختيار المحافظة:

| المنطقة | المحافظات | الشحن |
|---|---|---|
| القاهرة والجيزة | القاهرة، الجيزة | **40 ج.م** |
| وجه بحري | الإسكندرية، القليوبية، البحيرة، مطروح، دمياط، الدقهلية، الشرقية، الغربية، المنوفية، كفر الشيخ، الإسماعيلية، السويس، بورسعيد، البحر الأحمر | **60 ج.م** |
| سيناء | شمال سيناء، جنوب سيناء | **90 ج.م** |
| وجه قبلي | الفيوم، بني سويف، المنيا، أسيوط، سوهاج، قنا، الأقصر، أسوان، الوادي الجديد | **75 ج.م** |

يظهر سعر الشحن فوراً تحت المحافظة وفي ملخص الإجمالي ورسالة واتساب.

---

## 🛠️ التقنيات

| التقنية | الاستخدام |
|---|---|
| **React 19 + TypeScript 5.8** | SPA سريعة مع type safety كامل |
| **Vite 7** | بناء فائق السرعة مع HMR |
| **TanStack Router** | توجيه بالملفات + code-splitting تلقائي لكل صفحة |
| **Tailwind CSS 4** | تصميم utility-first بمتغيرات Oklch |
| **Fuse.js** | بحث ذكي يصحح الأخطاء الإملائية العربية |
| **Lucide React** | أيقونات حديثة خفيفة |
| **Sonner** | إشعارات Toast أنيقة |
| **Google Apps Script** | Webhook لاستقبال الطلبات في Google Sheets |

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
├── vite.config.ts                 # Vite + تقسيم vendor إلى 5 chunks
│
├── scripts/
│   ├── generate-sitemap.mjs       # sitemap.xml + robots.txt (109 URL)
│   └── prerender-seo.mjs          # HTML ثابت + JSON-LD لكل منتج ومقال
│
├── google-apps-script.gs          # كود Google Sheets Webhook
│
└── src/
    ├── main.tsx                   # نقطة دخول React
    ├── styles.css                 # Tailwind + ألوان Oklch + خطوط عربية
    │
    ├── routes/                    # 18 صفحة (file-based routing)
    │   ├── cart.tsx               # 🛒 السلة (متجاوبة + شحن + نظام مزدوج)
    │   ├── wholesale.tsx          # 🏢 الجملة (واتساب فقط + محافظات)
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

**واتساب:** يُفتح برسالة منسقة جاهزة تحتوي على المنتجات، بيانات العميل، المحافظة، الشحن، والإجمالي. بعد الإرسال تظهر نافذة تأكيد لتفرغ السلة والانتقال لصفحة الشكر.

**طلب مباشر:** يُرسل للشيت تلقائياً. يظهر Toast نجاح وينتقل العميل لصفحة تأكيد منفصلة. فريق المبيعات يتواصل عبر الهاتف.

---

## 📊 تكامل Google Sheets

### أعمدة شيت "الطلبات":

| العمود | المحتوى |
|---|---|
| التاريخ | `19/5/2026 10:30 ص` بتوقيت القاهرة (UTC+3) |
| رقم الطلب | `#EL-0001` تسلسلي تلقائي |
| اسم العميل | الاسم المدخل |
| الهاتف | رقم مصري 11 خانة |
| المحافظة | من القائمة المنسدلة |
| العنوان | تفصيلي |
| المنتجات | `اسم × كمية = سعر` |
| المجموع الفرعي | سعر المنتجات فقط |
| الشحن | 40 / 60 / 75 / 90 ج.م |
| الإجمالي | المجموع + الشحن |
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
- **التحقق من الهاتف** — Regex صارم `^01[0125][0-9]{8}$`
- **HTML escaping** — في صفحات SEO المسبقة

---

## ⚡ الأداء

| التحسين | التفاصيل |
|---|---|
| **DNS prefetch** | 5 نطاقات خارجية (Google Fonts، GA4، Google Sheets) |
| **Font preload** | تحميل Cairo بأولوية عالية — غير مانع للعرض |
| **Code-splitting** | تلقائي لكل صفحة عبر TanStack Router |
| **Vendor chunks** | 5 أجزاء منفصلة للتحميل المتوازي |
| **صور محسّنة** | WebP 100% + أبعاد width/height ثابتة لمنع CLS |
| **overflow-x: hidden** | يمنع أي تجاوز أفقي على الموبايل |
| **خطوط خفيفة** | وزنان فقط من Cairo (600 + 800) |
| **GA4 async** | تحميل غير مانع للعرض |
| **sourcemap** | معطل في الإنتاج |

---

## 🌐 الصفحات

| المسار | الصفحة |
|---|---|
| `/` | الرئيسية |
| `/products/men` | رجال (70 منتج) |
| `/products/women` | نساء (23 منتج) |
| `/products/devices` | أجهزة وأدوات (4 منتجات) |
| `/products/:id` | المنتج (97 صفحة — SEO + JSON-LD) |
| `/cart` | سلة التسوق |
| `/order-confirmed` | تأكيد الطلب المباشر |
| `/thank-you` | شكر واتساب |
| `/wholesale` | الجملة والتجار |
| `/education` | المكتبة التوعوية |
| `/education/:slug` | المقال (20 مقال — SEO + JSON-LD) |
| `/about` | من نحن |
| `/contact` | تواصل معنا |
| `/shipping` | سياسة الشحن |
| `/returns` | الاستبدال والاسترجاع |
| `/privacy` | الخصوصية |
| `/terms` | الشروط والأحكام |

---

## 🧩 إضافة منتج

```typescript
// src/data/products.ts
{
  id: "m-71",
  name: "اسم المنتج بالعربي",
  nameEn: "Product Name",
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

بعد `npm run build`: sitemap يتحدث، صفحة SEO تتولد، المنتج يظهر في الموقع والبحث.

---

## 🤝 التواصل

- 🌐 **الموقع:** [elysrmedical.com](https://elysrmedical.com)
- 💬 **واتساب:** [+20 109 8088206](https://wa.me/201098088206)
- 📧 **البريد:** info@elysrmedical.com
- 🏢 **المقر:** القاهرة، مصر

---

## 📜 الترخيص

جميع الحقوق محفوظة © 2026 مجموعة اليسر الطبية (Elysr Medical Group). هذا المشروع خاص.
