export type ProductCategory = "men" | "women" | "devices";

export interface Product {
  /** Internal stable ID (e.g. "m-57") — used for cart, images, sheets. Never shown in URLs. */
  id: string;
  /** Pretty slug used in URLs (e.g. "hammer-of-thor-capsules"). Derived from nameEn. */
  slug: string;
  name: string;
  nameEn: string;
  category: ProductCategory;
  price: number; // EGP

  description: string;
  benefits: string[];
  ingredients?: string;
  usage?: string;
  badge?: string;
  emoji: string; // visual placeholder (fallback)
  image?: string; // مسار الصورة الحقيقية (اختياري) — مثال: "/images/1.webp"
  rating: number;
  reviews: number;
  stock: number;
  featured?: boolean;
  /** مصفوفة بمعرفات المنتجات المقترحة للبيع المتقاطع (Cross-Sell) - اختياري */
  crossSell?: string[];
}

export const formatPrice = (price?: number) => (price ? `${price} ج.م` : "");
