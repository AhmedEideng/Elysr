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

/**
 * 🚚 مصاريف الشحن حسب المحافظة
 */
const SHIPPING_RATES: Record<string, number> = {
  القاهرة: 40,
  الجيزة: 40,
  // وجه بحري
  القليوبية: 60, البحيرة: 60, مطروح: 60, دمياط: 60, الدقهلية: 60,
  الشرقية: 60, الغربية: 60, المنوفية: 60, كفر_الشيخ: 60,
  الإسماعيلية: 60, السويس: 60, بورسعيد: 60, شمال_سيناء: 60,
  جنوب_سيناء: 60, البحر_الأحمر: 60, الإسكندرية: 60,
  // وجه قبلي
  الفيوم: 75, بني_سويف: 75, المنيا: 75, أسيوط: 75, سوهاج: 75,
  قنا: 75, الأقصر: 75, أسوان: 75, الوادي_الجديد: 75,
};

/** 🚚 حساب مصاريف الشحن حسب المحافظة */
export function getShippingCost(governorate: string): number {
  // نحول المسافات لشرطات سفلية عشان المفاتيح
  const key = governorate.replace(/ /g, "_");
  return SHIPPING_RATES[key] ?? 60; // الافتراضي 60 لو المحافظة مش موجودة
}

/** 🏷️ وصف منطقة الشحن */
export function getShippingLabel(governorate: string): string {
  const cost = getShippingCost(governorate);
  if (cost === 40) return "القاهرة والجيزة";
  if (cost === 60) return "وجه بحري";
  return "وجه قبلي";
}

const SHEET_URL = "https://script.google.com/macros/s/AKfycbx8WcLzjb8kaEe7-cjanJ4xI1fOuPc97V7UxKhqVNF8dWBx4CfEhvqqvoSqR5VhVTVG/exec";

/** إرسال للشيت في الخلفية - لا ننتظر الرد */
export function submitToGoogleSheets(data: Record<string, unknown>) {
  fetch(SHEET_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ data: JSON.stringify(data) }),
  }).catch((err) => {
    console.error("Google Sheets:", err);
    logOrderLocally(data);
  });
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
