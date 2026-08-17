# 📘 دليل نشر Google Apps Script — خطوة بخطوة

هذا الملف يشرح كيفية نشر `google-apps-script.gs` اللي بيستقبل الطلبات من موقعك ويسجلها في Google Sheets.

---

## 🅰️ تحضير Google Sheet (اختياري — الـ script بيعملها لوحده)

لو عاوز تعمل Sheet بنفسك اسمه `الطلبات` بالأعمدة دي:
`التاريخ | رقم الطلب | حالة الطلب | اسم العميل | الهاتف | المحافظة | العنوان | المنتجات | عدد المنتجات | المجموع قبل الخصم | قيمة الخصم | المجموع بعد الخصم | الشحن | الإجمالي النهائي | ملاحظات | طريقة الطلب | نوع الطلب | تم تطبيق خصم | IP العميل`

---

## 🅱️ خطوات النشر في Google Apps Script

### 1️⃣ افتح Google Apps Script

- اذهب إلى [script.google.com](https://script.google.com)
- سجّل دخولك بنفس حساب Google اللي هتستخدمه للشيت

### 2️⃣ أنشئ مشروع جديد

- اضغط على **+ New project** (أو أنشئ مشروع جديد)
- امسح الكود اللي في `Code.gs` (الافتراضي)

### 3️⃣ انسخ الكود

- افتح ملف `google-apps-script.gs` من المشروع
- انسخ المحتوى بالكامل (462 سطر)
- الصقه في `Code.gs`

### 4️⃣ غيّر إيميل الإشعارات

في السطر ده:

```javascript
const NOTIFICATION_EMAIL = "";
```

غيّره لإيميلك عشان توصلك إشعارات الطلبات الجديدة.

### 5️⃣ احفظ المشروع

- `Ctrl+S` أو `File → Save`
- سمّي المشروع: **Elysr Orders Webhook**

### 6️⃣ انشر كتطبيق ويب

- اضغط على **Deploy → New deployment**
- اختار النوع: **Web app**
- الإعدادات:
  - **Description**: Elysr Orders Webhook v1
  - **Execute as**: `Me` (أنا)
  - **Who has access**: `Anyone` (أي شخص) ✅ ← **مهم جداً!**
- اضغط **Deploy**

### 7️⃣ سمّح بالصلاحيات (أول مرة فقط)

- هتظهرلك شاشة Authorization
- اختار حساب Google بتاعك
- اضغط **Allow**
- （طبيعي تظهر جملة "Google hasn't verified this app" — ده لأن التطبيق مش في متجر Chrome، اضغط Advanced ثم Go to project)

### 8️⃣ انسخ رابط الـ Webhook

- بعد النشر، هيظهرلك URL زي:
  ```
  https://script.google.com/macros/s/AKfy.../exec
  ```
- **انسخ الرابط ده** — ده اللي هتحطه في Vercel

---

## 🅲 حط الرابط في Vercel

1. افتح [Vercel Dashboard](https://vercel.com) → مشروعك
2. **Settings → Environment Variables**
3. أضف:
   ```
   GOOGLE_SHEETS_WEBHOOK_URL = https://script.google.com/macros/s/.../exec
   ```
4. **Redeploy**

---

## 🅳 اختبر إنه شغال

### الطريقة 1 — طلب مباشر من الموقع

اطلب منتج من الموقع وشوف Google Sheet لو فيه صف جديد.

### الطريقة 2 — من المتصفح

افتح الرابط ده في المتصفح:

```
https://script.google.com/macros/s/.../exec
```

مفروض تشوف رسالة:

```json
{ "status": "✅ Elysr Webhook Active (v2)", "orders": "0 طلب", "sheet": "موجود" }
```

### الطريقة 3 — استخدم curl

```bash
curl -L -X POST "https://script.google.com/macros/s/.../exec" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d 'data={"orderId":"TEST-001","customerName":"اختبار","customerPhone":"01000000000","governorate":"القاهرة","items":[{"name":"منتج اختبار","qty":1,"price":100}],"subtotalBeforeDiscount":100,"discount":0,"subtotal":100,"shipping":50,"total":150,"paymentMethod":"واتساب","orderType":"شراء فوري"}'
```

---

## 🅴 مشاكل وحلول

| المشكلة                     | الحل                                                                             |
| --------------------------- | -------------------------------------------------------------------------------- |
| **404 Not Found**           | تأكد إن الرابط كامل وصحيح                                                        |
| **500 Internal Error**      | افتح Google Apps Script → Executions → شوف الخطأ                                 |
| **الـ Sheet مش بيسجل**      | تأكد من صلاحيات الـ deploy (Anyone)                                              |
| **طلب مكرر**                | الـ script بيكتشف التكرار تلقائياً بالأمر `orderId`                              |
| **بغيت أعدل في الـ script** | عدل الكود → **Deploy → Manage deployments** → Edit → **Deploy** (هينتج URL جديد) |

---

## 🅵 معلومة — الـ Sheet هيكون شكله كده

بعد أول طلب، هتلقى Sheet اسمه "الطلبات" في Google Drive بتاعك
بيشتغل تلقائياً وبيضيف صف لكل طلب جديد مع تنسيق احترافي (ألوان + أعمدة + Data Validation لخانة "حالة الطلب").

**وده جدول الحالات المتاحة:**
جديد → تم التأكيد → جاري التجهيز → تم الشحن → مكتمل → ملغي → مرتجع

بالتوفيق! 🚀
