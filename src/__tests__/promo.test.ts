/**
 * ============================================================
 * Unit Tests — نظام الخصم المتدرج (Promo System) - مبادرة الرعاية الماسية
 * ============================================================
 * يختبر:
 *   - حساب الشرائح الصحيحة
 *   - انتهاء العرض الديناميكي المتجدد كل 3 أيام
 *   - حالات الحدود (edge cases)
 * ============================================================
 */

import { describe, it, expect } from "vitest";
import {
  getPromoTier,
  getNextTier,
  calcDiscount,
  applyPromoToSubtotal,
  isPromoActive,
  getTimeLeft,
  PROMO_TIERS,
  PROMO_MIN_THRESHOLD,
  getPromoEndIso,
  PROMO_CYCLE_DURATION_MS,
} from "@/lib/promo";

// تاريخ ثابت أثناء فترة العرض
const ACTIVE_DATE = new Date("2026-06-15T12:00:00Z");
// تاريخ بعد فترة طويلة
const EXPIRED_DATE = new Date("2027-01-02T00:00:00Z");

describe("isPromoActive", () => {
  it("يرجع true دائماً لأن المبادرة تتجدد تلقائياً وتعمل على مدار الساعة", () => {
    expect(isPromoActive(ACTIVE_DATE)).toBe(true);
    expect(isPromoActive(EXPIRED_DATE)).toBe(true);
  });
});

describe("getPromoEndIso", () => {
  it("يحسب تاريخ الانتهاء المستقبلي للدورة الحالية بدقة تامة ويضمن أن يكون بعد التاريخ الحالي وقبل 3 أيام", () => {
    const testDate = new Date("2026-07-18T19:30:00Z");
    const endIso = getPromoEndIso(testDate);
    const endMs = new Date(endIso).getTime();

    // يجب أن يكون تاريخ الانتهاء بعد تاريخ الفحص
    expect(endMs).toBeGreaterThan(testDate.getTime());

    // يجب ألا يزيد الفرق عن مدة الدورة الكاملة (3 أيام)
    expect(endMs - testDate.getTime()).toBeLessThanOrEqual(PROMO_CYCLE_DURATION_MS);
  });
});

describe("getPromoTier", () => {
  it("لا يوجد شريحة تحت 1000 ج.م", () => {
    expect(getPromoTier(0, ACTIVE_DATE)).toBeNull();
    expect(getPromoTier(100, ACTIVE_DATE)).toBeNull();
    expect(getPromoTier(999, ACTIVE_DATE)).toBeNull();
  });

  it("شريحة 15% من 1000 ج.م", () => {
    const tier = getPromoTier(1000, ACTIVE_DATE);
    expect(tier).not.toBeNull();
    expect(tier!.discount).toBe(0.15);
    expect(tier!.label).toBe("15%");
  });

  it("شريحة 15% عند 1499 ج.م (حدود عليا)", () => {
    const tier = getPromoTier(1499, ACTIVE_DATE);
    expect(tier!.discount).toBe(0.15);
  });

  it("شريحة 20% من 1500 ج.م", () => {
    const tier = getPromoTier(1500, ACTIVE_DATE);
    expect(tier!.discount).toBe(0.2);
    expect(tier!.label).toBe("20%");
  });

  it("شريحة 25% من 2000 ج.م", () => {
    const tier = getPromoTier(2000, ACTIVE_DATE);
    expect(tier!.discount).toBe(0.25);
    expect(tier!.label).toBe("25%");
  });

  it("شريحة 25% لمبالغ كبيرة جداً", () => {
    const tier = getPromoTier(50000, ACTIVE_DATE);
    expect(tier!.discount).toBe(0.25);
  });

  it("الخصم نشط دائماً حتى في التواريخ المستقبلية بفضل التجديد التلقائي", () => {
    expect(getPromoTier(5000, EXPIRED_DATE)).not.toBeNull();
  });
});

describe("getNextTier", () => {
  it("الشريحة التالية من 0 هي 1000", () => {
    const next = getNextTier(0, ACTIVE_DATE);
    expect(next!.threshold).toBe(1000);
  });

  it("الشريحة التالية من 1100 هي 1500", () => {
    const next = getNextTier(1100, ACTIVE_DATE);
    expect(next!.threshold).toBe(1500);
  });

  it("الشريحة التالية من 1600 هي 2000", () => {
    const next = getNextTier(1600, ACTIVE_DATE);
    expect(next!.threshold).toBe(2000);
  });

  it("لا شريحة تالية فوق 2000", () => {
    expect(getNextTier(2000, ACTIVE_DATE)).toBeNull();
    expect(getNextTier(5000, ACTIVE_DATE)).toBeNull();
  });
});

describe("calcDiscount", () => {
  it("0 خصم تحت الحد الأدنى", () => {
    expect(calcDiscount(500, ACTIVE_DATE)).toBe(0);
  });

  it("خصم 15% على 1000 = 150 ج.م", () => {
    expect(calcDiscount(1000, ACTIVE_DATE)).toBe(150);
  });

  it("خصم 20% على 1500 = 300 ج.م", () => {
    expect(calcDiscount(1500, ACTIVE_DATE)).toBe(300);
  });

  it("خصم 25% على 2000 = 500 ج.م", () => {
    expect(calcDiscount(2000, ACTIVE_DATE)).toBe(500);
  });

  it("يُقرّب لأقرب عدد صحيح", () => {
    // 1101 * 0.15 = 165.15 → 165
    expect(calcDiscount(1101, ACTIVE_DATE)).toBe(165);
    // 1501 * 0.20 = 300.2 → 300
    expect(calcDiscount(1501, ACTIVE_DATE)).toBe(300);
  });
});

describe("applyPromoToSubtotal", () => {
  it("1000 - 15% = 850", () => {
    expect(applyPromoToSubtotal(1000, ACTIVE_DATE)).toBe(850);
  });

  it("بدون خصم تحت الحد", () => {
    expect(applyPromoToSubtotal(200, ACTIVE_DATE)).toBe(200);
  });
});

describe("getTimeLeft", () => {
  it("يُرجع دائماً ended: false لأن العداد يتجدد تلقائياً كل 3 أيام", () => {
    const tl = getTimeLeft(ACTIVE_DATE);
    expect(tl.ended).toBe(false);
    expect(tl.totalMs).toBeGreaterThan(0);
    expect(tl.days).toBeLessThanOrEqual(3);
  });
});

describe("PROMO_TIERS consistency", () => {
  it("الشرائح مرتبة من الأعلى للأدنى", () => {
    for (let i = 0; i < PROMO_TIERS.length - 1; i++) {
      expect(PROMO_TIERS[i].threshold).toBeGreaterThan(PROMO_TIERS[i + 1].threshold);
      expect(PROMO_TIERS[i].discount).toBeGreaterThan(PROMO_TIERS[i + 1].discount);
    }
  });

  it("PROMO_MIN_THRESHOLD = أقل شريحة", () => {
    expect(PROMO_MIN_THRESHOLD).toBe(PROMO_TIERS[PROMO_TIERS.length - 1].threshold);
  });
});
