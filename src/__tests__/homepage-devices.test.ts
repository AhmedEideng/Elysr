import { describe, expect, it } from "vitest";
import {
  products,
  getFeaturedProducts,
  HOMEPAGE_CONCERN_CANDIDATES,
  HOMEPAGE_EXCLUDED_PRODUCT_IDS,
} from "@/data/products";
import { getProductFAQs } from "@/data/product-faqs";
import { makeProductMetaDescription } from "@/lib/seo";

describe("homepage device selection and manual pump price", () => {
  it("shows the three replacement devices and excludes Big Bro only from home", () => {
    const featured = new Set(getFeaturedProducts().map((p) => p.id));
    const selected = HOMEPAGE_CONCERN_CANDIDATES.devices
      .filter((id) => !featured.has(id) && !HOMEPAGE_EXCLUDED_PRODUCT_IDS.has(id))
      .slice(0, 3);
    expect(selected).toEqual(["d-05", "d-07", "d-08"]);
    expect(HOMEPAGE_EXCLUDED_PRODUCT_IDS.has("d-04")).toBe(true);
    expect(products.find((p) => p.id === "d-04")?.category).toBe("devices");
  });
  it("keeps the manual pump price consistent in data, copy, FAQ and meta", () => {
    const pump = products.find((p) => p.id === "d-03")!;
    expect(pump.price).toBe(800);
    expect(pump.description).toContain("٨٠٠ جنيه");
    expect(pump.description).not.toMatch(/700|٧٠٠/);
    expect(getProductFAQs(pump).some((f) => f.answer.includes("800 جنيه"))).toBe(true);
    expect(makeProductMetaDescription(pump)).toContain("800 ج.م");
    expect(pump.stock).toBe(5000);
  });
});

describe("owner-selected homepage concern sections", () => {
  it.each([
    ["delay", ["m-31", "m-55", "m-30"]],
    ["strength", ["m-04", "m-63", "m-03"]],
    ["women", ["w-25", "w-10", "w-15"]],
  ] as const)("keeps the exact requested %s products in order", (key, expected) => {
    const featured = new Set(getFeaturedProducts().map((p) => p.id));
    const actual = HOMEPAGE_CONCERN_CANDIDATES[key]
      .filter((id) => !featured.has(id) && !HOMEPAGE_EXCLUDED_PRODUCT_IDS.has(id))
      .slice(0, 3);
    expect(actual).toEqual(expected);
    for (const id of actual) expect(products.some((p) => p.id === id)).toBe(true);
  });
  it("moves Connubial out of featured and enables capsules without enabling tablets", () => {
    const featured = getFeaturedProducts().map((p) => p.id);
    expect(featured).toHaveLength(6);
    expect(featured).not.toContain("w-15");
    expect(featured).toContain("m-32");
    expect(HOMEPAGE_EXCLUDED_PRODUCT_IDS.has("m-03")).toBe(false);
    expect(HOMEPAGE_EXCLUDED_PRODUCT_IDS.has("m-49")).toBe(true);
    const concernIds = Object.values(HOMEPAGE_CONCERN_CANDIDATES).flatMap((ids) =>
      ids
        .filter((id) => !featured.includes(id) && !HOMEPAGE_EXCLUDED_PRODUCT_IDS.has(id))
        .slice(0, 3),
    );
    expect(new Set([...featured, ...concernIds]).size).toBe(18);
  });
});
