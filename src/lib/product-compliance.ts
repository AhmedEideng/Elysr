// 🚀 Elysr Medical Group — Product Compliance Module
//
// 📌 سياسة الاستبعاد (الحالة الحالية 2026-09-06):
// - كل المنتجات (82) ظاهرة وقابلة للبيع على الموقع في كل الأقسام
//   (تصنيفات، بحث، واجهة، مقترحات) — لا يوجد أي حذف أو إخفاء من الموقع.
// - GOOGLE_SHOPPING_BLOCKED **فاضي حاليًا** بقرار المالك: إلغاء أي حظر
//   على Power 36 / Procomil Fort / Viagra Pfizer — دخلوا الخلاصة
//   (catalog-feed.xml) والسيتماب ويُفهرسوا عادي.
//   (rollback لو MC رفضهم: أعد إضافتهم للـ Set — كل السلوك بيرجع أوتو.)
//
// السجل التاريخي — 5 أدوية اتحذفت نهائيا من الكتالوج (تقرير Google +
// قرار المالك): m-34 (Hard-On), m-36 (Vegal), m-37 (Cialis),
// m-47 (Levitra), w-17 (Viagra for Women).

/**
 * الحالة (2026-09-07): مفيش أي حظر — مفيش أدوية في الكتالوج مستبعدة.
 * (تاريخياً: 6 أدوية اتحذفت نهائياً من الكتالوج:
 *  m-34 Hard-On, m-36 Vegal, m-37 Cialis, m-43 Procomil Fort,
 *  m-47 Levitra, w-17 Viagra for Women.
 *  وm-38/m-45 كانت محظورة من الخلاصة لحد ما المالك ألغي الحظر 2026-09-06.)
 */
export const GOOGLE_SHOPPING_BLOCKED = new Set<string>([]);

/** مجموعة فارغة — محفوظة للتوافق البرمجي، لا تُستثنى أي منتج من الموقع. */
export const RED_PRODUCT_IDS = new Set<string>([]);

/**
 * مؤهل لخلاصة Google Merchant (catalog-feed.xml):
 * - يستبعد المنتجات في GOOGLE_SHOPPING_BLOCKED (فاضي حاليًا — 2026-09-06).
 * - يستبعد المنتجات غير المتوافرة (stock=0).
 * - لا يؤثر إطلاقًا على ظهور المنتج على الموقع.
 */
export function isCatalogFeedEligible(product: { id?: string; stock?: number }): boolean {
  return !GOOGLE_SHOPPING_BLOCKED.has(product.id ?? "") && (product.stock ?? 0) > 0;
}
