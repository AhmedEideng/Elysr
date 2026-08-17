/**
 * قائمة محافظات مصر + مصاريف الشحن.
 * مصدر واحد للحقيقة لتجنب اختلاف أسماء المحافظات عن مفاتيح الشحن.
 */
import { secureLoad, secureStore } from "@/lib/local-secure-store";

export const GOVERNORATE_SHIPPING = [
  { name: "القاهرة", shipping: 50, region: "القاهرة والجيزة" },
  { name: "الإسكندرية", shipping: 70, region: "وجه بحري" },
  { name: "الجيزة", shipping: 50, region: "القاهرة والجيزة" },
  { name: "القليوبية", shipping: 70, region: "وجه بحري" },
  { name: "البحيرة", shipping: 70, region: "وجه بحري" },
  { name: "مطروح", shipping: 120, region: "وجه بحري" }, // مرسى مطروح 120 ج.م
  { name: "دمياط", shipping: 70, region: "وجه بحري" },
  { name: "الدقهلية", shipping: 70, region: "وجه بحري" },
  { name: "الشرقية", shipping: 70, region: "وجه بحري" },
  { name: "الغربية", shipping: 70, region: "وجه بحري" },
  { name: "المنوفية", shipping: 70, region: "وجه بحري" },
  { name: "كفر الشيخ", shipping: 70, region: "وجه بحري" },
  { name: "الإسماعيلية", shipping: 70, region: "وجه بحري" },
  { name: "السويس", shipping: 70, region: "وجه بحري" },
  { name: "بورسعيد", shipping: 70, region: "وجه بحري" },
  { name: "شمال سيناء", shipping: 120, region: "سيناء" }, // شمال سيناء 120 ج.م
  { name: "جنوب سيناء", shipping: 120, region: "سيناء" }, // جنوب سيناء 120 ج.م
  { name: "البحر الأحمر", shipping: 120, region: "وجه بحري" }, // البحر الأحمر 120 ج.م
  { name: "الفيوم", shipping: 80, region: "وجه قبلي" },
  { name: "بني سويف", shipping: 80, region: "وجه قبلي" },
  { name: "المنيا", shipping: 80, region: "وجه قبلي" },
  { name: "أسيوط", shipping: 100, region: "وجه قبلي" }, // أسيوط 100 ج.م
  { name: "سوهاج", shipping: 100, region: "وجه قبلي" }, // سوهاج 100 ج.م
  { name: "قنا", shipping: 120, region: "وجه قبلي" }, // قنا 120 ج.م
  { name: "الأقصر", shipping: 120, region: "وجه قبلي" }, // الأقصر 120 ج.م
  { name: "أسوان", shipping: 120, region: "وجه قبلي" }, // أسوان 120 ج.م
  { name: "الوادي الجديد", shipping: 120, region: "وجه قبلي" }, // الوادي الجديد 120 ج.م
] as const;

export const EGYPT_GOVERNORATES = GOVERNORATE_SHIPPING.map((g) => g.name);

export const FREE_SHIPPING_THRESHOLD = 2000;

function normalizeGovernorate(governorate: string): string {
  return governorate.trim().replace(/\s+/g, " ");
}

export function qualifiesForFreeShipping(subtotal: number): boolean {
  return subtotal >= FREE_SHIPPING_THRESHOLD;
}

/** 🚚 حساب مصاريف الشحن حسب المحافظة مع دعم الشحن المجاني */
export function getShippingCost(governorate: string, subtotal = 0): number {
  if (qualifiesForFreeShipping(subtotal)) return 0;
  const normalized = normalizeGovernorate(governorate);
  return GOVERNORATE_SHIPPING.find((g) => g.name === normalized)?.shipping ?? 70;
}

/** 🏷️ وصف منطقة الشحن */
export function getShippingLabel(governorate: string): string {
  const normalized = normalizeGovernorate(governorate);
  return GOVERNORATE_SHIPPING.find((g) => g.name === normalized)?.region ?? "وجه بحري";
}

export interface SheetSubmitResult {
  success: boolean;
  orderId?: string;
  error?: string;
}

/** إرسال الطلب للشيت مع إرجاع نتيجة واضحة للطلب المباشر */
export async function submitToGoogleSheets(
  data: Record<string, unknown>,
): Promise<SheetSubmitResult> {
  try {
    // إرسال الطلب إلى الـ API الوسيط — الأمان عبر CORS + Origin + Rate Limiting
    const response = await fetch("/api/submit-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`Google Sheets responded with ${response.status}: ${text.slice(0, 200)}`);
    }

    const result = (await response.json()) as SheetSubmitResult;
    if (!result?.success) {
      throw new Error(result?.error || "Google Sheets rejected the order");
    }

    return result;
  } catch (err) {
    console.error("Google Sheets:", err);
    logOrderLocally(data);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown Google Sheets error",
    };
  }
}

function logOrderLocally(data: Record<string, unknown>) {
  try {
    const key = "elysr_fallback";
    // 🔒 تخزين مشفّر (obfuscated) بدلاً من نص صريح — يقلّل كشف بيانات العميل
    // (اسم/هاتف/عنوان) لو قُرئ localStorage مباشرة.
    const raw = localStorage.getItem(key);
    const orders = secureLoad<Array<Record<string, unknown>>>(raw) ?? [];
    orders.push({ ...data, time: new Date().toISOString() });
    if (orders.length > 50) orders.shift();
    const encoded = secureStore(orders);
    if (encoded) localStorage.setItem(key, encoded);
  } catch (err) {
    console.warn("Failed to store fallback order locally:", err);
  }
}
