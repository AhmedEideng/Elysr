export type ProductCategory = "men" | "women" | "devices";

export interface Product {
  /** Internal stable ID (e.g. "m-57") — used for cart, images, sheets. Never shown in URLs. */
  id: string;
  /** Pretty slug used in URLs (e.g. "hammer-of-thor-capsules"). Derived from nameEn. */
  slug: string;
  name: string;
  nameEn: string;
  /** Verified manufacturer brand only; omit when the package/supplier does not confirm it. */
  brand?: string;
  /** Official manufacturer part number only; never use the internal product ID here. */
  mpn?: string;
  /** Verified product barcode (GTIN/EAN/UPC), when available. */
  gtin?: string;
  category: ProductCategory;
  price: number; // EGP

  description: string;
  benefits: string[];
  ingredients?: string;
  usage?: string;
  badge?: string;
  emoji: string; // visual placeholder (fallback)
  image?: string; // مسار الصورة الحقيقية (اختياري) — مثال: "/images/1.webp"
  /** Historical customer-review summary imported from the store archive. */
  rating?: number;
  reviews?: number;
  stock: number;
  featured?: boolean;
  /** مصفوفة بمعرفات المنتجات المقترحة للبيع المتقاطع (Cross-Sell) - اختياري */
  crossSell?: string[];
  /**
   * ألقاب بحثية بديلة (عامية/شعبية) — تدخل في:
   * meta description، Product JSON-LD (alternativeName)، سطر ظاهر أسفل
   * عنوان المنتج، وبحث الموقع. مثال: منتجات "قطرات" لها "نقط" المصري.
   */
  searchAliases?: string[];
}

export const formatPrice = (price?: number) => (price ? `${price} ج.م` : "");
