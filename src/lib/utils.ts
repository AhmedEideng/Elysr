import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// دالة للتحقق من أن رقم الهاتف هو رقم مصري صحيح (11 رقم يبدأ بـ 01)
export function isValidEgyptianPhone(phone: string): boolean {
  // نزيل المسافات أو الشرطات إن وجدت
  const cleanPhone = phone.replace(/[\s-]/g, "");
  // التعبير النمطي: يبدأ بـ 01 ثم (0 أو 1 أو 2 أو 5) ثم 8 أرقام (الإجمالي 11 رقم)
  const phoneRegex = /^01[0125][0-9]{8}$/;
  return phoneRegex.test(cleanPhone);
}
