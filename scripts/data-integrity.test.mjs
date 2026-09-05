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
  const {
    products,
    getFeaturedProducts,
    getProductsByCategory,
    HOMEPAGE_EXCLUDED_PRODUCT_IDS,
    HOMEPAGE_CONCERN_CANDIDATES,
  } = await vite.ssrLoadModule("/src/data/products.ts");
  const { articles } = await vite.ssrLoadModule("/src/data/articles.ts");
  const { seoLandingPages } = await vite.ssrLoadModule("/src/data/landing-pages.ts");
  const promo = await vite.ssrLoadModule("/src/lib/promo.ts");
  const bundle = await vite.ssrLoadModule("/src/lib/bundle-discount.ts");
  const { GOOGLE_SHOPPING_BLOCKED } = await vite.ssrLoadModule("/src/lib/product-compliance.ts");
  const siteConfig = await vite.ssrLoadModule("/src/lib/site-config.ts");
  const vercel = JSON.parse(readFileSync(resolve(ROOT, "vercel.json"), "utf-8"));
  const productsDb = JSON.parse(readFileSync(resolve(ROOT, "api/lib/products-db.json"), "utf-8"));
  const configDb = JSON.parse(readFileSync(resolve(ROOT, "api/lib/config-db.json"), "utf-8"));
  const cacheConfig = JSON.parse(readFileSync(resolve(ROOT, "config/cache-version.json"), "utf-8"));
  const cacheModule = await vite.ssrLoadModule("/src/lib/cache.ts");
  assert.equal(cacheModule.CACHE_VERSION, cacheConfig.version, "Cache version source mismatch");
  for (const script of ["scripts/prerender-seo.mjs", "scripts/generate-sitemap.mjs"]) {
    const content = readFileSync(resolve(ROOT, script), "utf-8");
    assert.doesNotMatch(
      content,
      /CACHE_VERSION\s*=\s*"\d+"/,
      `Duplicate cache version in ${script}`,
    );
  }

  assert.deepEqual(productsDb, products, "products-db.json is stale; run npm run build");
  // config-db = Single Source of Truth للسيرفر: الشحن/العروض/نسبة الباقة/
  // المنتجات المحظورة — كلهم مولّدون من نفس مصادر TS وقت البناء.
  assert.deepEqual(
    configDb,
    {
      GOVERNORATE_SHIPPING: siteConfig.GOVERNORATE_SHIPPING,
      FREE_SHIPPING_THRESHOLD: siteConfig.FREE_SHIPPING_THRESHOLD,
      PROMO_TIERS: promo.PROMO_TIERS,
      BUNDLE_DISCOUNT_RATE: bundle.BUNDLE_DISCOUNT_RATE,
      GOOGLE_SHOPPING_BLOCKED: [...GOOGLE_SHOPPING_BLOCKED],
    },
    "config-db.json is stale; run npm run build",
  );
  // 5 منتجات دوائية محذوفة نهائياً (نفس قائمة DELETED_PHARMA_FILES في
  // scripts/validate-schemas.mjs) — كل واحدة لازم يكون ليها 301 قائم
  // في vercel.json (حماية من قائمة تاريخية منفصلة عن الـ redirects).
  const deletedPharmaSlugs = [
    "hard-on-sildenafil-130mg-dapoxetine-60mg", // m-34
    "vegal-extra-sildenafil-130mg-cobra", // m-36
    "cialis-tadalafil-20mg-30-tablets", // m-37
    "levitra-100mg", // m-47
    "viagra-for-women-20-tablets", // w-17
    "viagra-1-2-3-2-10-tablets", // slug دوائي أقدم
  ];
  for (const slug of deletedPharmaSlugs) {
    assert.ok(
      vercel.redirects.some((r) => r.source === `/products/${slug}` && r.permanent === true),
      `Deleted pharma product missing 301 redirect in vercel.json: ${slug}`,
    );
  }

  assert.equal(
    products.length,
    82,
    "Expected 82 products after deleting 5 blocked pharma (including w-17)",
  );
  assert.ok(articles.length >= 51, "Expected at least 51 articles");
  // 🧭 Anti-drift: أي رقم مقالات hardcoded في واجهات/نصوص التسويق = درفت
  // حتمي مع auto-publisher. الـ UI لازم يقرا articles.length ديناميكياً.
  for (const file of [
    "src/routes/about.tsx",
    "src/routes/medical-review-board.tsx",
    "src/data/landing-pages.ts",
  ]) {
    const content = readFileSync(resolve(ROOT, file), "utf-8");
    assert.doesNotMatch(
      content,
      /\b\d{1,3}\s*مقالة/,
      `${file} contains a hardcoded article count — use articles.length (drift risk)`,
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
  // ── وعود مطلقة في المحتوى الطبي: ممنوعة (سلامة + التزام "لا وعود علاجية") ──
  // القائمة مقصودة بدقة: لا تشمل "يعالج"/"100%" لأنهما يظهران سياقات
  // تفنيد مشروعة (خرافة: "الطبيعي آمن 100%" / "ادعاءات أنه يعالج... لا يدعمها دليل")
  const FORBIDDEN_CLAIM_TERMS = [
    // ضمانات مطلقة (سلامة/فعالية/رضا)
    // ملاحظة: "مضمون" وحده غير ممنوع — "منتجات أصلية ومضمونة" ضمان تجاري مشروع
    // (أصالة + ضمان استبدال)، بينما "نتائج مضمونة"/"تضمن الرضا" ضمانات علاجية مطلقة
    "يضمن",
    "نتائج ملموسة",
    "نتائج مضمونة",
    "تضمن الرضا",
    "آمن تماماً",
    "آمنة تماماً",
    "آمن كلياً",
    "آمنة كلياً",
    "أمان كامل",
    "أمان تام",
    "فعالية أكيدة",
    "فعالية كاملة",
    "بدون أي أعراض جانبية",
    "بدون أعراض جانبية",
    "يقضي تماماً",
    "مضاعفة الإحساس",
    "طبيعي 100%",
    "طبيعية 100%",
    // ادعاءات فريق طبي (المراجعة حالياً داخلية — راجعي صفحة الفريق)
    "أطباؤنا",
    "فريقنا الطبي",
    "بمراجعة طبية",
  ];
  const scanForClaims = (label, text) => {
    for (const term of FORBIDDEN_CLAIM_TERMS) {
      assert.ok(
        !text.includes(term),
        `${label} contains forbidden absolute claim "${term}" — health content must not guarantee outcomes or imply a medical team`,
      );
    }
  };

  // "100%" مطلقاً في محتوى المنتجات/الدليل — المسموح الوحيد: "أصلية 100%"
  // (ضمان تجاري للأصالة). المقالات مستثناة: تنطوي اقتباسات تفنيد مشروعة.
  const scanNoAbsolute100 = (label, text) => {
    const withoutAuthenticity = text.replace(/أصلية 100%/g, "");
    assert.ok(
      !withoutAuthenticity.includes("100%"),
      `${label} contains an absolute "100%" claim (only "أصلية 100%" authenticity warranty is allowed)`,
    );
  };

  for (const article of articles) {
    scanForClaims(
      `Article "${article.slug}"`,
      [article.title, article.excerpt, article.content]
        .concat((article.faqs ?? []).map((f) => `${f.question} ${f.answer}`))
        .join(" "),
    );
  }
  // المنتجات: نفس القاعدة على كل الحقول النصية (الوصف/المكونات/الفوائد)
  for (const product of products) {
    scanForClaims(
      `Product "${product.slug}"`,
      [
        product.name,
        product.description,
        product.ingredients ?? "",
        product.usage ?? "",
        (product.benefits ?? []).join(" "),
      ].join(" "),
    );
    scanNoAbsolute100(
      `Product "${product.slug}"`,
      [
        product.name,
        product.description,
        product.ingredients ?? "",
        product.usage ?? "",
        (product.benefits ?? []).join(" "),
      ].join(" "),
    );
  }
  // صفحات الدليل: نفس القاعدة على كل النصوص
  for (const page of seoLandingPages) {
    scanForClaims(
      `Landing page "${page.slug}"`,
      [
        page.title,
        page.metaTitle,
        page.metaDescription,
        page.heroDescription,
        page.intro,
        page.sections.map((sec) => `${sec.heading} ${sec.body}`).join(" "),
        page.faqs.map((f) => `${f.question} ${f.answer}`).join(" "),
        page.links.map((l) => `${l.label} ${l.description}`).join(" "),
      ].join(" "),
    );
    scanNoAbsolute100(
      `Landing page "${page.slug}"`,
      [
        page.title,
        page.metaTitle,
        page.metaDescription,
        page.heroDescription,
        page.intro,
        page.sections.map((sec) => `${sec.heading} ${sec.body}`).join(" "),
        page.faqs.map((f) => `${f.question} ${f.answer}`).join(" "),
        page.links.map((l) => `${l.label} ${l.description}`).join(" "),
      ].join(" "),
    );
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
  assert.deepEqual(
    categories,
    { men: 52, women: 23, devices: 7 },
    "Unexpected category split after deletion",
  );

  const kreva = products.find((product) => product.id === "m-60");
  assert.equal(kreva?.price, 300, "Kreva price must be 300 EGP");
  assert.equal(kreva?.rating, 5, "Kreva rating must be 5/5");
  assert.equal(kreva?.reviews, 73, "Kreva must show 73 historical ratings");

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

  // 🎁 خريطة الباقات (bundles-db.json) — مولّدة من نفس محرك cross-sell،
  // ويجب أن تشير كل أعضائها لمنتجات موجودة (تُتحقق منها الخادم عند خصم الباقة)
  const bundlesDb = JSON.parse(
    readFileSync(resolve(ROOT, "api", "lib", "bundles-db.json"), "utf-8"),
  );
  assert.ok(Object.keys(bundlesDb).length > 0, "bundles-db.json is empty");
  for (const [mainId, members] of Object.entries(bundlesDb)) {
    assert.ok(productIds.has(mainId), `Bundle main missing: ${mainId}`);
    for (const member of members) {
      assert.ok(productIds.has(member), `Bundle member missing: ${member} (of ${mainId})`);
    }
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

  // 🚨 سياسة الامتثال الدوائية (مقفولة بالـ CI):
  // أي دليل يستهدف اسم دواء مضبوط (براند أو مادة فعالة) يجب أن يكون
  // (أ) noindex تماماً — الدوائ غير متوفر في الموقع فلا يُستهدف اسمه بمحتوى
  //     مفهرس، أو (ب) يحوي لغة تحذير طبي واضحة في جسمه.
  // الدرس: أدلة Cialis/Levitra كانت مُفهرسة رغم حذف الدوائين من الكتالوج
  // بسبب سياسات Google — تناقض امتثالي يُراجع الآن دورياً.
  const DRUG_TERMS = [
    "sildenafil",
    "tadalafil",
    "vardenafil",
    "dapoxetine",
    "cialis",
    "levitra",
    "viagra",
    "سيلدينافيل",
    "تادالافيل",
    "فاردينافيل",
    "دابوكستين",
    "سياليس",
    "ليفيترا",
    "فياجرا",
  ];
  const MEDICAL_WARNING_TERMS = ["طبيب", "وصفة", "استشار", "نترات", "توجيه طبي", "قرار طبي"];
  for (const page of seoLandingPages) {
    const targetingText = [
      page.slug,
      page.title,
      page.metaTitle,
      page.metaDescription,
      page.primaryKeyword,
      ...(page.relatedKeywords ?? []),
    ]
      .join(" ")
      .toLowerCase();
    const targetsDrug = DRUG_TERMS.some((t) => targetingText.includes(t.toLowerCase()));
    if (!targetsDrug) continue;
    if (page.noindex) continue; // (أ) noindex = سياسة سليمة
    const body = [
      page.heroDescription,
      page.intro,
      ...page.sections.map((s) => `${s.heading} ${s.body}`),
      ...page.faqs.map((f) => `${f.question} ${f.answer}`),
    ].join(" ");
    const hasWarning = MEDICAL_WARNING_TERMS.some((t) => body.includes(t));
    assert.ok(
      hasWarning,
      `Landing page ${page.slug} targets a drug name without medical warning language (or should be noindex)`,
    );
  }

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

  const sitemap = readFileSync(resolve(ROOT, "public/sitemap.xml"), "utf-8");
  const imageSitemap = readFileSync(resolve(ROOT, "public/sitemap-images.xml"), "utf-8");
  const catalogFeed = readFileSync(resolve(ROOT, "public/catalog-feed.xml"), "utf-8");
  for (const product of products.filter((item) => GOOGLE_SHOPPING_BLOCKED.has(item.id))) {
    const productUrl = `https://elysrmedical.store/products/${product.slug}`;
    assert.equal(sitemap.includes(productUrl), false, `Blocked product in sitemap: ${product.id}`);
    assert.equal(
      imageSitemap.includes(productUrl),
      false,
      `Blocked product in image sitemap: ${product.id}`,
    );
    assert.equal(
      catalogFeed.includes(`<g:id>${product.id}</g:id>`),
      false,
      `Blocked product in catalog feed: ${product.id}`,
    );
  }
  const noindexHeader = vercel.headers.find((entry) =>
    entry.source.includes("power-36-power-control-for-36-hours"),
  );
  assert.ok(noindexHeader, "Missing X-Robots-Tag header rule for blocked product pages");
  assert.ok(
    noindexHeader.headers.some(
      (header) => header.key === "X-Robots-Tag" && header.value.includes("noindex"),
    ),
    "Blocked product header rule must include noindex",
  );

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
