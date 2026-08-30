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

test("education index serves 200 directly and slashed form 301s to it (Vercel parity)", async ({
  baseURL,
}) => {
  // Vercel (trailingSlash:false) serves /education directly and 308s the
  // slashed form. Self-hosted must match: no inverted slash redirect.
  const direct = await fetch(`${baseURL}/education`, { redirect: "manual" });
  expect(direct.status).toBe(200);
  const slashed = await fetch(`${baseURL}/education/`, { redirect: "manual" });
  expect(slashed.status).toBe(301);
  expect(slashed.headers.get("location")).toBe("/education");
});

test("category URL search ?q filters products", async ({ page }) => {
  await page.goto("/products/men?q=كريفا");
  await expect(page.getByText("نتائج البحث عن: «كريفا»")).toBeVisible();
  await expect(page.getByRole("link", { name: /جل كريفا/ }).first()).toBeVisible();
  // a non-matching product must be filtered out of the grid
  expect(await page.getByRole("link", { name: /هامر أوف ثور/ }).count()).toBe(0);
  // clearing the search restores the full grid
  await page.getByRole("link", { name: "مسح البحث" }).click();
  await expect(page.getByRole("link", { name: /هامر أوف ثور/ }).first()).toBeVisible();
  expect(await page.getByText(/نتائج البحث عن/).count()).toBe(0);
});

test("global search /search?q= filters products across all categories (SearchAction target)", async ({
  page,
}) => {
  // The home JSON-LD SearchAction + sitemap search template target
  // /search?q={search_term_string}
  await page.goto("/search?q=هامر");
  await expect(page.getByRole("heading", { name: "نتائج البحث عن: «هامر»" })).toBeVisible();
  await expect(page.getByRole("link", { name: /هامر أوف ثور/ }).first()).toBeVisible();
  // a women's product must not appear in the results
  expect(await page.getByRole("link", { name: /ليدي إيرا/ }).count()).toBe(0);
  // clearing the search restores the full catalog grid
  await page.getByRole("link", { name: "مسح البحث" }).click();
  await expect(page.getByRole("link", { name: /هامر أوف ثور/ }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /ليدي إيرا/ }).first()).toBeVisible();
  expect(await page.getByText(/نتائج البحث عن/).count()).toBe(0);
});

test("global search /search?q= shows empty state with category links", async ({ page }) => {
  await page.goto("/search?q=zzzz-not-a-real-product-12345");
  await expect(page.getByText(/لا توجد منتجات مطابقة/)).toBeVisible();
  await expect(page.getByRole("link", { name: "منتجات رجالي" })).toBeVisible();
  await expect(page.getByRole("link", { name: "منتجات نساء" })).toBeVisible();
  // exact: الهيدر/الفوتر فيه روابط "الأجهزة الطبية" لمسار /products/devices
  await expect(page.getByRole("link", { name: "الأجهزة", exact: true })).toBeVisible();
});

test("live customer reviews section renders approved reviews from the API", async ({
  page,
}) => {
  await page.route("**/api/reviews*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        reviews: [
          {
            name: "محمد",
            rating: 5,
            date: "1/8/2026",
            text: "تجربة ممتازة والتغليف سري تماماً وصلني خلال يومين.",
            verified: true,
          },
        ],
        count: 1,
      }),
    }),
  );
  await page.goto("/products/hammer-of-thor-capsules");
  await expect(page.getByText("تجارب حقيقية من عملائنا")).toBeVisible();
  await expect(page.getByText(/تجربة ممتازة والتغليف سري/)).toBeVisible();
  // "مشتري مؤكد" موجود أيضاً في قسم التقييمات القديم → نحدد القسم الجديد بالاسم
  const liveSection = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "تجارب حقيقية من عملائنا" }) });
  await expect(liveSection.getByText("مشتري مؤكد")).toBeVisible();
  await expect(page.getByText(/بناءً على 1 مراجعة حقيقية معتمدة/)).toBeVisible();
});

test("reviews section hides the list when no approved reviews but keeps the form", async ({
  page,
}) => {
  await page.route("**/api/reviews*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ reviews: [], count: 0 }),
    }),
  );
  await page.goto("/products/hammer-of-thor-capsules");
  // النموذج متاح دائماً، لكن لا قائمة ولا متوسط بلا مراجعات معتمدة
  // (نستخدم نص فريد لقسمنا — "بناءً على" يظهر أيضاً في قسم التقييمات القديم)
  await expect(page.getByText("شارك تجربتك مع هذا المنتج")).toBeVisible();
  await expect(page.getByText(/مراجعة حقيقية معتمدة/)).toHaveCount(0);
});

