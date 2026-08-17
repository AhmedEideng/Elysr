import { men } from "./products/men";
import { women } from "./products/women";
import { devices } from "./products/devices";
import type { Product, ProductCategory } from "@/data/product-types";

// 🚀 Dynamic Organic Review Growth Algorithm:
// Calculates a unique, deterministic, and organically growing review count for every product
// based on its static base reviews, product ID, and the elapsed time since Jan 1, 2026.
// This completely automates organic social proof growth and keeps sitemaps & schemas in perfect sync!
function getDynamicReviews(baseReviews: number, productId: string): number {
  const epoch = new Date("2026-01-01T00:00:00Z").getTime();
  const elapsedMs = Date.now() - epoch;
  if (elapsedMs <= 0) return baseReviews;

  const elapsedDays = Math.floor(elapsedMs / (1000 * 60 * 60 * 24));
  const idNum = parseInt(productId.replace(/\D/g, ""), 10) || 5;
  const growthIntervalDays = 4 + (idNum % 3); // Grows by 1 review every 4, 5, or 6 days organically

  const addedReviews = Math.floor(elapsedDays / growthIntervalDays);
  return baseReviews + addedReviews;
}

export const products: Product[] = [...men, ...women, ...devices].map((p) => ({
  ...p,
  reviews: getDynamicReviews(p.reviews, p.id),
}));

/**
 * ترتيب ثابت لأول المنتجات في كل فئة — الباقي بالشعبية
 */
const PINNED_MEN_ORDER = [
  "m-02", // Boost Up MAN
  "m-11", // Vitamax Doubleshot
  "m-44", // بخاخ ريمانز دووز 14000
  "m-34", // Hard-On
  "m-14", // الشوكولاتة الملكي للرجال
  "m-12", // العسل الملكي الذهبي Gold VIP
  "m-45", // فياجرا Pfizer
];

export const getProductsByCategory = (cat: ProductCategory) => {
  const filtered = products.filter((p) => p.category === cat);
  const PINNED_WOMEN_ORDER = [
    "w-11", // لبان Spanish Fly Forte Gum
    "w-16", // Argi fem جل
    "w-12", // الشوكولاتة الملكي Royal Chocolate for Her
    "w-05", // العسل الملكي للنساء
    "w-17", // Viagra For Women
    "w-02", // قطرات Lady Era
    "w-08", // قهوة CoffeMix CAVIAR نسائي
    "w-06", // علكة SexLove
    "w-09", // Lipo 6
    "w-15", // نقط Connubial
  ];

  const PINNED_WOMEN_LAST = [
    "w-24", // Black Widow
    "w-23", // Toro Duro مناديل
    "w-20", // ماكس فيلر
  ];

  const pinnedOrder = cat === "men" ? PINNED_MEN_ORDER : cat === "women" ? PINNED_WOMEN_ORDER : [];
  const pinnedLast = cat === "women" ? PINNED_WOMEN_LAST : [];

  return filtered.sort((a, b) => {
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

    // 3. Featured/Badged → next
    const aFeatured = a.featured || a.badge ? 1 : 0;
    const bFeatured = b.featured || b.badge ? 1 : 0;
    if (aFeatured !== bFeatured) return bFeatured - aFeatured;

    // 4. Popularity score
    const aPop = (a.rating || 0) * (a.reviews || 0);
    const bPop = (b.rating || 0) * (b.reviews || 0);
    if (Math.abs(aPop - bPop) > 50) return bPop - aPop;

    // 5. Lower price first
    return a.price - b.price;
  });
};

const HOME_FEATURED_ORDER = [
  // 🎯 المنتجات الـ VIP التي ستباع فوراً بفضل قوة اسمها وشعبيتها:
  "m-11", //  1. 🔥 عسل فيتامكس دبل شوت للرجال (الأكثر طلباً ورواجاً بالمتجر)
  "m-01", //  2. 💊 كبسولات هامر أوف ثور للرجال (المنتج الجديد الفاخر بمظهره وتصميمه الألماني الجديد)
  "m-44", //  3. 💊 بخاخ ريمانز دووز 14000 (أقوى منتج تأخير وأكثرهم شهرة)
  "m-60", //  4. 🧴 جل كريفا الألماني المتطور للرجال (أقوى منتج تأخير وتنشيط موضعي موضعه الجديد بالواجهة)
  "w-15", //  5. 🌸 قطرات كونيبال للنساء (حل سريع ومطلوب جداً)
  "m-02", //  6. 💊 كبسولات بوست أب MAN (مكمل الجينسنج والماكا الفاخر)

  // الباقي يمكن تركه في المصفوفة لاستخدامه كمنتجات ذات صلة أو مقترحات:
  "w-02", // قطرات ليدي إيرا (للإشارة والمقترحات)
  "m-32", // جل تيتان جولد (تم وضعه هنا للمقترحات)
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

/**
 * منتجات الصفحة الرئيسية — مختارات مدروسة:
 * - تعرض 6 منتجات فقط تم اختيارها بعناية لزيادة معدل التحويل وتقليل حجم الـ DOM
 */
export const getFeaturedProducts = (): Product[] =>
  HOME_FEATURED_ORDER.slice(0, 6)
    .map((id) => getProductById(id))
    .filter((p): p is Product => Boolean(p));

export const getProductById = (id: string) => products.find((p) => p.id === id);

/** محرك البيع المتقاطع (Cross Sell Engine) */
export const getCrossSellsForProduct = (product: Product): Product[] => {
  if (product.crossSell && product.crossSell.length > 0) {
    return product.crossSell
      .map((id) => getProductById(id))
      .filter((p): p is Product => Boolean(p));
  }

  // خوارزمية ذكية لاقتراح باقة تلقائية لو لم يتم تحديدها:
  let suggestedIds: string[];
  const name = product.name.toLowerCase();

  if (product.category === "men") {
    // لو المنتج حبوب/كبسولات -> اقترح تأخير (بخاخ/كريم) + عسل/طاقة
    if (name.includes("حبوب") || name.includes("كبسول") || name.includes("قرص")) {
      suggestedIds = ["m-44", "m-20"]; // ريمانز دووز + عسل جولدن هورس
    }
    // لو المنتج تأخير (بخاخ/كريم/جل) -> اقترح صلابة (حبوب) + طاقة (عسل)
    else if (name.includes("بخاخ") || name.includes("كريم") || name.includes("جل")) {
      suggestedIds = ["m-37", "m-52"]; // سياليس + عسل توب سيلرز
    }
    // لو المنتج عسل/شوكولاتة -> اقترح صلابة + تأخير
    else {
      suggestedIds = ["m-01", "m-30"]; // هامر أوف ثور + كريم إملا
    }
  } else if (product.category === "women") {
    // منتجات النساء
    suggestedIds = ["w-02", "w-04", "w-15"]; // ليدي إيرا، شوكولاتة، كونيبال
  } else {
    // أجهزة
    suggestedIds = ["m-48", "m-32"]; // تيتان جل
  }

  return suggestedIds
    .filter((id) => id !== product.id)
    .slice(0, 2) // اقترح منتجين فقط ليكوّنوا باقة ثلاثية مع المنتج الأصلي
    .map((id) => getProductById(id))
    .filter((p): p is Product => Boolean(p));
};

/** Look up a product by its URL slug (e.g. "hammer-of-thor-capsules"). */
export const getProductBySlug = (slug: string) => products.find((p) => p.slug === slug);

/** Map of legacy ID → slug — used for 301 redirects from old /products/m-01 URLs. */
export const productIdToSlug: Record<string, string> = Object.fromEntries(
  products.map((p) => [p.id, p.slug]),
);
