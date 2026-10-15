import { describe, expect, it } from "vitest";
import { seoLandingPages } from "@/data/landing-pages";
import { products } from "@/data/products";
import {
  makeProductMetaDescription,
  makeProductMetaTitle,
  merchantShippingDetails,
  productSchema,
} from "@/lib/seo";

const product = {
  id: "m-test",
  slug: "test-product",
  name: "منتج اختبار",
  description: "وصف اختبار طويل بما يكفي لاختبار مخطط المنتج دون أي بيانات تقييمات ثابتة.",
  price: 300,
  stock: 10,
};

describe("SEO landing-page policy", () => {
  it("keeps the Cialis and Levitra educational guides indexable", () => {
    for (const slug of ["cialis-20mg-guide", "levitra-guide"]) {
      const page = seoLandingPages.find((candidate) => candidate.slug === slug);
      expect(page).toBeDefined();
      expect(page?.noindex).not.toBe(true);
    }
  });
});

describe("product JSON-LD review provenance", () => {
  it("does not emit an aggregate rating without an approved API summary", () => {
    const schema = productSchema(product);
    expect(schema).not.toHaveProperty("aggregateRating");
    expect(schema).not.toHaveProperty("mpn");
    expect(schema).not.toHaveProperty("gtin");
    expect(schema).not.toHaveProperty("brand");
  });

  it("accepts an aggregate only when the approved summary is valid", () => {
    const schema = productSchema({
      ...product,
      approvedReviewSummary: { ratingValue: 4.5, reviewCount: 2 },
    });
    expect(schema.aggregateRating).toEqual({
      "@type": "AggregateRating",
      ratingValue: 4.5,
      reviewCount: 2,
      bestRating: 5,
      worstRating: 1,
    });
  });
});

describe("shipping structured data provenance", () => {
  it("matches the visible delivery windows", () => {
    const details = merchantShippingDetails();
    const cairo = details.find((detail) =>
      detail.shippingDestination.addressRegion.includes("القاهرة"),
    );
    const other = details.find((detail) =>
      detail.shippingDestination.addressRegion.includes("الإسكندرية"),
    );

    expect(cairo?.deliveryTime.transitTime).toMatchObject({ minValue: 1, maxValue: 2 });
    expect(other?.deliveryTime.transitTime).toMatchObject({ minValue: 2, maxValue: 4 });
    expect(cairo?.deliveryTime.handlingTime).toMatchObject({ minValue: 0, maxValue: 0 });
  });
});

