// رقم الواتساب الرسمي للشركة
export const WHATSAPP_NUMBER = "201098088206";

export const COMPANY = {
  name: "اليسر ميديكال",
  nameEn: "Elysr Medical Group",
  email: "info@elysrmedical.com",
  address: "القاهرة، جمهورية مصر العربية",
};

export const waLink = (message: string) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

export const buildOrderMessage = (
  items: { id?: string; name: string; qty: number; price: number }[],
  customer?: { name?: string; phone?: string; address?: string; notes?: string },
  orderId?: string,
) => {
  const lines: string[] = [];
  lines.push("🛒 *طلب جديد من موقع اليسر ميديكال*");
  if (orderId) lines.push(`🔖 رقم الطلب: ${orderId}`);
  lines.push("");
  if (customer?.name) lines.push(`👤 الاسم: ${customer.name}`);
  if (customer?.phone) lines.push(`📞 الهاتف: ${customer.phone}`);
  if (customer?.address) lines.push(`📍 العنوان: ${customer.address}`);
  if (customer?.notes) lines.push(`📝 ملاحظات: ${customer.notes}`);
  lines.push("");
  lines.push("*المنتجات:*");

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  items.forEach((it, i) => {
    lines.push(`${i + 1}. ${it.name} × ${it.qty} = ${it.price * it.qty} ج.م`);
    if (it.id && origin) {
      lines.push(`🔗 رابط المنتج: ${origin}/products/${it.id}`);
    }
    lines.push("");
  });

  const total = items.reduce((s, it) => s + it.price * it.qty, 0);
  lines.push(`💰 *الإجمالي النهائي: ${total} ج.م*`);

  return lines.join("\n");
};
