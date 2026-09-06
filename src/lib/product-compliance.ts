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

/**
 * قرار المالك (2026-09-06): إلغاء أي حظر على Power 36 (m-38) وProcomil
 * Fort (m-43) وViagra Pfizer (m-45) — يدخلوا الخلاصة والسيتماب
 * ويُفهرسوا عادي زي أي منتج.
 * (5 أدوية تانية اتحذفت نهائيا من الكتالوج نفسه: m-34,m-36,m-37,m-47,w-17.
 * rollback لو MC رفضهم: أعد إضافتهم هنا.)
 */
export const GOOGLE_SHOPPING_BLOCKED = new Set<string>([]);

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
