import { getPromoTier, isPromoActive, PROMO_ORDER_LABEL } from "@/lib/promo";
import { MAX_CUSTOMER_PHONE_LENGTH, sanitizeForMsg } from "@/lib/utils";

// رقم الواتساب الرسمي للشركة
const WHATSAPP_NUMBER = "201098088206";

export const COMPANY = {
  name: "اليسر ميديكال",
  nameEn: "Elysr Medical Group",
  email: "info@elysrmedical.store",
  address: "العاشر من رمضان، محافظة الشرقية، جمهورية مصر العربية",
};

export const waLink = (message: string) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

/**
 * تاريخ/وقت الطلب بصيغة مصرية ثابتة (توقيت القاهرة — الشركة) وأرقام لاتينية
 * لمطابقة بقية الرسالة (الأسعار). مثال: "الاثنين، 07/09/2026، 5:45 م"
 */
export const formatOrderDateTime = (date: Date = new Date()): string =>
  new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Africa/Cairo",
  })
    .format(date)
    // ICU بيركب علامات bidi خفية (U+200E-F وغيرها) لـ RTL rendering —
    // بنشيلها عشان النص يفضل نظيف للـ copy/paste والمعالجة البرمجية
    .replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, "");

export interface OrderItemMsg {
  id?: string;
  /** Pretty URL slug used to build product links. */
  slug?: string;
  name: string;
  qty: number;
  /** السعر الفردي للمنتج */
  price: number;
  /** للحفاظ على التوافق — السعر الأصلي = السعر الفردي في النظام الجديد */
  originalPrice?: number;
}

export const buildOrderMessage = (
  items: OrderItemMsg[],
  customer?: {
    name?: string;
    phone?: string;
    governorate?: string;
    address?: string;
    notes?: string;
  },
  orderId?: string,
  shipping?: number,
  freeShipping = false,
  bundleDiscount = 0,
) => {
  const lines: string[] = [];
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://elysrmedical.store";

  lines.push("👇 اضغط إرسال الآن لتأكيد طلبك وتجهيز الشحن الفوري 🚚");
  lines.push("----------------------------------------");
  lines.push("طلب جديد من اليسر ميديكال");
  if (orderId) lines.push(`رقم الطلب: ${orderId}`);
  lines.push(`التاريخ والوقت: ${formatOrderDateTime()}`);
  if (isPromoActive()) lines.push(PROMO_ORDER_LABEL);
  lines.push("");

  if (customer?.name) lines.push(`الاسم: ${sanitizeForMsg(customer.name, 100)}`);
  if (customer?.phone)
    lines.push(`الهاتف: ${sanitizeForMsg(customer.phone, MAX_CUSTOMER_PHONE_LENGTH)}`);
  if (customer?.governorate) lines.push(`المحافظة: ${sanitizeForMsg(customer.governorate, 50)}`);
  lines.push(
    `العنوان: ${customer?.address ? sanitizeForMsg(customer.address, 200) : "سيتم تأكيده على واتساب"}`,
  );
  if (customer?.notes) lines.push(`ملاحظات: ${sanitizeForMsg(customer.notes, 300)}`);
  lines.push("");

  lines.push("المنتجات:");
  let subtotalBefore = 0;
  items.forEach((it, i) => {
    const unitPrice = it.originalPrice ?? it.price;
    const lineTotal = unitPrice * it.qty;
    subtotalBefore += lineTotal;
    lines.push(`${i + 1}. ${sanitizeForMsg(it.name, 150)} × ${it.qty} = ${lineTotal} ج.م`);
    const linkKey = it.slug ?? it.id;
    if (linkKey) lines.push(`${origin}/products/${linkKey}`);
  });

  const tier = isPromoActive() ? getPromoTier(subtotalBefore) : null;
  // 🔀 الخصمان متبادلا الاستبعاد (نفس قاعدة السلة والسيرفر):
  // عند اكتمال الباقة → خصم الباقة (20%) هو الخصم الوحيد المعروض
  const bundleActive = !!bundleDiscount && bundleDiscount > 0;
  const discount = bundleActive ? 0 : tier ? Math.round(subtotalBefore * tier.discount) : 0;
  const subtotalAfter = subtotalBefore - discount - (bundleDiscount || 0);

  lines.push("");
  lines.push(`المجموع: ${subtotalBefore} ج.م`);
  if (bundleActive) lines.push(`خصم الباقة (20%): -${bundleDiscount} ج.م`);
  else if (tier && discount > 0) lines.push(`خصم ${tier.label}: -${discount} ج.م`);
  if (freeShipping) lines.push("الشحن: مجاني");
  else if (shipping && shipping > 0) lines.push(`الشحن: ${shipping} ج.م`);
  lines.push(`الإجمالي: ${subtotalAfter + (shipping || 0)} ج.م`);

  return lines.join("\n");
};
