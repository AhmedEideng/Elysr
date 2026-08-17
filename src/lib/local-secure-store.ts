/**
 * ============================================================
 * 🔒 Local Secure Store — طبقة حماية خفيفة لبيانات localStorage
 * ============================================================
 * تُشفّر الحمولات المخزنة محلياً (مثل نسخ الطلبات الاحتياطية) بحيث
 * لا تُقرأ كنص صريح في DevTools أو عبر أي سكربت/حقنة خفيفة.
 *
 * ⚠️ ملاحظة أمان صادقة: هذا تشفير "تعتيم" (obfuscation) وليس تشفيراً
 * صريحاً آمناً — أي تشفير على جانب المتصفح قابل للكسر. الهدف هو
 * تقليل سطح كشف البيانات العرضي (متسوّق عادي/سكربت قراءة) وليس
 * حماية من مهاجم مُصمّم على فكّه. للتشفير الحقيقي، يجب نقل هذه
 * البيانات إلى الخادم فقط وعدم تخزينها محلياً نهائياً.
 *
 * يعتمد على TextEncoder/TextDecoder + XOR + Base64 (يعمل مع Unicode).
 * ============================================================
 */

const STORAGE_PREFIX = "elysr_enc_v1:";

/** توليد مفتاح ثابت خفيف (معرّف جلسة — يُستخدم للتعتيم فقط). */
function deriveKey(scope: string): number[] {
  const s = scope + ":elysr_local";
  const bytes = new TextEncoder().encode(s);
  const key = new Uint8Array(16);
  for (let i = 0; i < bytes.length; i++) {
    key[i % key.length] = (key[i % key.length] + bytes[i]) % 256;
  }
  return Array.from(key);
}

/** تشفير (XOR + Base64) مع دعم Unicode الكامل. */
function xorEncode(text: string, key: number[]): string {
  const bytes = new TextEncoder().encode(text);
  const out = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    out[i] = bytes[i] ^ key[i % key.length];
  }
  return btoa(String.fromCharCode(...out));
}

function xorDecode(encoded: string, key: number[]): string {
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
    out[i] = bytes[i] ^ key[i % key.length];
  }
  return new TextDecoder().decode(out);
}

/** تشفير قيمة قبل التخزين. */
export function secureStore(value: unknown, scope = "fallback-order"): string | null {
  try {
    const json = JSON.stringify(value);
    return STORAGE_PREFIX + xorEncode(json, deriveKey(scope));
  } catch {
    return null;
  }
}

/** فك تشفير قيمة مخزّنة. */
export function secureLoad<T>(raw: string | null, scope = "fallback-order"): T | null {
  if (!raw) return null;
  try {
    if (!raw.startsWith(STORAGE_PREFIX)) return null;
    const encoded = raw.slice(STORAGE_PREFIX.length);
    const json = xorDecode(encoded, deriveKey(scope));
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

/** هل القيمة المخزّنة مشفّرة بهذه الأداة؟ */
export function isSecureStored(raw: string | null): boolean {
  return Boolean(raw && raw.startsWith(STORAGE_PREFIX));
}
