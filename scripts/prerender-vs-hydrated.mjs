/**
 * ============================================================
 * Prerender ↔ Hydrated parity audit
 * ============================================================
 * Compares what the static (prerendered) HTML declares with what
 * the SPA sets after hydration through each route's `head()` +
 * `applySeo()` / `injectJsonLd()`.
 *
 * Why it matters: Google renders JavaScript. If the initial HTML and
 * the rendered DOM disagree, the crawler may index either version and
 * structured data can be treated as not matching visible content.
 *
 * Checks (products / articles / guides / static routes):
 *   • <title>          (prerender vs route head)
 *   • meta description (prerender vs route head, incl. applySeo default)
 *   • meta robots      (prerender vs route head noindex)
 *   • og:type / og:image / og:image:alt / canonical
 *   • Product JSON-LD: name/description/price/availability/aggregateRating/
 *     alternativeName/shippingDetails/brand/mpn/gtin
 *   • Article JSON-LD: headline/description/dates/author @id/citation/publisher
 *   • ItemList JSON-LD: numberOfItems + ListItem fields (price drift)
 *   • WebPage JSON-LD presence (guides)
 *   • Visible fallback parity: product fields, related products, cross-sell
 *     bundle, FAQ answers, article linked products/articles, guide products
 *
 * Usage: node scripts/prerender-vs-hydrated.mjs [--json]
 * Requires a build (dist/). Exit code 1 on any mismatch.
 * ============================================================
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DIST = resolve(ROOT, "dist");
const SITE_URL = "https://elysrmedical.store";
const WANT_JSON = process.argv.includes("--json");

const DEFAULT_TITLE = "اليسر ميديكال — أكبر شركة متخصصة في منتجات الصحة الزوجية الأصلية في مصر";
const DEFAULT_DESC =
  "اليسر ميديكال أكبر شركة متخصصة في منتجات الصحة الزوجية الأصلية للرجال والنساء في مصر. منتجات أصلية مختارة بعناية، شحن سري ودفع عند الاستلام.";

const results = {
  generatedAt: new Date().toISOString(),
  pages: 0,
  issues: [],
};

/**
 * The guide route injects its WebPage node in an effect (not in head()), so
 * parity is verified against the route source itself.
 */
const GUIDE_ROUTE_INJECTS_WEBPAGE = /injectJsonLd\(\s*"webpage"/.test(
  readFileSync(resolve(ROOT, "src/routes/products.guides.$slug.tsx"), "utf-8"),
);

/** كل ملفات HTML في dist — لفحوصات العناوين على كامل المخرجات. */
function walkDistHtml(dir = DIST, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = resolve(dir, entry.name);
    if (entry.isDirectory()) walkDistHtml(p, out);
    else if (entry.name.endsWith(".html")) out.push(p);
  }
  return out;
}

function addIssue(kind, page, detail) {
  results.issues.push({ kind, page, detail });
}

/* ---------- HTML helpers ---------- */

function tag(html, regex) {
  const m = html.match(regex);
  return m ? m[1] : null;
}

