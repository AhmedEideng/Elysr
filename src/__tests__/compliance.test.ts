/**
 * ============================================================
 * Unit Tests — نظام الامتثال (Product Compliance)
 * ============================================================
 * اختبارات سياسة الكتالوج وMerchant feed؛ لا تفرض هذه المجموعة
 * قائمة كلمات ادعاءات طبية أو قاعدة noindex على المحتوى.
 */

import { describe, it, expect } from "vitest";
import { products } from "@/data/products";
import { isCatalogFeedEligible, GOOGLE_SHOPPING_BLOCKED } from "@/lib/product-compliance";

describe("GOOGLE_SHOPPING_BLOCKED — يستبعد الأدوية المرفوضة من الخلاصة فقط", () => {
  it("فاضي بالكامل بعد قرار المالك بإلغاء الحظر (2026-09-06)", () => {
    // الحالة (2026-09-07): مفيش أي حظر — مفيش أدوية مستبعدة من الكتالوج.
    // (6 أدوية اتحذفت من الكتالوج نفسه: m-34,m-36,m-37,m-43,m-47,w-17.)
    expect(GOOGLE_SHOPPING_BLOCKED.has("m-38")).toBe(false); // Power 36 — اتحذف نهائيا (2026-09-07)
    expect(GOOGLE_SHOPPING_BLOCKED.has("m-43")).toBe(false); // Procomil Fort — اتحذف نهائيا (2026-09-07)
    expect(GOOGLE_SHOPPING_BLOCKED.has("m-45")).toBe(false); // Viagra Pfizer — اتحذف نهائيا (2026-09-07)
    expect(GOOGLE_SHOPPING_BLOCKED.has("w-17")).toBe(false); // محذوفة نهائيا
    expect(GOOGLE_SHOPPING_BLOCKED.has("m-01")).toBe(false); // منتج عادي
    expect(GOOGLE_SHOPPING_BLOCKED.has("m-34")).toBe(false); // محذوف نهائيا
    expect(GOOGLE_SHOPPING_BLOCKED.size).toBe(0);
  });
});

describe("النصوص الدوائية", () => {
  it("توضح الغرض التجاري الأساسي والمكونات والاستخدام لكل منتج محمي", () => {
    for (const product of products.filter((item) => GOOGLE_SHOPPING_BLOCKED.has(item.id))) {
      expect(product.description, `Missing customer purpose in ${product.id}`).toMatch(
        /انتصاب|القذف|الإحساس|الاستجابة/,
      );
      expect(product.benefits.length, `Too few benefits in ${product.id}`).toBeGreaterThanOrEqual(
        5,
      );
      expect(product.ingredients?.length, `Missing ingredients in ${product.id}`).toBeGreaterThan(
        80,
      );
      expect(product.usage?.length, `Missing usage in ${product.id}`).toBeGreaterThan(80);
    }
  });
});

describe("isCatalogFeedEligible — الفلترة بالمخزون (الحظر اتلغى 2026-09-06)", () => {
  it("منتج متوفر → مؤهل للخلاصة", () => {
    expect(isCatalogFeedEligible({ id: "m-01", stock: 50 })).toBe(true);
    expect(isCatalogFeedEligible({ id: "m-60", stock: 10 })).toBe(true);
  });

  it("الأدوية اللي اتفك عنها الحظر → بقت مؤهلة للخلاصة (قرار المالك)", () => {
    // GOOGLE_SHOPPING_BLOCKED فاضي — ومفيش أدوية في الكتالوج أصلًا دلوقتي
    expect(isCatalogFeedEligible({ id: "m-01", stock: 100 })).toBe(true); // منتج عادي
  });

  it("مخزون = 0 → غير مؤهل (مهما كان المنتج)", () => {
    expect(isCatalogFeedEligible({ id: "m-01", stock: 0 })).toBe(false);
    expect(isCatalogFeedEligible({ id: "m-01", stock: 0 })).toBe(false);
  });
});
