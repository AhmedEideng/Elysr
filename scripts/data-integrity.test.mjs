import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createServer } from "vite";

const ROOT = process.cwd();

function duplicates(values) {
  const seen = new Set();
  const dup = new Set();
  for (const value of values) {
    if (seen.has(value)) dup.add(value);
    seen.add(value);
  }
  return [...dup];
}

const vite = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
  optimizeDeps: { noDiscovery: true, include: [] },
  plugins: [],
  logLevel: "silent",
});

try {
  const { products } = await vite.ssrLoadModule("/src/data/products.ts");
  const { articles } = await vite.ssrLoadModule("/src/data/articles.ts");
  const { seoLandingPages } = await vite.ssrLoadModule("/src/data/landing-pages.ts");
  const promo = await vite.ssrLoadModule("/src/lib/promo.ts");
  const vercel = JSON.parse(readFileSync(resolve(ROOT, "vercel.json"), "utf-8"));

  assert.equal(products.length, 87, "Expected 87 products");
  assert.ok(articles.length >= 51, "Expected at least 51 articles");
  assert.ok(
    seoLandingPages.length >= 90,
    `Expected at least 90 SEO landing pages, got ${seoLandingPages.length}`,
  );
  assert.deepEqual(duplicates(products.map((p) => p.id)), [], "Duplicate product IDs");
  assert.deepEqual(duplicates(products.map((p) => p.slug)), [], "Duplicate product slugs");
  assert.deepEqual(duplicates(articles.map((a) => a.slug)), [], "Duplicate article slugs");
  for (const article of articles) {
    assert.ok(article.author?.name, `Missing article author: ${article.slug}`);
    assert.ok(article.reviewer?.name, `Missing article reviewer: ${article.slug}`);
    assert.match(
      article.publishedAt,
      /^\d{4}-\d{2}-\d{2}$/,
      `Invalid publishedAt: ${article.slug}`,
    );
    assert.match(article.updatedAt, /^\d{4}-\d{2}-\d{2}$/, `Invalid updatedAt: ${article.slug}`);
    assert.ok(article.sources.length >= 2, `Article needs at least 2 sources: ${article.slug}`);
    for (const source of article.sources) {
      assert.match(source.url, /^https:\/\//, `Article source must be https: ${article.slug}`);
      assert.ok(source.title && source.publisher, `Incomplete source: ${article.slug}`);
    }
  }
  assert.deepEqual(
    duplicates(seoLandingPages.map((page) => page.slug)),
    [],
    "Duplicate landing page slugs",
  );

  const categories = products.reduce((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + 1;
    return acc;
  }, {});
  assert.deepEqual(categories, { men: 56, women: 24, devices: 7 }, "Unexpected category split");

  for (const product of products) {
    assert.match(product.slug, /^[a-z0-9-]+$/, `Invalid slug: ${product.id}`);
    assert.ok(product.price > 0, `Invalid price: ${product.id}`);
    assert.ok(product.stock >= 0, `Invalid stock: ${product.id}`);
    assert.ok(product.rating >= 0 && product.rating <= 5, `Invalid rating: ${product.id}`);
    assert.ok(product.description.length >= 80, `Short description: ${product.id}`);
    assert.ok(product.benefits.length >= 3, `Too few benefits: ${product.id}`);

    const expectedPrefix =
      product.category === "men" ? "m-" : product.category === "women" ? "w-" : "d-";
    assert.ok(product.id.startsWith(expectedPrefix), `ID/category prefix mismatch: ${product.id}`);

    if (product.image) {
      const imagePath = resolve(ROOT, "public", product.image.replace(/^\//, "").split("?")[0]);
      const thumbPath = resolve(
        ROOT,
        "public/images/thumbs",
        product.image.split("/").pop().split("?")[0],
      );
      assert.ok(existsSync(imagePath), `Missing image: ${product.id} ${product.image}`);
      assert.ok(existsSync(thumbPath), `Missing thumbnail: ${product.id} ${product.image}`);

      // Images now use slug-based names, no prefix check needed
      assert.ok(
        product.image.split("/").pop().split("?")[0].endsWith(".webp"),
        `Image must be .webp: ${product.id} ${product.image}`,
      );
    }
  }

  const productIds = new Set(products.map((p) => p.id));
  for (const page of seoLandingPages) {
    assert.match(page.slug, /^[a-z0-9-]+$/, `Invalid landing page slug: ${page.slug}`);
    assert.ok(page.title.length >= 8, `Landing page title too short: ${page.slug}`);
    assert.ok(
      page.metaDescription.length >= 50,
      `Landing meta description too short: ${page.slug}`,
    );
    assert.ok(page.sections.length >= 2, `Landing page needs at least 2 sections: ${page.slug}`);
    assert.ok(page.faqs.length >= 1, `Landing page needs at least 1 FAQ: ${page.slug}`);
    for (const id of page.productIds) {
      assert.ok(productIds.has(id), `Landing page ${page.slug} references missing product ${id}`);
    }
  }

  const redirectBySource = new Map(vercel.redirects.map((r) => [r.source, r]));
  for (const product of products) {
    const redirect = redirectBySource.get(`/products/${product.id}`);
    assert.ok(redirect, `Missing redirect for ${product.id}`);
    assert.equal(
      redirect.destination,
      `/products/${product.slug}`,
      `Wrong redirect for ${product.id}`,
    );
    assert.equal(redirect.permanent, true, `Redirect should be permanent for ${product.id}`);
  }
  assert.equal(
    redirectBySource.get("/index.html")?.destination,
    "/",
    "Missing /index.html redirect",
  );
  assert.equal(redirectBySource.get("/index")?.destination, "/", "Missing /index redirect");
  const sitemap = readFileSync(resolve(ROOT, "public/sitemap.xml"), "utf-8");
  for (const blockedPath of ["/cart", "/thank-you", "/order-confirmed"]) {
    assert.equal(sitemap.includes(`<loc>https://elysrmedical.store${blockedPath}</loc>`), false);
  }
  for (const product of products) {
    assert.equal(
      sitemap.includes(`<loc>https://elysrmedical.store/products/${product.id}</loc>`),
      false,
      `Sitemap contains legacy product ID URL: ${product.id}`,
    );
  }
  for (const page of seoLandingPages) {
    if (page.noindex) continue; // صفحات noindex مستبعدة من sitemap عمداً
    assert.ok(
      sitemap.includes(`<loc>https://elysrmedical.store/products/guides/${page.slug}</loc>`),
      `Sitemap missing landing page: ${page.slug}`,
    );
  }

  assert.equal(promo.calcDiscount(999, new Date("2026-06-01T12:00:00Z")), 0);
  assert.equal(promo.calcDiscount(1000, new Date("2026-06-01T12:00:00Z")), 150);
  assert.equal(promo.calcDiscount(1500, new Date("2026-06-01T12:00:00Z")), 300);
  assert.equal(promo.calcDiscount(2000, new Date("2026-06-01T12:00:00Z")), 500);
  assert.equal(promo.isPromoActive(new Date("2026-06-26T00:00:00Z")), true);
  assert.equal(promo.isPromoActive(new Date("2027-01-02T00:00:00Z")), true);

  // 🧪 Smart Dynamic recommendations integrity test
  const { getProductsForArticle } = await vite.ssrLoadModule("/src/lib/internal-links.ts");

  // 👩 Test women's article smart dynamic recommendation:
  const womenProductIds = getProductsForArticle("omega-3-omega-6-benefits-skin-cell-elasticity");
  assert.equal(
    womenProductIds.length,
    6,
    "Expected exactly 6 product recommendations for women's article",
  );
  assert.deepEqual(
    duplicates(womenProductIds),
    [],
    "No duplicate recommendations allowed in women's article",
  );
  for (const id of womenProductIds) {
    const product = products.find((p) => p.id === id);
    assert.ok(product, `Recommended missing product ID ${id}`);
    assert.equal(
      product.category,
      "women",
      `Women's article recommended a non-women product ${id} (${product.category})`,
    );
  }

  // 👨 Test men's article smart dynamic recommendation:
  const menProductIds = getProductsForArticle("peruvian-maca-root-energy-vitality-men-women");
  assert.equal(
    menProductIds.length,
    6,
    "Expected exactly 6 product recommendations for men's article",
  );
  assert.deepEqual(
    duplicates(menProductIds),
    [],
    "No duplicate recommendations allowed in men's article",
  );
  for (const id of menProductIds) {
    const product = products.find((p) => p.id === id);
    assert.ok(product, `Recommended missing product ID ${id}`);
    assert.equal(
      product.category,
      "men",
      `Men's article recommended a non-men product ${id} (${product.category})`,
    );
  }

  console.log("✓ data integrity tests passed");
} finally {
  await vite.close();
}
