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
