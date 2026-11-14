/**
 * ============================================================
 * سياسات الكاش لملفات dist/ في النشر الذاتي (Express)
 * ============================================================
 * (2026-11-14) هذا الملف مستخرج من server/index.js ليكون قابلًا للاختبار
 * المباشر: العيب الأصلي (كل الملفات غير الـ HTML تُخدَّم
 * `max-age=31536000, immutable`) لا يمكن لأي اختبار حالي التقاطه لأنه كان
 * مدفونًا داخل `express.static({ setHeaders })`.
 *
 * القاعدة:
 *   • HTML مسبق البناء  → HTML_MAX_AGE (كاش قصير + revalidation).
 *   • أصول بالبصمة      → سنة + immutable (اسم الملف يتغير مع كل بناء).
 *   • ملفات بالمسار     → كاش قصير مطابق لـ vercel.json (sitemap/robots/feed).
 *   • sw.js             → no-cache (kill-switch يجب أن يُقرأ من الشبكة دائمًا).
 *
 * ⚠️ أي قيمة هنا يجب أن تطابق نفس الملف في vercel.json — يتحقق منها
 * `src/__tests__/server-cache-policy.test.ts`.
 * ============================================================
 */

export const HTML_MAX_AGE = "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400";
export const STATIC_MAX_AGE = "public, max-age=31536000, immutable";

/**
 * ملفات اسمها ثابت لكن محتواها يتغير عند كل نشر — لا يجوز منحها immutable.
 * @type {Record<string, string>}
 */
export const REVALIDATED_FILES = {
  "sitemap.xml": "public, max-age=3600",
  "sitemap-images.xml": "public, max-age=3600",
  "sitemap-index.xml": "public, max-age=3600",
  "robots.txt": "public, max-age=86400",
  "catalog-feed.xml": "public, max-age=3600",
  "catalog-feed.csv": "public, max-age=3600",
  "catalog-feed.txt": "public, max-age=3600",
  "site.webmanifest": "public, max-age=86400",
  "sw.js": "no-cache",
};

/**
 * سياسة الكاش المناسبة لمسار ملف داخل dist/.
 * @param {string} filePath مسار الملف على القرص.
 * @returns {string} قيمة ترويسة Cache-Control.
 */
export function cachePolicyForFile(filePath) {
  if (filePath.endsWith(".html")) return HTML_MAX_AGE;
  const name = filePath.slice(filePath.lastIndexOf("/") + 1);
  return REVALIDATED_FILES[name] ?? STATIC_MAX_AGE;
}
