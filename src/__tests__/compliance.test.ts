/**
 * ============================================================
 * Unit Tests — نظام الامتثال المبسط (Product Compliance)
 * ============================================================
 */

import { describe, it, expect } from "vitest";
import {
  getProductComplianceStatus,
  isRedProduct,
  isCatalogFeedEligible,
  RED_PRODUCT_IDS,
} from "@/lib/product-compliance";

describe("getProductComplianceStatus", () => {
  it("يصنف المنتجات الحمراء صحيحاً", () => {
    for (const id of RED_PRODUCT_IDS) {
      expect(getProductComplianceStatus(id)).toBe("red");
    }
  });

  it("باقي المنتجات خضراء", () => {
    expect(getProductComplianceStatus("m-01")).toBe("green");
    expect(getProductComplianceStatus("m-02")).toBe("green");
    expect(getProductComplianceStatus("w-05")).toBe("green");
    expect(getProductComplianceStatus("unknown-99")).toBe("green");
  });
});

describe("isRedProduct", () => {
  it("true للمنتجات الحمراء", () => {
    expect(isRedProduct("m-34")).toBe(true);
    expect(isRedProduct("m-37")).toBe(true);
    expect(isRedProduct("w-17")).toBe(true);
  });

  it("false للمنتجات غير الحمراء", () => {
    expect(isRedProduct("m-01")).toBe(false);
    expect(isRedProduct("m-05")).toBe(false);
    expect(isRedProduct("d-01")).toBe(false);
  });
});

describe("isCatalogFeedEligible", () => {
  it("المنتجات الخضراء مع مخزون → مؤهلة", () => {
    expect(isCatalogFeedEligible({ id: "m-01", stock: 50 })).toBe(true);
  });

  it("المنتجات الحمراء → غير مؤهلة حتى مع مخزون", () => {
    expect(isCatalogFeedEligible({ id: "m-34", stock: 100 })).toBe(false);
    expect(isCatalogFeedEligible({ id: "m-37", stock: 50 })).toBe(false);
  });

  it("مخزون = 0 → غير مؤهل", () => {
    expect(isCatalogFeedEligible({ id: "m-01", stock: 0 })).toBe(false);
  });

  it("بدون مخزون → غير مؤهل (default 0)", () => {
    expect(isCatalogFeedEligible({ id: "m-01" })).toBe(false);
  });
});
