/**
 * قائمة محافظات مصر + مصاريف الشحن.
 * المصدر الوحيد للحقيقة هو `api/lib/config-db.json` (يقرؤه السيرفر أيضاً) —
 * تُستورد القيم هنا عبر site-config حتى لا تختلف أسماء المحافظات أو تكلفة
 * الشحن بين ما يعرضه الموقع وما يحاسبه السيرفر على الطلب.
 */
import {
  GOVERNORATE_SHIPPING,
  FREE_SHIPPING_THRESHOLD,
  getShippingCost as sharedGetShippingCost,
} from "@/lib/site-config";

// إعادة تصدير للتوافق الخلفي — المصدر الفعلي هو site-config.
export { GOVERNORATE_SHIPPING, FREE_SHIPPING_THRESHOLD } from "@/lib/site-config";

export const EGYPT_GOVERNORATES = GOVERNORATE_SHIPPING.map((g) => g.name);

export function qualifiesForFreeShipping(subtotal: number): boolean {
  return subtotal >= FREE_SHIPPING_THRESHOLD;
}

/** 🚚 حساب مصاريف الشحن حسب المحافظة مع دعم الشحن المجاني */
export function getShippingCost(governorate: string, subtotal = 0): number {
  return sharedGetShippingCost(governorate, subtotal);
}

/** 🏷️ وصف منطقة الشحن */
export function getShippingLabel(governorate: string): string {
  const normalized = governorate.trim().replace(/\s+/g, " ");
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
    // Privacy by design: never persist customer name/phone/address in localStorage.
    // WhatsApp remains the primary confirmation channel; direct checkout keeps the
    // cart intact on failure so the customer can retry explicitly.
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown Google Sheets error",
    };
  }
}
