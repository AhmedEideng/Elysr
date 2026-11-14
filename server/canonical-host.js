/**
 * ============================================================
 * www → النطاق الأساسي (canonical host) — تكافؤ مع Vercel
 * ============================================================
 * (2026-11-14) كان الموقع يُخدَم بالكامل على `www.elysrmedical.store` وعلى
 * النطاق الأساسي معًا، والـ canonical وحده هو ما يمنع التكرار. التحويل 301
 * هو الإشارة القياسية الصحيحة (وأقوى من canonical)، ويطابق ما تفعله
 * vercel.json الآن بقاعدة `has: host`.
 *
 * الدالة نقية (pure) لتكون قابلة للاختبار مباشرة.
 * ============================================================
 */

/** النطاق الأساسي المشتق من SITE_URL (افتراضيًا نطاق الإنتاج). */
const DEFAULT_SITE_URL = "https://elysrmedical.store";

/**
 * @param {string | undefined} siteUrl قيمة SITE_URL في البيئة.
 * @returns {string} النطاق الأساسي بدون بروتوكول (مثال: `elysrmedical.store`).
 */
export function canonicalHost(siteUrl) {
  try {
    return new URL(siteUrl || DEFAULT_SITE_URL).host.toLowerCase();
  } catch {
    return new URL(DEFAULT_SITE_URL).host.toLowerCase();
  }
}

/**
 * يحسب وجهة تحويل www → النطاق الأساسي، أو null إن لم يكن الطلب على www.
 *
 * @param {{ hostHeader?: string, siteUrl?: string, protocol?: string, originalUrl?: string }} input
 * @returns {string | null} رابط مطلق للتحويل، أو null.
 */
export function canonicalHostRedirect({ hostHeader, siteUrl, protocol, originalUrl }) {
  const host = String(hostHeader || "")
    .trim()
    .toLowerCase();
  if (!host.startsWith("www.")) return null;

  const apex = canonicalHost(siteUrl);
  // نحوّل فقط نطاقنا نفسه (وليس أي مضيف عشوائي يبدأ بـ www.).
  if (host.slice(4) !== apex) return null;

  const scheme = protocol === "http" || protocol === "https" ? protocol : "https";
  const path = originalUrl && originalUrl.startsWith("/") ? originalUrl : "/";
  return `${scheme}://${apex}${path}`;
}
