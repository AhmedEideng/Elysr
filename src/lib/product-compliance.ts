// 🚀 Elysr Medical Group — Product Compliance Module
//
// ⚠️ تم إلغاء نظام التصنيف (GREEN/RED) ونظام الاستبعاد الإعلاني (Ads-Restricted)
// نهائيًا بقرار إدارة المتجر. جميع المنتجات الآن ظاهرة في كل الأقسام (تصنيفات،
// بحث، واجهة، مقترحات) ومتاحة في خلاصة المنتجات بالكامل.
//
// هذا الملف بقِيَ لأغراض التوافق البرمجي/الاختبارات فقط، وكل الدوال أصبحت
// لا تستبعد أي منتج:
//   - getProductComplianceStatus → يعيد دائمًا "green"
//   - isRedProduct / isAdsRestrictedProduct → يعيدان دائمًا false
//   - isCatalogFeedEligible → يقبل أي منتج متوفر بالمخزون
export type ProductComplianceStatus = "green" | "red";

/** مجموعة فارغة — لا يُستثنى أي منتج. */
export const RED_PRODUCT_IDS = new Set<string>([]);

/** مجموعة فارغة — لا يُستثنى أي منتج. */
export const ADS_RESTRICTED_PRODUCT_IDS = new Set<string>([]);

export function getProductComplianceStatus(_productId: string): ProductComplianceStatus {
  return "green";
}

export function isRedProduct(_productId: string): boolean {
  return false;
}

export function isAdsRestrictedProduct(_productId: string): boolean {
  return false;
}

/** كل المنتجات المتوافرة بالمخزون مؤهلة للخلاصة. */
export function isCatalogFeedEligible(product: { id?: string; stock?: number }): boolean {
  return (product.stock ?? 0) > 0;
}
