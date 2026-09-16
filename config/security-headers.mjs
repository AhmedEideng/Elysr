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

// (2026-09-16, P2 #12 — مراجعة 2) Report-To: endpoint لازم يكون
// absolute URL (اشتراط المتصفح — report-uri يقبل relative بس
// Report-To لأ).
//
// المشكلة الأصلية: server/index.js كان hardcoded على
// https://elysrmedical.store/api/csp-report — أي نسخة self-hosted
// كانت بتبعت تقاريرها لإنتاج. النسخة الأولى اتبنت من
// req.protocol + req.get("host") — شغالة، لكن بتعتمد على
// Host header (والتووبولوجيا بتاعتها) وقت كل طلب.
//
// الحل النهائي — أولويات صريحة (الإنتاج ما يعتمدش على Host):
//   1. CSP_REPORT_ENDPOINT — URL كامل صريح (أولوية قصوى — لأي نشر
//      فيه endpoint تقارير مختلف عن الـ public origin)
//   2. SITE_URL — الـ public origin اللي المشروع بيستخدمه أصلاً
//      (CORS whitelist + sitemaps/feeds) → ${SITE_URL}/api/csp-report
//      (متغير واحد لقيمة واحدة — مفيش PUBLIC_ORIGIN تاني)
//   3. origin الطلب (proxy-aware) — fallback لـ dev بس (localhost
//      من غير أي إعداد)
export const CSP_REPORT_ENDPOINT_OVERRIDE = process.env.CSP_REPORT_ENDPOINT || null;
export const PUBLIC_ORIGIN = process.env.SITE_URL ? process.env.SITE_URL.replace(/\/$/, "") : null;

/**
 * يبني قيمة هيدر Report-To حسب الأولويات أعلاه.
 * @param {string} requestOrigin الـ origin الفعلي للطلب (fallback أخير)
 */
export function buildReportToHeader(requestOrigin) {
  const url =
    CSP_REPORT_ENDPOINT_OVERRIDE ||
    (PUBLIC_ORIGIN ? `${PUBLIC_ORIGIN}/api/csp-report` : null) ||
    `${requestOrigin}/api/csp-report`;
  return JSON.stringify({
    group: "csp",
    max_age: 10886400,
    endpoints: [{ url }],
  });
}
