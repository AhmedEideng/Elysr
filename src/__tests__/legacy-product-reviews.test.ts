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
});