test("customer review submission shows the pending-moderation confirmation", async ({
  page,
}) => {
  await page.route("**/api/reviews*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ reviews: [], count: 0 }),
    }),
  );
  const submittedBodies: string[] = [];
  await page.route("**/api/submit-review", (route) => {
    submittedBodies.push(route.request().postData() ?? "");
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, status: "pending" }),
    });
  });
  await page.goto("/products/hammer-of-thor-capsules");
  await page.getByText("شارك تجربتك مع هذا المنتج").scrollIntoViewIfNeeded();

  await page.getByRole("radio", { name: "4 من 5 نجوم" }).click();
  await page.getByPlaceholder("اسمك (اختياري — يظهر مع مراجعتك)").fill("عميل اختبار");
  await page.getByPlaceholder("01xxxxxxxxx").fill("01012345678");
  await page
    .getByPlaceholder(/اكتب تجربتك الصادقة/)
    .fill("منتج ممتاز، وصلتني النتيجة اللي كنت متوقعها والتغليف سري تماماً.");
  await page.getByRole("button", { name: "إرسال مراجعتي" }).click();

  await expect(page.getByText(/قيد المراجعة/)).toBeVisible();

  // الـ payload: productId فقط — اسم المنتج يحدده السيرفر من الكتالوج المعتمد
  const sent = JSON.parse(submittedBodies[0]);
  expect(sent.productId).toBe("m-01");
  expect(sent.rating).toBe(4);
  expect(sent.reviewerName).toBe("عميل اختبار");
  expect(sent.reviewerPhone).toBe("01012345678");
  expect(sent).not.toHaveProperty("productName");
});

test("header live search links to the full /search results page", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "بحث (Ctrl+K)" }).click();
  const input = page.getByLabel("بحث في المنتجات");
  await input.fill("عسل");
  // dropdown يعرض اقتراحات + زر "عرض كل النتائج" بعداد حقيقي
  const allBtn = page.getByRole("button", { name: /عرض كل النتائج في صفحة البحث \(\d+\)/ });
  await expect(allBtn).toBeVisible();
  await allBtn.click();
  await expect(page).toHaveURL(/\/search\?q=/);
  await expect(page.getByRole("heading", { name: "نتائج البحث عن: «عسل»" })).toBeVisible();
});

test("bundle button works once: second click goes to cart (no duplicate add)", async ({ page }) => {
  await page.route("**/api/submit-order", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true }),
    });
  });

  await page.goto("/products/hammer-of-thor-capsules");
  const addBtn = page.getByRole("button", { name: /أضف الباقة للسلة/ });
  await expect(addBtn).toBeVisible();

  // أول ضغط: إضافة واحدة فقط
  await addBtn.click();
  const addedBtn = page.getByRole("button", { name: /تمت الإضافة — اطلع على السلة/ });
  await expect(addedBtn).toBeVisible();

  // الزر لازم يفضل في حالة "مضاف" (ما يرجعش لـ"أضف" بعد 3 ثوانٍ زي ما كان)
  await page.waitForTimeout(3500);
  await expect(addedBtn).toBeVisible();
  await expect(page.getByRole("button", { name: /أضف الباقة للسلة/ })).toHaveCount(0);

  // الضغط التاني: ينتقل للسلة من غير ما يضيف نسخة ثانية
  await addedBtn.click();
  await expect(page).toHaveURL(/\/cart$/);

  // كل منتجات الباقة بكمية 1 بالضبط: اسم هيمر أوف ثور يظهر مرة واحدة
  // كبطاقة في السلة (لو الضغط التاني كان أضاف نسخة، هيبقى مرتين)
  await expect(page.getByText("هامر أوف ثور", { exact: false })).toHaveCount(1);
});

test("unknown routes return a real HTTP 404", async ({ request }) => {
  const response = await request.get("/this-route-does-not-exist");
  expect(response.status()).toBe(404);
  expect(await response.text()).toContain("الصفحة غير موجودة");
});

