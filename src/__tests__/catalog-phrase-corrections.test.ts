import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { products } from "@/data/products";
import { getProductFAQs } from "@/data/product-faqs";
const byId = (id: string) => products.find((p) => p.id === id)!;
describe("phrase-only catalog corrections", () => {
  it("preserves every non-copy catalog field, including names, prices, badges and bundles", () => {
    expect(products).toHaveLength(89);
    // Owner-approved follow-up: Power 36 and Big Penis are each 250 EGP.
    for (const id of ["m-38", "m-46"]) {
      expect(byId(id).price).toBe(250);
      expect(getProductFAQs(byId(id)).some((faq) => faq.answer.includes("250 جنيه"))).toBe(true);
    }
    const copyFields = new Set(["description", "benefits", "ingredients", "usage"]);
    const fields = products.map((p) =>
      Object.fromEntries(
        Object.entries(p)
          .filter(([k]) => !copyFields.has(k))
          .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
      ),
    );
    expect(createHash("sha256").update(JSON.stringify(fields)).digest("hex")).toBe(
      "9593c419affc3b82798499429f220da3c12ba071b8fdc796d000e97b589bb57d",
    );
  });
  it("corrects discrete ingredient and language errors without removing the original descriptions", () => {
    expect(byId("m-32").description).toContain("هو الصيغة الذهبية المطورة");
    expect(byId("m-32").description).not.toContain("0 أعراض");
    expect(byId("m-60").description).toContain("هو تركيبة جل كريمي متخصصة ثنائية المفعول");
    expect(byId("w-20").description).toContain("هو البديل التجميلي الموضعي");
    expect(byId("w-20").description).not.toContain("5-7.5%");
    expect(byId("w-14").description).not.toContain("البابايا");
    for (const id of ["w-06", "w-10", "w-11", "w-13"]) expect(byId(id).usage).toContain("امضغي");
    expect(byId("w-22").description).not.toContain("الـ الـ");
  });
  it("retains contraindications and consent while avoiding a dose for an unspecified strength", () => {
    expect(byId("w-17").usage).not.toContain("نصف قرص");
    expect(byId("w-17").usage).toContain("معرفة تركيز القرص");
    expect(getProductFAQs(byId("w-17"))[1].answer).not.toContain("نصف قرص");
    for (const id of ["m-34", "m-38", "m-64", "w-17"])
      expect(byId(id).usage).toMatch(/النترات|النيترات/);
    for (const id of ["w-25", "w-26"]) expect(byId(id).usage).toMatch(/موافقة/);
    expect(byId("m-64").usage).toContain("4 ساعات");
    expect(byId("w-22").usage).toContain("نصف قرص");
    expect(byId("m-63").usage).toContain("بعد الوجبة الرئيسية");
  });
  it("keeps confirmed copy and removes contradictory usage-count estimates", () => {
    expect(byId("w-26").description).toContain("غيّري الروتين بطريقتك");
    expect(byId("m-01").description).toContain("الحل الشامل الثلاثي الأبعاد");
    expect(byId("w-03").usage).not.toContain("3-5 استخدامات");
    expect(JSON.stringify(getProductFAQs(byId("w-03")))).not.toContain("3-5 استخدامات");
    expect(byId("m-42").usage).not.toContain("1-2 كيس");
    expect(byId("m-42").usage).toContain("كيس واحد");
  });
});