describe("product metadata templates", () => {
  it("emits catalog product titles verbatim so prerender and SPA agree", () => {
    const name = "كبسولات هامر أوف ثور الألمانية الأصلية المستوردة (Hammer of Thor)";
    const title = makeProductMetaTitle(name);

    // Every catalog name fits the guard limit, so nothing is clipped: the
    // initial HTML <title> and the hydrated document.title stay identical.
    expect(title).toBe(name);
    expect(title).not.toContain("…");
  });

  it("still guards against a runaway name by trimming at a word boundary", () => {
    const title = makeProductMetaTitle(`${"اسم طويل جداً ".repeat(12)}(Brand Name)`, 60);

    expect(title.length).toBeLessThanOrEqual(61);
    expect(title.endsWith("…")).toBe(true);
  });

  // (2026-10-14 — موافقة المالكة «نفّذ دلوقتي»): البراند اللاتيني يُضاف
  // لعنوان الميتا فقط حين يخلو الاسم من اللاتيني (kreva/dooz = أعلى طلب لاتيني).
  it("appends titleLatin only when the name carries no Latin letters", () => {
    const kreva = makeProductMetaTitle("جل كريفا الألماني المتطور للرجال (50 جم)", 70, "Kreva Gel");
    expect(kreva).toBe("جل كريفا الألماني المتطور للرجال (50 جم) | Kreva Gel");
    expect(kreva.length).toBeLessThanOrEqual(70);

    const dooz = makeProductMetaTitle(
      "كريم دوز 14000 الألماني الأصلي للتأخير للرجال (20 جم)",
      70,
      "Dooz 14000",
    );
    expect(dooz.endsWith(" | Dooz 14000")).toBe(true);
    expect(dooz.length).toBeLessThanOrEqual(70);

    const alreadyLatin = makeProductMetaTitle(
      "أقراص هارد أون المزدوجة للرجال (Hard-On)",
      70,
      "Hard On",
    );
    expect(alreadyLatin).toBe("أقراص هارد أون المزدوجة للرجال (Hard-On)");

    const noToken = makeProductMetaTitle("جل سوتارا المتطور للرجال (Sotara Gel)");
    expect(noToken).toBe("جل سوتارا المتطور للرجال (Sotara Gel)");
  });

  it("builds a complete, sentence-ended supplement description", () => {
    const description = makeProductMetaDescription({
      name: "كبسولات جينسنج 1650 للرجال (Ginseng 1650)",
      nameEn: "Ginseng 1650 Capsules",
      category: "men",
      description: "وصف طويل لا يستخدم كقص ميكانيكي داخل الوصف المختصر.",
      stock: 10,
    });

    expect(description.length).toBeLessThanOrEqual(155);
    expect(description).toContain("مكمل غذائي");
    expect(description).not.toMatch(/\d+\s*ج\.م/);
    expect(description).not.toMatch(/السعر|تعليمات|وفق|النشرة/);
    expect(description).toContain("شحن سري ودفع عند الاستلام");
    expect(description).toContain("اليسر ميديكال");
    expect(description.endsWith(".")).toBe(true);
  });

  // (2026-10-14) «الصيغة الرابحة» المستعادة بقرار المالكة: تقييم حقيقي +
  // سعر + خطاف فريد لكل منتج — بلا صدى للعنوان في البداية. الأرقام من نفس
  // مصدر aggregateRating في السكيمَا (rating/reviews في بيانات المنتج).
  it("restores the owner-approved rich formula (stars + price + hook, no title echo)", () => {
    const rich = makeProductMetaDescription({
      id: "m-01",
      name: "كبسولات هامر أوف ثور الألمانية الأصلية المستوردة (Hammer of Thor)",
      nameEn: "Original German Hammer of Thor Capsules",
      category: "men",
      description: "وصف طويل لا يستخدم كقص ميكانيكي داخل الوصف المختصر.",
      price: 520,
      stock: 10,
      rating: 4.9,
      reviews: 48,
    });

    expect(rich.length).toBeLessThanOrEqual(155);
    expect(rich.startsWith("⭐4.9/5 من 48 تقييماً — ")).toBe(true);
    expect(rich).toContain("520 ج.م");
    expect(rich).toContain("شحن سري ودفع عند الاستلام");
    expect(rich).toContain("اليسر ميديكال");
    expect(rich.startsWith("كبسولات هامر")).toBe(false);
    expect(rich.endsWith(".")).toBe(true);
  });

  it("includes a raw excerpt of the first benefit for every catalog product", () => {
    expect(products).toHaveLength(83);

    for (const catalogProduct of products) {
      const rawBenefit = catalogProduct.benefits?.[0]?.trim().replace(/\s+/g, " ");
      expect(rawBenefit, `Missing first benefit for ${catalogProduct.id}`).toBeTruthy();

      const description = makeProductMetaDescription(catalogProduct);
      expect(description.length).toBeLessThanOrEqual(155);
      expect(description).toContain(rawBenefit!.slice(0, Math.min(15, rawBenefit!.length)));
    }
  });

  it("preserves source benefit claims without rewriting them", () => {
    const rawBenefit = "يحسن تدفق الدم ويضمن علاج الانتصاب بأمان";
    const description = makeProductMetaDescription({
      id: "m-unreviewed",
      name: "منتج اختبار",
      category: "men",
      description: "وصف اختبار.",
      benefits: [rawBenefit],
      stock: 1,
    });

    expect(description).toContain(rawBenefit);
  });

  it("omits stars when the product has no approved rating data", () => {
    const plain = makeProductMetaDescription({
      name: "كريم اختبار بلا تقييم (Test Cream)",
      category: "men",
      description: "وصف اختبار.",
      price: 100,
      stock: 5,
    });

    expect(plain.length).toBeLessThanOrEqual(155);
    expect(plain).not.toContain("⭐");
    expect(plain).toContain("100 ج.م");
    expect(plain).toContain("شحن سري ودفع عند الاستلام");
  });
});
