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

// توليد رقم طلب عشوائي
export function generateOrderId(): string {
  const prefix = "EL";
  const randomNum = Math.floor(1000 + Math.random() * 9000); // 4 أرقام عشوائية
  return `#${prefix}-${randomNum}`;
}
