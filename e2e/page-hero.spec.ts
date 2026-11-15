import { expect, test } from "@playwright/test";

const pages = [
  ["/products/men", "منتجات الصحة والسعادة الزوجية للرجال"],
  ["/products/women", "منتجات الصحة والسعادة الزوجية للنساء"],
  ["/products/devices", "الأجهزة والمستلزمات الطبية"],
  ["/education", "مكتبة التوعية الجنسية"],
  ["/products/guides/men-products-prices-egypt", ""],
  ["/education/erectile-dysfunction", ""],
  ["/about", ""],
  ["/en", ""],
] as const;

for (const width of [390, 1440]) {
  test(`shared page headings remain readable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    for (const [path, title] of pages) {
      const response = await page.goto(path);
      expect(response?.status(), path).toBe(200);
      const hero = page.locator("[data-page-hero]");
      await expect(hero, path).toBeVisible();
      await expect(hero.locator("h1"), path).toBeVisible();
      if (title) await expect(hero.locator("h1"), path).toContainText(title);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        path,
      ).toBe(true);
    }
  });
}

for (const width of [390, 1440]) {
  test(`category spacing is compact at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    for (const category of ["men", "women", "devices"]) {
      await page.goto(`/products/${category}`);
      const header = await page.locator("header").first().boundingBox();
      const hero = await page.locator("[data-page-hero]").boundingBox();
      const products = await page.locator("[data-catalog-results]").boundingBox();
      expect(header && hero && products).toBeTruthy();
      expect(hero!.y - (header!.y + header!.height)).toBeLessThanOrEqual(width < 768 ? 25 : 33);
      expect(products!.y - (hero!.y + hero!.height)).toBeLessThanOrEqual(width < 768 ? 21 : 25);
    }
  });
}
