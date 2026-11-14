import { men } from "./products/men";
import { women } from "./products/women";
import { devices } from "./products/devices";
import type { Product, ProductCategory } from "@/data/product-types";
import { expandSearchTerm } from "@/lib/search-terms";
import { getBundlePresentation, getBundleProductType, getOralSolidForm } from "@/lib/product-form";
import { productSearchScore, rankProductSearch } from "@/lib/product-search";
import {
  HOMEPAGE_CONCERN_CANDIDATES,
  HOMEPAGE_EXCLUDED_PRODUCT_IDS,
  isHomepageProductEligible,
  pickHomepageFeatured,
  sortCategoryProducts,
} from "@/lib/product-selection";

// (2026-11-14 · H5) الثوابت والمنطق انتقلا إلى `@/lib/product-selection` كي
// تعمل الطبقة الخفيفة (بطاقات المنتجات) بنفس القواعد بلا استيراد هذا الملف.
export { HOMEPAGE_CONCERN_CANDIDATES, HOMEPAGE_EXCLUDED_PRODUCT_IDS, isHomepageProductEligible };

export { expandSearchTerm };
// (2026-11-14 · H5) منطق الشكل انتقل إلى `@/lib/product-form` — يُعاد تصديره
// هنا حتى تبقى كل نقاط الاستيراد القديمة كما هي.
export { getBundlePresentation, getBundleProductType, getOralSolidForm } from "@/lib/product-form";

// ✅ إزالة نظام التقييمات التلقائي (Dynamic Review Growth).
// كان يزيد عدد المراجعات تلقائيًا كل بضعة أيام بدون مراجعات حقيقية من
// العملاء — وهذا يعدّ "تقييمات وهمية / مراجعات مضللة" مخالفة لسياسة جوجل
// وقد يستدعي عقوبة يدوية أو حرمان الصفحات من النجوم. الآن نستخدم أرقام
// المراجعات الثابتة الأصلية من بيانات المنتجات فقط، دون أي نمو تلقائي.

export const products: Product[] = [...men, ...women, ...devices];

export const getProductsByCategory = (cat: ProductCategory) =>
  sortCategoryProducts(
    products.filter((p) => p.category === cat),
    cat,
  );

export const getFeaturedProducts = (): Product[] => pickHomepageFeatured(getProductById);

export const getProductById = (id: string) => products.find((p) => p.id === id);

/**
 * منتجات ظاهرة للعامة في صفحات الفئات.
 * المنتجات المحذوفة حاليًا: m-36 (Vegal)، m-43 (Procomil Fort)،
 * m-47 (Levitra)، وw-24 (Black Widow Drops).
 * مفيش أي حظر: كل المنتجات الحالية (84) ظاهرة في الفئات عادي ومن غير
 * noindex ولا استبعاد من feed/sitemap.
 */
export const getPublicProductsByCategory = (cat: ProductCategory) => {
  return getProductsByCategory(cat);
};

/**
 * يختار عضوين غير صلبين فموياً من نفس الفئة بترتيب دوّار ثابت.
 * بهذا تظل كل باقة من 3 منتجات، وتتنوع الاقتراحات من صفحة لأخرى،
 * ولا تتكرر نفس فئة المنتج داخل الباقة.
 */
function pickVariedBundleSuggestions(product: Product, preferredIds: string[] = []): Product[] {
  const preferred = preferredIds
    .map((id) => getProductById(id))
    .filter((p): p is Product => Boolean(p))
    .filter((p) => p.category === product.category && p.id !== product.id && !getOralSolidForm(p));
  const preferredIdsSet = new Set(preferred.map((p) => p.id));
  const pool = products.filter(
    (candidate) =>
      candidate.category === product.category &&
      candidate.id !== product.id &&
      candidate.id !== "w-26" &&
      // Marcin's form correction must not reshuffle the approved bundle pool.
      candidate.id !== "w-21" &&
      candidate.stock > 0 &&
      !getOralSolidForm(candidate) &&
      !preferredIdsSet.has(candidate.id),
  );

  // رقم المنتج يعطي تدويراً ثابتاً: نفس الصفحة = نفس الباقة، لكن الصفحات
  // المختلفة لا تبدأ دائماً من نفس المنتجين.
  const seed = Number(product.id.match(/\d+/)?.[0] ?? 0);
  const start = pool.length > 0 ? seed % pool.length : 0;
  const rotated = [...pool.slice(start), ...pool.slice(0, start)];
  const chosen: Product[] = [];
  for (const candidate of [...preferred, ...rotated]) {
    if (chosen.length === 2) break;

    const candidateType = getBundleProductType(candidate);
    const hasSameType = [product, ...chosen].some(
      (existing) => getBundleProductType(existing) === candidateType,
    );
    if (hasSameType) continue;

    const candidateOralForm = getOralSolidForm(candidate);
    const existingOralForms = new Set(
      [product, ...chosen]
        .map((existing) => getOralSolidForm(existing))
        .filter((form): form is "tablet" | "capsule" => Boolean(form)),
    );
    // استمرار منع خلط الأقراص مع الكبسولات، حتى مع اختلاف النوع.
    if (
      candidateOralForm &&
      existingOralForms.size > 0 &&
      !existingOralForms.has(candidateOralForm)
    ) {
      continue;
    }

    const candidatePresentation = getBundlePresentation(candidate);
    const mixesGelAndCream = [product, ...chosen].some((existing) => {
      const existingPresentation = getBundlePresentation(existing);
      return Boolean(
        candidatePresentation &&
        existingPresentation &&
        candidatePresentation !== existingPresentation,
      );
    });
    if (mixesGelAndCream) continue;

    chosen.push(candidate);
  }
  return chosen;
}

/** محرك البيع المتقاطع (Cross Sell Engine) */
export const getCrossSellsForProduct = (product: Product): Product[] => {
  // Preserve the owner-approved existing bundles; new HILTI women is sold separately
  // until complementary bundle alternatives are approved.
  if (product.id === "w-26") return [];
  // أي cross-sell يدوي يظل له الأولوية، ثم نكمله تلقائياً حتى تصبح الباقة 3 منتجات.
  // الاقتراحات الفموية الصلبة تُستبعد هنا عمداً حتى لا تختلط الأقراص بالكبسولات.
  return pickVariedBundleSuggestions(product, product.crossSell ?? []);
};

/** Look up a product by its URL slug (e.g. "hammer-of-thor-capsules"). */
export const getProductBySlug = (slug: string) => products.find((p) => p.slug === slug);

/**
 * هل يطابق المنتج مصطلح البحث؟
 * 1) مطابقة مباشرة في الحقول المعروضة (بما فيها توسيع المرادفات العامة: نقط/قطرات).
 * 2) مطابقة بألقاب المنتج البحثية (searchAliases) — مثال: "سبراي" يطابق
 *    منتج "بخاخ ..." حتى لو الكلمة غير مكتوبة في أي حقل من حقوله.
 */
export const matchesProductQuery = (p: Product, q: string): boolean => productSearchScore(p, q) > 0;

/**
 * بحث شامل في كل المنتجات (رجالي/نساء/أجهزة) — محرك صفحة /search?q={search_term_string}.
 * مطابق لنمط فلترة ?q في صفحات الفئات، ويدعم المرادفات المصرية
 * (مثال: "نقط" ← منتجات "قطرات" والعكس)، بدون شبكة، قابل للاختبار.
 */
export const searchAllPublicProducts = (q: string): Product[] => {
  return rankProductSearch(products, q);
};
