/**
 * ============================================================
 * Elysr Medical — Security Headers: Single Source of Truth
 * ============================================================
 * (2026-09-16, P2 #13) الـ CSP كانت نسخة نصية مكررة في مكانين
 * (server/index.js + vercel.json) → خطر drift صامت بين النشرين:
 * تعديل في مكان وينسى التاني = سياسات أمان مختلفة على نفس الموقع.
 *
 * دلوقتي المصدر الوحيد هو الملف ده، والمستهلكات:
 *   • server/index.js — يستورد CSP_POLICY + buildReportToHeader مباشرة.
 *   • vercel.json — JSON ما يقدرش يستورد JS، فالقيم فيه **نسخة** —
 *     و scripts/verify-security-headers.mjs (جزء من npm test) يفشل
 *     فورًا لو النسختين اختلفوا، فمفيش drift صامت ممكن يمشي لـ CI.
 * ============================================================
 */

// 🛡️ القياسات الأمنية — تحديث أي directive هنا لازم يتنعكس على
// vercel.json (نفس القيمة حرفيًا — الـ parity check هي اللي بتتأكد).
export const CSP_POLICY = [
  "default-src 'self'",
  "script-src 'self' https://www.googletagmanager.com https://www.google-analytics.com",
  "script-src-attr 'none'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data: blob:",
  "connect-src 'self' https://script.google.com https://script.googleusercontent.com https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://*.googletagmanager.com https://*.g.doubleclick.net https://*.google.com",
  "worker-src 'self'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "manifest-src 'self'",
  "media-src 'self'",
  "upgrade-insecure-requests",
  "report-uri /api/csp-report",
].join("; ");

// (2026-09-16, P2 #12) Report-To: endpoint لازم يكون absolute URL
// (اشتراط المتصفح — report-uri يقبل relative بس Report-To لأ).
//
// المشكلة اللي كانت قائمة: server/index.js كان hardcoded على
// https://elysrmedical.store/api/csp-report — يعني أي نسخة self-hosted
// (dev/staging/VPS تاني) كانت بتبعت كل تقارير CSP الخاصة بيها لإنتاج.
//
// الحل: نبني الـ endpoint من **الأصل الفعلي اللي بيتم تقديم الخدمة
// منه** (proxy-aware عبر trust proxy=1 → X-Forwarded-Proto)، مع
// override صريح بـ CSP_REPORT_ENDPOINT للنشر اللي فيه اشتقاق الـ
// origin مش موثوق (نطاقات متعددة على نفس الخادم).
export const CSP_REPORT_ENDPOINT_OVERRIDE = process.env.CSP_REPORT_ENDPOINT || null;

/**
 * يبني قيمة هيدر Report-To للـ origin المعطى.
 * @param {string} origin مثل "https://elysrmedical.store" (بلا شلطة نهاية)
 */
export function buildReportToHeader(origin) {
  const url = CSP_REPORT_ENDPOINT_OVERRIDE || `${origin}/api/csp-report`;
  return JSON.stringify({
    group: "csp",
    max_age: 10886400,
    endpoints: [{ url }],
  });
}
