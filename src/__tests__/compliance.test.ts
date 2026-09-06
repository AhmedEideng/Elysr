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
    // تم حذف 5 أدوية نهائياً (m-34,m-36,m-37,m-47,w-17).
    // 3 محظورة معروضة على الموقع ومستبعدة من الخلاصة (m-38,m-43,m-45)
    // — w-17 (Viagra For Women) اتحذفت نهائياً 2026-09-06 (بعد إعادة إضافتها).
    expect(GOOGLE_SHOPPING_BLOCKED.has("m-38")).toBe(true); // Power 36
    expect(GOOGLE_SHOPPING_BLOCKED.has("m-43")).toBe(true); // Procomil Fort
    expect(GOOGLE_SHOPPING_BLOCKED.has("m-45")).toBe(true); // Viagra Pfizer
    expect(GOOGLE_SHOPPING_BLOCKED.has("w-17")).toBe(false); // محذوفة نهائياً
    expect(GOOGLE_SHOPPING_BLOCKED.has("m-01")).toBe(false); // منتج عادي
    expect(GOOGLE_SHOPPING_BLOCKED.has("m-34")).toBe(false); // محذوف نهائياً
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
    expect(isCatalogFeedEligible({ id: "m-38", stock: 100 })).toBe(false);
    expect(isCatalogFeedEligible({ id: "m-45", stock: 50 })).toBe(false);
    expect(isCatalogFeedEligible({ id: "m-43", stock: 10 })).toBe(false);
  });

  it("مخزون = 0 → غير مؤهل", () => {
    expect(isCatalogFeedEligible({ id: "m-01", stock: 0 })).toBe(false);
  });
});
