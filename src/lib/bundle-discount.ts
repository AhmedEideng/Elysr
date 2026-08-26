/**
 * ============================================================
 * 🎁 خصم الباقة الحقيقي (Real Bundle Discount)
 * ============================================================
 * القاعدة (نفسها تماماً في السيرفر api/submit-order.js):
 *   - كل منتج P يكوّن "باقة" = [P, ...منتجاته المقترحة (cross-sell)].
 *   - إذا احتوت السلة على كل أعضاء الباقة بكمية ≥ 1 →
 *     يُخصم 10% من مجموع أسعار الوحدات (واحدة من كل عضو).
 *   - تُطبَّق أفضل باقة واحدة فقط (الأعلى قيمة) — حتمية وقابلة
 *     للتحقق الخلفي بدون أي ثقة في حساب العميل.
 *
 * هذا الملف يُستورد ديناميكياً فقط (chunk منفصل) حتى لا يدخل
 * الكتالوج الكامل في مسار الـ home الحرج للسلات الفارغة/الصغيرة.
 * ============================================================
 */

import { products, getCrossSellsForProduct, getProductById } from "@/data/products";

/** نسبة خصم الباقة (10%) — نفس القيمة في السيرفر واختبارات السلامة. */
export const BUNDLE_DISCOUNT_RATE = 0.1;

export interface AppliedBundle {
  /** المنتج الرئيسي الذي كُشف من خلال باقته (للعرض في الواجهة). */
  mainId: string;
  /** كل أعضاء الباقة (يشمل المنتج الرئيسي). */
  ids: string[];
}

export interface BundleCalcResult {
  /** قيمة الخصم (0 إذا لم تكتمل أي باقة). */
  discount: number;
  /** الباقة المطبقة أو null. */
  bundle: AppliedBundle | null;
}

/**
 * يحسب خصم الباقة لمجموعة عناصر (id/qty/price) — حتمي:
 * نفس العناصر → نفس النتيجة دائماً، والنتيجة مطابقة لحساب
 * السيرفر (bundles-db.json + products-db.json) بالضبط.
 */
export function calcBundleDiscountForItems(
  items: { id: string; qty: number; price: number }[],
): BundleCalcResult {
  const qty = new Map(items.map((i) => [i.id, i.qty]));
  let best = 0;
  let bestBundle: AppliedBundle | null = null;

  for (const main of products) {
    const suggestions = getCrossSellsForProduct(main).map((s) => s.id);
    if (suggestions.length === 0) continue;
    const ids = [main.id, ...suggestions];
    if (!ids.every((id) => (qty.get(id) ?? 0) >= 1)) continue;

    const unitSum = ids.reduce((sum, id) => sum + (getProductById(id)?.price ?? 0), 0);
    const value = Math.round(unitSum * BUNDLE_DISCOUNT_RATE);
    if (value > best) {
      best = value;
      bestBundle = { mainId: main.id, ids };
    }
  }

  return { discount: best, bundle: bestBundle };
}
