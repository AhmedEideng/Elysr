/**
 * ============================================================
 * Unit Tests — نظام الامتثال (Product Compliance)
 * ============================================================
 * ⚠️ تم إلغاء نظامي GREEN/RED والاستبعاد الإعلاني نهائيًا بقرار الإدارة.
 * جميع المنتجات الآن ظاهرة في كل الأقسام ومتاحة في الخلاصة بالكامل.
 * هذه الاختبارات تؤكد أن النظام لم يعد يستبعد أي منتج.
 */

import { describe, it, expect } from "vitest";
import {
  getProductComplianceStatus,
  isRedProduct,
  isCatalogFeedEligible,
  RED_PRODUCT_IDS,
  ADS_RESTRICTED_PRODUCT_IDS,
} from "@/lib/product-compliance";

describe("تم إلغاء نظام الامتثال — لا يوجد أي استبعاد", () => {
  it("قائمتي RED و ADS_RESTRICTED فارغتان تمامًا", () => {
    expect(RED_PRODUCT_IDS.size).toBe(0);
    expect(ADS_RESTRICTED_PRODUCT_IDS.size).toBe(0);
  });

  it("كل المنتجات تُصنّف خضراء", () => {
    expect(getProductComplianceStatus("m-34")).toBe("green");
    expect(getProductComplianceStatus("m-37")).toBe("green");
    expect(getProductComplianceStatus("m-44")).toBe("green");
    expect(getProductComplianceStatus("m-22")).toBe("green");
    expect(getProductComplianceStatus("w-03")).toBe("green");
    expect(getProductComplianceStatus("unknown-99")).toBe("green");
  });

  it("لا يوجد أي منتج أحمر", () => {
    expect(isRedProduct("m-34")).toBe(false);
    expect(isRedProduct("m-37")).toBe(false);
    expect(isRedProduct("w-17")).toBe(false);
  });

  it("لا يوجد أي استبعاد إعلاني إضافي", () => {
    expect(isRedProduct("m-22")).toBe(false);
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
