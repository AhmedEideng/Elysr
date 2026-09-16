// 🚀 Elysr Medical Group — Product Compliance Module
//
// 📌 سياسة الاستبعاد (الحالة الحالية):
// - كل منتجات الكاتالوج (78 حالياً — العدد ديناميكي من الكاتالوج) ظاهرة
//   وقابلة للبيع على الموقع في كل الأقسام (تصنيفات، بحث، واجهة، مقترحات).
// - GOOGLE_SHOPPING_BLOCKED **فاضي حاليًا** بقرار المالك: إلغاء أي حظر
//   على Power 36 / Procomil Fort / Viagra Pfizer — دخلوا الخلاصة
//   (catalog-feed.xml) والسيتماب ويُفهرسوا عادي.
//   (rollback لو MC رفضهم: أعد إضافتهم للـ Set — كل السلوك بيرجع أوتو.)
//
// السجل التاريخي — 5 أدوية اتحذفت نهائيا من الكتالوج (تقرير Google +
// قرار المالك): m-34 (Hard-On), m-36 (Vegal), m-37 (Cialis),
// m-47 (Levitra), w-17 (Viagra for Women).

/**
 * الحالة (2026-09-14): GOOGLE_SHOPPING_BLOCKED فاضي — مفيش حظر feed حالياً.
 * 8 أدوية (مواد محظورة/وصفة) اتحذفت نهائياً من الكتالوج على مدار الأيام:
 * m-34 Hard-On, m-36 Vegal, m-37 Cialis, m-38 Power 36, m-43 Procomil Fort,
 * m-45 Viagra Pfizer, m-47 Levitra, w-17 Viagra for Women — بقرارات المالك
 * بعد مراجعات Google Merchant Center. ومنتج w-24 (Black Widow Drops) اتحذف
 * بقرار تجاري. ملاحظة دقة: الكاتالوج لسه فيه مستحضر موضعي طبي غير وصفة
 * (Emla 7.5% lidocaine/prilocaine — m-30)، فـ"مفيش أدوية خالص" صياغة مضللة؛
 * الصحيح: مفيش أدوية بوصفة/مواد محظورة.
 */
export const GOOGLE_SHOPPING_BLOCKED = new Set<string>([]);

/**
 * مؤهل لخلاصة Google Merchant (catalog-feed.xml):
 * - يستبعد المنتجات في GOOGLE_SHOPPING_BLOCKED (فاضي حاليًا — 2026-09-06).
 * - يستبعد المنتجات غير المتوافرة (stock=0).
 * - لا يؤثر إطلاقًا على ظهور المنتج على الموقع.
 */
export function isCatalogFeedEligible(product: { id?: string; stock?: number }): boolean {
  return !GOOGLE_SHOPPING_BLOCKED.has(product.id ?? "") && (product.stock ?? 0) > 0;
}
