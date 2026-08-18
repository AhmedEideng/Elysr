/**
 * ============================================================
 * 💎 مبادرة الرعاية الماسية — Diamond Care Initiative
 * ============================================================
 * نظام خصم متدرج صيدلاني ذكي يجمع بين التحفيز والتوفير الاستثنائي:
 *
 *   ✨ بدءاً من 1000 ج.م  →  خصم 15% (رعاية أساسية متميزة)
 *   ⚡ بدءاً من 1500 ج.م  →  خصم 20% (عناية ماسية متقدمة)
 *   👑 بدءاً من 2000 ج.م  →  خصم 25% (تميز ورعاية نخبوية شاملة)
 *
 * نظام التجديد التلقائي (Urgency Countdowns):
 * يتجدد العرض تلقائياً كل 3 أيام لخلق طاقة رغبة وتجاوب حقيقية.
 * ============================================================
 */

import {
  PROMO_TIERS as SHARED_PROMO_TIERS,
  PROMO_MIN_THRESHOLD as SHARED_MIN,
  type PromoTier,
} from "./site-config";
export type { PromoTier } from "./site-config";

export const PROMO_TITLE = "مبادرة الرعاية الماسية";
export const PROMO_TAGLINE = "رعاية طبية متكاملة.. بتوفير استثنائي!";
export const PROMO_ORDER_LABEL = "💎 مبادرة الرعاية الماسية";

/**
 * نظام التجديد التلقائي كل 3 أيام.
 * نقسم الزمن إلى دورات ثابتة من 3 أيام متتالية تبدأ من 1 يناير 2026.
 */
export const PROMO_CYCLE_DURATION_MS = 3 * 24 * 60 * 60 * 1000; // 3 أيام بالمللي ثانية
export const PROMO_EPOCH_MS = new Date("2026-01-01T00:00:00Z").getTime(); // نقطة البداية الثابتة

export function getPromoEndIso(now: Date = new Date()): string {
  const nowMs = now.getTime();
  if (nowMs < PROMO_EPOCH_MS) {
    return new Date(PROMO_EPOCH_MS + PROMO_CYCLE_DURATION_MS).toISOString();
  }
  const elapsed = nowMs - PROMO_EPOCH_MS;
  const currentCycle = Math.floor(elapsed / PROMO_CYCLE_DURATION_MS);
  const nextExpiryMs = PROMO_EPOCH_MS + (currentCycle + 1) * PROMO_CYCLE_DURATION_MS;
  return new Date(nextExpiryMs).toISOString();
}

/**
 * تاريخ انتهاء الدورة الحالية من العرض عند لحظة تحميل الموديول.
 */
export const PROMO_END_ISO = getPromoEndIso();

/**
 * الشرائح تُقرأ من مصدر الحقيقة الوحيد (api/lib/config-db.json) عبر site-config.
 * مرتّبة من الأعلى للأدنى — مهم لمنطق الحساب (find أول شريحة يساوي/يقل عنها المبلغ).
 */
export const PROMO_TIERS: PromoTier[] = SHARED_PROMO_TIERS;

export const PROMO_MIN_THRESHOLD: number = SHARED_MIN;

export function isPromoActive(_now: Date = new Date()): boolean {
  // المبادرة ممتدة ونشطة وتتجدد تلقائياً دائماً
  return true;
}

export function getPromoTier(subtotal: number, now: Date = new Date()): PromoTier | null {
  if (!isPromoActive(now)) return null;
  return PROMO_TIERS.find((tier) => subtotal >= tier.threshold) ?? null;
}

export function getNextTier(subtotal: number, now: Date = new Date()): PromoTier | null {
  if (!isPromoActive(now)) return null;
  const ascending = [...PROMO_TIERS].sort((a, b) => a.threshold - b.threshold);
  return ascending.find((tier) => subtotal < tier.threshold) ?? null;
}

export function calcDiscount(subtotal: number, now: Date = new Date()): number {
  const tier = getPromoTier(subtotal, now);
  if (!tier) return 0;
  return Math.round(subtotal * tier.discount);
}

export function applyPromoToSubtotal(subtotal: number, now: Date = new Date()): number {
  return subtotal - calcDiscount(subtotal, now);
}

export interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
  ended: boolean;
}

export function getTimeLeft(now: Date = new Date()): TimeLeft {
  const end = new Date(getPromoEndIso(now)).getTime();
  const diff = end - now.getTime();
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0, ended: true };
  }
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  return { days, hours, minutes, seconds, totalMs: diff, ended: false };
}
