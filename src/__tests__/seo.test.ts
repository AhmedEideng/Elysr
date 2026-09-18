import { describe, expect, it } from "vitest";
import { productSchema } from "@/lib/seo";

const product = {
  id: "m-test",
  slug: "test-product",
  name: "منتج اختبار",
  description: "وصف اختبار طويل بما يكفي لاختبار مخطط المنتج دون أي بيانات تقييمات ثابتة.",
  price: 300,
  stock: 10,
};

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
