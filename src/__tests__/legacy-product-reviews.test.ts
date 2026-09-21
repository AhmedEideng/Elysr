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

  it.each([
    ["cialis-tadalafil-20mg-30-tablets", 7, 4.7],
    ["royal-cream", 11, 4.6],
    ["hard-on-sildenafil-130mg-dapoxetine-60mg", 8, 4.6],
    ["power-36-power-control-for-36-hours", 13, 4.7],
    ["lovezone-intimacy-at-its-peak-10x400mg", 9, 4.7],
    ["viagra-pfizer-100mg", 6, 4.7],
    ["dal-el-khair-honey-cherry", 15, 4.7],
    ["top-sellers-honey", 10, 4.7],
    ["halpeno-men-gel-50gm", 12, 4.7],
    ["lovezone-intimacy-at-its-peak-10x380mg", 14, 4.6],
    ["viagra-20-tablets", 5, 4.6],
  ])("preserves the supplied archive for %s", (slug, count, rating) => {
    const result = getProductReviews(slug, "men", Number(count));

    expect(result.reviewCount).toBe(count);
    expect(result.rating).toBe(rating);
    expect(result.reviews.every((review) => review.fixedDate === true)).toBe(true);
  });
});
