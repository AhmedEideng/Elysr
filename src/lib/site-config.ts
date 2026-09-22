/**
 * ============================================================
 * 🔧 مصدر الحقيقة الوحيد (SSOT) لإعدادات الموقع المشتركة
 * ============================================================
 * (2026-09-15) هذا الملف هو **المصدر الوحيد** لكل الإعدادات
 * المشتركة (شحن المحافظات / حد الشحن المجاني / شرائح الخصم):
 *
 *   الفرونت  ← يستورد من هنا مباشرة (build-time)
 *   الـ build ← يولّد من هنا api/lib/config-db.json للسيرفر
 *               (artifact يُبندل مع النشر ويقرأه السيرفر وقت
 *               التشغيل — نفس نمط products.ts → products-db.json)
 *
 * ⚠️ لذلك **لا يُعدَّل أي رقم في config-db.json يدويًا** — أي
 * تعديل يدوي فيه بيتسحب عند أول build (المصدر هنا TS).
 *
 * تاريخ المشكلة (قبل 2026-09-15): كان الـ JSON هو "المصدر" لشحن/
 * العروض بينما BUNDLE_DISCOUNT_RATE ومصدّره TS — مصدران لاتجاه واحد = drift محتمل. دلوقتي كل
 * الإعدادات المشتركة لها مصدر واحد (TS) والـ JSON artifact.
 * ============================================================
 */

export interface GovernorateShipping {
  name: string;
  shipping: number;
  region: string;
}

export type ShippingDeliveryWindowKey = "metropolitan" | "other";

export interface ShippingDeliveryWindow {
  key: ShippingDeliveryWindowKey;
  label: string;
  text: string;
  minDays: number;
  maxDays: number;
}

/**
 * المواعيد المعلنة للشحن — المصدر الوحيد للنص الظاهر ولـ Product/Offer schema.
 * القاهرة والجيزة 24–48 ساعة عمل، وباقي المحافظات 2–4 أيام عمل.
 * تمثيل الساعات في Schema يكون بالأيام لأن Schema.org لا يملك وحدة ساعات
 * لحقول deliveryTime: 1–2 يوم للقاهرة والجيزة، و2–4 أيام للباقي.
 */
export const SHIPPING_DELIVERY_WINDOWS: Record<ShippingDeliveryWindowKey, ShippingDeliveryWindow> =
  {
    metropolitan: {
      key: "metropolitan",
      label: "القاهرة والجيزة",
      text: "24–48 ساعة عمل",
      minDays: 1,
      maxDays: 2,
    },
    other: {
      key: "other",
      label: "باقي المحافظات",
      text: "2–4 أيام عمل",
      minDays: 2,
      maxDays: 4,
    },
  };

export const SHIPPING_DELIVERY_TEXT =
  `القاهرة والجيزة: ${SHIPPING_DELIVERY_WINDOWS.metropolitan.text}. ` +
  `باقي المحافظات: ${SHIPPING_DELIVERY_WINDOWS.other.text}`;

export function getShippingDeliveryWindow(governorate: string): ShippingDeliveryWindow {
  const normalized = governorate.trim().replace(/\s+/g, " ");
  return normalized === "القاهرة" || normalized === "الجيزة"
    ? SHIPPING_DELIVERY_WINDOWS.metropolitan
    : SHIPPING_DELIVERY_WINDOWS.other;
}

export interface PromoTier {
  threshold: number;
  discount: number;
  label: string;
  icon: string;
  name: string;
  color: string;
}

/** جميع المحافظات مع تكلفة الشحن (المصدر الوحيد). */
export const GOVERNORATE_SHIPPING: GovernorateShipping[] = [
  { name: "القاهرة", shipping: 50, region: "القاهرة والجيزة" },
  { name: "الإسكندرية", shipping: 70, region: "وجه بحري" },
  { name: "الجيزة", shipping: 50, region: "القاهرة والجيزة" },
  { name: "القليوبية", shipping: 70, region: "وجه بحري" },
  { name: "البحيرة", shipping: 70, region: "وجه بحري" },
  { name: "مطروح", shipping: 120, region: "وجه بحري" },
  { name: "دمياط", shipping: 70, region: "وجه بحري" },
  { name: "الدقهلية", shipping: 70, region: "وجه بحري" },
  { name: "الشرقية", shipping: 70, region: "وجه بحري" },
  { name: "الغربية", shipping: 70, region: "وجه بحري" },
  { name: "المنوفية", shipping: 70, region: "وجه بحري" },
  { name: "كفر الشيخ", shipping: 70, region: "وجه بحري" },
  { name: "الإسماعيلية", shipping: 70, region: "وجه بحري" },
  { name: "السويس", shipping: 70, region: "وجه بحري" },
  { name: "بورسعيد", shipping: 70, region: "وجه بحري" },
  { name: "شمال سيناء", shipping: 120, region: "سيناء" },
  { name: "جنوب سيناء", shipping: 120, region: "سيناء" },
  { name: "البحر الأحمر", shipping: 120, region: "وجه بحري" },
  { name: "الفيوم", shipping: 90, region: "وجه قبلي" },
  { name: "بني سويف", shipping: 90, region: "وجه قبلي" },
  { name: "المنيا", shipping: 90, region: "وجه قبلي" },
  { name: "أسيوط", shipping: 90, region: "وجه قبلي" },
  { name: "سوهاج", shipping: 90, region: "وجه قبلي" },
  { name: "قنا", shipping: 90, region: "وجه قبلي" },
  { name: "الأقصر", shipping: 90, region: "وجه قبلي" },
  { name: "أسوان", shipping: 90, region: "وجه قبلي" },
  { name: "الوادي الجديد", shipping: 90, region: "وجه قبلي" },
];

/** الحد الأدنى للشحن المجاني (المصدر الوحيد). */
export const FREE_SHIPPING_THRESHOLD: number = 2000;

/** شرائح الخصم المتدرج (المصدر الوحيد) — مرتبة من الأعلى للأدنى. */
export const PROMO_TIERS: PromoTier[] = [
  {
    threshold: 2000,
    discount: 0.2,
    label: "20%",
    icon: "👑",
    name: "شريحة التميز والرعاية النخبوية",
    color: "from-indigo-600 to-indigo-800",
  },
  {
    threshold: 1500,
    discount: 0.15,
    label: "15%",
    icon: "⚡",
    name: "شريحة العناية الماسية المتقدمة",
    color: "from-teal-500 to-teal-700",
  },
  {
    threshold: 1000,
    discount: 0.1,
    label: "10%",
    icon: "💎",
    name: "شريحة الرعاية الأساسية المتميزة",
    color: "from-sky-500 to-sky-700",
  },
];

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
