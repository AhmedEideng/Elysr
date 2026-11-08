import { expect, test } from "@playwright/test";

test("homepage replacement devices match static HTML and exclude the breast kit", async ({
  page,
  request,
}) => {
  const slugs = [
    "manual-vacuum-pump-sawft",
    "konsa-electric-pump",
    "digital-electric-vacuum-pump-9-speeds",
  ];
  const html = await (await request.get("/")).text();
  for (const slug of slugs) expect(html).toContain(`/products/${slug}`);
  expect(html).not.toContain("/products/big-bro-breast-enlargement-cup");
  await page.goto("/");
  const section = page
    .locator("div.group.rounded-2xl")
    .filter({ has: page.getByRole("heading", { name: "أجهزة طبية", exact: true }) });
  await expect(section).toHaveCount(1);
  for (const slug of slugs)
    await expect(section.locator(`a[href="/products/${slug}"]`).first()).toBeVisible();
  await page.getByRole("button", { name: "⚡ أجهزة", exact: true }).click();
  await expect(page.locator('a[href="/products/big-bro-breast-enlargement-cup"]')).toHaveCount(0);
  await page.goto("/products/devices");
  await expect(
    page.locator('a[href="/products/big-bro-breast-enlargement-cup"]').first(),
  ).toBeVisible();
});

test("manual pump costs 800 on the page, in schema and in the cart", async ({ page }) => {
  await page.goto("/products/manual-ved-pump");
  await expect(page.locator("script#ldjson-product")).toBeAttached();
  const schema = JSON.parse((await page.locator("script#ldjson-product").textContent())!);
  expect(Number(schema.offers.price)).toBe(800);
  expect(schema.description).toContain("٨٠٠ جنيه");
  await expect(page.getByText("800 ج.م", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "إضافة للسلة", exact: true }).click();
  await page.goto("/cart");
  await expect(page.getByText("800 ج.م", { exact: true }).first()).toBeVisible();
});
