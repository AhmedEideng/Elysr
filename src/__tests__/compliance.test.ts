/**
 * ============================================================
 * Unit Tests — نظام الامتثال (Product Compliance)
 * ============================================================
 * ⚠️ تم إلغاء نظامي GREEN/RED والاستبعاد الإعلاني نهائيًا بقرار الإدارة.
 * جميع المنتجات الآن ظاهرة في كل الأقسام ومتاحة في الخلاصة بالكامل.
 * هذه الاختبارات تؤكد أن النظام لم يعد يستبعد أي منتج.
 */

import { describe, it, expect } from "vitest";
import { isCatalogFeedEligible, RED_PRODUCT_IDS } from "@/lib/product-compliance";

describe("تم إلغاء نظام الامتثال — لا يوجد أي استبعاد", () => {
  it("قائمة RED فارغة تمامًا", () => {
    expect(RED_PRODUCT_IDS.size).toBe(0);
  });
});

describe("isCatalogFeedEligible — يعتمد على المخزون فقط", () => {
  it("منتج متوفر → مؤهل بغض النظر عن أي تصنيف سابق", () => {
    expect(isCatalogFeedEligible({ id: "m-34", stock: 100 })).toBe(true);
    expect(isCatalogFeedEligible({ id: "m-37", stock: 50 })).toBe(true);
    expect(isCatalogFeedEligible({ id: "m-22", stock: 10 })).toBe(true);
    expect(isCatalogFeedEligible({ id: "m-01", stock: 50 })).toBe(true);
  });

  it("مخزون = 0 → غير مؤهل", () => {
    expect(isCatalogFeedEligible({ id: "m-01", stock: 0 })).toBe(false);
  });

  it("بدون مخزون → غير مؤهل (default 0)", () => {
    expect(isCatalogFeedEligible({ id: "m-01" })).toBe(false);
  });
});
