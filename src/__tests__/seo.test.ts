import { describe, expect, it } from "vitest";
import { seoLandingPages } from "@/data/landing-pages";
import { productSchema } from "@/lib/seo";

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
