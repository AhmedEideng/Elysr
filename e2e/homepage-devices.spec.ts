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

test("requested concern products are in the same order before and after React renders", async ({
  page,
  request,
}) => {
  const groups = [
    {
      label: "علاجات التأخير",
      slugs: ["sotara-gel-50gm", "procomil-spray-indian", "emla-7-5-lidocaine-prilocaine-cream"],
    },
    {
      label: "القوة والأداء",
      slugs: [
        "ginseng-1650-capsules",
        "tri-force-30-capsules",
        "powerfully-up-advanced-male-performance-formula",
      ],
    },
    {
      label: "الرغبة والإثارة للنساء",
      slugs: ["provocative-pink-shot-30ml", "beauty-love", "connubial-drops"],
    },
  ];
  const html = await (await request.get("/")).text();
  await page.goto("/");
  for (const group of groups) {
    const rawSection = html.split(`<h3>${group.label}</h3>`)[1]?.split("</ul>")[0];
    expect(rawSection).toBeTruthy();
    const rawSlugs = [
      ...rawSection!.matchAll(/href="https:\/\/elysrmedical\.store\/products\/([^"/]+)"/g),
    ].map((m) => m[1]);
    expect(rawSlugs).toEqual(group.slugs);
    const section = page
      .locator("div.group.rounded-2xl")
      .filter({ has: page.getByRole("heading", { name: group.label, exact: true }) });
    await expect(section).toHaveCount(1);
    const links = section.locator('a[href^="/products/"]');
    const hrefs = await links.evaluateAll((items) =>
      items.map((item) => item.getAttribute("href")),
    );
    expect(
      hrefs.filter((href) => group.slugs.some((slug) => href === `/products/${slug}`)),
    ).toEqual(group.slugs.map((slug) => `/products/${slug}`));
  }
});
