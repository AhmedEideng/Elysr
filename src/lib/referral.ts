/**
 * ============================================================
 * 🔗 Referral System — نظام الإحالة الفيروسي (2026-09-18 v3)
 * ============================================================
 * الفكرة: كل عميل ياخد كود إحالة فريد بعد الطلب، يشاركه واتساب.
 * لما حد ييجي عبر ?ref=CODE:
 *   1. نحفظ الكود في localStorage (30 يوم)
 *   2. نتتبع referral_applied في GA4
 *   3. نبعته مع الطلب في الشيت (عمود جديد)
 *
 * الخصوصية: الكود لا يحتوي PII — مجرد EL-XXXX
 * ============================================================
 */

const REFERRAL_STORAGE_KEY = "elysr_referral";
const REFERRAL_OWN_CODE_KEY = "elysr_own_referral";
const REFERRAL_EXPIRY_DAYS = 30;

interface StoredReferral {
  code: string;
  timestamp: number;
}

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* quota exceeded — ignore */
  }
}

function secureToken(chars: number): string {
  try {
    const arr = new Uint8Array(Math.ceil(chars / 2));
    crypto.getRandomValues(arr);
    return Array.from(arr, (b) => b.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, chars)
      .toUpperCase();
  } catch {
    // fallback
    return Math.random()
      .toString(36)
      .slice(2, 2 + chars)
      .toUpperCase();
  }
}

export function generateReferralCode(): string {
  // EL- + 6 chars alphanumeric
  return `EL-${secureToken(6)}`;
}

export function getOwnReferralCode(): string {
  const existing = safeGet(REFERRAL_OWN_CODE_KEY);
  if (existing && /^EL-[A-Z0-9]{4,8}$/.test(existing)) return existing;
  const fresh = generateReferralCode();
  safeSet(REFERRAL_OWN_CODE_KEY, fresh);
  return fresh;
}

export function saveReferrerCode(code: string): void {
  if (!code || !/^EL-[A-Z0-9]{4,8}$/.test(code)) return;
  // لا تحفظ كودك الخاص كـ referrer
  const own = safeGet(REFERRAL_OWN_CODE_KEY);
  if (own && own === code) return;
  const data: StoredReferral = { code, timestamp: Date.now() };
  safeSet(REFERRAL_STORAGE_KEY, JSON.stringify(data));
}

export function getReferrerCode(): string | null {
  try {
    const raw = safeGet(REFERRAL_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredReferral;
    if (!parsed.code || !parsed.timestamp) return null;
    const ageDays = (Date.now() - parsed.timestamp) / (1000 * 60 * 60 * 24);
    if (ageDays > REFERRAL_EXPIRY_DAYS) {
      try {
        localStorage.removeItem(REFERRAL_STORAGE_KEY);
      } catch {
        /* ignore */
      }
      return null;
    }
    return parsed.code;
  } catch {
    return null;
  }
}

export function getReferrerFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref")?.trim().toUpperCase();
    if (ref && /^EL-[A-Z0-9]{4,8}$/.test(ref)) return ref;
    return null;
  } catch {
    return null;
  }
}

export function clearReferrerCode(): void {
  try {
    localStorage.removeItem(REFERRAL_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function buildReferralLink(code: string): string {
  const base =
    typeof window !== "undefined" ? window.location.origin : "https://elysrmedical.store";
  return `${base}/?ref=${code}`;
}

export function buildReferralShareText(code: string): string {
  const link = buildReferralLink(code);
  return `جربت منتجات اليسر ميديكال وكانت ممتازة 👌\nخصم خاص لأول طلب عبر رابطي:\n${link}\n\nكود الإحالة: ${code}\nشحن سري لكل مصر 🚚`;
}
