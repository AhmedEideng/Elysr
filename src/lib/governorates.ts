/**
 * 📋 قائمة محافظات مصر الرسمية
 * تستخدم في جميع صفحات الطلب (السلة، الجملة، التواصل)
 */
export const EGYPT_GOVERNORATES = [
  "القاهرة",
  "الإسكندرية",
  "الجيزة",
  "القليوبية",
  "البحيرة",
  "مطروح",
  "دمياط",
  "الدقهلية",
  "الشرقية",
  "الغربية",
  "المنوفية",
  "كفر الشيخ",
  "الإسماعيلية",
  "السويس",
  "بورسعيد",
  "شمال سيناء",
  "جنوب سيناء",
  "البحر الأحمر",
  "الفيوم",
  "بني سويف",
  "المنيا",
  "أسيوط",
  "سوهاج",
  "قنا",
  "الأقصر",
  "أسوان",
  "الوادي الجديد",
] as const;

export type Governorate = (typeof EGYPT_GOVERNORATES)[number];

/**
 * 🔗 دوال التكامل مع Google Sheets عبر Google Apps Script Web App
 *
 * ⚠️ بعد نشر الـ Web App، استبدل YOUR_DEPLOYMENT_ID بالمعرف الحقيقي:
 *    https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
 */

const GOOGLE_SHEETS_WEBHOOK_URL =
  "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec";

export interface OrderSheetData {
  orderId: string;
  customerName: string;
  customerPhone: string;
  governorate: string;
  address: string;
  notes?: string;
  items: { name: string; qty: number; price: number }[];
  total: number;
  orderType: "cart" | "wholesale" | "contact";
  paymentMethod?: "واتساب" | "طلب مباشر";
}

/**
 * إرسال الطلب إلى Google Sheets مع معالجة حقيقية للاستجابة.
 */
export async function submitToGoogleSheets(
  orderData: OrderSheetData,
): Promise<{ success: boolean; error?: string; orderId?: string }> {
  try {
    const res = await fetch(GOOGLE_SHEETS_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ data: JSON.stringify(orderData) }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();
    if (json.success) return { success: true, orderId: json.orderId };
    return { success: false, error: json.error || "خطأ غير معروف من السيرفر" };
  } catch (err) {
    console.error("Google Sheets submission failed:", err);
    logOrderLocally(orderData);
    return {
      success: false,
      error:
        err instanceof TypeError
          ? "تعذر الاتصال بقاعدة البيانات. الطلب محفوظ محلياً."
          : "فشل الاتصال بقاعدة البيانات",
    };
  }
}

/**
 * ✅ تسجيل الطلب محلياً كـ fallback عند فشل Google Sheets
 */
export function logOrderLocally(orderData: Record<string, unknown>) {
  try {
    const key = "elysr_order_fallback_v2";
    const raw = localStorage.getItem(key);
    const orders: Array<Record<string, unknown>> = raw ? JSON.parse(raw) : [];
    orders.push({ ...orderData, loggedAt: new Date().toISOString() });
    while (orders.length > 50) orders.shift();
    localStorage.setItem(key, JSON.stringify(orders));
  } catch {
    // تجاهل بهدوء
  }
}
