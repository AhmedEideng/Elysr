import { expect, test } from "@playwright/test";
import { restoredLandingPages } from "../src/data/restored-landing-pages";
import { restoredNutritionArticle } from "../src/data/restored-nutrition-article";

for (const guide of restoredLandingPages) {
  test(`restored guide: ${guide.slug}`, async ({ page, request }) => {
    const path = `/products/guides/${guide.slug}`;
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status()).toBe(200);
    const html = await response.text();
    expect(html).toContain(guide.sections[0].heading);
    expect(html).toContain(guide.sources![0].url);
    expect(html).toContain(`https://elysrmedical.store${path}`);
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1, name: guide.title })).toBeVisible();
    await expect(page.getByRole("heading", { name: "المصادر والمراجع" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: guide.sources![0].title, exact: true }),
    ).toHaveAttribute("href", guide.sources![0].url);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      `https://elysrmedical.store${path}`,
    );
  });
}

test("restored nutrition article loads at the original URL", async ({ page, request }) => {
  const path = `/education/${restoredNutritionArticle.slug}`;
  const response = await request.get(path, { maxRedirects: 0 });
  expect(response.status()).toBe(200);
  expect(await response.text()).toContain(restoredNutritionArticle.title);
  await page.goto(path);
  await expect(
    page.getByRole("heading", { level: 1, name: restoredNutritionArticle.title }),
  ).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    `https://elysrmedical.store${path}`,
  );
});

test("restored long guide remains readable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/products/guides/sildenafil-products-guide");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.getByRole("heading", { name: "المصادر والمراجع" }).scrollIntoViewIfNeeded();
  await expect(page.getByRole("heading", { name: "المصادر والمراجع" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
