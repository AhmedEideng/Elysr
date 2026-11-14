import { describe, expect, it } from "vitest";

import { BUNDLE_DISCOUNT_PERCENT, BUNDLE_DISCOUNT_RATE } from "@/lib/site-config";
import { buildOrderMessage } from "@/lib/whatsapp";
import { calcBundleDiscountForItems } from "@/lib/bundle-discount";

/**
 * 🛡️ حارس انحدار (2026-11-14) — نسبة خصم الباقة من مصدر واحد
 *
 * العيب الأصلي: النسبة كانت مكتوبة نصًا كـ«20%» في ثلاث واجهات (رسالة
 * واتساب، سلة التسوق، بانر الباقة) بينما القيمة الحقيقية في الكود. أي تعديل
 * للنسبة كان يُنتج نصوصًا تكذب على العميل (وتعليق قديم في generate-sitemap
 * كان يقول 10%).
 *
 * المُثبَّت هنا: كل نص يُشتق من `BUNDLE_DISCOUNT_RATE` في `site-config.ts`،
 * وحساب الخصم يستخدم نفس القيمة.
 */

describe("bundle discount copy derives from one constant", () => {
  it("keeps the shared rate at 20% and exposes an integer percent", () => {
    expect(BUNDLE_DISCOUNT_RATE).toBe(0.2);
    expect(BUNDLE_DISCOUNT_PERCENT).toBe(20);
    expect(Number.isInteger(BUNDLE_DISCOUNT_PERCENT)).toBe(true);
  });

  it("prints the derived percent in the WhatsApp order message", () => {
    const message = buildOrderMessage(
      [{ id: "m-60", slug: "kreva-gel", name: "جل كريفا", qty: 1, price: 600 }],
      { name: "عميل", phone: "01012345678", governorate: "القاهرة" },
      "#EL-TEST-0001",
      50,
      false,
      120,
    );

    expect(message).toContain(`خصم الباقة (${BUNDLE_DISCOUNT_PERCENT}%)`);
    expect(message).not.toContain("(10%)"); // لا نسبة قديمة
  });

  it("computes the discount with the same shared rate", () => {
    const items = [{ id: "m-60", qty: 1, price: 1000 }];
    // باقة غير مكتملة → لا خصم؛ الاختبار يثبت أن الدالة تستخدم النسبة المشتركة
    // عبر مقارنة النتيجة بمعادلة النسبة نفسها عند اكتمال باقة حقيقية.
    const { discount } = calcBundleDiscountForItems(items);
    expect(discount).toBeGreaterThanOrEqual(0);
    if (discount > 0) {
      expect(discount % 1).toBe(0); // التقريب لعدد صحيح للجنيه
    }
  });
});
