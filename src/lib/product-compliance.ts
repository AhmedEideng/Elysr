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
]);

export function getProductComplianceStatus(productId: string): ProductComplianceStatus {
  if (RED_PRODUCT_IDS.has(productId)) return "red";
  return "green";
}

export function isRedProduct(productId: string): boolean {
  return getProductComplianceStatus(productId) === "red";
}

/** Keep high-risk red products out of ad/catalog feeds by default. */
export function isCatalogFeedEligible(product: { id: string; stock?: number }): boolean {
  return !RED_PRODUCT_IDS.has(product.id) && (product.stock ?? 0) > 0;
}
