/**
 * ============================================================
 * Utility functions — validation, XSS protection, order IDs
 * ============================================================
 * Single source of truth for all input sanitization.
 * Both `sanitizeInput` (for HTML contexts) and `sanitizeForMsg`
 * (for WhatsApp/Sheet contexts) are defined here.
 * ============================================================
 */

/**
 * التحقق من أن رقم الهاتف هو رقم مصري صحيح.
 *
 * يقبل الصيغ التالية:
 *   - 01012345678 (محلي 11 رقم)
 *   - 010 1234 5678 (مع مسافات)
 *   - 010-1234-5678 (مع شرطات)
 *   - +201012345678 (دولي)
 *   - 201012345678 (دولي بدون +)
 *   - 00201012345678 (دولي بـ 00)
 *
 * Prefixes المسموحة: 010 (فودافون), 011 (اتصالات), 012 (أورانج), 015 (وي)
 */
export function isValidEgyptianPhone(phone: string): boolean {
  // إزالة كل شيء ليس رقم
  const digits = phone.replace(/\D/g, "");
  const trimmed = phone.trim();

  // 1. تحديد ما إذا كان الرقم يستهدف شريحة مصرية (سواء بالبادئة المحلية 01 أو الدولية +20):
  const isEgypt =
    /^01[0125]\d{8}$/.test(digits) ||
    (/^201[0125]\d{8}$/.test(digits) && (trimmed.startsWith("+") || trimmed.startsWith("201"))) ||
    (/^00201[0125]\d{8}$/.test(digits) && trimmed.startsWith("00"));

  if (isEgypt) {
    // التحقق الصارم من صحة الرقم المصري:
    if (/^01[0125]\d{8}$/.test(digits)) return true;
    if (/^201[0125]\d{8}$/.test(digits)) return true;
    if (/^00201[0125]\d{8}$/.test(digits)) return true;
    return false;
  }

  // 2. قبول الأرقام الدولية الأخرى للعملاء المقيمين في مصر الذين يستخدمون أرقاماً أجنبية (تبدأ بـ + أو 00) وطولها بين 7 و 15 رقماً:
  if (trimmed.startsWith("+") || trimmed.startsWith("00")) {
    return digits.length >= 7 && digits.length <= 15;
  }

  // 3. إذا كان الرقم يبدأ بـ 01 ولكنه لم يمر كشريحة مصرية صحيحة (مثل البادئة الخاطئة 013):
  if (digits.startsWith("01")) {
    return /^01[0125]\d{8}$/.test(digits);
  }

  return false;
}

/**
 * تحويل رقم مصري لصيغة محلية موحدة (01XXXXXXXXX) أو الحفاظ على الصيغة الدولية للأرقام الأجنبية
 * مفيد لتوحيد الأرقام قبل التخزين أو المقارنة.
 */
export function normalizeEgyptianPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");

  // 1. إذا كان رقم هاتف مصري محلي أو دولي، نقوم بتوحيده للصيغة المحلية الرسمية:
  if (/^01[0125]\d{8}$/.test(digits)) return digits;
  if (/^201[0125]\d{8}$/.test(digits)) return "0" + digits.slice(2);
  if (/^00201[0125]\d{8}$/.test(digits)) return "0" + digits.slice(4);

  // 2. إذا كان رقم دولي أجنبي، نحتفظ برمز الدولة بصيغة قياسية تبدأ بـ +:
  const trimmed = phone.trim();
  if (trimmed.startsWith("+")) {
    return "+" + digits;
  }
  if (trimmed.startsWith("00")) {
    return "+" + digits.slice(2);
  }

  // Fallback: إرجاع الأرقام المصفاة كما هي
  return digits;
}

// 🔧 توليد رقم طلب آمن بدون تكرار
export function generateOrderId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  let randomPart: string;
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    randomPart = crypto.randomUUID().slice(0, 4).toUpperCase();
  } else {
    randomPart = Math.random().toString(36).slice(2, 6).toUpperCase();
  }
  return `#EL-${timestamp}-${randomPart}`;
}

/**
 * ============================================================
 * دوال التعقيم (Sanitization)
 * ============================================================
 */

/**
 * تنظيف النصوص من الرموز الخطرة لمنع XSS.
 *
 * يُستخدم لجميع مُدخلات المستخدم قبل العرض في HTML.
 *
 * يزيل:
 *   - HTML tags (<, >)
 *   - علامات الاقتباس (", ')
 *   - Ampersand (&)
 *   - Backslash (\)
 *   - Template literals (`)
 *   - JavaScript event handlers (javascript:, on*)
 *
 * يقطع عند maxLength ويزيل الأسطر الفارغة الزائدة.
 */
export function sanitizeInput(input: string, maxLength = 200): string {
  let cleaned = input
    .slice(0, maxLength)
    // إزالة الرموز الأساسية
    .replace(/[<>"'&\\`]/g, "")
    // إزالة javascript: URIs
    .replace(/javascript\s*:/gi, "")
    // إزالة data: URIs
    .replace(/data\s*:/gi, "")
    // إزالة on* event handlers (onclick, onerror, etc.)
    .replace(/\bon\w+\s*=/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // 🛡️ مكافحة ثغرة حقن الصيغ والمعادلات (Formula/CSV Injection) في Google Sheets:
  // إذا كان النص يبدأ بأحد الرموز الحسابية التي تفسر كمعادلة، نضيف علامة اقتباس أحادية "'" في البداية لتأمين الشيت!
  if (/^[=+\-@\t\r]/.test(cleaned)) {
    cleaned = "'" + cleaned;
  }
  return cleaned;
}

/**
 * تنظيف النصوص للاستخدام في رسائل واتساب و Google Sheets.
 *
 * يزيل رموز Markdown ورموز التنسيق التي قد تُفسر بشكل خاطئ
 * في سياقات المراسلة النصية.
 *
 * يستخدم sanitizeInput كقاعدة ثم يزيل رموز markdown الإضافية.
 */
export function sanitizeForMsg(text: string, maxLen: number): string {
  return sanitizeInput(text, maxLen)
    .replace(/[*~|#{}]/g, "")
    .replace(/[\][]/g, "")
    .trim();
}