function readHead(file) {
  const html = readFileSync(file, "utf-8");
  const head = html.slice(0, html.indexOf("</head>"));
  const single = (attrRe) => {
    const m = head.match(new RegExp(`<meta\\b(?=[^>]*${attrRe})[^>]*content="([^"]*)"`, "i"));
    return m ? m[1] : null;
  };
  const jsonLd = [
    ...head.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g),
  ]
    .map((m) => {
      try {
        return JSON.parse(m[1]);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
  const bodyMatch = html.match(/<div data-prerender-content[^>]*>([\s\S]*?)<\/div><\/div>/);
  return {
    html,
    title: tag(head, /<title>([\s\S]*?)<\/title>/),
    description: single(`name=["']description["']`),
    robots: single(`name=["']robots["']`),
    ogType: single(`property=["']og:type["']`),
    ogImage: single(`property=["']og:image["']`),
    ogImageAlt: single(`property=["']og:image:alt["']`),
    canonical: tag(head, /<link rel="canonical" href="([^"]*)"/),
    jsonLd,
    fallback: bodyMatch ? bodyMatch[1] : "",
  };
}

const ENTITIES = {
  "&amp;": "&",
  "&quot;": '"',
  "&#39;": "'",
  "&lt;": "<",
  "&gt;": ">",
  "&apos;": "'",
};

/** Undo HTML escaping so prerender markup and route strings compare fairly. */
function unescapeHtml(s) {
  return String(s ?? "").replace(/&(?:amp|quot|#39|apos|lt|gt);/g, (m) => ENTITIES[m] ?? m);
}

function normalize(s) {
  return unescapeHtml(s).replace(/\s+/g, " ").trim();
}

/** Prerendered asset URLs carry the cache-busting ?v=N; the SPA drops it. */
function normalizeAsset(value) {
  if (typeof value !== "string") return value;
  return value.replace(/\?v=\d+$/, "");
}

function compare(page, kind, prerenderValue, hydratedValue) {
  const a = normalize(prerenderValue);
  const b = normalize(hydratedValue);
  if (a !== b) addIssue(kind, page, { prerender: a, hydrated: b });
}

function findLd(list, type) {
  return list.find(
    (item) =>
      item &&
      (item["@type"] === type || (Array.isArray(item["@type"]) && item["@type"].includes(type))),
  );
}

function graphLd(list) {
  const out = [];
  for (const item of list) {
    if (item?.["@graph"]) out.push(...item["@graph"]);
    else if (item) out.push(item);
  }
  return out;
}

/* ---------- main ---------- */

if (!existsSync(resolve(DIST, "index.html"))) {
  console.error("✗ dist/index.html not found — run npm run build first.");
  process.exit(1);
}

const vite = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
  optimizeDeps: { noDiscovery: true, include: [] },
  plugins: [],
  logLevel: "silent",
});

try {
  const { products, getCrossSellsForProduct, getProductsByCategory, getProductById } =
    await vite.ssrLoadModule("/src/data/products.ts");
  const { articles } = await vite.ssrLoadModule("/src/data/articles.ts");
  const { seoLandingPages } = await vite.ssrLoadModule("/src/data/landing-pages.ts");
  const { makeProductMetaTitle, makeProductMetaDescription, productSchema, articleSchema } =
    await vite.ssrLoadModule("/src/lib/seo.ts");
  const { productFAQs } = await vite.ssrLoadModule("/src/data/product-faqs.ts");
  const { getProductsForArticle, getRelatedArticles, getArticlesForLandingPage } =
    await vite.ssrLoadModule("/src/lib/internal-links.ts");

  const routeModules = {
    "/products/men": "/src/routes/products.men.tsx",
    "/products/women": "/src/routes/products.women.tsx",
    "/products/devices": "/src/routes/products.devices.tsx",
    "/education": "/src/routes/education.tsx",
    "/about": "/src/routes/about.tsx",
    "/contact": "/src/routes/contact.tsx",
    "/shipping": "/src/routes/shipping.tsx",
    "/returns": "/src/routes/returns.tsx",
    "/terms": "/src/routes/terms.tsx",
    "/privacy": "/src/routes/privacy.tsx",
    "/refer": "/src/routes/refer.tsx",
    "/cart": "/src/routes/cart.tsx",
    "/wishlist": "/src/routes/wishlist.tsx",
    "/search": "/src/routes/search.tsx",
    "/order-confirmed": "/src/routes/order-confirmed.tsx",
    "/medical-review-board": "/src/routes/medical-review-board.tsx",
    "/": "/src/routes/index.tsx",
  };

  /** Mirrors RouteHeadSync + applySeo: what the SPA leaves in <head>. */
  async function hydratedHead(path, loaderData) {
    const mod = await vite.ssrLoadModule(routeModules[path]);
    const headFn = mod?.Route?.options?.head;
    let metas = [];
    if (typeof headFn === "function") {
      try {
        metas = headFn({ loaderData })?.meta ?? [];
      } catch {
        metas = [];
      }
    }
    let title,
      description,
      image,
      type,
      noindex = false;
    for (const m of metas) {
      if (!title && typeof m?.title === "string") title = m.title;
      if (!description && m?.name === "description") description = m.content;
      if (!image && (m?.property === "og:image" || m?.name === "twitter:image")) image = m.content;
      if (!type && m?.property === "og:type") type = m.content;
      if (m?.name === "robots") noindex = String(m.content).toLowerCase().includes("noindex");
    }
    return {
      title: title ?? DEFAULT_TITLE,
      description: description ?? DEFAULT_DESC,
      robots: noindex
        ? "noindex,follow,noarchive,nosnippet,noimageindex"
        : "index,follow,max-image-preview:large,max-snippet:-1",
      image,
      type: type ?? "website",
      noindex,
    };
  }

  /* ===== products ===== */
  for (const product of products) {
    const page = `/products/${product.slug}`;
    const file = resolve(DIST, "products", `${product.slug}.html`);
    if (!existsSync(file)) {
      addIssue("missingPrerenderFile", page, {});
      continue;
    }
    results.pages++;
    const head = readHead(file);

    // The product route head is loader-driven — replicate it exactly here
    // (same makeProductMetaTitle/Description calls as src/routes/products.$slug.tsx).
    const crossSells = getCrossSellsForProduct(product);
    const related = getProductsByCategory(product.category)
      .filter((p) => p.id !== product.id && !crossSells.some((c) => c.id === p.id))
      .sort((a, b) => a.id.localeCompare(b.id))
      .slice(0, 4);
    const hydratedProduct = {
      title: makeProductMetaTitle(product.name),
      description: makeProductMetaDescription(product),
      robots: "index,follow,max-image-preview:large,max-snippet:-1",
    };

    compare(page, "title", head.title, hydratedProduct.title);
    compare(page, "description", head.description, hydratedProduct.description);
    compare(page, "robots", head.robots, hydratedProduct.robots);
    compare(page, "ogType", head.ogType, "product");
    compare(page, "canonical", head.canonical, `${SITE_URL}${page}`);
    compare(page, "ogImageAlt", head.ogImageAlt, product.name);

    const ld = graphLd(head.jsonLd);
    const productLd = findLd(ld, "Product");
    if (!productLd) {
      addIssue("missingProductSchema", page, {});
    } else {
      const hydratedSchema = productSchema({
        ...product,
        approvedReviewSummary:
          product.rating && product.reviews
            ? { ratingValue: product.rating, reviewCount: product.reviews }
            : undefined,
      });
      for (const key of [
        "name",
        "description",
        "sku",
        "image",
        "alternativeName",
        "brand",
        "mpn",
        "gtin",
      ]) {
        const a = JSON.stringify(productLd[key] ?? null);
        const b = JSON.stringify(hydratedSchema[key] ?? null);
        if (a !== b)
          addIssue("productSchemaField", page, {
            field: key,
            prerender: productLd[key] ?? null,
            hydrated: hydratedSchema[key] ?? null,
          });
      }
      const aOffers = JSON.stringify({
        price: productLd.offers?.price,
        availability: productLd.offers?.availability,
        currency: productLd.offers?.priceCurrency,
      });
      const bOffers = JSON.stringify({
        price: hydratedSchema.offers?.price,
        availability: hydratedSchema.offers?.availability,
        currency: hydratedSchema.offers?.priceCurrency,
      });
      if (aOffers !== bOffers)
        addIssue("productSchemaOffer", page, {
          prerender: productLd.offers,
          hydrated: hydratedSchema.offers,
        });
      if (
        JSON.stringify(productLd.aggregateRating ?? null) !==
        JSON.stringify(hydratedSchema.aggregateRating ?? null)
      ) {
        addIssue("productSchemaRating", page, {
          prerender: productLd.aggregateRating ?? null,
          hydrated: hydratedSchema.aggregateRating ?? null,
        });
      }
      const preShipping = productLd.offers?.shippingDetails;
      const hydShipping = hydratedSchema.offers?.shippingDetails;
      if (JSON.stringify(preShipping ?? null) !== JSON.stringify(hydShipping ?? null)) {
        addIssue("productSchemaShipping", page, {
          prerenderBands: Array.isArray(preShipping) ? preShipping.length : preShipping,
          hydratedBands: Array.isArray(hydShipping) ? hydShipping.length : hydShipping,
        });
      }
      // Visible-content parity for schema fields (Google policy: structured
      // data must match what the user can see).
      const visible = normalize(head.fallback);
      if (productLd.name && !visible.includes(normalize(productLd.name))) {
        addIssue("schemaNameNotVisible", page, { name: productLd.name });
      }
      if (!visible.includes(`${product.price} ج.م`)) {
        addIssue("schemaPriceNotVisible", page, { price: productLd.offers?.price });
      }
      if (
        productLd.aggregateRating &&
        !visible.includes(String(productLd.aggregateRating.ratingValue))
      ) {
        addIssue("schemaRatingNotVisible", page, { rating: productLd.aggregateRating.ratingValue });
      }
    }

    // Visible fallback parity with the hydrated route
    const fb = normalize(head.fallback);
    const missingText = [];
    if (product.description && !fb.includes(normalize(product.description).slice(0, 60)))
      missingText.push("description");
    if (product.ingredients && !fb.includes(normalize(product.ingredients).slice(0, 40)))
      missingText.push("ingredients");
    if (product.usage && !fb.includes(normalize(product.usage).slice(0, 40)))
      missingText.push("usage");
    for (const benefit of (product.benefits || []).slice(0, 4)) {
      if (!fb.includes(normalize(benefit).slice(0, 30)))
        missingText.push(`benefit:${benefit.slice(0, 20)}`);
    }
    for (const faq of productFAQs) {
      if (!fb.includes(faq.question)) missingText.push(`faq:${faq.question.slice(0, 20)}`);
      if (!fb.includes(normalize(faq.answer).slice(0, 40)))
        missingText.push(`faqAnswer:${faq.question.slice(0, 20)}`);
    }
    if (missingText.length) addIssue("productFallbackMissing", page, { missingText });

    const prerenderedRelated = [...fb.matchAll(/products\/([a-z0-9-]+)"><img/g)].map((m) => m[1]);
    const hydratedRelated = related.map((p) => p.slug);
    if (JSON.stringify(prerenderedRelated) !== JSON.stringify(hydratedRelated)) {
      addIssue("relatedProductsMismatch", page, {
        prerender: prerenderedRelated,
        hydrated: hydratedRelated,
      });
    }

    const bundleNames = crossSells.length === 2 ? [product, ...crossSells].map((p) => p.name) : [];
    for (const name of bundleNames) {
      if (!fb.includes(normalize(name))) addIssue("bundleMissingInFallback", page, { name });
    }
  }

  /* ===== articles ===== */
  for (const article of articles) {
    const page = `/education/${article.slug}`;
    const file = resolve(DIST, "education", `${article.slug}.html`);
    if (!existsSync(file)) {
      addIssue("missingPrerenderFile", page, {});
      continue;
    }
    results.pages++;
    const head = readHead(file);
    const hydratedSchema = articleSchema(article);

    compare(page, "title", head.title, article.title);
    compare(
      page,
      "description",
      head.description,
      article.excerpt.length > 155 ? `${article.excerpt.slice(0, 154)}…` : article.excerpt,
    );
    compare(page, "ogType", head.ogType, "article");
    compare(page, "canonical", head.canonical, `${SITE_URL}${page}`);

    const ld = graphLd(head.jsonLd);
    const articleLd = findLd(ld, "Article");
    if (!articleLd) {
      addIssue("missingArticleSchema", page, {});
    } else {
      for (const key of [
        "headline",
        "description",
        "datePublished",
        "dateModified",
        "articleSection",
        "timeRequired",
        "inLanguage",
      ]) {
        const a = JSON.stringify(articleLd[key] ?? null);
        const b = JSON.stringify(hydratedSchema[key] ?? null);
        if (a !== b)
          addIssue("articleSchemaField", page, {
            field: key,
            prerender: articleLd[key] ?? null,
            hydrated: hydratedSchema[key] ?? null,
          });
      }
      if (articleLd.author?.["@id"] !== hydratedSchema.author?.["@id"]) {
        addIssue("articleSchemaAuthor", page, {
          prerender: articleLd.author,
          hydrated: hydratedSchema.author,
        });
      }
      if (
        JSON.stringify(articleLd.publisher ?? null) !==
        JSON.stringify(hydratedSchema.publisher ?? null)
      ) {
        addIssue("articleSchemaPublisher", page, {
          prerender: articleLd.publisher,
          hydrated: hydratedSchema.publisher,
        });
      }
      if (
        JSON.stringify(articleLd.citation ?? null) !==
        JSON.stringify(hydratedSchema.citation ?? null)
      ) {
        addIssue("articleSchemaCitation", page, {
          prerenderSample: (articleLd.citation ?? [])[0],
          hydratedSample: (hydratedSchema.citation ?? [])[0],
        });
      }
      const preImg = typeof articleLd.image === "string" ? articleLd.image : articleLd.image?.url;
      const hydImg =
        typeof hydratedSchema.image === "string" ? hydratedSchema.image : hydratedSchema.image?.url;
      if (normalizeAsset(preImg) !== normalizeAsset(hydImg))
        addIssue("articleSchemaImage", page, { prerender: preImg, hydrated: hydImg });
    }

    // Visible parity: linked products + related articles the route renders
    const fb = unescapeHtml(head.fallback);
    const linkedProducts = getProductsForArticle(article.slug)
      .map((id) => getProductById(id))
      .filter(Boolean)
      .slice(0, 6);
    const relatedSlugs = getRelatedArticles(article.slug, article.category, articles);
    const missing = [];
    for (const p of linkedProducts) {
      if (!fb.includes(`/products/${p.slug}`)) missing.push(`product:${p.id}`);
    }
    for (const slug of relatedSlugs) {
      if (!fb.includes(`/education/${slug}`)) missing.push(`article:${slug}`);
    }
    const paragraphCount = (article.content || "").split(/\n{2,}/).filter((p) => p.trim()).length;
    const renderedParagraphs = (fb.match(/<p>/g) || []).length;
    if (renderedParagraphs < paragraphCount) {
      missing.push(`paragraphs:${renderedParagraphs}<${paragraphCount}`);
    }
    for (const source of article.sources || []) {
      if (!fb.includes(source.url)) missing.push(`source:${source.url.slice(0, 40)}`);
    }
    if (missing.length) addIssue("articleFallbackMissing", page, { missing });
  }

  /* ===== guides ===== */
  for (const page of seoLandingPages) {
    const path = `/products/guides/${page.slug}`;
    const file = resolve(DIST, "products", "guides", `${page.slug}.html`);
    if (!existsSync(file)) {
      addIssue("missingPrerenderFile", path, {});
      continue;
    }
    results.pages++;
    const head = readHead(file);
    compare(path, "title", head.title, page.metaTitle);
    compare(path, "description", head.description, page.metaDescription);
    compare(path, "canonical", head.canonical, `${SITE_URL}${path}`);
    compare(
      path,
      "robots",
      head.robots,
      page.noindex
        ? "noindex,follow,noarchive,nosnippet,noimageindex"
        : "index,follow,max-image-preview:large,max-snippet:-1",
    );

    const ld = graphLd(head.jsonLd);
    const webPage = findLd(ld, "WebPage");
    const faq = findLd(ld, "FAQPage");
    const itemList = findLd(ld, "ItemList");
    // The hydrated guide route injects webPage + breadcrumb + faq + itemlist
    // from the same landing-page record (src/routes/products.guides.$slug.tsx).
    if (!webPage) {
      addIssue("missingWebPageSchema", path, {});
    } else if (!GUIDE_ROUTE_INJECTS_WEBPAGE) {
      addIssue("webPageSchemaOnlyInPrerender", path, { id: webPage["@id"] });
    } else {
      const expectedWebPage = {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "@id": `${SITE_URL}${path}`,
        name: page.title,
        headline: page.title,
        description: page.metaDescription,
        url: `${SITE_URL}${path}`,
        inLanguage: "ar-EG",
        about: page.primaryKeyword,
      };
      if (JSON.stringify(webPage) !== JSON.stringify(expectedWebPage)) {
        addIssue("webPageSchemaMismatch", path, {
          prerender: webPage,
          hydrated: expectedWebPage,
        });
      }
    }
    if (!faq && (page.faqs || []).length) addIssue("missingFaqSchema", path, {});
    if (
      faq &&
      JSON.stringify(faq.mainEntity ?? null) !==
        JSON.stringify(
          (page.faqs || []).map((f) => ({
            "@type": "Question",
            name: f.question,
            acceptedAnswer: { "@type": "Answer", text: f.answer },
          })),
        )
    ) {
      addIssue("faqSchemaMismatch", path, {});
    }
    const selected = (page.productIds || []).map((id) => getProductById(id)).filter(Boolean);
    if (!itemList) {
      if (selected.length) addIssue("missingItemListSchema", path, {});
    } else {
      if (itemList.numberOfItems !== selected.length) {
        addIssue("itemListCount", path, {
          prerender: itemList.numberOfItems,
          hydrated: selected.length,
        });
      }
      const hydratedItems = selected.map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${SITE_URL}/products/${p.slug}`,
        name: p.name,
        image: p.image ? `${SITE_URL}${p.image}` : undefined,
      }));
      const normalizeItems = (items) =>
        JSON.stringify((items ?? []).map((it) => ({ ...it, image: normalizeAsset(it.image) })));
      if (normalizeItems(itemList.itemListElement) !== normalizeItems(hydratedItems)) {
        addIssue("itemListItems", path, {
          prerenderSample: (itemList.itemListElement ?? [])[0],
          hydratedSample: hydratedItems[0],
        });
      }
    }

    const fb = unescapeHtml(head.fallback);
    const missing = [];
    for (const p of selected)
      if (!fb.includes(`/products/${p.slug}`)) missing.push(`product:${p.id}`);
    for (const section of page.sections || [])
      if (!fb.includes(section.heading)) missing.push(`section:${section.heading.slice(0, 24)}`);
    for (const faqItem of page.faqs || [])
      if (!fb.includes(faqItem.question)) missing.push(`faq:${faqItem.question.slice(0, 24)}`);
    for (const link of page.links || [])
      if (!fb.includes(link.href.replace(/^\//, ""))) missing.push(`link:${link.href}`);
    for (const slug of getArticlesForLandingPage(page.slug, page.title)) {
      if (!fb.includes(`/education/${slug}`)) missing.push(`article:${slug}`);
    }
    if (missing.length) addIssue("guideFallbackMissing", path, { missing });
  }

  /**
   * JSON-LD parity model for the static routes.
   *
   * Some routes call clearPrerenderJsonLd() and re-inject their own nodes; for
   * those the hydrated set is the injected list. Routes that never touch
   * JSON-LD leave the prerendered blocks in the DOM, so for those the hydrated
   * set is "whatever the prerender emitted" (PERSIST).
   *
   * Template-level Organization/LocalBusiness are excluded from the comparison.
   */
  const PERSIST = Symbol("persist");
  const HYDRATED_JSONLD = {
    "/": PERSIST,
    "/products/men": ["ItemList", "BreadcrumbList", "FAQPage"],
    "/products/women": ["ItemList", "BreadcrumbList", "FAQPage"],
    "/products/devices": ["ItemList", "BreadcrumbList", "FAQPage"],
    "/education": PERSIST,
    "/medical-review-board": PERSIST,
    "/about": PERSIST,
    "/contact": PERSIST,
    "/shipping": PERSIST,
    "/returns": PERSIST,
    "/terms": PERSIST,
    "/privacy": PERSIST,
    "/cart": PERSIST,
    "/order-confirmed": PERSIST,
    "/wishlist": PERSIST,
    "/search": PERSIST,
    "/refer": PERSIST,
  };

  /* ===== static routes ===== */
  const staticFiles = {
    "/": resolve(DIST, "index.html"),
    "/products/men": resolve(DIST, "products", "men.html"),
    "/products/women": resolve(DIST, "products", "women.html"),
    "/products/devices": resolve(DIST, "products", "devices.html"),
    "/education": resolve(DIST, "education.html"),
    "/medical-review-board": resolve(DIST, "medical-review-board.html"),
    "/about": resolve(DIST, "about.html"),
    "/contact": resolve(DIST, "contact.html"),
    "/shipping": resolve(DIST, "shipping.html"),
    "/returns": resolve(DIST, "returns.html"),
    "/terms": resolve(DIST, "terms.html"),
    "/privacy": resolve(DIST, "privacy.html"),
    "/cart": resolve(DIST, "cart.html"),
    "/order-confirmed": resolve(DIST, "order-confirmed.html"),
    "/wishlist": resolve(DIST, "wishlist.html"),
    "/search": resolve(DIST, "search.html"),
    "/refer": resolve(DIST, "refer.html"),
  };

  for (const [path, file] of Object.entries(staticFiles)) {
    if (!existsSync(file)) {
      addIssue("missingPrerenderFile", path, {});
      continue;
    }
    results.pages++;
    const head = readHead(file);
    let loaderData;
    if (path === "/products/men")
      loaderData = { items: products.filter((p) => p.category === "men"), query: "", total: 0 };
    if (path === "/products/women")
      loaderData = { items: products.filter((p) => p.category === "women") };
    if (path === "/products/devices")
      loaderData = { items: products.filter((p) => p.category === "devices") };
    if (path === "/education") loaderData = { articles };
    const hydrated = await hydratedHead(path, loaderData);

    compare(path, "title", head.title, hydrated.title);
    compare(path, "description", head.description, hydrated.description);
    compare(path, "robots", head.robots, hydrated.robots);
    compare(path, "canonical", head.canonical, `${SITE_URL}${path === "/" ? "/" : path}`);

    // JSON-LD parity: the prerendered blocks vs what the SPA injects after
    // clearPrerenderJsonLd() (template-level Organization/LocalBusiness stay).
    const ld = graphLd(head.jsonLd);
    const TEMPLATE_TYPES = new Set(["Organization", "LocalBusiness"]);
    const prerenderTypes = ld
      .map((node) => node?.["@type"])
      .flat()
      .filter((type) => typeof type === "string" && !TEMPLATE_TYPES.has(type))
      .sort();
    const expected = HYDRATED_JSONLD[path];
    const hydratedTypes =
      expected === PERSIST ? prerenderTypes.slice() : (expected || []).slice().sort();
    if (JSON.stringify(prerenderTypes) !== JSON.stringify(hydratedTypes)) {
      addIssue("jsonLdSetMismatch", path, {
        prerender: prerenderTypes,
        hydrated: hydratedTypes,
      });
    }

    // ItemList parity on category pages
    const itemList = findLd(ld, "ItemList");
    if (["/products/men", "/products/women", "/products/devices"].includes(path)) {
      const items = getProductsByCategory(path.split("/").pop());
      if (!itemList) {
        addIssue("missingItemListSchema", path, {});
      } else if (itemList.numberOfItems !== items.length) {
        addIssue("itemListCount", path, {
          prerender: itemList.numberOfItems,
          hydrated: items.length,
        });
      } else {
        const order = (itemList.itemListElement || []).map((it) => it.url);
        const expected = items.map((p) => `${SITE_URL}/products/${p.slug}`);
        if (JSON.stringify(order) !== JSON.stringify(expected)) {
          addIssue("itemListOrder", path, { prerenderFirst: order[0], hydratedFirst: expected[0] });
        }
        const extraKeys = new Set();
        for (const it of itemList.itemListElement || []) {
          for (const key of Object.keys(it)) extraKeys.add(key);
        }
        if (extraKeys.has("price") || extraKeys.has("offers")) {
          addIssue("itemListExtraFields", path, { keys: [...extraKeys] });
        }
      }
      const fb = unescapeHtml(head.fallback);
      // اسم ItemList في النسخة الثابتة لازم يطابق الاسم الذي يحقنه الـ route
      // (itemListSchema(items, PAGE_TITLE)) — كان يُبنى من عنوان السيو فيظهر
      // داخل البيانات المنظمة بلاحقة العلامة «… | اليسر ميديكال».
      if (itemList && itemList.name) {
        const h1 = (fb.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1];
        const h1Text = h1 ? h1.replace(/<[^>]+>/g, "").trim() : null;
        if (h1Text && itemList.name !== h1Text) {
          addIssue("itemListNameMismatch", path, {
            prerender: itemList.name,
            hydratedRouteUses: h1Text,
          });
        }
        if (/\|\s*اليسر ميديكال|—\s*اليسر ميديكال/.test(String(itemList.name))) {
          addIssue("itemListNameBrandSuffix", path, { name: itemList.name });
        }
      }
      const links = [...fb.matchAll(/\/products\/([a-z0-9-]+)"/g)].map((m) => m[1]);
      const unique = [...new Set(links)];
      const missingItems = items.filter((p) => !unique.includes(p.slug));
      if (missingItems.length) {
        addIssue("categoryFallbackMissingProducts", path, {
          count: missingItems.length,
          sample: missingItems.slice(0, 3).map((p) => p.slug),
        });
      }
    }
  }

  /* ===== heading hygiene inside prerendered fallback content ===== */
  // عناوين <h1>–<h6> في النسخة الثابتة لازم تكون نصاً نظيفاً: بلا لاحقة
  // علامة («| اليسر ميديكال») وبلا كلمة مكررة — كان عنوان أقسام الرجال/النساء
  // يُبنى من عنوان السيو فيظهر «منتجات منتجات … | اليسر ميديكال».
  for (const file of walkDistHtml()) {
    const html = readFileSync(file, "utf-8");
    const rel = file.slice(DIST.length).replace(/\\/g, "/");
    for (const m of html.matchAll(/<(h[1-6])[^>]*>([\s\S]*?)<\/\1>/gi)) {
      const text = m[2]
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (!text) continue;
      if (/\|\s*اليسر ميديكال|—\s*اليسر ميديكال/.test(text))
        addIssue("headingBrandSuffix", rel, { tag: m[1], text });
      const words = text.split(" ");
      for (let i = 1; i < words.length; i++) {
        if (words[i] === words[i - 1] && words[i].length > 2 && !/^[\d.,%]+$/.test(words[i])) {
          addIssue("headingDoubledWord", rel, { tag: m[1], text });
          break;
        }
      }
    }
  }

  /* ===== length guards (prerender truncation would break parity) ===== */
  const longDesc = [];
  const longTitle = [];
  for (const product of products) {
    const d = makeProductMetaDescription(product);
    if (d.length > 155) longDesc.push({ page: `/products/${product.slug}`, len: d.length });
    const t = makeProductMetaTitle(product.name);
    if (t.endsWith("…")) longTitle.push({ page: `/products/${product.slug}`, title: t });
  }
  for (const article of articles) {
    if (article.excerpt.length > 155) {
      longDesc.push({ page: `/education/${article.slug}`, len: article.excerpt.length });
    }
  }
  for (const page of seoLandingPages) {
    if ((page.metaDescription || "").length > 155) {
      longDesc.push({ page: `/products/guides/${page.slug}`, len: page.metaDescription.length });
    }
    if ((page.metaTitle || "").length > 65) {
      longTitle.push({ page: `/products/guides/${page.slug}`, len: page.metaTitle.length });
    }
  }
  if (longDesc.length) addIssue("metaDescriptionOver155", "catalog", { items: longDesc });
  if (longTitle.length) addIssue("titleTooLong", "catalog", { items: longTitle });

  /* ===== summary ===== */
  const byKind = {};
  for (const issue of results.issues) byKind[issue.kind] = (byKind[issue.kind] || 0) + 1;
  results.summary = {
    pages: results.pages,
    issues: results.issues.length,
    byKind,
  };

  const jsonPath = resolve(ROOT, "AUDIT-PRERENDER-VS-HYDRATED.json");
  writeFileSync(jsonPath, JSON.stringify(results, null, 2));

  const mdLines = [
    "# Prerender ↔ Hydrated parity audit",
    "",
    `- Generated: ${results.generatedAt}`,
    `- Pages checked: ${results.pages}`,
    `- Issues: ${results.issues.length}`,
    "",
    "## Issues by kind",
    "",
    "| kind | count |",
    "| --- | --- |",
    ...Object.entries(byKind)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `| ${k} | ${v} |`),
    "",
    "## First 40 issues",
    "",
    ...results.issues
      .slice(0, 40)
      .map((i) => `- **${i.kind}** — \`${i.page}\` — ${JSON.stringify(i.detail).slice(0, 400)}`),
    "",
  ];
  writeFileSync(resolve(ROOT, "AUDIT-PRERENDER-VS-HYDRATED.md"), mdLines.join("\n"));

  if (WANT_JSON) console.log(JSON.stringify(results.summary, null, 2));
  else {
    console.log(`pages checked: ${results.pages}`);
    console.log(`issues: ${results.issues.length}`);
    for (const [kind, count] of Object.entries(byKind).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${kind}: ${count}`);
    }
    const samples = {};
    for (const issue of results.issues) {
      if (!samples[issue.kind]) samples[issue.kind] = issue;
    }
    for (const [kind, issue] of Object.entries(samples)) {
      console.log(
        `\n--- ${kind} (${issue.page})\n${JSON.stringify(issue.detail, null, 2).slice(0, 900)}`,
      );
    }
  }

  process.exitCode = results.issues.length > 0 ? 1 : 0;
} finally {
  await vite.close();
}
