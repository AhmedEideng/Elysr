import { expect, test, type Page } from "@playwright/test";

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
  for (const width of [390, 1440]) {
    test(`${category} catalog displays products without filters at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(`/products/${category}`);
      const results = page.locator("[data-catalog-results]");
      await expect(results).toBeVisible();
      await expect(results.locator('a[href^="/products/"]').first()).toBeVisible();
      await expect(page.locator("[data-catalog-toolbar]")).toHaveCount(0);
      await expect(page.getByLabel("نوع المنتج", { exact: true })).toHaveCount(0);
      await expect(page.getByLabel("ترتيب المنتجات", { exact: true })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "تحديد السعر", exact: true })).toHaveCount(0);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        "href",
        `https://elysrmedical.store/products/${category}`,
      );
      const links = await results
        .locator('a[href^="/products/"]')
        .evaluateAll((els) => els.map((el) => el.getAttribute("href")));
      await page.reload();
      await expect
        .poll(() =>
          results
            .locator('a[href^="/products/"]')
            .evaluateAll((els) => els.map((el) => el.getAttribute("href"))),
        )
        .toEqual(links);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      ).toBe(true);
    });
  }
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
