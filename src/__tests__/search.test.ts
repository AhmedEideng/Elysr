import { describe, it, expect } from "vitest";
import { expandSearchTerm, products, searchAllPublicProducts } from "@/data/products";

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

  describe("Egyptian dialect synonyms (نقط/قطرات)", () => {
    const DROP_IDS = ["w-02", "w-03", "w-15", "w-18", "w-24"];

    it("searching the dialect word 'نقط' finds all drops products", () => {
      const res = searchAllPublicProducts("نقط");
      const ids = new Set(res.map((p) => p.id));
      for (const id of DROP_IDS) expect(ids.has(id)).toBe(true);
    });

    it("searching the formal word 'قطرات' still finds the same products", () => {
      const res = searchAllPublicProducts("قطرات");
      const ids = new Set(res.map((p) => p.id));
      for (const id of DROP_IDS) expect(ids.has(id)).toBe(true);
    });

    it("both directions return the same product set", () => {
      const byDialect = new Set(searchAllPublicProducts("نقط").map((p) => p.id));
      const byFormal = new Set(searchAllPublicProducts("قطرات").map((p) => p.id));
      expect(byDialect).toEqual(byFormal);
    });

    it("expandSearchTerm expands known synonyms only", () => {
      expect(expandSearchTerm("نقط")).toEqual(["نقط", "قطرات"]);
      expect(expandSearchTerm("قطرات")).toEqual(["قطرات", "نقط"]);
      expect(expandSearchTerm("كريم")).toEqual(["كريم"]);
      expect(expandSearchTerm("  ")).toEqual([]);
    });
  });

  describe("product searchAliases (dialect product-type words)", () => {
    it("'سبراي' finds the spray products (named بخاخ ...)", () => {
      const ids = new Set(searchAllPublicProducts("سبراي").map((p) => p.id));
      for (const id of ["m-41", "m-44", "m-55", "w-01"]) expect(ids.has(id)).toBe(true);
    });

    it("'جيل' finds the gel products (named جل ...)", () => {
      const ids = new Set(searchAllPublicProducts("جيل").map((p) => p.id));
      for (const id of ["m-06", "m-32", "m-48", "m-60", "w-14"]) expect(ids.has(id)).toBe(true);
    });

    it("'حبوب' finds the capsule products (named كبسولات ...)", () => {
      const ids = new Set(searchAllPublicProducts("حبوب").map((p) => p.id));
      for (const id of ["m-01", "m-02", "m-04", "w-10"]) expect(ids.has(id)).toBe(true);
    });

    it("'الصلابة' finds the strength products whose text only says الانتصاب", () => {
      const ids = new Set(searchAllPublicProducts("الصلابة").map((p) => p.id));
      for (const id of ["m-02", "m-03", "m-04"]) expect(ids.has(id)).toBe(true);
    });

    it("'غذاء ملكات النحل' finds the royal honey product w-07", () => {
      const ids = new Set(searchAllPublicProducts("غذاء ملكات النحل").map((p) => p.id));
      expect(ids.has("w-07")).toBe(true);
    });

    it("a longer query containing the alias also matches", () => {
      const ids = new Set(searchAllPublicProducts("سبراي تأخير").map((p) => p.id));
      expect(ids.has("m-44")).toBe(true);
    });
  });

  it("trims surrounding whitespace from the query", () => {
    expect(searchAllPublicProducts("  هامر  ").length).toBe(searchAllPublicProducts("هامر").length);
  });
});