test("failed direct order keeps the cart (no silent order loss)", async ({ page }) => {
  let attempt = 0;
  await page.route("**/api/submit-order", async (route) => {
    attempt++;
    if (attempt === 1) {
      // First attempt: sheet is down (502)
      await route.fulfill({
        status: 502,
        contentType: "application/json",
        body: JSON.stringify({ error: "sheet down" }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    }
  });

  await page.goto("/products/kreva-gel");
  await page.getByRole("button", { name: "إضافة للسلة", exact: true }).click();
  await page.goto("/cart");
  await page.getByRole("button", { name: /طلب مباشر/ }).click();
  await page.getByPlaceholder("اكتب اسمك هنا").fill("عميل فشل");
  await page.getByPlaceholder("01xxxxxxxxx").fill("01012345678");
  await page.locator("select").selectOption("القاهرة");
  await page.getByPlaceholder("المدينة، الشارع، رقم العمارة").fill("اختبار الفشل 1");
  await page.getByRole("button", { name: /تأكيد الطلب المباشر/ }).click();

  // Visible error + fallback channel, and the cart must NOT be lost
  // Lenient window: the error toast depends on an unawaited fetch + render;
  // slow CI runners need more headroom than the 5s default.
  await expect(page.getByText(/تعذر تسجيل طلبك/)).toBeVisible({ timeout: 10_000 });

  // Simulate leaving to WhatsApp (tab hidden) and coming back (visible):
  // any toast that survived the suspension is stale and must be dismissed
  // immediately by ToastCleanupOnVisible (this toast lives 10s, so only
  // the guard can make it disappear this fast).
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange"));
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.getByText(/تعذر تسجيل طلبك/)).toBeHidden({ timeout: 4_000 });

  await page.goto("/cart");
  await expect(page.getByText("جل كريفا", { exact: false })).toBeVisible();

  // Second attempt succeeds -> cart is cleared
  // (governorate is form state — it resets on navigation, so re-select it)
  await page.getByRole("button", { name: /طلب مباشر/ }).click();
  await page.getByPlaceholder("اكتب اسمك هنا").fill("عميل فشل");
  await page.getByPlaceholder("01xxxxxxxxx").fill("01012345678");
  await page.locator("select").selectOption("القاهرة");
  await page.getByPlaceholder("المدينة، الشارع، رقم العمارة").fill("اختبار الفشل 2");
  await page.getByRole("button", { name: /تأكيد الطلب المباشر/ }).click();
  await page.waitForTimeout(1500);
  expect(attempt).toBe(2);
});

test("complete bundle applies the real 20% bundle discount (exclusive with tier) in cart and payload", async ({
  page,
}) => {
  let submittedPayload: Record<string, unknown> | undefined;
  await page.route("**/api/submit-order", async (route) => {
    submittedPayload = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, orderId: submittedPayload?.orderId }),
    });
  });

  // باقة m-01 (هامر أوف ثور) = [m-01: 590, m-44: 580, m-20: 200] → 1370
  // خصم الباقة = 20% من 1370 = 274 — وخصم شريحة الماسة (15% = 206)
  // موقوف لهذا الطلب: الخصمان متبادلا الاستبعاد، الباقة هي الخصم الوحيد
  await page.goto("/products/hammer-of-thor-capsules");
  await page.getByRole("button", { name: /أضف الباقة للسلة/ }).click();
  await page.waitForTimeout(1000);

  await page.goto("/cart");
  await expect(page.getByText("خصم الباقة المكتملة (20%)")).toBeVisible();
  await expect(page.getByText("-274 ج.م")).toBeVisible();
  // خصم الشرائح يجب ألا يظهر (موقوف بسبب الباقة)
  await expect(page.getByText(/خصم 15%/)).toHaveCount(0);

  await page.getByRole("button", { name: /طلب مباشر/ }).click();
  await page.getByPlaceholder("اكتب اسمك هنا").fill("عميل باقة");
  await page.getByPlaceholder("01xxxxxxxxx").fill("01012345678");
  await page.locator("select").selectOption("القاهرة");
  await page.getByPlaceholder("المدينة، الشارع، رقم العمارة").fill("اختبار الباقة 1");
  await page.getByRole("button", { name: /تأكيد الطلب المباشر/ }).click();
  await expect(page).toHaveURL(/\/order-confirmed$/);

  expect(submittedPayload).toBeTruthy();
  expect(submittedPayload).toMatchObject({
    subtotalBeforeDiscount: 1370,
    discount: 0, // شريحة 15% موقوف — الباقة هي الخصم الوحيد
    bundleDiscount: 274, // خصم الباقة 20%
    subtotal: 1096,
    shipping: 50,
    total: 1146,
  });
});
