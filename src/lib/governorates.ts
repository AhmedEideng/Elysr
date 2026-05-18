/**
 * قائمة محافظات مصر
 */
export const EGYPT_GOVERNORATES = [
  "القاهرة", "الإسكندرية", "الجيزة", "القليوبية", "البحيرة", "مطروح",
  "دمياط", "الدقهلية", "الشرقية", "الغربية", "المنوفية", "كفر الشيخ",
  "الإسماعيلية", "السويس", "بورسعيد", "شمال سيناء", "جنوب سيناء",
  "البحر الأحمر", "الفيوم", "بني سويف", "المنيا", "أسيوط", "سوهاج",
  "قنا", "الأقصر", "أسوان", "الوادي الجديد",
] as const;

export type Governorate = (typeof EGYPT_GOVERNORATES)[number];

const SHEET_URL = "https://script.google.com/macros/s/AKfycbxU4Q-3QdKr6NJ1g8vrUBRTy5k9tTqh51SnkdPJTF43UP3Mzw6PXk_O8EdxD_FwM8DuhA/exec";

export async function submitToGoogleSheets(data: Record<string, unknown>) {
  try {
    await fetch(SHEET_URL, {
      method: "POST",
      body: new URLSearchParams({ data: JSON.stringify(data) }),
    });
    return { success: true };
  } catch (err) {
    console.error("Google Sheets:", err);
    logOrderLocally(data);
    return { success: false };
  }
}

function logOrderLocally(data: Record<string, unknown>) {
  try {
    const key = "elysr_fallback";
    const raw = localStorage.getItem(key);
    const orders: Array<Record<string, unknown>> = raw ? JSON.parse(raw) : [];
    orders.push({ ...data, time: new Date().toISOString() });
    if (orders.length > 50) orders.shift();
    localStorage.setItem(key, JSON.stringify(orders));
  } catch {}
}
