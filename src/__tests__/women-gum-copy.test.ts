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
      // (Round 8) ممنوع إحالة الطبيب/الصيدلي في نسخ المنتج — التحذير نفسه باقٍ.
      expect(usage, id).not.toMatch(/استشير|الطبيب|الصيدلي|النشرة/);
    }
    for (const id of ["w-10", "w-11", "w-13"]) {
      expect(product(id).usage, id).toContain("توقّفي");
      expect(product(id).price, id).toBe(250);
    }
    expect(product("w-11").usage).toContain("أمراض مزمنة");
    // (Round 8) صيغة التحذير وُحّدت: «تناول أدوية» بدل «تتناولين أدوية» — نفس المعنى بلا مخاطبة شخصية.
    expect(product("w-21").usage).toContain("تناول أدوية");
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
      "امضغي قطعة واحدة فقط قبل العلاقة بـ 10-20 دقيقة. اشربي الماء بكثرة. لا يُستخدم أثناء الحمل أو الرضاعة. توقّفي عند ظهور أي أثر جانبي. لا يُنصح بالاستخدام في حال وجود حساسية.",
    );
    // (m-27 · 2026-11-15) بعد تحويل إكس ستيل من «أكياس» إلى «عسل» تغيّر شكل
    // المنتج، فمحرّك الاقتراحات (الذي يفضّل نفس الشكل) أعاد ترتيب بعض القوائم —
    // البصمة اتحدّثت عن قصد، والعدد/البنية لم يتغيّرا.
    // (m-36 + m-47 · 2026-11-15) استرجاع منتجين فمويين جديدين غيّر مرشحي
    // الباقات في فئة الرجال (89 → 91 منتجًا) — البصمة اتحدّثت عن قصد أيضًا،
    // وكل باقة لا تزال 3 منتجات بلا تكرار.
    const bundles = products.map((p) => [p.id, getCrossSellsForProduct(p).map((item) => item.id)]);
    expect(createHash("sha256").update(JSON.stringify(bundles)).digest("hex")).toBe(
      "641a98b8c454e46df675f552c06f0ab26e393f06817067d0519bafb2dc429efa",
    );
  });
});
