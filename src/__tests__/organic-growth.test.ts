import { describe, expect, it } from "vitest";
import { products } from "@/data/products";
import { seoLandingPages } from "@/data/landing-pages";
import { articles } from "@/data/articles";
import { getArticlesForProduct, getProductsForArticle } from "@/lib/internal-links";
import { orderAnalyticsFinancials } from "@/lib/analytics";
import { productSchema } from "@/lib/seo";

const guide = (slug: string) => seoLandingPages.find((p) => p.slug === slug)!;
describe("organic discovery and editorial relevance", () => {
  it.each(["men", "women"] as const)("%s price guide covers the live catalogue", (category) => {
    expect(guide(`${category}-products-prices-egypt`).productIds).toEqual(
      products.filter((p) => p.category === category).map((p) => p.id),
    );
  });
  it("all guide selections are existing unique products", () => {
    const ids = new Set(products.map((p) => p.id));
    for (const page of seoLandingPages) {
      expect(new Set(page.productIds).size, page.slug).toBe(page.productIds.length);
      for (const id of page.productIds) expect(ids.has(id), `${page.slug}: ${id}`).toBe(true);
    }
  });
  it.each(["manual-vs-electric-vacuum-pump", "vacuum-pump-men-guide"])(
    "%s only recommends male vacuum pumps",
    (slug) => {
      expect(guide(slug).productIds).toEqual(["d-03", "d-05", "d-07", "d-08", "d-01", "d-02"]);
    },
  );
  it("spray articles recommend sprays, not chocolate or energy sachets", () => {
    expect(getProductsForArticle("delay-sprays-safe-use")).toEqual(["m-55", "m-41", "m-44"]);
  });
  it("women's categories precede broad ingredient keyword matching", () => {
    const pink = products.find((p) => p.id === "w-25")!;
    expect(getArticlesForProduct(pink)).toEqual([
      "women-products-complete-guide",
      "womens-libido-boosters",
    ]);
  });
  it("ginseng recommendations include ginseng and general medical articles have no sales fallback", () => {
    expect(getProductsForArticle("red-korean-ginseng-energy-endurance-benefits")).toContain("m-04");
    for (const slug of [
      "nutrition-mental-health-testosterone-balance",
      "std-prevention",
      "contraception-options",
      "when-to-see-doctor",
      "unknown",
    ])
      expect(getProductsForArticle(slug)).toEqual([]);
  });
  it("all article recommendations and product article links resolve", () => {
    const ids = new Set(products.map((p) => p.id));
    const slugs = new Set(articles.map((a) => a.slug));
    for (const article of articles)
      for (const id of getProductsForArticle(article.slug)) expect(ids.has(id)).toBe(true);
    for (const product of products)
      for (const slug of getArticlesForProduct(product)) expect(slugs.has(slug)).toBe(true);
  });
  it("previously isolated guides have contextual incoming links", () => {
    for (const slug of [
      "cialis-20mg-guide",
      "levitra-guide",
      "whatsapp-order-guide",
      "why-buy-from-elysr-medical",
      "most-popular-products-egypt",
      "women-products-cairo",
    ])
      expect(
        seoLandingPages.some(
          (p) => p.slug !== slug && p.links.some((l) => l.href === `/products/guides/${slug}`),
        ),
        slug,
      ).toBe(true);
  });
});

describe("GA4 merchandise values without delivery", () => {
  it.each([
    [1, 400, 450, 50, 400],
    [2, 100, 240, 50, 190],
    [3, 100, 299.99, 50, 249.99],
    [1, 420, 420, 0, 420],
  ])("keeps net item values consistent (%s units)", (qty, price, total, shipping, expected) => {
    const f = orderAnalyticsFinancials([{ id: "test", name: "Test", price, qty }], total, shipping);
    expect(f.value).toBe(expected);
    expect(f.items.reduce((sum, i) => sum + i.price * i.quantity, 0)).toBeCloseTo(f.value, 6);
  });
  it("distributes discounts across multiple item lines", () => {
    const items = [
      { id: "a", name: "A", qty: 3, price: 70 },
      { id: "b", name: "B", qty: 2, price: 105 },
    ];
    const original = JSON.stringify(items);
    const f = orderAnalyticsFinancials(items, 437.5, 70);
    expect(f.value).toBe(367.5);
    expect(f.items.reduce((sum, i) => sum + i.price * i.quantity, 0)).toBeCloseTo(367.5, 6);
    expect(JSON.stringify(items)).toBe(original);
  });
  it("handles empty and fully discounted orders without negative values", () => {
    expect(orderAnalyticsFinancials([], 50, 50)).toEqual({ value: 0, items: [] });
    expect(
      orderAnalyticsFinancials([{ id: "a", name: "A", qty: 1, price: 100 }], 50, 50).items[0].price,
    ).toBe(0);
  });
  it("preserves the existing single product image in schema", () => {
    const product = products[0];
    const image = productSchema(product).image;
    expect(typeof image).toBe("string");
    expect(image).toContain(product.image!);
  });
});
