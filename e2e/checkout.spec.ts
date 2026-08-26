import { expect, test } from "@playwright/test";

test("customer can add a product, update quantity, calculate shipping and submit", async ({
  page,
}) => {
  let submittedPayload: Record<string, unknown> | undefined;
  await page.route("**/api/submit-order", async (route) => {
    submittedPayload = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, orderId: submittedPayload.orderId }),
    });
  });

  await page.goto("/products/kreva-gel");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("كريفا");
  await page.getByRole("button", { name: "إضافة للسلة", exact: true }).click();

  await page.goto("/cart");
  await expect(page.getByText("جل كريفا", { exact: false }).first()).toBeVisible();
  await page.getByRole("button", { name: /زيادة كمية جل كريفا/ }).click();

  await page.getByRole("button", { name: /طلب مباشر/ }).click();
  await page.getByPlaceholder("اكتب اسمك هنا").fill("عميل اختبار");
  await page.getByPlaceholder("01xxxxxxxxx").fill("01012345678");
  await page.locator("select").selectOption("القاهرة");
  await page.getByPlaceholder("المدينة، الشارع، رقم العمارة").fill("القاهرة، شارع الاختبار 10");

  await expect(page.getByText("650 ج.م", { exact: true }).last()).toBeVisible();
  await page.getByRole("button", { name: /تأكيد الطلب المباشر/ }).click();

  await expect(page).toHaveURL(/\/order-confirmed$/);
  expect(submittedPayload).toBeTruthy();
  expect((submittedPayload!.items as Array<{ id: string; qty: number }>)[0]).toMatchObject({
    id: "m-60",
    qty: 2,
  });
  expect(submittedPayload).toMatchObject({
    governorate: "القاهرة",
    subtotalBeforeDiscount: 600,
    discount: 0,
    shipping: 50,
    total: 650,
  });
});

test("blocked medicine remains public but carries layered noindex protection", async ({ page }) => {
  // m-34 (Hard-On) was deleted per Merchant report (now 301 → /products/men).
  // The remaining blocked products are m-38/m-43/m-45 — power-36 is the canonical
  // case: still purchasable on-site, but excluded from SEO with layered noindex.
  const path = "/products/power-36-power-control-for-36-hours";
  const response = await page.goto(path);
  expect(response?.status()).toBe(200);
  expect(response?.headers()["x-robots-tag"]).toContain("noindex");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.locator('meta[name="googlebot"]')).toHaveAttribute("content", /noindex/);
  const imageResponse = await page.request.get("/images/power-36-power-control-for-36-hours.webp");
  expect(imageResponse.headers()["x-robots-tag"]).toContain("noimageindex");

  await page.goto("/products/men");
  await expect(page.locator(`a[href="${path}"]`).first()).toBeAttached();
});

test("deleted product legacy URLs 301 to their category section", async ({ baseURL }) => {
  // Deleted pharma (Merchant report) must never 404: m-34 → men, w-17 → women.
  // Use fetch with redirect:"manual" — Playwright's request fixture follows
  // redirects and would mask the 301.

  const menResp = await fetch(`${baseURL}/products/m-34`, { redirect: "manual" });
  expect(menResp.status).toBe(301);
  expect(menResp.headers.get("location")).toBe("/products/men");

  const womenResp = await fetch(`${baseURL}/products/w-17`, { redirect: "manual" });
  expect(womenResp.status).toBe(301);
  expect(womenResp.headers.get("location")).toBe("/products/women");
});

test("unknown routes return a real HTTP 404", async ({ request }) => {
  const response = await request.get("/this-route-does-not-exist");
  expect(response.status()).toBe(404);
  expect(await response.text()).toContain("الصفحة غير موجودة");
});
