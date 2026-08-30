import { describe, it, expect } from "vitest";
import { products, searchAllPublicProducts } from "@/data/products";

/**
 * اختبارات محرك البحث الشامل searchAllPublicProducts —
 * محرك صفحة /search?q={search_term_string} (هدف SearchAction الرئيسي).
 */
describe("searchAllPublicProducts (global /search?q=)", () => {
  it("returns the whole catalog for an empty/whitespace query", () => {
    expect(searchAllPublicProducts("")).toHaveLength(products.length);
    expect(searchAllPublicProducts("   ")).toHaveLength(products.length);
  });

  it("matches Arabic product names", () => {
    const res = searchAllPublicProducts("هامر");
    expect(res.length).toBeGreaterThan(0);
    expect(res.some((p) => p.name.includes("هامر أوف ثور"))).toBe(true);
  });

  it("matches English names and URL slugs (case-insensitive)", () => {
    const bySlug = searchAllPublicProducts("HAMMER-OF-THOR");
    expect(bySlug.some((p) => p.slug === "hammer-of-thor-capsules")).toBe(true);
  });

  it("searches across ALL categories (men + women + devices)", () => {
    // "عسل" يوجد في منتجات الرجالي والنساء معاً
    const res = searchAllPublicProducts("عسل");
    const cats = new Set(res.map((p) => p.category));
    expect(cats.has("men")).toBe(true);
    expect(cats.has("women")).toBe(true);
  });

  it("matches descriptions and ingredients, not just names", () => {
    // "الجينسنج" مكوّن يظهر في وصف/مكونات منتجات كثيرة
    const res = searchAllPublicProducts("الجينسنج");
    expect(res.length).toBeGreaterThan(0);
  });

  it("returns an empty array for a query that matches nothing", () => {
    expect(searchAllPublicProducts("zzzz-not-a-real-product-12345")).toEqual([]);
  });

  it("trims surrounding whitespace from the query", () => {
    expect(searchAllPublicProducts("  هامر  ").length).toBe(
      searchAllPublicProducts("هامر").length,
    );
  });
});
