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

// 🔒 نسخة مصغرة بدون PII حساس (للحماية من تسريب البيانات في رابط واتساب و history)
// تحتوي فقط على رقم الطلب والمنتجات والمحافظة، التفاصيل الكاملة في Google Sheets
export const buildMinimalOrderMessage = (
  items: OrderItemMsg[],
  customer?: {
    name?: string;
    governorate?: string;
  },
  orderId?: string,
  shipping?: number,
  _freeShipping = false,
) => {
  const lines: string[] = [];

  lines.push("طلب جديد من اليسر ميديكال");
  if (orderId) lines.push(`رقم الطلب: ${orderId}`);
  if (customer?.name) lines.push(`الاسم: ${sanitizeForMsg(customer.name, 50)}`);
  if (customer?.governorate) lines.push(`المحافظة: ${sanitizeForMsg(customer.governorate, 30)}`);
  lines.push("");
  lines.push("المنتجات:");
  let subtotalBefore = 0;
  items.forEach((it, i) => {
    const unitPrice = it.originalPrice ?? it.price;
    const lineTotal = unitPrice * it.qty;
    subtotalBefore += lineTotal;
    lines.push(`${i + 1}. ${sanitizeForMsg(it.name, 80)} × ${it.qty}`);
  });
  lines.push("");
  lines.push(`الإجمالي: ${subtotalBefore + (shipping || 0)} ج.م`);
  lines.push("التفاصيل الكاملة محفوظة في النظام وسيتم تأكيدها على واتساب");
  return lines.join("\n");
};

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
) => {
  const lines: string[] = [];
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://elysrmedical.store";

  lines.push("👇 اضغط إرسال الآن لتأكيد طلبك وتجهيز الشحن الفوري 🚚");
  lines.push("----------------------------------------");
  lines.push("طلب جديد من اليسر ميديكال");
  if (orderId) lines.push(`رقم الطلب: ${orderId}`);
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
  const discount = tier ? Math.round(subtotalBefore * tier.discount) : 0;
  const subtotalAfter = subtotalBefore - discount;

  lines.push("");
  lines.push(`المجموع: ${subtotalBefore} ج.م`);
  if (tier && discount > 0) lines.push(`خصم ${tier.label}: -${discount} ج.م`);
  if (freeShipping) lines.push("الشحن: مجاني");
  else if (shipping && shipping > 0) lines.push(`الشحن: ${shipping} ج.م`);
  lines.push(`الإجمالي: ${subtotalAfter + (shipping || 0)} ج.م`);

  return lines.join("\n");
};
