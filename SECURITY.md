# Security Policy

## Supported Versions

| Version | Supported      |
| ------- | -------------- |
| latest  | ✅ Active      |
| < 1.0   | ❌ End of life |

## Reporting a Vulnerability

If you discover a security vulnerability in **Elysr Medical**, please report it
responsibly:

### 🔒 Private Disclosure (Preferred)

- **Email:** security@elysrmedical.store (PGP key on request)
- **WhatsApp:** https://wa.me/201098088206 (mention "security report")

### 📝 What to Include

1. Affected component (e.g. `/api/submit-order`, `CartContext`)
2. Reproduction steps (URL, payload, headers)
3. Impact assessment (what can an attacker do?)
4. Suggested fix (if any)

### ⏱️ Response SLA

| Severity | First response | Patch ETA   |
| -------- | -------------- | ----------- |
| Critical | < 24 hours     | < 72 hours  |
| High     | < 48 hours     | < 7 days    |
| Medium   | < 5 days       | < 30 days   |
| Low      | < 14 days      | Next sprint |

### 🚫 Out of Scope

- Self-XSS via pasting malicious payloads in your own cart
- Denial-of-Service against our CDN (report to Vercel instead)
- Issues affecting only outdated browsers (IE11, etc.)

## Security Architecture (المحدثة — أغسطس 2026)

نموذج الأمان الحالي بعد آخر التحديثات:

| الطبقة                 | الآلية الحالية                                                              |
| ---------------------- | --------------------------------------------------------------------------- |
| **CSP**                | `vercel.json` + `server/index.js` — كلا المستويين + Report-To + NEL         |
| **HSTS**               | `max-age=63072000; includeSubDomains; preload`                              |
| **CORS**               | صارم — فقط `elysrmedical.store` و `www.elysrmedical.store`                  |
| **Rate Limiting**      | In-process IP limit (hashed) + Google Apps Script per-phone limit + 5/min لطلبات الحذف |
| **Price Validation**   | منع تلاعب العميل بأسعار المنتجات (server-side lookup من `products-db.json`) |
| **Input Sanitization** | كل الإدخالات تُنظف (remove XSS, strip dangerous chars) + Prototype Pollution protection |
| **Phone Validation**   | regex صارم للأرقام المصرية + الدولية E.164 على الـ client + الـ server      |
| **Google Sheets**      | Rate-limited (15 req/min/IP) + detection للتكرار + IP hash بدلاً من raw IP |
| **CSRF**               | CORS + Origin checking + Rate Limiting (بدلاً من HMAC بمفتاح مكشوف)         |
| **Body Size Limits**   | 64KB للطلبات، 32KB للـ events، 4KB لـ CSP reports                           |
| **Memory Cleanup**     | CSP + Rate Limiter maps تنظف دورياً كل 5 دقائق + hashed IPs                 |
| **PII Protection**     | لا تخزين PII في localStorage، sessionStorage يحفظ orderId فقط بدون PII، IP hash في الشيت |
| **Data Retention**     | `autoCleanupOldOrders()` في Apps Script يحذف طلبات أقدم من 90 يوم + `deleteCustomerData()` لحق النسيان |
| **Security.txt**       | `/.well-known/security.txt` + `/security.txt` مع Contact و Expires          |
| **API Hardening**      | كل APIs عليها `X-Robots-Tag: noindex` + `no-store` + `Vary: Origin` + COEP + OAC |

### 🔒 حماية بيانات العملاء (أغسطس 2026 - أحدث الأنظمة)

1. **تقليل التخزين**: `elysr_last_whatsapp_url` اللي كان فيه PII كامل (اسم، هاتف، عنوان) اتلغى، بقى `elysr_last_order_id` فقط
2. **تشفير IP**: في `submit-order.js` بنخزن `SHA256(IP).slice(0,16)` فقط في Google Sheets بدلاً من IP خام
3. **حق النسيان**: API جديد `/api/delete-customer-data` + دالة `deleteCustomerData(phone)` في Apps Script
4. **الاحتفاظ**: دالة `autoCleanupOldOrders()` بتحذف تلقائياً طلبات أقدم من 90 يوم
5. **CSP + NEL**: `Report-To` و `NEL` headers لمراقبة أي انتهاك أمني فورياً

### ⚠️ تغيير مهم — CSRF (يوليو 2026)

تم إزالة نظام CSRF القديم الذي اعتمد على `VITE_META_CAPI_CSRF` المكشوف في الـ client bundle. الأمان الحالي يعتمد على:

1. **CORS** — التحقق من `Origin` header
2. **Rate Limiting** — 30 request/min لكل IP
3. **Price Validation** — السيرفر يتحقق من صحة كل سعر مقابل الكتالوج الرسمي
4. **Input Validation** — كل حقل يُفحص على السيرفر

هذا أكثر أمناً من النظام السابق الذي كان يعطي إحساساً زائفاً بالأمان بمفتاح كان مكشوفاً فعلياً لأي زائر يفتح DevTools.

## Best Practices for Contributors

- ❌ Never commit `.env` files or secrets
- ✅ Always validate user input server-side
- ✅ Always escape user input rendered as HTML
- ✅ Add new endpoints to the `ALLOWED_ORIGINS` allowlist if needed
- ✅ Add new admin actions to the rate limiter
