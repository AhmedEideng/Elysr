import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import type { Product } from "../src/data/product-types";
const products = JSON.parse(readFileSync("api/lib/products-db.json", "utf8")) as Product[];

for (const width of [390, 1440]) {
  test(`phrase corrections retain the original pages at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 });
    await page.route("**/api/reviews?*", (route) => route.fulfill({ json: { reviews: [] } }));
    await page.route("**/api/submit-order", (route) => route.abort());
    await page.route("**/api/submit-review", (route) => route.abort());
    for (const id of ["m-32", "m-60", "w-14", "w-17", "w-26", "d-06"]) {
      const product = products.find((p) => p.id === id)!;
      await page.goto(`/products/${product.slug}`);
      await expect(page.locator("script#ldjson-product")).toBeAttached();
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(product.name);
      await expect(page.getByText(product.description, { exact: true })).toBeVisible();
      await expect(page.getByText(product.usage!, { exact: true })).toBeVisible();
      await expect(page.getByText("إرشادات استخدام واضحة", { exact: true })).toBeVisible();
      const schema = JSON.parse((await page.locator("script#ldjson-product").textContent())!);
      expect(schema.description).toBe(product.description);
      expect(Number(schema.offers.price)).toBe(product.price);
      if (product.rating && product.reviews) {
        expect(schema.aggregateRating).toMatchObject({
          ratingValue: product.rating,
          reviewCount: product.reviews,
        });
      } else {
        expect(schema.aggregateRating).toBeUndefined();
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
  });
}
