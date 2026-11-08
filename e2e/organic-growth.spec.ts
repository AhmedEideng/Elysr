import { expect, test } from "@playwright/test";

test("pump comparison selections match initial HTML and the hydrated page", async ({
  page,
  request,
}) => {
  const path = "/products/guides/manual-vs-electric-vacuum-pump";
  const slugs = [
    "manual-ved-pump",
    "manual-vacuum-pump-sawft",
    "konsa-electric-pump",
    "digital-electric-vacuum-pump-9-speeds",
    "digital-vacuum-pump",
    "power-ved-kit-with-k-y-jelly",
  ];
  const html = await (await request.get(path)).text();
  const selected = html.split("<h2>منتجات مختارة مرتبطة بالبحث</h2><ul>")[1]?.split("</ul>")[0];
  expect(selected).toBeTruthy();
  const rawSlugs = [
    ...selected!.matchAll(/href="https:\/\/elysrmedical\.store\/products\/([^"/]+)"/g),
  ].map((m) => m[1]);
  expect(rawSlugs).toEqual(slugs);
  await page.goto(path);
  const section = page.locator("section").filter({
    has: page.getByRole("heading", { name: "منتجات مختارة مرتبطة بالبحث", exact: true }),
  });
  await expect(section).toHaveCount(1);
  for (const slug of slugs)
    await expect(section.locator(`a[href="/products/${slug}"]`).first()).toBeVisible();
  await expect(section.locator('a[href="/products/big-bro-breast-enlargement-cup"]')).toHaveCount(
    0,
  );
});

test("price guides include the new products before and after hydration", async ({
  page,
  request,
}) => {
  for (const [category, slugs] of [
    [
      "men",
      ["tri-force-30-capsules", "overtime-erection-delay", "cialis-tadalafil-20mg-4-tablets"],
    ],
    ["women", ["provocative-pink-shot-30ml"]],
  ] as const) {
    const path = `/products/guides/${category}-products-prices-egypt`;
    const html = await (await request.get(path)).text();
    for (const slug of slugs) expect(html).toContain(`/products/${slug}`);
    await page.goto(path);
    await expect(page.locator("script#ldjson-itemlist")).toBeAttached();
    for (const slug of slugs)
      await expect(page.locator(`a[href="/products/${slug}"]`).first()).toBeVisible();
  }
});

test("editorial transparency is crawlable and remains in the footer", async ({ page, request }) => {
  const html = await (await request.get("/")).text();
  expect(html).toContain('href="/medical-review-board"');
  await page.goto("/");
  await expect(page.locator('footer a[href="/medical-review-board"]')).toBeVisible();
  await page.locator('footer a[href="/medical-review-board"]').click();
  await expect(
    page.getByRole("heading", { name: "من يكتب المحتوى وكيف نتحقق منه", exact: true }),
  ).toBeVisible();
});
