import { expect, test } from "@playwright/test";

const path = "/products/kreva-gel-for-men";
const historicalMeta =
  "جل كريفا الألماني المتطور للرجال (Kreva Gel 50GM) هو تركيبة جل كريمي متخصصة ثنائية المفعول (ساخن وبارد) مصممة بعناية لدعم الأداء الذكوري والتحكم الكامل في…";

for (const width of [390, 1280]) {
  test(`Kreva August restoration stays consistent after refresh at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const reviewsRequests: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/api/reviews?product=m-60")) reviewsRequests.push(request.url());
    });
    await page.goto(path);
    for (let pass = 0; pass < 2; pass++) {
      if (pass) await page.reload();
      await expect(page.locator("script#ldjson-product")).toBeAttached();
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        "جل كريفا الألماني المتطور للرجال (50 جم)",
      );
      await expect(page.locator('meta[name="description"]')).toHaveAttribute(
        "content",
        historicalMeta,
      );
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        "href",
        "https://elysrmedical.store/products/kreva-gel-for-men",
      );
      const schema = JSON.parse((await page.locator("script#ldjson-product").textContent())!);
      expect(Number(schema.offers.price)).toBe(250);
      expect(schema.offers.availability).toBe("https://schema.org/InStock");
      expect(schema.aggregateRating).toBeUndefined();
      expect(schema.review).toBeUndefined();
      expect(schema.description).toContain("هو تركيبة جل كريمي متخصصة ثنائية المفعول");
      await expect(page.getByText(/اتركه لمدة 15 إلى 20 دقيقة/)).toBeVisible();
      await expect(page.getByRole("heading", { name: "شاركنا تجربتك" })).toHaveCount(0);
      await expect(page.getByRole("heading", { name: "تجارب عملاء حقيقية" })).toHaveCount(0);
      expect(reviewsRequests).toHaveLength(0);
    }
  });
}
