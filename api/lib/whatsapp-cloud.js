/**
 * WhatsApp Cloud API - Send full order data server-side
 * This sends PII via server-to-WhatsApp, NOT via URL, so browser history is clean
 * Requires env vars:
 * - WHATSAPP_TOKEN (Meta Cloud API token)
 * - WHATSAPP_PHONE_NUMBER_ID (Phone number ID)
 * - WHATSAPP_BUSINESS_NUMBER (your number to receive full orders, e.g. 201098088206)
 */

export async function sendWhatsAppCloudMessage(to, message) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    // Cloud API not configured - skip silently
    return { skipped: true, reason: "WHATSAPP_TOKEN or PHONE_NUMBER_ID not set" };
  }

  const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: to,
        type: "text",
        text: { body: message.slice(0, 4000) },
      }),
    });

    const result = await res.json();
    if (!res.ok) {
      console.error("[whatsapp-cloud] failed", result);
      return { success: false, error: result };
    }

    return { success: true, result };
  } catch (err) {
    console.error("[whatsapp-cloud] error", err);
    return { success: false, error: err.message };
  }
}

export function buildFullOrderMessageForBusiness(payload) {
  const lines = [];
  lines.push(`🛒 طلب جديد ${payload.orderId}`);
  lines.push(`النوع: ${payload.orderType} - ${payload.paymentMethod}`);
  lines.push("");
  lines.push(`👤 العميل: ${payload.customerName}`);
  lines.push(`📞 الهاتف: ${payload.customerPhone}`);
  lines.push(`📍 المحافظة: ${payload.governorate}`);
  lines.push(`🏠 العنوان: ${payload.address}`);
  if (payload.notes) lines.push(`📝 ملاحظات: ${payload.notes}`);
  lines.push("");
  lines.push("📦 المنتجات:");
  payload.items?.forEach((it, i) => {
    lines.push(`${i + 1}. ${it.name} × ${it.qty} = ${it.price * it.qty} ج.م`);
  });
  lines.push("");
  lines.push(`قبل الخصم: ${payload.subtotalBeforeDiscount} ج.م`);
  if (payload.discount > 0) lines.push(`خصم: -${payload.discount} ج.م`);
  lines.push(`شحن: ${payload.shipping} ج.م`);
  lines.push(`الإجمالي: ${payload.total} ج.م`);
  lines.push("");
  lines.push(`🕒 ${new Date().toLocaleString("ar-EG", { timeZone: "Africa/Cairo" })}`);
  return lines.join("\n");
}

function normalizeForWhatsAppCloud(phone) {
  // Convert 01xxxxxxxxx -> 201xxxxxxxxx
  const digits = String(phone).replace(/\D/g, "");
  if (/^01[0125]\d{8}$/.test(digits)) {
    return "2" + digits; // 2010...
  }
  if (/^201[0125]\d{8}$/.test(digits)) {
    return digits;
  }
  if (digits.startsWith("00")) {
    return digits.slice(2);
  }
  return digits;
}

export function buildFullOrderMessageForCustomer(payload) {
  const lines = [];
  lines.push(`أهلاً ${payload.customerName} 👋`);
  lines.push(`تم استلام طلبك ${payload.orderId} من اليسر ميديكال`);
  lines.push("");
  lines.push("📦 طلبك:");
  payload.items?.forEach((it, i) => {
    lines.push(`${i + 1}. ${it.name} × ${it.qty}`);
  });
  lines.push("");
  lines.push(`المحافظة: ${payload.governorate}`);
  lines.push(`العنوان: ${payload.address}`);
  lines.push(`الإجمالي: ${payload.total} ج.م`);
  lines.push("");
  lines.push("سنتواصل معك قريباً لتأكيد الشحن 🚚");
  lines.push("شكراً لثقتك في اليسر ميديكال ❤️");
  return lines.join("\n");
}
