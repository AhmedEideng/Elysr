import { describe, expect, it } from "vitest";
import {
  getProductById,
  getCrossSellsForProduct,
  getBundleProductType,
  products,
  searchAllPublicProducts,
} from "@/data/products";
import { getProductFAQs } from "@/data/product-faqs";
import { productSchema } from "@/lib/seo";

describe("owner-approved HILTI catalogue update", () => {
  it("adds an independent women's listing with the supplied price and actual stock", () => {
    const women = getProductById("w-26")!;
    expect(women).toMatchObject({
      slug: "hilti-bitter-chocolate-for-women",
      category: "women",
      price: 200,
      stock: 300,
      image: "/images/hilti-bitter-chocolate-for-women.webp",
    });
    expect(getBundleProductType(women)).toBe("chocolate");
    expect(women).not.toHaveProperty("rating");
    expect(women).not.toHaveProperty("reviews");
    expect(women.ingredients).toBe(
      "الإبيميديوم (عشبة العنزة)، مستخلص الجينسنغ، كاكاو طبيعي، نكهات طبيعية.",
    );
    expect(women.description).toContain("ليست كل اللحظات الجميلة بحاجة إلى مناسبة");
    expect(women.description).not.toMatch(/200|أضيفي|سلتك|المصدر|المتجر/);
    expect(women).not.toHaveProperty("gtin");
  });
  it("changes the men's price without changing its URL or stock", () => {
    expect(getProductById("m-15")).toMatchObject({
      slug: "hilti-bitter-chocolate-man",
      price: 200,
      stock: 5000,
    });
  });
  it.each(["هيلتى للنساء", "شيكولاتة هيلتى للنساء", "Hilti women"])(
    "finds the women's product first for %s",
    (query) => {
      expect(searchAllPublicProducts(query)[0]?.id).toBe("w-26");
    },
  );
  it("keeps structured price and FAQs aligned without invented review or safety claims", () => {
    const p = getProductById("w-26")!;
    const schema = productSchema(p);
    expect(schema.offers).toMatchObject({ price: 200, priceCurrency: "EGP" });
    expect(schema).not.toHaveProperty("aggregateRating");
    const faq = getProductFAQs(p);
    expect(faq[0].answer).toContain("200 جنيه");
    expect(faq[0].answer).toContain("50 جم");
    expect(faq.some((q) => q.question === "هل المنتجات أصلية؟")).toBe(false);
    expect(p.description).not.toMatch(/يعالج|مضمون|آمن تمام|آمنة تمام|72 ساعة|سيلدينافيل/);
  });
  it("does not insert the new product into existing bundles", () => {
    expect(getCrossSellsForProduct(getProductById("w-26")!)).toEqual([]);
    for (const p of products)
      expect(getCrossSellsForProduct(p).some((x) => x.id === "w-26")).toBe(false);
  });
});
