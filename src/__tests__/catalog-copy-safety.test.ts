import { describe, expect, it } from "vitest";
import { products } from "@/data/products";
import { getProductFAQs } from "@/data/product-faqs";
import { PRODUCT_META_PROFILES } from "@/data/product-meta";

describe("catalog claim corrections", () => {
  it("does not reintroduce the removed blanket medical promises", () => {
    for (const product of products.filter((p) => p.id !== "m-01")) {
      expect(product.benefits.join(" "), product.id).not.toMatch(
        /الطاقة الخلوية الفورية|تركيبة عشبية سريرية|التوازن الهرموني|آمن تمام|أمان فسيولوجي كلي|امتصاص خلوي|دون التسبب في تهيج/,
      );
    }
  });
  it("keeps Ferrari chocolate oral and removes conflicting Caviar pack weights", () => {
    const ferrari = products.find((p) => p.id === "m-54")!;
    expect(ferrari.benefits.join(" ")).toContain("للتناول الفموي");
    expect(ferrari.benefits.join(" ")).not.toContain("الامتصاص الموضعي");
    const caviar = products.find((p) => p.id === "m-21")!;
    expect(
      JSON.stringify([
        caviar.benefits,
        caviar.description,
        getProductFAQs(caviar),
        PRODUCT_META_PROFILES[caviar.id],
      ]),
    ).not.toMatch(/(?:15|20) جم/);
  });
  it("preserves the explicitly confirmed capsule, tablet and Emla details", () => {
    const power = products.find((p) => p.id === "m-03")!;
    expect(power.description).toContain("30 كبسولة");
    expect(power.usage).toContain("تناول كبسولة");
    const love = products.find((p) => p.id === "w-22")!;
    expect(love.usage).toContain("نصف قرص");
    expect(love.usage).not.toContain("كبسولة");
    expect(products.find((p) => p.id === "m-30")!.ingredients).toContain("7.5%");
  });
});
