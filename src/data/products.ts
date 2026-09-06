import { men } from "./products/men";
import { women } from "./products/women";
import { devices } from "./products/devices";
import type { Product, ProductCategory } from "@/data/product-types";
import { expandSearchTerm } from "@/lib/search-terms";

export { expandSearchTerm };

// ✅ إزالة نظام التقييمات التلقائي (Dynamic Review Growth).
// كان يزيد عدد المراجعات تلقائيًا كل بضعة أيام بدون مراجعات حقيقية من
// العملاء — وهذا يعدّ "تقييمات وهمية / مراجعات مضللة" مخالفة لسياسة جوجل
// وقد يستدعي عقوبة يدوية أو حرمان الصفحات من النجوم. الآن نستخدم أرقام
// المراجعات الثابتة الأصلية من بيانات المنتجات فقط، دون أي نمو تلقائي.

export const products: Product[] = [...men, ...women, ...devices];

/**
 * ترتيب ثابت لأول المنتجات في كل فئة — الباقي بالشعبية
 * تم إزالة الأدوية المحظورة من التثبيت العلوي (m-34,m-36,m-37,m-38,m-43,m-45,m-47,w-17)
 * لتقليل أثرها على الـ SEO والـ Merchant Center
 */
const PINNED_MEN_ORDER = [
  "m-01", // Hammer of Thor - بديل آمن لـ Hard-On
  "m-11", // Vitamax Doubleshot
  "m-44", // بخاخ ريمانز دووز 14000
  "m-14", // الشوكولاتة الملكي للرجال
  "m-12", // العسل الملكي الذهبي Gold VIP
  "m-20", // Golden Horse - بديل آمن لـ Viagra
];

