import { describe, expect, it } from "vitest";
import { seoLandingPages } from "@/data/landing-pages";
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
  it("keeps product titles within 60 characters without cutting a parenthetical brand", () => {
    const title = makeProductMetaTitle(
      "كبسولات هامر أوف ثور الألمانية الأصلية المستوردة (Hammer of Thor)",
    );

    expect(title.length).toBeLessThanOrEqual(60);
    expect(title).not.toContain("(Hammer…");
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
    expect(description).toContain("اطلب الآن");
    expect(description).toContain("شحن سري ودفع عند الاستلام");
    expect(description).toContain("اليسر ميديكال");
    expect(description.endsWith(".")).toBe(true);
  });
});
