// 🚀 Elysr Medical Group — Product Compliance Module
//
// 📌 سياسة الاستبعاد (الحالة الحالية — 2026-09-20):
// - الكتالوج الحالي هو مصدر الحقيقة للمنتجات المتاحة، وعدده 84 منتجًا.
// - GOOGLE_SHOPPING_BLOCKED فارغة حاليًا بقرار المالك؛ لذلك لا يوجد حظر
//   نشط من feed أو sitemap أو noindex للمنتجات.
// - المنتجات المحذوفة نهائيًا لا تُعاد إلى هذه القائمة؛ روابطها التاريخية
//   محفوظة في redirects إلى القسم المناسب، وتوجد حراسة CI لمنع عودة schema لها.
// - إذا قرر المالك حظر منتج موجود مستقبلًا، يُضاف ID هنا فقط، وتنتشر
//   السياسة تلقائيًا إلى feed/sitemap/SEO/ItemList/ProductCard.
//
// المنتجات المحذوفة تاريخيًا من الكتالوج:
// المنتجات المحذوفة حاليًا: m-36, m-43, m-47, w-24.
// المنتجات التي أعادها المالك: m-34, m-37, m-38, m-45, w-17.

/**
 * القائمة النشطة فارغة حاليًا؛ هذه هي السياسة الوحيدة التي تؤثر على
 * منتجات الكتالوج الموجودة. السجل التاريخي أعلاه لا يساوي حظرًا تنفيذيًا.
 */
export const GOOGLE_SHOPPING_BLOCKED = new Set<string>([]);

/**
 * مؤهل لخلاصة Google Merchant (catalog-feed.xml):
 * - يستبعد المنتجات في GOOGLE_SHOPPING_BLOCKED (فارغة حاليًا — 2026-09-20).
 * - يستبعد المنتجات غير المتوافرة (stock=0).
 * - لا يؤثر إطلاقًا على ظهور المنتج على الموقع عندما تكون القائمة فارغة.
 */
export function isCatalogFeedEligible(product: { id?: string; stock?: number }): boolean {
  return !GOOGLE_SHOPPING_BLOCKED.has(product.id ?? "") && (product.stock ?? 0) > 0;
}
