import type { ProductCardView, ProductCategory } from "@/data/product-types";

/**
 * (2026-11-14 · H5) منطق اختيار وترتيب المنتجات — بلا بيانات.
 *
 * كان هذا المنطق داخل `src/data/products.ts` أي أنه مربوط بالكتالوج الكامل
 * (89 منتجًا بوصفها الطويل). الصفحة الرئيسية والسلة تحتاجان الترتيب والاختيار
 * فقط، لا الوصف ولا المكونات — فنُقل المنطق هنا ليعمل على «بطاقة المنتج»
 * (`ProductCardView`) وتستهلكه الطبقة الخفيفة وحدها.
 *
 * الثوابت نفسها لم تتغيّر: أي تعديل هنا ينتشر على الكتالوج الكامل وبطاقاته معًا.
 */

/** منتجات طلبت الإدارة عدم إظهارها في أي قسم من أقسام الصفحة الرئيسية. */
export const HOMEPAGE_EXCLUDED_PRODUCT_IDS = new Set([
  "m-02", // Boost Up MAN
  "m-49", // Power Fully Up Advanced
  "d-04", // Big Bro: excluded from the homepage by owner request
]);

export const isHomepageProductEligible = (product: Pick<ProductCardView, "id">): boolean =>
  !HOMEPAGE_EXCLUDED_PRODUCT_IDS.has(product.id);

/**
 * المرشحون لقسم «تسوق حسب الاحتياج» — مصدر واحد مشترك بين:
 * ShopByConcern (العرض)، ProductsTabs (الاستبعاد لمنع التكرار)،
 * وdata-integrity.test.mjs (التحقق).
 */
export const HOMEPAGE_CONCERN_CANDIDATES = {
  delay: ["m-31", "m-55", "m-30"],
  strength: ["m-04", "m-63", "m-03"],
  devices: ["d-05", "d-07", "d-08", "d-01", "d-02", "d-03", "d-06"],
  women: ["w-25", "w-10", "w-15"],
} as const;

/**
 * ترتيب ثابت لأول المنتجات في كل فئة — الباقي بالشعبية.
 * ملاحظات:
 * - أربعة منتجات دوائية ما زالت محذوفة من الكتالوج: m-36,m-43,m-47,w-24.
 * - المنتجات الخمسة التي أعادها المالك (m-34,m-37,m-38,m-45,w-17)
 *   تُرتب وتظهر طبيعيًا مثل بقية الكتالوج.
 */
const PINNED_MEN_ORDER = ["m-01", "m-11", "m-44", "m-14", "m-12", "m-20"] as const;

const PINNED_WOMEN_ORDER = [
  "w-11",
  "w-16",
  "w-12",
  "w-05",
  "w-02",
  "w-08",
  "w-06",
  "w-09",
  "w-15",
  "w-04",
] as const;

const PINNED_WOMEN_LAST = ["w-23", "w-20"] as const;

/** ترتيب منتجات الصفحة الرئيسية — أول 6 فقط تُعرض. */
const HOME_FEATURED_ORDER = [
  "m-11", // Vitamax
  "m-01", // Hammer of Thor
  "m-44", // Dooz 14000
  "m-60", // Kreva
  "w-13", // Golden Gum
  "m-32", // Titan Gold; Connubial now belongs to the women's concern section

  // Reserve products for the featured selection.
  "m-02", // Boost Up MAN remains excluded from the homepage
  "m-52",
  "w-07",
  "w-04",
  "m-29",
  "m-15",
  "m-26",
  "w-08",
  "m-22",
  "m-21",
  "m-25",
  "m-06",
  "m-48",
  "w-01",
  "m-56",
] as const;

/** الترتيب الفعلي داخل صفحة القسم — نفس قواعد الكتالوج حرفيًا. */
export function sortCategoryProducts<T extends Pick<ProductCardView, "id" | "price" | "stock">>(
  items: T[],
  cat: ProductCategory,
): T[] {
  const pinnedOrder =
    cat === "men"
      ? (PINNED_MEN_ORDER as readonly string[])
      : cat === "women"
        ? (PINNED_WOMEN_ORDER as readonly string[])
        : [];
  const pinnedLast = cat === "women" ? (PINNED_WOMEN_LAST as readonly string[]) : [];

  return items.sort((a, b) => {
    // 1. Out of stock → bottom
    const aStock = a.stock > 0 ? 1 : 0;
    const bStock = b.stock > 0 ? 1 : 0;
    if (aStock !== bStock) return bStock - aStock;

    // 2. Pinned last → bottom (before out of stock)
    const aLast = pinnedLast.indexOf(a.id);
    const bLast = pinnedLast.indexOf(b.id);
    if (aLast !== -1 && bLast === -1) return 1;
    if (bLast !== -1 && aLast === -1) return -1;
    if (aLast !== -1 && bLast !== -1) return aLast - bLast;

    // 3. Pinned products → top in exact order
    const aPin = pinnedOrder.indexOf(a.id);
    const bPin = pinnedOrder.indexOf(b.id);
    if (aPin !== -1 && bPin !== -1) return aPin - bPin;
    if (aPin !== -1) return -1;
    if (bPin !== -1) return 1;

    // 4. Featured/Badged → next
    const aFeatured =
      (a as { featured?: boolean; badge?: string }).featured || (a as { badge?: string }).badge
        ? 1
        : 0;
    const bFeatured =
      (b as { featured?: boolean; badge?: string }).featured || (b as { badge?: string }).badge
        ? 1
        : 0;
    if (aFeatured !== bFeatured) return bFeatured - aFeatured;

    // 5. Lower price first.
    return a.price - b.price;
  });
}

/** أول 6 منتجات في ترتيب الرئيسية، مع استبعاد الممنوعات. */
export function pickHomepageFeatured<T extends Pick<ProductCardView, "id">>(
  byId: (id: string) => T | undefined,
  limit = 6,
): T[] {
  return HOME_FEATURED_ORDER.map((id) => byId(id))
    .filter((p): p is T => Boolean(p))
    .filter(isHomepageProductEligible)
    .slice(0, limit);
}
