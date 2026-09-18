export type ProductCategory = "men" | "women" | "devices";

export interface Product {
  /** Internal stable ID (e.g. "m-57") — used for cart, images, sheets. Never shown in URLs. */
  id: string;
  /** Pretty slug used in URLs (e.g. "hammer-of-thor-capsules"). Derived from nameEn. */
  slug: string;
  name: string;
  nameEn: string;
  /**
   * (2026-09-17) العلامة التجارية الفعلية للمنتج (اختياري).
   * في الـ Product schema: brand = product.brand ?? nameEn ?? name.
   * قبل كده كل المنتجات كان براند "Elysr Medical" (اسم المتجر مش البراند).
   * TODO (تحرير للمالك): ضبط brand لكل منتج معروف برانده (Konsa، SAWFT،
   * Golden Horse، بلاك هورس...) — لحد ما يتضبط، بيُستخدم الاسم الإنجليزي
   * لخط المنتج وهو تحسين موضوعي على اسم المتجر.
   */
  brand?: string;
  category: ProductCategory;
  price: number; // EGP

  description: string;
  benefits: string[];
  ingredients?: string;
  usage?: string;
  badge?: string;
  emoji: string; // visual placeholder (fallback)
  image?: string; // مسار الصورة الحقيقية (اختياري) — مثال: "/images/1.webp"
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
