import { expect, test, type Page } from "@playwright/test";
import catalog from "../api/lib/products-db.json" with { type: "json" };

test.beforeEach(async ({ page }) => {
  await page.route("**/gtag/js**", (route) => route.abort());
  await page.route("**/g/collect**", (route) => route.abort());
  await page.addInitScript(() => {
    const w = window as unknown as { dataLayer: unknown[]; gtag: (...args: unknown[]) => void };
    w.dataLayer = [];
    w.gtag = (...args) => w.dataLayer.push(args);
  });
});
async function events(page: Page) {
  return page.evaluate(() => {
    const rows = (window as unknown as { dataLayer: unknown[] }).dataLayer ?? [];
    return rows.flatMap((row) => {
      const value = row as Record<string, unknown>;
      if (value.event) return [value];
      if (value[0] === "event") return [{ event: value[1], ...(value[2] as object) }];
      return [];
    });
  });
}

test("multiword Egyptian search, spelling suggestions and header search agree", async ({
  page,
}) => {
  for (const [query, name] of [
    ["سعر كريفا", "كريفا"],
    ["بينكشوت", "بينك شوت"],
    ["نقط كونيبال", "كونيبال"],
  ]) {
    await page.goto(`/search?q=${encodeURIComponent(query)}`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(query);
    await expect(
      page.locator('[data-search-results] a[href^="/products/"]').first(),
    ).toHaveAttribute("aria-label", new RegExp(name));
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /^noindex,follow(?:,|$)/,
    );
  }
  await page.goto("/search?q=" + encodeURIComponent("كريفو"));
  await expect(page.getByText("هل تقصد أحد هذه الأسماء؟")).toBeVisible();
  await page.getByRole("button", { name: "بحث (Ctrl+K)", exact: true }).click();
  await page.getByRole("textbox", { name: "بحث في المنتجات", exact: true }).fill("سعر كريفا");
  await expect(page.getByRole("listbox")).toContainText("كريفا");
});

for (const category of ["men", "women", "devices"]) {
  test(`${category} filters preserve canonical URL and default order`, async ({ page }) => {
    await page.goto(`/products/${category}`);
    await expect(page.locator("[data-catalog-results]")).toBeVisible();
    const original = await page
      .locator('[data-catalog-results] a[href^="/products/"]')
      .evaluateAll((links) => links.map((a) => a.getAttribute("href")));
    await page.getByLabel("ترتيب المنتجات", { exact: true }).selectOption("price-asc");
    await page.getByLabel("السعر إلى", { exact: true }).fill("1000");
    await expect
      .poll(async () => {
        const text = await page.locator("script#ldjson-itemlist").textContent();
        const list = JSON.parse(text!);
        const prices = list.itemListElement.map(
          (x: { url: string }) => catalog.find((p) => x.url.endsWith(`/products/${p.slug}`))!.price,
        );
        return (
          prices.length > 0 &&
          prices.every(
            (price: number, i: number) => price <= 1000 && (!i || price >= prices[i - 1]),
          )
        );
      })
      .toBe(true);
    await expect(page).toHaveURL(new RegExp(`/products/${category}$`));
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      `https://elysrmedical.store/products/${category}`,
    );
    await page.getByRole("button", { name: "مسح الفلاتر", exact: true }).click();
    await expect
      .poll(() =>
        page
          .locator('[data-catalog-results] a[href^="/products/"]')
          .evaluateAll((links) => links.map((a) => a.getAttribute("href"))),
      )
      .toEqual(original);
  });
}

test("form starts before submit, metrics exclude private fields, and order submission is unchanged", async ({
  page,
}) => {
  let requests = 0;
  await page.route("**/api/submit-order", async (route) => {
    requests++;
    const data = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, orderId: data.orderId }),
    });
  });
  await page.goto("/products/kreva-gel-for-men");
  await page.getByRole("button", { name: "إضافة للسلة", exact: true }).click();
  await page.goto("/cart");
  await page.getByRole("button", { name: /طلب مباشر/ }).click();
  await page.getByPlaceholder("اكتب اسمك هنا").fill("عميل اختبار خاص");
  await expect
    .poll(async () => (await events(page)).filter((e) => e.event === "begin_checkout").length)
    .toBe(1);
  expect(requests).toBe(0);
  await page.getByPlaceholder("01xxxxxxxxx").fill("01012345678");
  await page.locator("select").selectOption("القاهرة");
  await page.getByPlaceholder("المدينة، الشارع، رقم العمارة").fill("عنوان اختبار خاص");
  await page.getByRole("button", { name: /تأكيد الطلب المباشر/ }).click();
  await expect(page).toHaveURL(/\/order-confirmed$/);
  expect(requests).toBe(1);
  const recorded = await events(page);
  expect(recorded.filter((e) => e.event === "begin_checkout")).toHaveLength(1);
  expect(recorded.filter((e) => e.event === "checkout_submit")).toHaveLength(1);
  expect(recorded.find((e) => e.event === "order_request")).toMatchObject({
    request_outcome: "success",
  });
  expect(recorded.find((e) => e.event === "purchase")).toMatchObject({ value: 300, shipping: 50 });
  expect(JSON.stringify(recorded)).not.toMatch(/01012345678|عميل اختبار خاص|عنوان اختبار خاص/);
});

test("mobile filters recover from an empty range without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/products/men");
  await page.getByLabel("نوع المنتج", { exact: true }).selectOption("spray");
  await page.getByLabel("السعر من", { exact: true }).fill("1000");
  await page.getByLabel("السعر إلى", { exact: true }).fill("1");
  await expect(
    page.getByText("لا توجد منتجات ضمن الفلاتر المختارة.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "مسح الفلاتر", exact: true }).click();
  await expect(page.locator("[data-catalog-results]")).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBe(true);
});
