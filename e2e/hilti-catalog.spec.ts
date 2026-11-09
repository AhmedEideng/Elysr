import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/gtag/js**", (route) => route.abort());
  await page.route("**/g/collect**", (route) => route.abort());
});

test("HILTI women is discoverable, has working responsive images and a 200 EGP offer", async ({
  page,
  request,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const slug = "hilti-bitter-chocolate-for-women";
  const response = await request.get(`/products/${slug}`);
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).toContain("ليست كل اللحظات الجميلة بحاجة إلى مناسبة");
  expect(html).toContain("الإبيميديوم (عشبة العنزة)");
  await page.goto("/products/women");
  await page.getByLabel("نوع المنتج", { exact: true }).selectOption("chocolate");
  const cardLink = page.locator(`[data-catalog-results] a[href="/products/${slug}"]`).first();
  await cardLink.scrollIntoViewIfNeeded();
  await expect(cardLink).toBeVisible();
  const cardImage = cardLink.locator("img");
  await expect
    .poll(() => cardImage.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
    .toBe(true);
  await cardLink.click();
  await expect(page).toHaveURL(new RegExp(`/products/${slug}$`));
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    `https://elysrmedical.store/products/${slug}`,
  );
  const schema = JSON.parse((await page.locator("script#ldjson-product").textContent())!);
  expect(Number(schema.offers.price)).toBe(200);
  expect(schema.aggregateRating).toBeUndefined();
  await expect(page.getByText("المكونات / التركيبة", { exact: true })).toBeVisible();
  await expect(
    page.getByText("الإبيميديوم (عشبة العنزة)، مستخلص الجينسنغ، كاكاو طبيعي، نكهات طبيعية.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByText(/ليست كل اللحظات الجميلة بحاجة إلى مناسبة/).first()).toBeVisible();
  const hero = page.locator('img[fetchpriority="high"]').first();
  await expect
    .poll(() => hero.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth === 800))
    .toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  await page.goto("/search?q=" + encodeURIComponent("شيكولاتة هيلتى للنساء"));
  await expect(
    page.locator(`[data-search-results] a[href="/products/${slug}"]`).first(),
  ).toBeVisible();
});

test("both HILTI editions retain their 200 EGP prices in the cart", async ({ page }) => {
  for (const slug of ["hilti-bitter-chocolate-man", "hilti-bitter-chocolate-for-women"]) {
    await page.goto(`/products/${slug}`);
    const schema = JSON.parse((await page.locator("script#ldjson-product").textContent())!);
    expect(Number(schema.offers.price)).toBe(200);
    await page.getByRole("button", { name: "إضافة للسلة", exact: true }).click();
  }
  const cart = await page.evaluate(() => JSON.parse(localStorage.getItem("elysr_cart_v3") || "[]"));
  expect(cart).toHaveLength(2);
  expect(cart.map((item: { price: number }) => item.price)).toEqual([200, 200]);
  await page.goto("/cart");
  await expect(
    page.getByText("شوكولاتة هيلتي الداكنة للنساء (HILTI) — 50 جم", { exact: true }).first(),
  ).toBeVisible();
});
