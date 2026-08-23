import { describe, expect, it } from "vitest";
import { getProductReviews } from "@/lib/product-reviews";

describe("Kreva historical reviews", () => {
  it("shows exactly five comments and every displayed rating is 5/5", () => {
    const result = getProductReviews("kreva-gel", "men");

    expect(result.reviews).toHaveLength(5);
    expect(result.reviews.every((review) => review.rating === 5)).toBe(true);
    expect(result.rating).toBe(5);
    expect(result.reviewCount).toBe(5);
  });
});
