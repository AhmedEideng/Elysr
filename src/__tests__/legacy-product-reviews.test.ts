import { describe, expect, it } from "vitest";
import { getProductReviews } from "@/lib/legacy-product-reviews";

describe("archived customer reviews", () => {
  it("returns a stable, non-empty review set for an archived product", () => {
    const first = getProductReviews("hammer-of-thor-capsules", "men");
    const second = getProductReviews("hammer-of-thor-capsules", "men");

    expect(first.reviews.length).toBeGreaterThanOrEqual(3);
    expect(first).toEqual(second);
    expect(first.reviews.every((review) => review.rating >= 1 && review.rating <= 5)).toBe(true);
  });

  it("preserves the supplied Vitamax archive and calculates its 4.5 average", () => {
    const result = getProductReviews("vitamax-doubleshot-energy-honey", "men", 15);

    expect(result.reviewCount).toBe(15);
    expect(result.rating).toBe(4.5);
    expect(result.reviews[0]).toMatchObject({
      name: "أحمد م.",
      city: "القاهرة",
      date: "2026/09/02",
      fixedDate: true,
    });
    expect(result.reviews.every((review) => review.helpful === 0)).toBe(true);
  });
});
