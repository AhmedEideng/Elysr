// 🚀 Elysr Medical Group - Simplified 2-Tier Product Compliance System (GREEN / RED) - Verified & Stable
export type ProductComplianceStatus = "green" | "red";

/**
 * Product compliance map used to keep advertising/catalog exports safer.
 * - red: active pharmaceutical / prescription-like or high-risk branded products.
 * - green: regular wellness/support products.
 *
 * 🎯 النطاق الوحيد لنظام RED هو أمان الإعلانات والكشتلوج التجاري:
 * - يُستثنى RED من catalog-feed.xml (إعلانات Google/Facebook) للحماية من التحذيرات.
 * - يُستثنى RED من أولوية العرض "المميز" في بعض الفئات.
 *
 * 🚀 أما في البحث العضوي: المنتجات RED تبقى مفهرسة (index) وظاهرة في sitemap.xml
 * وصفحاتها كاملة على الموقع، لأن الزيارات العضوية وتحويلات واتساب قيّمة.
 * (لا تُطبق noindex ولا تُحذف من sitemap.)
 */
export const RED_PRODUCT_IDS = new Set([
  "m-34", // Hard-On (Disapproved - Sildenafil/Dapoxetine)
  "m-36", // Vegal Extra 130 (Disapproved - Sildenafil/Cobra)
  "m-37", // Cialis (Prescription Tadalafil)
  "m-38", // Power 36 (Disapproved - Power)
  "m-43", // Procomil Fort (Disapproved - Procomil)
  "m-45", // Viagra Pfizer 100mg (Disapproved - Viagra)
  "m-47", // Levitra (Disapproved - Vardenafil)
  "m-54", // Ferrari Chocolate (Disapproved - Ferrari)
  "w-17", // Viagra for Women (Disapproved - Viagra)
  "w-19", // Ferrari Chocolate for Her (Disapproved - Ferrari)

  // 🔴 مخدّرات موضعية (Local Anesthetics) — ليدوكايين/بنزوكايين/بريلوكايين:
  // منتجات دوائية غير موافق عليها كمكملات في مصر، ومحظورة في إعلانات جوجل ما لم تكن معتمدة.
  "m-30", // Emla 7.5% (Lidocaine + Prilocaine)
  "m-44", // Reman's Dooz 14000 Spray (Lidocaine + Benzocaine)
  "m-55", // Procomil Spray (Lidocaine)
  "m-17", // Procomil Cream مصري (Lidocaine)
  "m-28", // Stallion Delay Gel (مادة مخدرة موضعية)
  "m-41", // Procomil Plus Spray (Lidocaine)
  "m-50", // Black Horse Long Time (Lidocaine)

  // 🔴 m-07: كريم "دوز 14000" — نفس العلامة التجارية لمنتج ريمانز دووز المخدّر (ليدوكايين+بنزوكايين).
  // على الرغم من أن المكونات المعلنة بلا مخدّر، اسم العلامة قد يثير الرفض التلقائي من جوجل في مصر.
  "m-07", // Dooz 14000 Delay Cream (اسم علامة مرتبط بمخدّر موضعي)

  // 🔴 أسماء تجارية مرتبطة بمادة الكانثاريدين المحظورة (Spanish Fly):
  "w-03", // Spanish Fly drops (اسم يرتبط بمادة سامة محظورة)
  "w-11", // Spanish Fly Forte Gum (اسم يرتبط بمادة سامة محظورة)
]);

export function getProductComplianceStatus(productId: string): ProductComplianceStatus {
  if (RED_PRODUCT_IDS.has(productId)) return "red";
  return "green";
}

export function isRedProduct(productId: string): boolean {
  return getProductComplianceStatus(productId) === "red";
}

// 🔴 استبعاد إعلاني إضافي (Ads-Restricted) — مستقلة عن نظام RED:
// منتجات "العسل الملكي / فيتال" (Royal/Vital/Black Horse Honey) التي يربطها
// جوجل عالميًا بمنتجات مغشوشة تحتوي سيلدينافيل مخفي، فتُرفض إعلاناتها في مصر
// (مثل "Honey Vital" و"CIALIS/TADALAFIL" في رسالة الرفض الأخيرة).
//
// ⚠️ على عكس RED، هذه المنتجات تبقى **ظاهرة وقابلة للبيع** في الموقع
// (صفحات التصنيف/البحث/المقترحات) لأنها مش منتجات دوائية؛ نستبعدها فقط من
// خلاصة الإعلانات المدفوعة لتفادي رفض جوجل وخطر إيقاف الحساب.
export const ADS_RESTRICTED_PRODUCT_IDS = new Set([
  "m-12", // Royal Honey Gold VIP
  "m-13", // KING Royal Honey Plus
  "m-16", // Excellent Hard Leopard Royal Honey
  "m-18", // Golden Horse Royal Honey
  "m-20", // Golden Horse Royal Honey Plus
  "m-21", // Black Horse Caviar
  "m-22", // Black Horse Vital Honey ← "Honey Vital"
  "m-24", // Super Royal Honey – Top Pharma
  "m-27", // XSteel (Black Horse)
  "m-52", // Top Sellers Honey
  "m-56", // Dal El Khair (Royal)
  "w-05", // Royal Honey (women)
  "w-07", // Top Sellers Honey (women)
]);

export function isAdsRestrictedProduct(productId: string): boolean {
  return ADS_RESTRICTED_PRODUCT_IDS.has(productId);
}

/**
 * Keep products out of ad/catalog feeds by default:
 * - RED (drugs, anesthetics, Spanish Fly)
 * - Ads-restricted (high-risk royal honey)
 * - out of stock
 * They remain fully visible on the site and organically indexed.
 */
export function isCatalogFeedEligible(product: { id: string; stock?: number }): boolean {
  const id = product.id;
  return (
    !RED_PRODUCT_IDS.has(id) && !ADS_RESTRICTED_PRODUCT_IDS.has(id) && (product.stock ?? 0) > 0
  );
}
