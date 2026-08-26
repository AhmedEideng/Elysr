// 🚀 Elysr Medical Group — Product Compliance Module
//
// 📌 سياسة الاستبعاد:
// - كل المنتجات (82) تبقى ظاهرة وقابلة للبيع على الموقع في كل الأقسام
//   (تصنيفات، بحث، واجهة، مقترحات) — لا يوجد أي حذف أو إخفاء من الموقع.
// - فقط منتجات Google Shopping المرفوضة (أدوية تستلزم وصفة طبية) تُستثنى
//   من **خلاصة Google Merchant Center** (catalog-feed.xml) لأن جوجل يكتشفها
//   عبر الخلاصة. الموقع نفسه يبقى ظاهرًا.
//
// المنتجات المرفوضة حسب تقرير Google:
// m-34 (Hard-On / Sildenafil), m-36 (Vegal / Sildenafil),
// m-37 (Cialis / Tadalafil), m-38 (Power 36 / Sildenafil),
// m-43 (Procomil Fort / Sildenafil), m-45 (Viagra Pfizer / Sildenafil),
// m-47 (Levitra / Vardenafil), w-17 (Viagra for Women / Sildenafil).

/** منتجات مرفوضة من Google Shopping (تُستثنى من الخلاصة فقط، وتبقى على الموقع).
 * تم حذف 4 منتجات نهائياً (m-34,m-36,m-37,m-47) بناء على تقرير Merchant Center،
 * المتبقي 3 منتجات محظورة فقط مع حماية noindex كاملة (تم حذف w-17)
 */
export const GOOGLE_SHOPPING_BLOCKED = new Set<string>([
  "m-38", // Power 36 (Sildenafil)
  "m-43", // Procomil Fort (Sildenafil)
  "m-45", // Viagra Pfizer 100mg (Sildenafil)
]);

/** مجموعة فارغة — محفوظة للتوافق البرمجي، لا تُستثنى أي منتج من الموقع. */
export const RED_PRODUCT_IDS = new Set<string>([]);

/**
 * مؤهل لخلاصة Google Merchant (catalog-feed.xml):
 * - يستبعد فقط منتجات Google Shopping المرفوضة (أدوية).
 * - يستبعد المنتجات غير المتوافرة (stock=0).
 * - لا يؤثر إطلاقًا على ظهور المنتج على الموقع.
 */
export function isCatalogFeedEligible(product: { id?: string; stock?: number }): boolean {
  return !GOOGLE_SHOPPING_BLOCKED.has(product.id ?? "") && (product.stock ?? 0) > 0;
}
