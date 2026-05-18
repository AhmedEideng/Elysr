import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// دالة للتحقق من أن رقم الهاتف هو رقم مصري صحيح (11 رقم يبدأ بـ 01)
export function isValidEgyptianPhone(phone: string): boolean {
  const cleanPhone = phone.replace(/[\s-]/g, "");
  const phoneRegex = /^01[0125][0-9]{8}$/;
  return phoneRegex.test(cleanPhone);
}

// 🔧 توليد رقم طلب آمن بدون تكرار باستخدام UUID + timestamp
export function generateOrderId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomPart = crypto.randomUUID().slice(0, 4).toUpperCase();
  return `#EL-${timestamp}-${randomPart}`;
}

// 🔧 تنظيف النصوص من الرموز الخطرة لمنع XSS
export function sanitizeInput(input: string, maxLength = 200): string {
  return input
    .slice(0, maxLength)
    .replace(/[<>"'&\\]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
