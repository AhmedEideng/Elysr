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
 */

const GOOGLE_SHEETS_WEBHOOK_URL =
  "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec";

/**
 * إرسال الطلب إلى Google Sheets
 */
export async function submitToGoogleSheets(orderData: {
  orderId: string;
  customerName: string;
  customerPhone: string;
  governorate: string;
  address: string;
  notes?: string;
  items: { name: string; qty: number; price: number }[];
  total: number;
  orderType: "cart" | "wholesale" | "contact";
}): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(GOOGLE_SHEETS_WEBHOOK_URL, {
      method: "POST",
      mode: "no-cors", // Google Apps Script يتطلب no-cors للعمل من المتصفح
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ data: JSON.stringify(orderData) }),
    });

    // في وضع no-cors، لا يمكن قراءة الـ response body
    // نعتبر أن الطلب نجح إذا لم يرمِ خطأ
    return { success: true };
  } catch (err) {
    console.error("Google Sheets submission failed:", err);
    return { success: false, error: "فشل الاتصال بقاعدة البيانات" };
  }
}

/**
 * تسجيل محاولة طلب (حتى لو فشل Google Sheets) — fallback
 */
export function logOrderLocally(orderData: Record<string, unknown>) {
  try {
    const key = "elysr_order_fallback_v1";
    const raw = localStorage.getItem(key);
    const orders = raw ? JSON.parse(raw) : [];
    orders.push({ ...orderData, loggedAt: new Date().toISOString() });
    // الاحتفاظ بآخر 50 طلب فقط
    if (orders.length > 50) orders.splice(0, orders.length - 50);
    localStorage.setItem(key, JSON.stringify(orders));
  } catch {
    // تجاهل بهدوء
  }
}
