export type ProductCategory = "men" | "women" | "devices";

export interface Product {
  id: string;
  name: string;
  nameEn: string;
  category: ProductCategory;
  price: number; // EGP
  oldPrice?: number;
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
}

export const formatPrice = (price?: number) => (price ? `${price} ج.م` : "");
