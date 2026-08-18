/**
 * ============================================================
 * 🔧 مصدر الحقيقة الوحيد لإعدادات الموقع المشتركة
 * ============================================================
 * هذا الملف هو الجسر الوحيد بين الواجهة (React) وملف الإعدادات
 * المركزي `api/lib/config-db.json` (الذي يقرؤه السيرفر أيضاً).
 *
 * لماذا؟
 * كان سابقاً هناك ازدواجية: الواجهة تعرّف الـ PROMO_TIERS و
 * FREE_SHIPPING_THRESHOLD وشحن المحافظات بنسخها الخاصة داخل
 * `src/lib/promo.ts` و`src/lib/governorates.ts`، بينما السيرفر
 * يقرأ القيم نفسها من `api/lib/config-db.json`. أي تعديل كان يجب
 * إجراؤه في مكانين، وأي انحراف بينهما قد يؤدي لحساب خصم/شحن
 * مختلف بين ما يعرضه الموقع وما يحاسبه السيرفر على الطلب.
 *
 * الآن: ملف `api/lib/config-db.json` هو المصدر الوحيد، وتستورد
 * منه الواجهة والسيرفر معاً. عُدّل أي إعداد في مكان واحد فقط.
 * ============================================================
 */

// استيراد الإعدادات المركزية (يُبندل في الواجهة وقت البناء،
// ويقرؤه السيرفر من نفس الملف وقت التشغيل).
import configDb from "../../api/lib/config-db.json";

export interface GovernorateShipping {
  name: string;
  shipping: number;
  region: string;
}

export interface PromoTier {
  threshold: number;
  discount: number;
  label: string;
  icon: string;
  name: string;
  color: string;
}

/** جميع المحافظات مع تكلفة الشحن (مصدر واحد). */
export const GOVERNORATE_SHIPPING = (configDb.GOVERNORATE_SHIPPING as GovernorateShipping[]) ?? [];

/** الحد الأدنى للشحن المجاني (مصدر واحد). */
export const FREE_SHIPPING_THRESHOLD: number = configDb.FREE_SHIPPING_THRESHOLD;

/** شرائح الخصم المتدرج (مصدر واحد). */
export const PROMO_TIERS: PromoTier[] = (configDb.PROMO_TIERS as PromoTier[]) ?? [];

/** أدنى حد للخصم (أصغر شريحة). */
export const PROMO_MIN_THRESHOLD: number =
  PROMO_TIERS.length > 0 ? PROMO_TIERS[PROMO_TIERS.length - 1].threshold : 0;

/** دالة مساعدة: التقييم الرقمي الحتمي لأي محافظة. */
export function getShippingCost(governorate: string, subtotal = 0): number {
  if (subtotal >= FREE_SHIPPING_THRESHOLD) return 0;
  const normalized = governorate.trim().replace(/\s+/g, " ");
  const found = GOVERNORATE_SHIPPING.find((g) => g.name === normalized);
  return found ? found.shipping : 70;
}
