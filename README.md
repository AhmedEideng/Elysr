<div align="center">

# اليسر ميديكال — Elysr Medical Group

### رقم 1 في المنتجات الطبية والصحية في مصر

[![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)](https://vercel.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite)](https://vitejs.dev)
[![Tailwind](https://img.shields.io/badge/Tailwind-4-38B2AC?logo=tailwindcss)](https://tailwindcss.com)

موقع تجاري بالعربية (RTL) لعرض وبيع المنتجات الطبية والصحية بإتمام الطلب عبر **واتساب** وبدون قاعدة بيانات (Zero-Backend).

[التشغيل المحلي](#-التشغيل-المحلي) • [النشر](#-النشر) • [بنية المشروع](#-بنية-المشروع) • [الميزات](#-الميزات-الرئيسية)

</div>

---

## 📖 نظرة عامة

**اليسر ميديكال** متجر إلكتروني عربي (RTL) متخصص في المنتجات الطبية والصحية في مصر.
الموقع مبني كتطبيق صفحة واحدة (SPA) فائق السرعة، ومُحسّن لمحركات البحث عبر توليد صفحات ثابتة مسبقاً (SEO-only Prerendering). يعمل التطبيق بالكامل من جانب العميل — حيث تُرسَل الطلبات مباشرة عبر **واتساب** إلى فريق المبيعات.

### المميّزات التجارية

- 🛒 **97 منتج** في 3 تصنيفات (رجال، نساء، أجهزة وأدوات)
- 📱 **إتمام الطلب عبر واتساب** — تجربة بسيطة بدون تسجيل ولا بطاقات ائتمان
- 🚚 **شحن سري** لجميع محافظات مصر مع الدفع عند الاستلام
- 🏢 **قسم الجملة** مخصص للصيدليات والموزّعين
- 📚 **مكتبة توعوية** بمقالات علمية موثوقة
- 💬 **زر واتساب عائم** ذكي، يظهر مع نُدج تشويقي بعد 5 ثوان

---

## 🛠️ التقنيات المستخدمة

### الـ Frontend Stack

| التقنية             | الإصدار | الاستخدام                                          |
| ------------------- | ------- | -------------------------------------------------- |
| **React**           | 19      | المكتبة الأساسية                                   |
| **TypeScript**      | 5.8     | Type safety كامل (strict mode)                     |
| **Vite**            | 7       | Build tool + dev server فائق السرعة                |
| **TanStack Router** | 1.168   | File-based routing مع code-splitting تلقائي        |
| **Tailwind CSS**    | 4       | Styling utility-first باستخدام Oklch Variables     |
| **Fuse.js**         | 7       | بحث ذكي ومرن (Fuzzy Search) يدعم الأخطاء الإملائية |
| **Lucide React**    | latest  | مكتبة الأيقونات                                    |
| **Sonner**          | 2       | Toast notifications                                |

### الـ Tooling

- **SEO Prerender** — سكريبت مخصص لتوليد HTML ثابت لكل منتج ومقال لأغراض الأرشفة و الـ Social Previews (Open Graph).
- **Sitemap Generator** — سكريبت لتوليد `sitemap.xml` تلقائياً قبل البناء.
- **ESLint 9** + **Prettier 3** — نظافة وتنسيق الكود.

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

| الأمر             | الوصف                                                                    |
| ----------------- | ------------------------------------------------------------------------ |
| `npm run dev`     | يشغّل dev server على المنفذ 8080 مع HMR                                  |
| `npm run build`   | يولّد الـ sitemap، ويبني التطبيق، ثم يولد صفحات الـ SEO الثابتة للمنتجات |
| `npm run preview` | يعرض الـ build المُنتَج محلياً للتجربة                                   |
| `npm run lint`    | يفحص الكود بـ ESLint                                                     |
| `npm run format`  | يُنسّق الكود بـ Prettier                                                 |

---

## 🏗️ بنية المشروع

```
Elysr/
├── 📄 vercel.json              # إعدادات النشر + Clean URLs + Security Headers
├── 📄 index.html               # نقطة دخول SPA + Meta tags + Schema.org
├── 📄 package.json             # تعريف المشروع والاعتماديات
├── 📄 vite.config.ts           # إعدادات Vite + الـ plugins
├── 📁 scripts/
│   ├── generate-sitemap.mjs    # توليد sitemap.xml تلقائياً
│   └── prerender-seo.mjs       # توليد صفحات HTML ثابتة لكل منتج ومقال
│
├── 📁 public/                  # ملفات ثابتة عامة (sitemap.xml، صور، manifests)
│
└── 📁 src/
    ├── 📄 router.tsx           # إعداد TanStack Router
    ├── 📄 styles.css           # Tailwind + متغيرات الألوان (oklch)
    │
    ├── 📁 routes/              # الصفحات (file-based routing)
    ├── 📁 components/          # المكونات (SearchBar, ProductCard, Layout, Sections)
    ├── 📁 contexts/            # React Context (cart.tsx)
    ├── 📁 hooks/               # Custom Hooks
    ├── 📁 data/                # البيانات المحلية الثابتة (products.ts, articles.ts)
    └── 📁 lib/                 # الدوال المساعدة (seo.ts, whatsapp.ts)
```

---

## ✨ الميزات والتحديثات التقنية المضافة مؤخراً

1. **بحث ذكي (Fuzzy Search):** دمج مكتبة `Fuse.js` في شريط البحث لتصحيح الأخطاء الإملائية للمستخدمين.
2. **أرشفة ومشاركة روابط مثالية (SEO-only Prerendering):** توليد ملفات `.html` ثابتة في `dist/` تشتمل على بيانات الـ Open Graph (OG) لتظهر في واتساب وفيسبوك.
3. **تفريغ السلة الآمن:** تفريغ السلة لا يحدث إلا بعد تأكيد العميل على إرسال رسالة الواتساب عبر (Prompt Modal) لتجنب فقدان المنتجات خطأً.
4. **حدود أمان متقدمة:** تحديد حد أقصى للكميات من المخزون، والتحقق من صحة أرقام الهواتف المصرية، وتحديد `maxLength` لحقول الإدخال.
5. **فوتر نظيف (Clean Footer):** إعادة تصميم تذييل الموقع بشكل عصري يعتمد على الأعمدة.
6. **تتبع Google Analytics:** دمج GA4 لتسجيل وتتبع حركة الزوار والتنقل عبر صفحات الموقع (SPA Page Views).
7. **إضافات UX إضافية:** إضافة زر العودة للأعلى (Back To Top)، ورسائل حالة واضحة أثناء التحويل للواتساب (Visual Feedback)، وتوفير صور مميزة للمقالات.

---

## 💬 إتمام الطلب عبر واتساب

يتم الاعتماد على ميزة الـ Checkout بضغطة واحدة، حيث يتم توليد رسالة منسقة بالمنتجات والأسعار وإرسالها لرقم الشركة:

```
🛒 *طلب جديد من موقع اليسر ميديكال*

👤 الاسم: محمد أحمد
📞 الهاتف: 01098088206
📍 العنوان: القاهرة - مدينة نصر

*المنتجات:*
1. كبسولات تيستو ماكس × 2 = 1300 ج.م

💰 *الإجمالي: 1300 ج.م*
```

---

## 🧩 إضافة منتج جديد

افتح `src/data/products.ts` وأضف object داخل التصنيف المناسب. بمجرد الحفظ وتشغيل `npm run build`:

- الـ Sitemap يتحدّث تلقائياً.
- صفحة HTML ثابتة تتولد للمنتج.
- يظهر المنتج في واجهة الموقع.

```typescript
{
  id: "m-26",
  name: "اسم المنتج بالعربي",
  nameEn: "Product Name in English",
  category: "men",
  price: 650,
  description: "وصف المنتج الكامل",
  emoji: "💊",
  image: "/images/m-26.webp",
  stock: 80,
}
```

---

## 🚀 النشر (Vercel)

المشروع مُهيأ خصيصاً ليتم رفعه على منصة **Vercel** مجاناً مع دعم لخاصية `cleanUrls`.

1. ادفع الكود إلى GitHub.
2. قم بربط المستودع في Vercel.
3. الإعدادات تُلتقط تلقائياً من `vercel.json` (Build command: `npm run build` و Output directory: `dist`).

---

## 🤝 التواصل

هذا مشروع خاص بـ **مجموعة اليسر الطبية**. للاستفسارات:

- 💬 **واتساب:** [اضغط هنا](https://wa.me/01098088206)

---

## 📜 الترخيص

جميع الحقوق محفوظة © مجموعة اليسر الطبية (Elysr Medical Group).
