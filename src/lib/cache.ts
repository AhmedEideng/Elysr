/**
 * ============================================================
 * 🗂️ نظام كسر الكاش المركزي (Cache Busting)
 * ============================================================
 * المشكلة التي يحلّها:
 *   الصور والأصول تُخدَّم بترويسة `Cache-Control: immutable` (سنة كاملة)،
 *   فالمتصفح لا يسأل السيرفر عنها أبداً ويُبقي النسخة القديمة حتى لو
 *   تغيّر المحتوى. كانت الحلول سابقاً أرقاماً يدوية مبعثرة (`?v=7`,
 *   `?v=27`, `?v=elysr_v28`) تُنسى بسهولة وتُنسَخ في كل مكان.
 *
 * الحل:
 *   القيمة محفوظة مرة واحدة في `config/cache-version.json`، وتقرأها الواجهة
 *   وسكربتات الـ sitemap والـ prerender. عند تغيير الصور عدّل الملف المركزي
 *   أو نفّذ `npm run release`، فتتحدث كل المخرجات من نفس المصدر.
 * ============================================================
 */

/**
 * رقم إصدار الكاش الحالي من المصدر المركزي الوحيد.
 * عدّل `config/cache-version.json` أو استخدم `npm run release`.
 */
import cacheVersionConfig from "../../config/cache-version.json";

export const CACHE_VERSION = cacheVersionConfig.version;

/**
 * يُلحق رقم الإصدار بأي مسار صورة/أصل ليكسر كاش المتصفح عند تغيير المحتوى.
 * - يزيل أي `?v=` قديم أولاً ثم يضيف الحالي (حتى لو تُرك رقم قديم يدوياً).
 * - مثال: assetUrl("/images/hero.webp?v=7") → "/images/hero.webp?v=28"
 */
export function assetUrl(path: string): string {
  const base = String(path).split("?")[0];
  return `${base}?v=${CACHE_VERSION}`;
}

/** نسخة thumbs (الـ srcSet) — تستخدم نفس رقم الإصدار. */
export function thumbUrl(baseWebP: string, thumbDir: "thumbs" | "thumbs-180"): string {
  const base = String(baseWebP)
    .split("?")[0]
    .replace(/^\/images\//, `/images/${thumbDir}/`);
  return `${base}?v=${CACHE_VERSION}`;
}