export const getProductsByCategory = (cat: ProductCategory) => {
  const filtered = products.filter((p) => p.category === cat);
  const PINNED_WOMEN_ORDER = [
    "w-11", // لبان Spanish Fly Forte Gum
    "w-16", // Argi fem جل
    "w-12", // الشوكولاتة الملكي Royal Chocolate for Her
    "w-05", // العسل الملكي للنساء
    "w-02", // قطرات Lady Era - بديل آمن لـ Viagra Women
    "w-08", // قهوة CoffeMix CAVIAR نسائي
    "w-06", // علكة SexLove
    "w-09", // Lipo 6
    "w-15", // نقط Connubial
    "w-04", // Checoo Love - بديل آمن
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

/** منتجات طلبت الإدارة عدم إظهارها في أي قسم من أقسام الصفحة الرئيسية.
 * سياسة موحدة للأدوية المحظورة (تقرير Google Shopping):
 * m-45 مستبعد أصلاً + m-38/m-43 أضيفا لسياسة موحدة —
 * تبقى ظاهرة فقط في صفحة القسم /products/men وصفحاتها المباشرة
 * (لا تزال قابلة للشراء) لكنها لا تظهر إطلاقاً في أقسام الهوم.
 * (أصل المجموعة كان 6 منتجات، بعد حذف m-34 نهائياً أصبح 5، ثم أضيف الم-38 والم-43)
 */
export const HOMEPAGE_EXCLUDED_PRODUCT_IDS = new Set([
  "m-02", // Boost Up MAN
  "m-03", // Powerfully Up
  "m-49", // Power Fully Up Advanced
  "m-45", // Viagra Pfizer للرجال - كان مستبعد أصلاً
  "m-38", // Power 36 (Sildenafil) - سياسة موحدة للأدوية المحظورة
  "m-43", // Procomil Fort (Sildenafil) - سياسة موحدة للأدوية المحظورة
]);

export const isHomepageProductEligible = (product: Pick<Product, "id">): boolean =>
  !HOMEPAGE_EXCLUDED_PRODUCT_IDS.has(product.id);

/**
 * المرشحون لقسم "تسوق حسب الاحتياج" — مصدر واحد مشترك بين:
 * ShopByConcern (العرض)، ProductsTabs (الاستبعاد لمنع التكرار)،
 * وdata-integrity.test.mjs (التحقق). أي تعديل هنا ينتشر لكل المواضع
 * تلقائياً بدل ثلاث نسخ مكررة كانت تبتعد عن بعضها صامتاً.
 */
export const HOMEPAGE_CONCERN_CANDIDATES = {
  delay: ["m-44", "m-30", "m-14", "m-19", "m-55", "m-48"],
  strength: ["m-11", "m-02", "m-01", "m-04", "m-03", "m-49", "m-52", "m-20", "m-32"],
  devices: ["d-01", "d-02", "d-03", "d-04", "d-05"],
  women: ["w-13", "w-15", "w-05", "w-11", "w-01", "w-03", "w-04"],
} as const;

const HOME_FEATURED_ORDER = [
  // 🎯 المنتجات الـ VIP التي ستباع فوراً بفضل قوة اسمها وشعبيتها:
  "m-11", //  1. 🔥 عسل فيتامكس دبل شوت للرجال (الأكثر طلباً ورواجاً بالشركة)
  "m-01", //  2. 💊 كبسولات هامر أوف ثور للرجال (المنتج الجديد الفاخر بمظهره وتصميمه الألماني الجديد)
  "m-44", //  3. 💊 بخاخ ريمانز دووز 14000 (أقوى منتج تأخير وأكثرهم شهرة)
  "m-60", //  4. 🧴 جل كريفا الألماني المتطور للرجال (أقوى منتج تأخير وتنشيط موضعي موضعه الجديد بالواجهة)
  "w-15", //  5. 🌸 قطرات كونيبال للنساء (حل سريع ومطلوب جداً)
  "w-13", //  6. 🍬 علكة جولدن جم للنساء (حلت محل ليدي إيرا في الواجهة الرئيسية)

  // الباقي يمكن تركه في المصفوفة لاستخدامه كمنتجات ذات صلة أو مقترحات:
  "m-02", // كبسولات بوست أب MAN (خارج المنتجات الستة الرئيسية)
  "m-32", // جل تيتان جولد (منتجات ذات صلة/مقترحات)
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
  HOME_FEATURED_ORDER.map((id) => getProductById(id))
    .filter((p): p is Product => Boolean(p))
    .filter(isHomepageProductEligible)
    .slice(0, 6);

export const getProductById = (id: string) => products.find((p) => p.id === id);

/**
 * منتجات ظاهرة للعامة في صفحات الفئات — بعد حذف 5 أدوية نهائياً
 * (m-34,m-36,m-37,m-47,w-17)؛ الأدوية المحظورة المتبقية (m-38,m-43,m-45)
 * تظهر في الفئات كما كانت مع حماية noindex، وتُستبعد من feed/sitemap جوجل.
 */
export const getPublicProductsByCategory = (cat: ProductCategory) => {
  return getProductsByCategory(cat);
};

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
    // لو المنتج حبوب/كبسولات -> اقترح تأخير (بخاخ/كريم) + عسل/طاقة (بدائل آمنة بدون أدوية محظورة)
    if (name.includes("حبوب") || name.includes("كبسول") || name.includes("قرص")) {
      suggestedIds = ["m-44", "m-20"]; // ريمانز دووز + عسل جولدن هورس (آمن)
    }
    // لو المنتج تأخير (بخاخ/كريم/جل) -> اقترح صلابة (حبوب آمنة) + طاقة (عسل)
    else if (name.includes("بخاخ") || name.includes("كريم") || name.includes("جل")) {
      suggestedIds = ["m-01", "m-52"]; // هامر أوف ثور (آمن) + عسل توب سيلرز بدلاً من سياليس المحظور m-37
    }
    // لو المنتج عسل/شوكولاتة -> اقترح صلابة + تأخير (آمن)
    else {
      suggestedIds = ["m-01", "m-30"]; // هامر أوف ثور + كريم إملا (آمن)
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

/**
 * هل يطابق المنتج مصطلح البحث؟
 * 1) مطابقة مباشرة في الحقول المعروضة (بما فيها توسيع المرادفات العامة: نقط/قطرات).
 * 2) مطابقة بألقاب المنتج البحثية (searchAliases) — مثال: "سبراي" يطابق
 *    منتج "بخاخ ..." حتى لو الكلمة غير مكتوبة في أي حقل من حقوله.
 */
export const matchesProductQuery = (p: Product, q: string): boolean => {
  const term = q.trim();
  if (!term) return false;
  const t = term.toLowerCase();

  if (
    expandSearchTerm(term).some((w) =>
      [p.name, p.nameEn, p.slug, p.description, p.ingredients ?? ""].some((field) =>
        field.toLowerCase().includes(w.toLowerCase()),
      ),
    )
  ) {
    return true;
  }

  return (p.searchAliases ?? []).some((a) => {
    const al = a.toLowerCase();
    // مطابقة كاملة، أو المصطلح جزء من اللقب ("سبراي" ← "سبراي تأخير")،
    // أو اللقب جزء من المصطلح ("سبراي ريمانز" ← "سبراي") — بلا ضوضاء للكلمات القصيرة
    if (al === t) return true;
    if (t.length >= 3 && al.includes(t)) return true;
    if (al.length >= 3 && t.includes(al)) return true;
    return false;
  });
};

/**
 * بحث شامل في كل المنتجات (رجالي/نساء/أجهزة) — محرك صفحة /search?q={search_term_string}.
 * مطابق لنمط فلترة ?q في صفحات الفئات، ويدعم المرادفات المصرية
 * (مثال: "نقط" ← منتجات "قطرات" والعكس)، بدون شبكة، قابل للاختبار.
 */
export const searchAllPublicProducts = (q: string): Product[] => {
  if (!q.trim()) return products;
  return products.filter((p) => matchesProductQuery(p, q));
};
