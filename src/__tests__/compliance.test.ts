/**
 * ============================================================
 * Unit Tests — نظام الامتثال (Product Compliance)
 * ============================================================
 * جميع المنتجات ظاهرة داخل الموقع، بينما تُستبعد المنتجات الدوائية المحددة
 * من Merchant feed وتخضع لنصوص دوائية أكثر تحفظاً.
 */

import { describe, it, expect } from "vitest";
import { products } from "@/data/products";
import {
  isCatalogFeedEligible,
  RED_PRODUCT_IDS,
  GOOGLE_SHOPPING_BLOCKED,
} from "@/lib/product-compliance";

describe("تم إلغاء نظام RED — لا يُستثنى أي منتج من الموقع", () => {
  it("قائمة RED فارغة تمامًا", () => {
    expect(RED_PRODUCT_IDS.size).toBe(0);
  });
});

describe("GOOGLE_SHOPPING_BLOCKED — يستبعد الأدوية المرفوضة من الخلاصة فقط", () => {
  it("تحوي منتجات الأدوية المرفوضة من Google Shopping", () => {
    expect(GOOGLE_SHOPPING_BLOCKED.has("m-34")).toBe(true); // Hard-On
    expect(GOOGLE_SHOPPING_BLOCKED.has("m-37")).toBe(true); // Cialis
    expect(GOOGLE_SHOPPING_BLOCKED.has("w-17")).toBe(true); // Viagra Women
    expect(GOOGLE_SHOPPING_BLOCKED.has("m-01")).toBe(false); // منتج عادي
  });
});

describe("النصوص الدوائية", () => {
  it("لا تستخدم وعود أمان أو نتائج مطلقة في المنتجات الدوائية المحجوبة", () => {
    const prohibited =
      /آمن(?:ة)?\s*(?:تمام|100%)|أمان\s*تام|منتج\s*مضمون|مضمون\s*100%|يضمن\s+لك|مجرب\s*سريري|نتائج\s*مؤكدة|ثقة\s*مطلقة/i;
    for (const product of products.filter((item) => GOOGLE_SHOPPING_BLOCKED.has(item.id))) {
      const copy = [product.description, ...product.benefits, product.usage ?? ""].join(" ");
      expect(copy, `Risky absolute claim in ${product.id}`).not.toMatch(prohibited);
    }
  });
});

describe("isCatalogFeedEligible — يستثني الأدوية من الخلاصة فقط", () => {
  it("منتج آمن متوفر → مؤهل للخلاصة", () => {
    expect(isCatalogFeedEligible({ id: "m-01", stock: 50 })).toBe(true);
    expect(isCatalogFeedEligible({ id: "m-60", stock: 10 })).toBe(true);
  });

  it("دواء مرفوض → غير مؤهل للخلاصة حتى لو متوفر", () => {
    expect(isCatalogFeedEligible({ id: "m-34", stock: 100 })).toBe(false);
    expect(isCatalogFeedEligible({ id: "m-37", stock: 50 })).toBe(false);
    expect(isCatalogFeedEligible({ id: "w-17", stock: 10 })).toBe(false);
  });

  it("مخزون = 0 → غير مؤهل", () => {
    expect(isCatalogFeedEligible({ id: "m-01", stock: 0 })).toBe(false);
  });
});
