import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  getProductById,
  getBundleProductType,
  getOralSolidForm,
  getCrossSellsForProduct,
  products,
  searchAllPublicProducts,
} from "@/data/products";
import { getProductFAQs } from "@/data/product-faqs";
import { PRODUCT_META_PROFILES } from "@/data/product-meta";

const product = (id: string) => getProductById(id)!;

describe("women's gum wording and owner-confirmed Marcin form", () => {
  it("uses affirmative one-piece wording without removing essential precautions", () => {
    for (const id of ["w-10", "w-11", "w-13", "w-21"]) {
      const usage = product(id).usage!;
      expect(usage, id).toContain("امضغي قطعة واحدة فقط");
      expect(usage, id).toContain("30-60 دقيقة");
      expect(usage, id).not.toMatch(/لا تتجاوزي|قطعتين/);
      expect(usage, id).toMatch(/الحمل|للحامل/);
      expect(usage, id).toMatch(/استشار|استشيري/);
    }
    for (const id of ["w-10", "w-11", "w-13"]) {
      expect(product(id).usage, id).toContain("توقفي");
      expect(product(id).price, id).toBe(250);
    }
    expect(product("w-11").usage).toContain("أمراض مزمنة");
    expect(product("w-21").usage).toContain("تتناولين أدوية");
  });

  it("presents and searches Marcin as gum while preserving its URL, price and stock", () => {
    const marcin = product("w-21");
    expect(marcin.name).toBe("لبان مارسين اللذيذ بنكهة الكرز للنساء (Marcin Cherry)");
    expect(marcin).toMatchObject({ slug: "marcin-cherry-women", price: 200, stock: 5000 });
    expect(marcin.description).toContain("علكة مارسين");
    expect(marcin.description).not.toContain("أقراص");
    expect(marcin.ingredients).not.toContain("للقرص");
    expect(marcin.benefits[0]).toContain("لبان للمضغ");
    expect(PRODUCT_META_PROFILES[marcin.id].hook).toContain("لبان للمضغ");
    expect(getProductFAQs(marcin)[0].answer).toContain("لبان للمضغ");
    expect(getBundleProductType(marcin)).toBe("gum");
    expect(getOralSolidForm(marcin)).toBeNull();
    for (const term of ["مارسين لبان", "علكة مارسين"]) {
      expect(searchAllPublicProducts(term)[0]?.id, term).toBe("w-21");
    }
  });

  it("updates SexLove wording and preserves every previously approved bundle", () => {
    expect(product("w-06").usage).toBe(
      "امضغي قطعة واحدة فقط قبل العلاقة بـ 10-20 دقيقة. اشربي الماء بكثرة. لا تستخدمي أثناء الحمل أو الرضاعة دون استشارة. إذا ظهر أي أثر جانبي توقفي. استشيري الطبيب إذا كان لديك حساسية.",
    );
    const bundles = products.map((p) => [p.id, getCrossSellsForProduct(p).map((item) => item.id)]);
    expect(createHash("sha256").update(JSON.stringify(bundles)).digest("hex")).toBe(
      "a122851c2d64b1803af82826b636f3c6b54c026d2acc7b5ed45ecc985c2d6200",
    );
  });
});
