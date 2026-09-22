import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
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
  const {
    products,
    getFeaturedProducts,
    getProductsByCategory,
    HOMEPAGE_EXCLUDED_PRODUCT_IDS,
    HOMEPAGE_CONCERN_CANDIDATES,
    getOralSolidForm,
    getBundlePresentation,
    getBundleProductType,
  } = await vite.ssrLoadModule("/src/data/products.ts");
  const { articles } = await vite.ssrLoadModule("/src/data/articles.ts");
  const { seoLandingPages } = await vite.ssrLoadModule("/src/data/landing-pages.ts");
  const promo = await vite.ssrLoadModule("/src/lib/promo.ts");
  const bundle = await vite.ssrLoadModule("/src/lib/bundle-discount.ts");
  const siteConfig = await vite.ssrLoadModule("/src/lib/site-config.ts");
  const vercel = JSON.parse(readFileSync(resolve(ROOT, "vercel.json"), "utf-8"));
  const dockerfile = readFileSync(resolve(ROOT, "Dockerfile"), "utf-8");
  assert.match(
    dockerfile,
    /COPY --from=build \/app\/config \.\/config/,
    "Docker runtime must include config/ because server/index.js imports security-headers.mjs",
  );
  assert.match(
    dockerfile,
    /COPY --from=build \/app\/vercel\.json \.\/vercel\.json/,
    "Docker runtime must include vercel.json for self-hosted redirect parity",
  );
  const productsDb = JSON.parse(readFileSync(resolve(ROOT, "api/lib/products-db.json"), "utf-8"));
  const configDb = JSON.parse(readFileSync(resolve(ROOT, "api/lib/config-db.json"), "utf-8"));
  const cacheConfig = JSON.parse(readFileSync(resolve(ROOT, "config/cache-version.json"), "utf-8"));
  const cacheModule = await vite.ssrLoadModule("/src/lib/cache.ts");
  assert.equal(cacheModule.CACHE_VERSION, cacheConfig.version, "Cache version source mismatch");
  // (2026-09-15) package.json ↔ package-lock.json لازم يفضلوا متزامنين —
  // كان الـ release script بيهمل الـ lock فتجمع drift لـ 5 releases.
  {
    const pkg = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf-8"));
    const lock = JSON.parse(readFileSync(resolve(ROOT, "package-lock.json"), "utf-8"));
    assert.equal(
      lock.version,
      pkg.version,
      `package-lock.json version ${lock.version} != package.json ${pkg.version} (run: npm install or a release)`,
    );
    assert.equal(
      lock.packages?.[""]?.version,
      pkg.version,
      `package-lock.json root package version ${lock.packages?.[""]?.version} != package.json ${pkg.version}`,
    );
  }
  for (const script of ["scripts/prerender-seo.mjs", "scripts/generate-sitemap.mjs"]) {
    const content = readFileSync(resolve(ROOT, script), "utf-8");
    assert.doesNotMatch(
      content,
      /CACHE_VERSION\s*=\s*"\d+"/,
      `Duplicate cache version in ${script}`,
    );
  }

  assert.deepEqual(productsDb, products, "products-db.json is stale; run npm run build");
  // config-db.json = artifact للسيرفر (مش مصدر): الشحن/العروض/نسبة الباقة
  // مولّد من مصادر TS وقت البناء (SSOT = TS).
  // لو حد عدّل الـ JSON يدويًا، هيفشل الـ test هنا حتى يعمل build.
  assert.deepEqual(
    configDb,
    {
      GOVERNORATE_SHIPPING: siteConfig.GOVERNORATE_SHIPPING,
      FREE_SHIPPING_THRESHOLD: siteConfig.FREE_SHIPPING_THRESHOLD,
      PROMO_TIERS: promo.PROMO_TIERS,
      BUNDLE_DISCOUNT_RATE: bundle.BUNDLE_DISCOUNT_RATE,
    },
    "config-db.json is stale; run npm run build",
  );
  // slugs دوائية للمنتجات المحذوفة فقط لازم يفضل عندها 301 قائم دائماً
  // (نفس قائمة DELETED_PHARMA_FILES في scripts/validate-schemas.mjs).
  const deletedPharmaSlugs = [
    "vegal-extra-sildenafil-130mg-cobra", // m-36
    "levitra-100mg", // m-47
    "procomil-fort-tablet", // m-43 (حذف نهائي 2026-09-07)
    "black-widow-drops", // w-24 (حذف نهائي 2026-09-07)
  ];
  for (const slug of deletedPharmaSlugs) {
    assert.ok(
      vercel.redirects.some((r) => r.source === `/products/${slug}` && r.permanent === true),
      `Deleted pharma product missing 301 redirect in vercel.json: ${slug}`,
    );
  }

  // 🖼️ Anti-drift: مفيش أي ملف صور (full/thumbs/thumbs-180) لمنتج محذوف.
  // الصور بتترجع للكتالوج بـ optimize-images.mjs من أسماء الـ slugs، فلو أي
  // slug محذوف رجع يلاقي اسم صورته هنا = الدرفت رجعت. بنفشل الفوراً.
  for (const imgDir of ["public/images", "public/images/thumbs", "public/images/thumbs-180"]) {
    const dir = resolve(ROOT, imgDir);
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir)) {
      const stem = file.replace(/\.[^.]+$/, "");
      const leaked = deletedPharmaSlugs.find((slug) => stem.startsWith(slug));
      assert.ok(
        !leaked,
        `Deleted product image still on disk: ${imgDir}/${file} (matches deleted slug "${leaked}") — remove it`,
      );
    }
  }

  assert.equal(
    products.length,
    84,
    "Expected 84 products (five previously deleted products restored; four deleted products remain)",
  );
  assert.ok(articles.length >= 51, "Expected at least 51 articles");
  // 🧭 Anti-drift: أرقام الكتالوج/المحتوى hardcoded في نصوص التسويق = درفت
  // حتمي مع أي تغيير في الكتالوج أو المقالات. الـ UI لازم يقرأ الـ counts
  // ديناميكياً (products.length / articles.length / seoLandingPages.length).
  // (محفوظات: "51 مقالة"، "108 دليل SEO"، "56/24 منتج"، "87 منتجاً" — كله اتصحح 2026-09-06)
  for (const file of [
    "src/routes/about.tsx",
    "src/routes/medical-review-board.tsx",
    "src/data/landing-pages.ts",
    "src/routes/wishlist.tsx",
    "src/components/sections/ArticlesGrid.tsx",
    "src/routes/education.tsx",
  ]) {
    const content = readFileSync(resolve(ROOT, file), "utf-8");
    assert.doesNotMatch(
      content,
      /\b\d{1,3}\s*مقال(ة)?\b/,
      `${file} contains a hardcoded article count — use ARTICLE_COUNT/articles.length (drift risk)`,
    );
    assert.doesNotMatch(
      content,
      /\b\d{1,3}\s*دليل SEO/,
      `${file} contains a hardcoded SEO-guide count — use seoLandingPages.length (drift risk)`,
    );
    assert.doesNotMatch(
      content,
      /\bأكثر من \d{1,3}\s*منتج/,
      `${file} contains a hardcoded "more than N products" claim — use products.length (drift risk)`,
    );
  }
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
  // ── Drift guard: بطاقات الـ homepage المولّدة (articles-cards.generated.ts) ──
  // لازم تطابق المصدر (articles.ts) حقاً — لو قديمة → البناء مولّد قبل تعديلك.
  assert.ok(
    existsSync(resolve(ROOT, "src/data/articles-cards.generated.ts")),
    "src/data/articles-cards.generated.ts missing; run npm run build",
  );
  const cards = await vite.ssrLoadModule("/src/data/articles-cards.generated.ts");
  assert.equal(
    cards.ARTICLE_COUNT,
    articles.length,
    "articles-cards.generated.ts ARTICLE_COUNT stale; run npm run build",
  );
  assert.ok(
    Array.isArray(cards.featuredArticleCards) && cards.featuredArticleCards.length >= 1,
    "featuredArticleCards missing/empty; run npm run build",
  );
  for (const card of cards.featuredArticleCards) {
    const src = articles.find((a) => a.slug === card.slug);
    assert.ok(src, `featured card ${card.slug} not found in articles.ts`);
    assert.equal(src.title, card.title, `featured card ${card.slug} title stale`);
    assert.equal(src.excerpt, card.excerpt, `featured card ${card.slug} excerpt stale`);
    assert.equal(src.category, card.category, `featured card ${card.slug} category stale`);
    assert.equal(src.readMin, card.readMin, `featured card ${card.slug} readMin stale`);
    assert.equal(src.emoji, card.emoji, `featured card ${card.slug} emoji stale`);
    assert.equal(src.image ?? undefined, card.image, `featured card ${card.slug} image stale`);
  }
  // ── Drift guard: meta + body المولّدين (فصل content عن القوائم) ──
  assert.ok(
    existsSync(resolve(ROOT, "src/data/articles-meta.generated.ts")),
    "src/data/articles-meta.generated.ts missing; run npm run build",
  );
  assert.ok(
    existsSync(resolve(ROOT, "src/data/article-content.generated.ts")),
    "src/data/article-content.generated.ts missing; run npm run build",
  );
  const meta = await vite.ssrLoadModule("/src/data/articles-meta.generated.ts");
  const body = await vite.ssrLoadModule("/src/data/article-content.generated.ts");
  assert.equal(
    meta.articlesMeta.length,
    articles.length,
    "articlesMeta count stale; run npm run build",
  );
  const metaBySlug = new Map(meta.articlesMeta.map((m) => [m.slug, m]));
  const bodyBySlug = new Map(Object.entries(body.articleBodies));
  for (const a of articles) {
    const m = metaBySlug.get(a.slug);
    const b = bodyBySlug.get(a.slug);
    assert.ok(m, `meta ${a.slug} missing in generated meta`);
    assert.ok(b, `body ${a.slug} missing in generated content`);
    for (const f of [
      "title",
      "excerpt",
      "category",
      "readMin",
      "emoji",
      "publishedAt",
      "updatedAt",
    ]) {
      assert.deepEqual(m[f], a[f], `meta ${a.slug}.${f} stale; run npm run build`);
    }
    assert.equal(m.image ?? undefined, a.image, `meta ${a.slug}.image stale`);
    assert.deepEqual(m.author, a.author, `meta ${a.slug}.author stale`);
    assert.deepEqual(m.reviewer, a.reviewer, `meta ${a.slug}.reviewer stale`);
    assert.equal(m.autoReviewed ?? undefined, a.autoReviewed, `meta ${a.slug}.autoReviewed stale`);
    assert.equal(b.content, a.content, `body ${a.slug}.content stale; run npm run build`);
    assert.deepEqual(b.sources, a.sources, `body ${a.slug}.sources stale; run npm run build`);
  }
  assert.equal(bodyBySlug.size, articles.length, "articleBodies has extra/unknown slugs");

  // ── Topic Authority: assignments لازم تطابق الكاتالوج الحقيقي (2026-09-17) ──
  // أي slug/ID مش موجود (rename/delete) أو pillar غير موجود = فشل فورًا
  // بدل ما الروابط تيبقى مكسورة في الـ bundles والـ static HTML.
  {
    const topicsMod = await vite.ssrLoadModule("/src/data/topics.ts");
    const { TOPICS, pillarPath } = topicsMod;
    assert.ok(Array.isArray(TOPICS) && TOPICS.length >= 5, "TOPICS missing/empty");
    const articleSlugs = new Set(articles.map((a) => a.slug));
    const guideSlugs = new Map(seoLandingPages.map((p) => [p.slug, p]));
    const productIds = new Set(products.map((p) => p.id));
    const seenArticle = new Set();
    const seenGuide = new Set();
    const seenProduct = new Set();
    for (const t of TOPICS) {
      // pillar موجود فعليًا (مقال أو دليل)
      if (t.pillarKind === "article") {
        assert.ok(
          articleSlugs.has(t.pillarSlug),
          `topic ${t.id}: pillar article "${t.pillarSlug}" not in articles.ts`,
        );
      } else {
        const g = guideSlugs.get(t.pillarSlug);
        assert.ok(g, `topic ${t.id}: pillar guide "${t.pillarSlug}" not in landing-pages`);
        assert.ok(!g.noindex, `topic ${t.id}: pillar guide "${t.pillarSlug}" is noindex`);
      }
      // كل membership موجود فعليًا
      for (const s of t.articleSlugs) {
        assert.ok(articleSlugs.has(s), `topic ${t.id}: unknown article "${s}"`);
        assert.ok(!seenArticle.has(s), `article "${s}" assigned to two topics`);
        seenArticle.add(s);
      }
      for (const s of t.guideSlugs) {
        assert.ok(guideSlugs.has(s), `topic ${t.id}: unknown guide "${s}"`);
        assert.ok(!seenGuide.has(s), `guide "${s}" assigned to two topics`);
        seenGuide.add(s);
      }
      for (const id of t.productIds) {
        assert.ok(productIds.has(id), `topic ${t.id}: unknown product "${id}"`);
        assert.ok(!seenProduct.has(id), `product "${id}" assigned to two topics`);
        seenProduct.add(id);
      }
    }
    // كل المقالات والمنتجات القابلة للربط يجب أن تدخل شبكة الموضوعات؛
    // بدون هذا الحارس يمكن إضافة منتج/مقال جديد في الكتالوج ثم يظل معزولاً
    // عن الـ hubs والروابط الداخلية رغم نجاح build وsitemap.
    const unassignedArticles = articles.filter((article) => !seenArticle.has(article.slug));
    assert.equal(
      unassignedArticles.length,
      0,
      `articles missing topic assignment: ${unassignedArticles.map((article) => article.slug).join(", ")}`,
    );
    const unassignedProducts = products.filter((product) => !seenProduct.has(product.id));
    assert.equal(
      unassignedProducts.length,
      0,
      `products missing topic assignment: ${unassignedProducts.map((product) => product.id).join(", ")}`,
    );

    // كل topic ليه pillar مختلف (مفيش shared pillar)
    const pillarPaths = TOPICS.map((t) => pillarPath(t));
    assert.equal(duplicates(pillarPaths).length, 0, "two topics share the same pillar path");
    console.log(
      `✓ topics: ${TOPICS.length} topics, ${seenArticle.size} articles + ${seenGuide.size} guides + ${seenProduct.size} products assigned`,
    );
  }

  // ── Drift guard: landing-pages-meta.generated.ts (خفيف للـ bundles) ──
  assert.ok(
    existsSync(resolve(ROOT, "src/data/landing-pages-meta.generated.ts")),
    "src/data/landing-pages-meta.generated.ts missing; run npm run build",
  );
  {
    const lpMeta = await vite.ssrLoadModule("/src/data/landing-pages-meta.generated.ts");
    assert.equal(
      lpMeta.SEO_LANDING_PAGE_COUNT,
      seoLandingPages.length,
      "SEO_LANDING_PAGE_COUNT stale; run npm run build",
    );
    assert.equal(
      lpMeta.landingPagesMeta.length,
      seoLandingPages.length,
      "landingPagesMeta count stale; run npm run build",
    );
    const lpBySlug = new Map(lpMeta.landingPagesMeta.map((m) => [m.slug, m]));
    for (const p of seoLandingPages) {
      const m = lpBySlug.get(p.slug);
      assert.ok(m, `landingPagesMeta ${p.slug} missing; run npm run build`);
      assert.equal(m.title, p.title, `landingPagesMeta ${p.slug}.title stale; run npm run build`);
      assert.equal(
        m.noindex ?? false,
        Boolean(p.noindex),
        `landingPagesMeta ${p.slug}.noindex stale`,
      );
    }
  }

  // تم إلغاء الفحص المعجمي لعبارات الادعاءات الطبية من CI بقرار المالك.
  // تبقى اختبارات بنية البيانات، الاتساق، schema، والأمان فعالة.

  assert.deepEqual(
    duplicates(seoLandingPages.map((page) => page.slug)),
    [],
    "Duplicate landing page slugs",
  );

  const categories = products.reduce((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + 1;
    return acc;
  }, {});
  assert.deepEqual(
    categories,
    { men: 54, women: 23, devices: 7 },
    "Unexpected category split (84 = 54 men / 23 women / 7 devices)",
  );

  // (2026-09-15) JSON-LD OfferCatalog في index.html لازم يطابق كتالوج
  // البيانات — ده كان drifting (52/23 بدل 49/22) من غير ما أي guard يلتقطه.
  {
    const indexHtml = readFileSync(resolve(ROOT, "index.html"), "utf8");
    const offerCatalog = indexHtml.match(/"name":\s*"منتجات الرجال",\s*"numberOfItems":\s*(\d+)/);
    const offerCatalogWomen = indexHtml.match(
      /"name":\s*"منتجات النساء",\s*"numberOfItems":\s*(\d+)/,
    );
    const offerCatalogDevices = indexHtml.match(
      /"name":\s*"الأجهزة الطبية",\s*"numberOfItems":\s*(\d+)/,
    );
    assert.ok(offerCatalog, "index.html JSON-LD missing men OfferCatalog");
    assert.ok(offerCatalogWomen, "index.html JSON-LD missing women OfferCatalog");
    assert.ok(offerCatalogDevices, "index.html JSON-LD missing devices OfferCatalog");
    assert.equal(
      Number(offerCatalog[1]),
      categories.men,
      `index.html JSON-LD men count ${offerCatalog[1]} != catalog ${categories.men}`,
    );
    assert.equal(
      Number(offerCatalogWomen[1]),
      categories.women,
      `index.html JSON-LD women count ${offerCatalogWomen[1]} != catalog ${categories.women}`,
    );
    assert.equal(
      Number(offerCatalogDevices[1]),
      categories.devices,
      `index.html JSON-LD devices count ${offerCatalogDevices[1]} != catalog ${categories.devices}`,
    );
    // كل @id لازم يكون فريد في الـ graph (كان Organization وLocalBusiness
    // مشاركين #organization — graph غير نظيف)
    const ids = [...indexHtml.matchAll(/"@id":\s*"([^"]+)"/g)].map((m) => m[1]);
    assert.deepEqual(duplicates(ids), [], "Duplicate @id in index.html JSON-LD graph");
  }

  // Historical ratings are restored only for the archived products approved
  // by the owner. New products must not receive invented defaults or counts.
  for (const product of products) {
    const hasRating = Object.hasOwn(product, "rating");
    const hasReviews = Object.hasOwn(product, "reviews");
    assert.equal(hasRating, hasReviews, `Incomplete legacy review summary in ${product.id}`);
    if (hasRating) {
      assert.ok(
        Number.isFinite(product.rating) && product.rating >= 1 && product.rating <= 5,
        `Invalid rating in ${product.id}`,
      );
      assert.ok(
        Number.isInteger(product.reviews) && product.reviews >= 1,
        `Invalid review count in ${product.id}`,
      );
    }
  }

  // Verify every product-bearing homepage section, not only the top featured grid.
  const featuredProducts = getFeaturedProducts();
  assert.equal(featuredProducts.length, 6, "Homepage must show exactly 6 featured products");
  const featuredIds = new Set(featuredProducts.map((product) => product.id));
  // المصدر المشترك نفسه الذي تستخدمه مكونات الهوم — يمنع انحراف نسخة الاختبار
  const concernCandidates = HOMEPAGE_CONCERN_CANDIDATES;
  const concernIds = Object.values(concernCandidates).flatMap((ids) =>
    ids.filter((id) => !featuredIds.has(id) && !HOMEPAGE_EXCLUDED_PRODUCT_IDS.has(id)).slice(0, 3),
  );
  assert.equal(concernIds.length, 12, "Homepage concern sections must show 12 products");
  const previouslyDisplayedIds = new Set([...featuredIds, ...concernIds]);
  const tabProducts = ["men", "women", "devices"].flatMap((category) =>
    getProductsByCategory(category)
      .filter(
        (product) =>
          !previouslyDisplayedIds.has(product.id) && !HOMEPAGE_EXCLUDED_PRODUCT_IDS.has(product.id),
      )
      .slice(0, 4),
  );
  assert.equal(tabProducts.length, 12, "Homepage category tabs must show 4 products per category");
  const allHomepageProductIds = [
    ...featuredProducts.map((product) => product.id),
    ...concernIds,
    ...tabProducts.map((product) => product.id),
  ];
  assert.deepEqual(
    allHomepageProductIds.filter((id) => HOMEPAGE_EXCLUDED_PRODUCT_IDS.has(id)),
    [],
    "An excluded product is still present in a homepage section",
  );

  for (const product of products) {
    assert.match(product.slug, /^[a-z0-9-]+$/, `Invalid slug: ${product.id}`);
    assert.ok(product.price > 0, `Invalid price: ${product.id}`);
    assert.ok(product.stock >= 0, `Invalid stock: ${product.id}`);
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

  // 🎁 خريطة الباقات (bundles-db.json) — مولّدة من نفس محرك cross-sell،
  // ويجب أن تشير كل أعضائها لمنتجات موجودة (تُتحقق منها الخادم عند خصم الباقة)
  const bundlesDb = JSON.parse(
    readFileSync(resolve(ROOT, "api", "lib", "bundles-db.json"), "utf-8"),
  );
  assert.ok(Object.keys(bundlesDb).length > 0, "bundles-db.json is empty");
  for (const [mainId, members] of Object.entries(bundlesDb)) {
    assert.ok(productIds.has(mainId), `Bundle main missing: ${mainId}`);
    assert.equal(members.length, 3, `Bundle must contain exactly 3 products: ${mainId}`);
    for (const member of members) {
      assert.ok(productIds.has(member), `Bundle member missing: ${member} (of ${mainId})`);
    }
    const forms = new Set(
      members
        .map((id) => getOralSolidForm(products.find((product) => product.id === id)))
        .filter(Boolean),
    );
    assert.ok(
      forms.size <= 1,
      `Bundle mixes tablets and capsules: ${mainId} (${members.join(", ")})`,
    );
    const presentations = new Set(
      members
        .map((id) => getBundlePresentation(products.find((product) => product.id === id)))
        .filter(Boolean),
    );
    assert.ok(
      presentations.size <= 1,
      `Bundle mixes gel and cream: ${mainId} (${members.join(", ")})`,
    );
    const productTypes = members.map((id) =>
      getBundleProductType(products.find((product) => product.id === id)),
    );
    assert.equal(
      new Set(productTypes).size,
      productTypes.length,
      `Bundle repeats a product type (${productTypes.join(", ")}): ${mainId} (${members.join(", ")})`,
    );
  }

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

  // تم إلغاء قاعدة الكلمات الدوائية التي كانت تفرض noindex أو تحذيرًا
  // طبيًا على صفحات الأدلة، وفق قرار المالك الحالي.

  assert.deepEqual(
    duplicates(vercel.redirects.map((r) => r.source)),
    [],
    "Duplicate redirect sources in vercel.json",
  );
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

  // ── سلامة شبكة الـ redirects: لا loops، لا chains، ولا destinations ميتة ──
  // (حماية تلقائية مع كل تغيير في الكتالوج — أي destination غير موجودة أو
  // أي destination هي source لقاعدة تانية = فشل فوري في CI)
  const isLiteralPath = (p) => !p.includes(":") && !p.includes("*") && !p.includes("(");
  const knownStaticRoutes = new Set([
    "/",
    "/products/men",
    "/products/women",
    "/products/devices",
    "/search",
    "/education",
    "/about",
    "/contact",
    "/medical-review-board",
    "/shipping",
    "/returns",
    "/terms",
    "/privacy",
    "/cart",
    "/order-confirmed",
    "/thank-you",
    "/wishlist",
  ]);
  const productSlugs = new Set(products.map((p) => p.slug));
  const articleSlugs = new Set(articles.map((a) => a.slug));
  const guideSlugs = new Set(seoLandingPages.map((g) => g.slug));
  const destinationIsLive = (dest) => {
    if (knownStaticRoutes.has(dest)) return true;
    const parts = dest.split("/").filter(Boolean);
    if (parts[0] === "products" && parts.length === 2) return productSlugs.has(parts[1]);
    if (parts[0] === "products" && parts[1] === "guides" && parts.length === 3) {
      return guideSlugs.has(parts[2]);
    }
    if (parts[0] === "education" && parts.length === 2) return articleSlugs.has(parts[1]);
    return false;
  };

  // 1) كل destination حرفية (غير باراميترية) يجب أن تفسر لـ route حقيقية
  for (const r of vercel.redirects) {
    if (!isLiteralPath(r.destination)) continue; // destinations الباراميترية تخص التطبيق
    assert.ok(
      destinationIsLive(r.destination),
      `Redirect ${r.source} -> ${r.destination} points to a route that does not exist`,
    );
  }

  // 2) لا سلاسل/حلقات: destination قاعدة لا يجوز أن تكون source لقاعدة تانية
  // (الحلقة حالة خاصة من السلسلة — لو A->B->A فالقيد ده يمسكها من أول خطوة)
  const literalGraph = new Map(
    vercel.redirects
      .filter((r) => isLiteralPath(r.source) && isLiteralPath(r.destination))
      .map((r) => [r.source, r.destination]),
  );
  for (const [source, destination] of literalGraph) {
    assert.ok(
      !literalGraph.has(destination),
      `Redirect chain/loop: ${source} -> ${destination} (destination must not be another rule's source)`,
    );
  }
  const sourceValidator = readFileSync(
    resolve(ROOT, "scripts/validate-article-sources.mjs"),
    "utf-8",
  );
  assert.match(
    sourceValidator,
    /No generated article marker found[\s\S]*process\.exit\(2\)/,
    "Article source validation must fail instead of silently passing without a generated slug",
  );
  const serverSource = readFileSync(resolve(ROOT, "server/index.js"), "utf-8");
  assert.match(
    serverSource,
    /app\.get\("\/health"[\s\S]*?Cache-Control.*?no-store[\s\S]*?X-Robots-Tag/,
    "Self-hosted health endpoint must be non-cacheable and non-indexable",
  );

  const appsScript = readFileSync(resolve(ROOT, "google-apps-script.gs"), "utf-8");
  assert.match(
    appsScript,
    /createTextFinder\(orderId\)/,
    "Durable order idempotency search missing",
  );
  assert.doesNotMatch(
    appsScript,
    /lastRow\s*-\s*49/,
    "Order idempotency must not be limited to the last 50 rows",
  );
  assert.match(
    appsScript,
    /isInternational\s*=\s*\/\^\\\+\[1-9\]/,
    "Apps Script must accept canonical international phone numbers",
  );
  assert.doesNotMatch(appsScript, /Invalid Egyptian phone/, "Stale Egypt-only validation");
  assert.match(
    appsScript,
    /if \(statusCol <= 0\) return "لا"/,
    "Verified reviews must fail closed when the order-status column is missing",
  );
  assert.match(
    appsScript,
    /currentHeaders\.indexOf\(expectedHeaders\[i\]\) === -1/,
    "Apps Script must repair missing headers even when the sheet column count matches",
  );

  const sitemap = readFileSync(resolve(ROOT, "public/sitemap.xml"), "utf-8");
  const imageSitemap = readFileSync(resolve(ROOT, "public/sitemap-images.xml"), "utf-8");
  const sitemapIndex = readFileSync(resolve(ROOT, "public/sitemap-index.xml"), "utf-8");
  const catalogFeed = readFileSync(resolve(ROOT, "public/catalog-feed.xml"), "utf-8");
  const inStockProducts = products.filter((product) => (product.stock ?? 0) > 0);
  assert.equal(
    (imageSitemap.match(/<image:loc>/g) || []).length,
    (imageSitemap.match(/<image:image>/g) || []).length,
    "Each image sitemap entry must contain exactly one image location",
  );
  assert.equal(
    (catalogFeed.match(/<item>/g) || []).length,
    inStockProducts.length,
    "Catalog feed must contain every in-stock catalog product",
  );
  assert.equal(
    (catalogFeed.match(/<g:google_product_category>/g) || []).length,
    inStockProducts.length,
    "Every catalog feed item must have an official Google product category",
  );
  assert.doesNotMatch(
    catalogFeed,
    /طريقة الاستخدام/,
    "Merchant feed descriptions must not include usage instructions",
  );
  assert.equal(
    sitemapIndex.includes("catalog-feed.xml"),
    false,
    "Product feed must not be listed as a sitemap",
  );
  for (const product of products) {
    const productUrl = `https://elysrmedical.store/products/${product.slug}`;
    assert.equal(sitemap.includes(productUrl), true, `Product missing from sitemap: ${product.id}`);
    assert.equal(
      imageSitemap.includes(productUrl),
      true,
      `Product missing from image sitemap: ${product.id}`,
    );
    if ((product.stock ?? 0) > 0) {
      assert.equal(
        catalogFeed.includes(`<g:id>${product.id}</g:id>`),
        true,
        `Product missing from catalog feed: ${product.id}`,
      );
      assert.equal(
        catalogFeed.includes(`<g:link>${productUrl}</g:link>`),
        true,
        `Product URL missing from catalog feed: ${product.id}`,
      );
    }
  }
  // المنتجات التي أعادها المالك يجب ألا تحمل قواعد noindex على مستوى headers.
  for (const restoredSlug of [
    "hard-on-sildenafil-130mg-dapoxetine-60mg",
    "cialis-tadalafil-20mg-30-tablets",
    "power-36-power-control-for-36-hours",
    "viagra-pfizer-100mg",
    "viagra-20-tablets",
  ]) {
    assert.equal(
      vercel.headers.some((entry) => entry.source.includes(restoredSlug)),
      false,
      `Restored product must not have noindex header rules: ${restoredSlug}`,
    );
  }

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

  // 🧭 قرار موثق: sitemap "نظيف لجوجل" — بدون أي search template.
  // امتداد Yandex <search> بيعلّمه Google Search Console كـ "علامة XML غير
  // صالحة" (error دائم في تقرير الـ sitemap). بحث جوجل الشامل شغال عبر
  // SearchAction في JSON-LD الصفحة الرئيسية — مش عبر sitemap.
  assert.ok(
    !sitemap.includes("xmlns:search"),
    "Sitemap must NOT declare the Yandex search namespace (GSC reports it as an invalid tag)",
  );
  assert.ok(
    !sitemap.includes("<search>"),
    "Sitemap must NOT contain a <search> extension element (GSC reports it as an invalid tag)",
  );
  assert.ok(
    !sitemap.includes("{search_term_string}"),
    "Sitemap must NOT contain search template placeholder URLs",
  );

  assert.equal(promo.calcDiscount(999, new Date("2026-06-01T12:00:00Z")), 0);
  assert.equal(promo.calcDiscount(1000, new Date("2026-06-01T12:00:00Z")), 100);
  assert.equal(promo.calcDiscount(1500, new Date("2026-06-01T12:00:00Z")), 225);
  assert.equal(promo.calcDiscount(2000, new Date("2026-06-01T12:00:00Z")), 400);
  assert.equal(promo.isPromotionEnabled(new Date("2026-06-26T00:00:00Z")), true);
  assert.equal(promo.isPromotionEnabled(new Date("2027-01-02T00:00:00Z")), true);

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
