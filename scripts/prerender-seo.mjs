/**
 * ============================================================
 * Pre-render SEO HTML for each route
 * ============================================================
 * Generates a static HTML file per page (products, articles, and
 * key static routes) with:
 *   • A unique <title> and <meta description>
 *   • Full Open Graph + Twitter card meta
 *   • <link rel="canonical">
 *   • Schema.org JSON-LD (Product / Article / BreadcrumbList / WebPage)
 *   • A visible initial HTML fallback holding the real route text
 *     (product name, description, benefits, article body) so users,
 *     assistive technology, and crawlers see the same content before
 *     the React app boots.
 *
 * Uses Vite's ssrLoadModule to resolve TypeScript data files
 * without booting a full dev server.
 * ============================================================
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DIST = resolve(ROOT, "dist");
const SITE_URL = (process.env.SITE_URL || "https://elysrmedical.store").replace(/\/$/, "");
const SITE_NAME = "اليسر ميديكال";
const priceValidUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

/** 🗂️ رقم إصدار الكاش من المصدر المركزي الوحيد. */
const { version: CACHE_VERSION } = JSON.parse(
  readFileSync(resolve(ROOT, "config/cache-version.json"), "utf-8"),
);

/** يلحق رقم الإصدار بمسار صورة/أصل (يزيل أي ?v= قديم أولاً). */
function assetUrl(path) {
  const base = String(path).split("?")[0];
  return `${base}?v=${CACHE_VERSION}`;
}

/** HTML-escape */
function esc(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * اسم المعدود الصحيح نحوياً بعد الرقم (3–10 جمع، 11+ مفرد منصوب).
 * يُستخدم في عناوين قوائم المنتجات الثابتة: «— 54 منتجاً» / «— 7 منتجات».
 */
function arabicCountNoun(n) {
  const v = Number(n) || 0;
  if (v >= 3 && v <= 10) return "منتجات";
  return "منتجاً";
}

/**
 * يبني meta description بطول مثالي (~150-155 حرف) للظهور الكامل في نتائج Google.
 * يقطع عند حدود كلمة حتى لا يترك كلمة مقطوعة، ويضيف "…" عند الاقتطاع.
 * يُستخدم للـ <meta name="description"> وog/twitter فقط،
 * بينما يبقى الوصف الكامل في JSON-LD والـ body.
 */
/** وصف مقتطع أثناء البناء — يُبلَّغ عنه في النهاية بدل أن يمر بصمت. */
const TRUNCATED_META = [];

function makeMetaDescription(text = "", maxLength = 155) {
  const clean = String(text).trim().replace(/\s+/g, " ");
  if (clean.length <= maxLength) return clean;
  const cut = clean.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  const base = lastSpace > 40 ? cut.slice(0, lastSpace) : cut;
  TRUNCATED_META.push({ length: clean.length, maxLength, preview: `${base.slice(-40)}…` });
  return `${base}…`;
}

/**
 * Titles are emitted verbatim.
 *
 * The SPA sets `document.title` from the same route data without truncation,
 * so trimming here made the initial HTML and the rendered DOM disagree
 * (Google renders JS and may index either copy). Titles that are too long are
 * a data problem: shorten them at the source instead of clipping at build time.
 */
function makeTitle(text = "") {
  return String(text).trim().replace(/\s+/g, " ");
}

/** Build a complete HTML page from the template + overrides */
function buildHtml(template, opts) {
  const {
    title,
    description,
    image,
    canonical,
    jsonLd = [],
    bodyContent = "",
    type = "website",
    noindex = false,
    heroPreload = false,
    preloadImage = "",
    // (2026-09-17) بيانات الصورة لمشاركة الـ OG — الأبعاد الحقيقية للملف
    // (مش أبعاد العرض) + alt وصفية (SEO + accessibility + معاينة المشاركة).
    imageAlt,
    imageWidth = 1200,
    imageHeight = 631,
  } = opts;

  let html = template;
  // 🎯 اقتطاع ذكي للـ title والـ description إلى أطوال مثالية للظهور الكامل في Google.
  const safeTitle = esc(makeTitle(title));
  const safeDesc = esc(makeMetaDescription(description));
  const safeImg = esc(image);
  const safeCanonical = esc(canonical);

  // title
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${safeTitle}</title>`);

  // description
  // The template keeps this tag formatted across multiple lines. Match the
  // complete meta element by attributes rather than assuming a one-line tag;
  // otherwise every prerendered route receives a second description and search
  // engines may pick the generic template text instead of the route-specific
  // description.
  const descriptionMeta =
    /<meta\b(?=[^>]*\bname=["']description["'])(?=[^>]*\bcontent=["'][^"']*["'])[^>]*>/i;
  if (descriptionMeta.test(html)) {
    html = html.replace(descriptionMeta, `<meta name="description" content="${safeDesc}" />`);
  } else {
    html = html.replace("</head>", `  <meta name="description" content="${safeDesc}" />\n</head>`);
  }

  // og + twitter
  // Route head data can already exist in the Vite template (for example the
  // home route's OG tags). Keep exactly one copy of each singleton metadata
  // tag so product-specific social previews cannot compete with a generic copy.
  const replaceOrInsert = (regex, tag) => {
    const normalizedSource = regex.source.replaceAll("<meta ", "<meta\\s+");
    const globalRegex = new RegExp(
      normalizedSource,
      regex.flags.includes("g") ? regex.flags : `${regex.flags}g`,
    );
    let replaced = false;
    html = html.replace(globalRegex, () => {
      if (replaced) return "";
      replaced = true;
      return tag;
    });
    if (!replaced) html = html.replace("</head>", `  ${tag}\n</head>`);
  };
  replaceOrInsert(
    /<meta property="og:title"[^>]*>/,
    `<meta property="og:title" content="${safeTitle}" />`,
  );
  replaceOrInsert(
    /<meta property="og:description"[^>]*>/,
    `<meta property="og:description" content="${safeDesc}" />`,
  );
  replaceOrInsert(
    /<meta property="og:type"[^>]*>/,
    `<meta property="og:type" content="${esc(type)}" />`,
  );
  replaceOrInsert(
    /<meta property="og:url"[^>]*>/,
    `<meta property="og:url" content="${safeCanonical}" />`,
  );
  replaceOrInsert(
    /<meta property="og:image"[^>]*>/,
    `<meta property="og:image" content="${safeImg}" />`,
  );
  // (2026-09-17) أبعاد + alt للصورة — الأبعاد الحقيقية للملف (مش العرض)
  const safeImgAlt = esc(imageAlt || title);
  replaceOrInsert(
    /<meta property="og:image:width"[^>]*>/,
    `<meta property="og:image:width" content="${imageWidth}" />`,
  );
  replaceOrInsert(
    /<meta property="og:image:height"[^>]*>/,
    `<meta property="og:image:height" content="${imageHeight}" />`,
  );
  replaceOrInsert(
    /<meta property="og:image:alt"[^>]*>/,
    `<meta property="og:image:alt" content="${safeImgAlt}" />`,
  );
  replaceOrInsert(
    /<meta property="og:site_name"[^>]*>/,
    `<meta property="og:site_name" content="${esc(SITE_NAME)}" />`,
  );
  replaceOrInsert(
    /<meta name="twitter:card"[^>]*>/,
    `<meta name="twitter:card" content="summary_large_image" />`,
  );
  replaceOrInsert(
    /<meta name="twitter:title"[^>]*>/,
    `<meta name="twitter:title" content="${safeTitle}" />`,
  );
  replaceOrInsert(
    /<meta name="twitter:description"[^>]*>/,
    `<meta name="twitter:description" content="${safeDesc}" />`,
  );
  replaceOrInsert(
    /<meta name="twitter:image"[^>]*>/,
    `<meta name="twitter:image" content="${safeImg}" />`,
  );
  replaceOrInsert(
    /<meta name="twitter:image:alt"[^>]*>/,
    `<meta name="twitter:image:alt" content="${safeImgAlt}" />`,
  );

  // canonical
  if (/<link rel="canonical"[^>]*>/.test(html)) {
    html = html.replace(
      /<link rel="canonical"[^>]*>/,
      `<link rel="canonical" href="${safeCanonical}" />`,
    );
  } else {
    html = html.replace("</head>", `  <link rel="canonical" href="${safeCanonical}" />\n</head>`);
  }

  // robots directive (explicit per page)
  const robotsContent = noindex
    ? "noindex,follow,noarchive,nosnippet,noimageindex"
    : "index,follow,max-image-preview:large,max-snippet:-1";
  for (const name of ["robots", "googlebot"]) {
    const pattern = new RegExp(`<meta name="${name}"[^>]*>`);
    if (pattern.test(html)) {
      html = html.replace(pattern, `<meta name="${name}" content="${robotsContent}" />`);
    } else {
      html = html.replace(
        "</head>",
        `  <meta name="${name}" content="${robotsContent}" />\n</head>`,
      );
    }
  }

  // Home-only hero preload: keeps the LCP image discoverable in the initial
  // document without globally preloading it on routes that do not render Hero.
  if (heroPreload) {
    html = html.replace(
      "</head>",
      `  <link rel="preload" as="image" href="${assetUrl("/images/hero-banner-480.webp")}" imagesrcset="${assetUrl("/images/hero-banner-480.webp")} 480w, ${assetUrl("/images/hero-banner-640.webp")} 640w, ${assetUrl("/images/hero-banner-768.webp")} 768w, ${assetUrl("/images/hero-banner-960.webp")} 960w, ${assetUrl("/images/hero-banner.webp")} 1200w" imagesizes="100vw" fetchpriority="high" />
</head>`,
    );
  }

  // Route-specific LCP preload. The education index hydrates its first
  // article card after the shell; declaring the same image in the initial
  // document removes the lazy-image discovery delay without preloading every
  // article image on the site.
  if (preloadImage) {
    html = html.replace(
      "</head>",
      `  <link rel="preload" as="image" href="${esc(preloadImage)}" fetchpriority="high" />
</head>`,
    );
  }

  // JSON-LD blocks
  jsonLd.forEach((data, i) => {
    const tag = `<script type="application/ld+json" data-prerender="${i}">${JSON.stringify(data)}</script>`;
    html = html.replace("</head>", `${tag}\n</head>`);
  });

  // Put the real route content in the initial HTML. React replaces these
  // children when it mounts, but the pre-render remains visible and useful to
  // users, assistive technology, and crawlers instead of being a clipped
  // crawler-only copy.
  if (bodyContent) {
    // (2026-09-28) قرار المالك: هيكل first-paint محايد يظهر فقط عند وجود
    // JavaScript (صنف html.js) ويختفي فور تركيب React؛ بلا JavaScript يبقى
    // مخفياً وتظهر النسخة الثابتة الكاملة نفسها.
    const skeleton =
      `<div data-prerender-skeleton aria-hidden="true">` +
      `<div data-sk="hero"></div><div data-sk="row"></div><div data-sk="row"></div>` +
      `<div data-sk="grid"><div></div><div></div><div></div><div></div></div>` +
      `</div>`;
    const visibleFallback = `<div data-prerender-content dir="rtl" style="max-width:1120px;margin:0 auto;padding:32px 16px 48px;color:#14213d;font-family:Arial,sans-serif;line-height:1.8;">${bodyContent}</div>`;
    html = html.replace(
      '<div id="root"></div>',
      `<div id="root">${skeleton}${visibleFallback}</div>`,
    );
  }

  // The <noscript> block is the only copy of the page a no-JS visitor (and a
  // JS-less crawler fetch) can read. The template ships one generic marketing
  // sentence on every route, which made 252 pages share identical fallback
  // text that matched none of them — replace it with this page's own title and
  // description so the no-JS view is truthful and page-specific.
  html = html.replace(
    /(<noscript>\s*<div[^>]*>\s*)<p>[\s\S]*?<\/p>/,
    `$1<p>${safeTitle}</p>\n        <p>${safeDesc}</p>`,
  );

  return html;
}

async function prerender() {
  if (!existsSync(resolve(DIST, "index.html"))) {
    console.error("✗ dist/index.html not found. Run npm run build first.");
    process.exit(1);
  }

  const template = readFileSync(resolve(DIST, "index.html"), "utf-8");

  // 🚀 Minimal Vite server — only for ssrLoadModule (TypeScript resolution).
  // No plugins, no optimization — fastest possible boot.
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: "custom",
    optimizeDeps: { noDiscovery: true, include: [] },
    plugins: [],
    logLevel: "silent",
  });

  let productsCount = 0;
  let articlesCount = 0;
  let landingCount = 0;
  let staticCount = 0;

  try {
    const {
      products,
      getProductsByCategory,
      getCrossSellsForProduct,
      getFeaturedProducts,
      getProductById,
      HOMEPAGE_CONCERN_CANDIDATES,
      HOMEPAGE_EXCLUDED_PRODUCT_IDS,
    } = await vite.ssrLoadModule("/src/data/products.ts");
    const { getProductReviews } = await vite.ssrLoadModule("/src/lib/legacy-product-reviews.ts");
    const { makeProductMetaDescription, makeProductMetaTitle } =
      await vite.ssrLoadModule("/src/lib/seo.ts");
    const {
      getProductsForArticle,
      getRelatedArticles,
      getArticlesForLandingPage,
      getArticlesForProduct,
    } = await vite.ssrLoadModule("/src/lib/internal-links.ts");
    const { editorialTrustSignals } = await vite.ssrLoadModule(
      "/src/data/editorial-trust-signals.ts",
    );
    const { BUNDLE_DISCOUNT_RATE } = await vite.ssrLoadModule("/src/lib/bundle-discount.ts");
    const { productFAQs } = await vite.ssrLoadModule("/src/data/product-faqs.ts");
    const {
      GOVERNORATE_SHIPPING,
      SHIPPING_DELIVERY_TEXT,
      FREE_SHIPPING_THRESHOLD,
      getShippingDeliveryWindow,
    } = await vite.ssrLoadModule("/src/lib/site-config.ts");
    // نفس أرقام صفحة /shipping الحقيقية (src/routes/shipping.tsx يحسبها من
    // GOVERNORATE_SHIPPING و FREE_SHIPPING_THRESHOLD) — حتى لا تختلف السياسة
    // المعلنة في النسخة الثابتة عن المعلنة بعد الـ hydration.
    const SHIPPING_RATES = GOVERNORATE_SHIPPING.map((entry) => entry.shipping);
    const MIN_SHIPPING = Math.min(...SHIPPING_RATES);
    const MAX_SHIPPING = Math.max(...SHIPPING_RATES);
    const SHIPPING_FEES_TEXT = `تختلف حسب المحافظة (من ${MIN_SHIPPING} ج.م إلى ${MAX_SHIPPING} ج.م). الشحن مجاني للطلبات من ${FREE_SHIPPING_THRESHOLD} ج.م فأكثر.`;
    const shippingBands = new Map();
    for (const entry of GOVERNORATE_SHIPPING) {
      const delivery = getShippingDeliveryWindow(entry.name);
      const key = `${entry.shipping}:${delivery.key}`;
      const band = shippingBands.get(key) ?? {
        rate: entry.shipping,
        regions: [],
        delivery,
      };
      band.regions.push(entry.name);
      shippingBands.set(key, band);
    }
    const merchantShippingDetails = [...shippingBands.values()].map(
      ({ rate, regions, delivery }) => ({
        "@type": "OfferShippingDetails",
        shippingDestination: {
          "@type": "DefinedRegion",
          addressCountry: "EG",
          addressRegion: regions,
        },
        shippingRate: { "@type": "MonetaryAmount", value: rate, currency: "EGP" },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          handlingTime: {
            "@type": "QuantitativeValue",
            minValue: 0,
            maxValue: 0,
            unitCode: "DAY",
          },
          transitTime: {
            "@type": "QuantitativeValue",
            minValue: delivery.minDays,
            maxValue: delivery.maxDays,
            unitCode: "DAY",
          },
        },
      }),
    );
    let articles = [];
    try {
      const mod = await vite.ssrLoadModule("/src/data/articles.ts");
      articles = mod.articles || [];
    } catch {
      /* no articles */
    }
    let featuredArticleCards = [];
    try {
      const mod = await vite.ssrLoadModule("/src/data/articles-cards.generated.ts");
      featuredArticleCards = mod.featuredArticleCards || [];
    } catch {
      /* no generated article cards */
    }

    let seoLandingPages = [];
    try {
      const mod = await vite.ssrLoadModule("/src/data/landing-pages.ts");
      seoLandingPages = mod.seoLandingPages || [];
    } catch {
      /* no landing pages */
    }

    // (2026-09-17) Topic Authority: روابط الموضوعات في الـ HTML الثابت
    // (قابل للزحف من غير JS) — نفس محتوى TopicHub في الـ SPA.
    let TOPICS = [];
    let topicForArticle = () => undefined;
    let topicForGuide = () => undefined;
    let topicForProduct = () => undefined;
    let pillarPath = (t) =>
      t.pillarKind === "article"
        ? `/education/${t.pillarSlug}`
        : `/products/guides/${t.pillarSlug}`;
    let isPillarPath = (p) => false;
    try {
      const topicsMod = await vite.ssrLoadModule("/src/data/topics.ts");
      TOPICS = topicsMod.TOPICS || [];
      topicForArticle = topicsMod.topicForArticle;
      topicForGuide = topicsMod.topicForGuide;
      topicForProduct = topicsMod.topicForProduct;
      pillarPath = topicsMod.pillarPath;
      isPillarPath = topicsMod.isPillarPath;
    } catch {
      /* topics غير متاح — صفحات من غير روابط موضوعات */
    }

    const articleTitleOf = (slug) => (articles.find((a) => a.slug === slug) || {}).title || slug;
    const guideTitleOf = (slug) =>
      (seoLandingPages.find((p) => p.slug === slug) || {}).title || slug;
    const productNameOf = (id) => (products.find((p) => p.id === id) || {}).name || id;
    const productSlugOf = (id) => (products.find((p) => p.id === id) || {}).slug;

    /**
     * يبني HTML روابط الموضوعات للصفحة الحالية (static/crawler):
     *  • الـ pillar  ← "موضوع كامل": مقالات + أدلة + منتجات
     *  • satellite   ← "ارجع للدليل الشامل"
     *  • كلهم       ← "مواضيع مرتبطة" (3)
     */
    function topicLinksHtml(selfKind, selfSlug) {
      if (TOPICS.length === 0) return "";
      let topic;
      if (selfKind === "article") topic = topicForArticle(selfSlug);
      else if (selfKind === "guide") topic = topicForGuide(selfSlug);
      else if (selfKind === "product") topic = topicForProduct(selfSlug);
      if (!topic) return "";
      // مسار الصفحة الحالية (لسه مش pillarPath(topic) — ده كان دايماً
      // true: كان بيقارن الـ pillar بنفسه!)
      const selfPath =
        selfKind === "article"
          ? `/education/${selfSlug}`
          : selfKind === "guide"
            ? `/products/guides/${selfSlug}`
            : `/products/${productSlugOf(selfSlug) || selfSlug}`;
      const isPillar = isPillarPath(selfPath);
      const parts = [];

      if (!isPillar) {
        parts.push(
          // (2026-09-28) الصفحة الحقيقية لا ترسم هذا العنوان (TopicHub يعرض
          // «مواضيع مرتبطة» فقط لغير الـ pillar) — يبقى الرابط كنص بلا h2.
          `<p><a href="${SITE_URL}${pillarPath(topic)}">ارجع للدليل الشامل: ${esc(topic.pillarTitle)}</a></p>`,
        );
      } else {
        const cols = [];
        const aLinks = topic.articleSlugs
          .filter((s) => s !== selfSlug)
          .map((s) => `<li><a href="${SITE_URL}/education/${s}">${esc(articleTitleOf(s))}</a></li>`)
          .join("");
        const gLinks = topic.guideSlugs
          .filter((s) => s !== selfSlug)
          .map(
            (s) =>
              `<li><a href="${SITE_URL}/products/guides/${s}">${esc(guideTitleOf(s))}</a></li>`,
          )
          .join("");
        const pLinks = topic.productIds
          .filter((id) => id !== selfSlug)
          .map((id) => {
            const slug = productSlugOf(id);
            return slug
              ? `<li><a href="${SITE_URL}/products/${slug}">${esc(productNameOf(id))}</a></li>`
              : "";
          })
          .slice(0, 8)
          .join("");
        if (aLinks) cols.push(`<div><h3>مقالات موثقة</h3><ul>${aLinks}</ul></div>`);
        if (gLinks) cols.push(`<div><h3>أدلة عملية</h3><ul>${gLinks}</ul></div>`);
        if (pLinks) cols.push(`<div><h3>منتجات مختارة</h3><ul>${pLinks}</ul></div>`);
        if (cols.length) {
          parts.push(
            `<h2>${esc(topic.emoji || "")}موضوع ${esc(topic.name)} كامل</h2>${cols.join("")}`,
          );
        }
      }

      const related = TOPICS.filter((t) => t.id !== topic.id).slice(0, 3);
      if (related.length) {
        const items = related
          .map(
            (t) =>
              `<li><h3><a href="${SITE_URL}${pillarPath(t)}">${esc(t.pillarTitle)}</a></h3></li>`,
          )
          .join("");
        parts.push(`<h2>مواضيع مرتبطة</h2><ul>${items}</ul>`);
      }
      return `<section>${parts.join("\n")}</section>`;
    }

    /* ========== 1) Home page ========== */
    {
      const title = "اليسر ميديكال — أكبر شركة متخصصة في منتجات الصحة الزوجية الأصلية في مصر";
      const desc =
        "اليسر ميديكال أكبر شركة متخصصة في منتجات الصحة الزوجية الأصلية للرجال والنساء في مصر. منتجات أصلية مختارة بعناية، شحن سري ودفع عند الاستلام.";
      // The hydrated home route renders featured product cards and featured
      // article cards; the static copy must name the same items so a
      // no-JS/crawler visit is not a smaller or different page than the real
      // one, and so the strongest internal links exist in the initial HTML.
      const homeFeatured = getFeaturedProducts();
      const homeFeaturedBody = homeFeatured.length
        ? `<p><strong>اخترنا لك</strong></p><p>باقة مختارة بعناية من أفضل المنتجات والمكملات لدعم صحتك وحيويتك الزوجية بأمان وثقة</p><ul>${homeFeatured
            .map(
              (p) =>
                `<li><a href="${SITE_URL}/products/${p.slug}">${esc(p.name)}</a> — ${p.price} ج.م</li>`,
            )
            .join("")}</ul>`
        : "";
      const homeArticlesBody = featuredArticleCards.length
        ? `<h2>مكتبة التوعية والصحة الزوجية</h2><p>مقالات ونصوص توعوية مبسطة من خبرائنا تساعدك على فهم احتياجاتك لتعزيز جودة حياتك الزوجية بأمان</p><ul>${featuredArticleCards
            .map(
              (a) =>
                `<li><a href="${SITE_URL}/education/${a.slug}">${esc(a.title)}</a> — ${esc(a.category)} — ${a.readMin} دقائق قراءة</li>`,
            )
            .join(
              "",
            )}</ul><p><a href="${SITE_URL}/education">عرض كل المقالات التوعوية (${articles.length} مقالة)</a></p>`
        : "";
      // "أبرز فئات العناية والاهتمام" (ShopByConcern) uses the same shared
      // candidate source and the same featured/excluded filters as React.
      const featuredIds = new Set(homeFeatured.map((p) => p.id));
      const homeConcerns = [
        { label: "علاجات التأخير", link: "/products/men", ids: HOMEPAGE_CONCERN_CANDIDATES.delay },
        {
          label: "القوة والأداء",
          link: "/products/men",
          ids: HOMEPAGE_CONCERN_CANDIDATES.strength,
        },
        {
          label: "أجهزة طبية",
          link: "/products/devices",
          ids: HOMEPAGE_CONCERN_CANDIDATES.devices,
        },
        {
          label: "الرغبة والإثارة للنساء",
          link: "/products/women",
          ids: HOMEPAGE_CONCERN_CANDIDATES.women,
        },
      ].map((concern) => ({
        ...concern,
        products: concern.ids
          .filter((id) => !featuredIds.has(id) && !HOMEPAGE_EXCLUDED_PRODUCT_IDS.has(id))
          .slice(0, 3)
          .map(getProductById)
          .filter(Boolean),
      }));
      const homeConcernBody = `<h2>أبرز فئات العناية والاهتمام</h2><p>اختر الفئة التي تود التركيز عليها لتكتشف الحلول والمكملات المخصصة لدعم حيويتك الزوجية بأمان</p>${homeConcerns
        .map(
          (concern) =>
            `<section><h3>${esc(concern.label)}</h3><ul>${concern.products
              .map((p) => `<li><a href="${SITE_URL}/products/${p.slug}">${esc(p.name)}</a></li>`)
              .join(
                "",
              )}</ul><p><a href="${SITE_URL}${concern.link}">تصفح كل منتجات ${esc(concern.label)}</a></p></section>`,
        )
        .join("")}`;
      let html = buildHtml(template, {
        title,
        description: desc,
        image: `${SITE_URL}/og-default.webp`,
        canonical: `${SITE_URL}/`,
        type: "website",
        heroPreload: true,
        // (2026-09-17) og-default 1200×631 (الأبعاد الافتراضية في buildHtml)
        imageAlt: "اليسر ميديكال — أكبر شركة متخصصة في منتجات الصحة الزوجية الأصلية في مصر",
        jsonLd: [
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            "@id": `${SITE_URL}/#website-search`,
            url: SITE_URL,
            name: "اليسر ميديكال",
            alternateName: ["اليسر", "Elysr", "Elysr Medical"],
            potentialAction: {
              "@type": "SearchAction",
              target: {
                "@type": "EntryPoint",
                // البحث الشامل (كل الفئات) — نفس القالب المُعلَن في الـ sitemap
                urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
              },
              "query-input": "required name=search_term_string",
            },
          },
        ],
        bodyContent: `<h1>اليسر ميديكال — أكبر شركة متخصصة في منتجات الصحة الزوجية الأصلية في مصر</h1>
<p>${esc(desc)}</p>
<p>نوفر تشكيلة مختارة من المكملات والمنتجات الموضعية والأجهزة المساعدة، مع وصف واضح للمكونات وطريقة الاستخدام والتحذيرات المتاحة لكل منتج.</p>
<p>نحافظ على خصوصية الطلبات بتغليف محايد وشحن سري، ونوفر الدفع عند الاستلام حيثما كان متاحاً. يمكن التواصل معنا عبر واتساب للاستفسار عن المنتجات والطلبات، مع التأكيد أن المحتوى التوعوي لا يغني عن استشارة الطبيب أو الصيدلي.</p>
<h2>تسوق حسب الفئة</h2>
<ul>
  <li><a href="${SITE_URL}/products/men">منتجات الصحة الزوجية للرجال</a> — مكملات، عسل، جل وبخاخات مختارة لدعم الصحة الزوجية للرجال</li>
  <li><a href="${SITE_URL}/products/women">منتجات الصحة الزوجية للنساء</a> — منتجات مختارة لدعم الراحة والحيوية والثقة للنساء</li>
  <li><a href="${SITE_URL}/products/devices">الأجهزة والمستلزمات الطبية</a> — أجهزة احترافية للاستخدام الشخصي</li>
  <li><a href="${SITE_URL}/education">مقالات التوعية الصحية</a> — مقالات علمية موثوقة عن الصحة الزوجية</li>
</ul>
${homeFeaturedBody}
${homeConcernBody}
${homeArticlesBody}
<p><strong>لماذا اليسر ميديكال؟</strong></p>
<ul>
  <li>منتجات مختارة من مصادر وموردين موثوقين</li>
  <li>شحن سري وتغليف محايد لجميع محافظات مصر</li>
  <li>الدفع عند الاستلام حيثما كان متاحاً</li>
  <li>معلومات واضحة عن المكونات والاستخدام والتحذيرات</li>
  <li>تواصل مباشر عبر واتساب للاستفسارات والطلبات</li>
</ul>`,
      });
      // Hero preload is already handled by buildHtml with heroPreload:true above.
      // No need for a duplicate preload here — it would cause unused-preload browser warnings.
      writeFileSync(resolve(DIST, "index.html"), html);
      staticCount++;
    }

    /* ========== 2) Static routes ========== */
    // Keep category fallback FAQs byte-for-byte aligned with the React routes;
    // these answers are visible in the hydrated accordion and in the static
    // fallback/FAQ schema.
    const menCategoryFaqs = [
      {
        question: "ما هي منتجات الصحة الزوجية للرجال؟",
        answer:
          "هي منتجات مختارة لدعم احتياجات الرجل داخل العلاقة الزوجية مثل الطاقة والحيوية، التحكم في التوقيت، الراحة والثقة. الاختيار المناسب يعتمد على الحالة الصحية ونوع الاحتياج، مع ضرورة استشارة الطبيب عند وجود أمراض مزمنة أو استخدام أدوية أخرى.",
      },
      {
        question: "كيف أختار بين العسل، الكبسولات، الجل أو البخاخ؟",
        answer:
          "العسل والمكملات تناسب غالباً دعم الطاقة والحيوية، بينما المنتجات الموضعية مثل الجل أو البخاخ تُستخدم حسب التعليمات لاحتياج محدد. اقرأ وصف كل منتج ومكوناته وطريقة الاستخدام، ولا تجمع أكثر من منتج قوي في نفس الوقت دون استشارة مختص.",
      },
      {
        question: "هل منتجات السعادة الزوجية للرجال آمنة؟",
        answer:
          "الأمان يعتمد على المكونات، الجرعة، مصدر المنتج وحالتك الصحية. لا تستخدم أي منتج إذا كنت تتناول أدوية القلب أو الضغط أو النترات إلا بعد استشارة الطبيب. جميع الطلبات في اليسر ميديكال تتم بسرية مع إرشادات استخدام واضحة لكل منتج.",
      },
      {
        question: "هل يوجد شحن سري لمنتجات الصحة الزوجية داخل مصر؟",
        answer:
          "نعم، يتم الشحن بتغليف محايد وسري لجميع المحافظات، مع عدم توضيح طبيعة المنتج على العبوة الخارجية حفاظاً على الخصوصية.",
      },
      {
        question: "متى يجب استشارة الطبيب قبل استخدام منتجات الصحة الزوجية؟",
        answer:
          "استشر الطبيب إذا كنت تعاني من أمراض القلب أو الضغط أو السكر أو الكبد أو الكلى، أو تستخدم أدوية مزمنة، أو لديك حساسية معروفة من أحد المكونات. المحتوى والمنتجات لا تغني عن الاستشارة الطبية المتخصصة.",
      },
    ];

    const womenCategoryFaqs = [
      {
        question: "ما هي منتجات الصحة الزوجية للنساء؟",
        answer:
          "هي منتجات مختارة لدعم الراحة، الحيوية، الترطيب، الثقة وتحسين التجربة الزوجية للمرأة. تختلف طريقة الاختيار حسب الاحتياج ونوع المنتج، ويُفضل قراءة المكونات والتعليمات واستشارة الطبيب عند وجود حمل أو رضاعة أو أمراض مزمنة.",
      },
      {
        question: "كيف أختار بين القطرات، العسل، الجل أو المنتجات الموضعية؟",
        answer:
          "القطرات والعسل تناسب غالباً دعم الحيوية والمزاج والطاقة، بينما الجل والمنتجات الموضعية تُستخدم لاحتياجات مثل الترطيب أو الراحة الموضعية حسب تعليمات المنتج. لا تستخدمي أكثر من منتج في نفس الوقت دون فهم المكونات أو استشارة مختص.",
      },
      {
        question: "هل منتجات السعادة الزوجية للنساء مناسبة لكل السيدات؟",
        answer:
          "ليست كل المنتجات مناسبة للجميع. يجب تجنب أي منتج يحتوي على مكونات قد تسبب حساسية لكِ، واستشارة الطبيب في حالات الحمل والرضاعة، اضطرابات الهرمونات، الأمراض المزمنة أو استخدام أدوية منتظمة.",
      },
      {
        question: "هل الشحن سري لمنتجات الصحة الزوجية للنساء؟",
        answer:
          "نعم، يتم تجهيز الطلبات بتغليف محايد وسري، ولا يتم ذكر طبيعة المنتج على العبوة الخارجية حفاظاً على الخصوصية في جميع محافظات مصر.",
      },
      {
        question: "هل يمكن الدفع عند الاستلام؟",
        answer:
          "نعم، يمكنك إتمام الطلب عبر واتساب أو الطلب المباشر، مع إمكانية الدفع عند الاستلام حسب المحافظة وتفاصيل الشحن المتاحة وقت تأكيد الطلب.",
      },
    ];

    // (2026-09-29) توسعة صفحة الأجهزة الرقيقة: نفس أسئلة وأجوبة
    // DEVICES_CATEGORY_FAQS في src/routes/products.devices.tsx حرفياً.
    const devicesCategoryFaqs = [
      {
        question: "ما الأجهزة والمستلزمات الطبية المتاحة في هذا القسم؟",
        answer:
          "يضم القسم مضخات التفريغ وأجهزة الشد وأدوات التأهيل المختارة بعناية لدعم احتياجات الصحة الزوجية، مع وصف واضح لكل منتج في صفحته.",
      },
      {
        question: "كيف أختار الجهاز المناسب لي؟",
        answer:
          "اقرأ وصف المنتج وطريقة الاستخدام والتنبيهات المذكورة في صفحته، واختر بحسب احتياجك. إذا كنت تعاني من حالة صحية مزمنة أو تتناول أدوية فاستشر طبيبك قبل الاستخدام.",
      },
      {
        question: "هل الشحن سري للأجهزة والمستلزمات الطبية؟",
        answer:
          "نعم، تُشحن جميع الطلبات بتغليف محايد تماماً لا يكشف طبيعة المنتج، ولا تُكتب أي تفاصيل عن المحتوى على العبوة الخارجية أو بوليصة الشحن.",
      },
      {
        question: "هل يمكن الدفع عند الاستلام؟",
        answer:
          "نعم، يمكنك إتمام الطلب عبر واتساب أو الطلب المباشر، مع إمكانية الدفع عند الاستلام حسب المحافظة وتفاصيل الشحن المتاحة وقت تأكيد الطلب.",
      },
      {
        question: "ما سياسة الاسترجاع للأجهزة؟",
        answer:
          "يحق لك الاستبدال أو الاسترجاع خلال 14 يوماً من تاريخ الاستلام بشرط أن يكون المنتج غير مفتوح وبحالته الأصلية، ويتم الاسترداد خلال 7 أيام عمل بعد الفحص.",
      },
    ];

    const staticRoutes = [
      {
        path: "/products/men",
        title: "منتجات الصحة الزوجية للرجال في مصر | اليسر ميديكال",
        desc: "تسوق منتجات الصحة الزوجية للرجال الأصلية في مصر: مكملات، عسل، جل وبخاخات للطاقة والأداء والتحكم، مختارة بعناية مع شحن سري ودفع عند الاستلام وتغليف محايد.",
        h1: "منتجات الصحة الزوجية للرجال",
        bodyDescription:
          "مكمّلات غذائية، عسل ملكي، بخاخات، كريمات وجل موضعي مختارة بعناية لدعم الصحة الزوجية للرجال مع الخصوصية والشحن السري داخل مصر.",
        faqs: menCategoryFaqs,
        faqTitle: "أسئلة شائعة عن منتجات الصحة الزوجية للرجال",
      },
      {
        path: "/products/women",
        title: "منتجات الصحة الزوجية للنساء في مصر | اليسر ميديكال",
        desc: "تسوق منتجات الصحة الزوجية للنساء الأصلية في مصر: قطرات، عسل، جل ومنتجات مختارة للراحة والحيوية مع شحن سري ودفع عند الاستلام.",
        h1: "منتجات الصحة الزوجية للنساء",
        bodyDescription:
          "منتجات مختارة بعناية لدعم الراحة، الترطيب، الحيوية والثقة في العلاقة الزوجية للمرأة مع التزام كامل بالخصوصية وسرية التوصيل.",
        faqs: womenCategoryFaqs,
        faqTitle: "أسئلة شائعة عن منتجات الصحة الزوجية للنساء",
      },
      {
        path: "/products/devices",
        title: "الأجهزة والمستلزمات الطبية — اليسر ميديكال",
        desc: "تصفح أجهزة الصحة الزوجية والمستلزمات الطبية: مضخات التفريغ، أجهزة الشد، وأدوات التأهيل، بجودة موصوفة بوضوح مع شحن سري ودفع عند الاستلام وتغليف محايد.",
        h1: "الأجهزة والمستلزمات الطبية",
        bodyDescription:
          "أجهزة ومستلزمات طبية موثوقة مختارة بعناية، مع جودة عالية وشحن سري لكل المحافظات لتجربة أكثر أماناً واحترافية.",
        faqs: devicesCategoryFaqs,
        faqTitle: "أسئلة شائعة عن الأجهزة والمستلزمات الطبية",
      },
      {
        path: "/education",
        title: "التوعية الجنسية — مقالات علمية موثوقة | اليسر ميديكال",
        desc: "مكتبة مقالات توعوية موثوقة بالعربية عن الصحة الجنسية والعلاقات الزوجية: ضعف الانتصاب، سرعة القذف، الرغبة، والتواصل بين الزوجين — بمصادر طبية مذكورة.",
        h1: "مكتبة التوعية الجنسية",
        bodyDescription:
          "مقالات توعوية مع مصادر واضحة تساعدك على فهم جسدك وعلاقاتك بشكل صحي وآمن. معرفتك هي الخطوة الأولى نحو راحة وثقة أكبر.",
      },
      {
        path: "/medical-review-board",
        title: "شفافية المحتوى: من يكتب وكيف نتحقق — اليسر ميديكال",
        // نفس وصف head() في src/routes/medical-review-board.tsx (مصدر واحد).
        desc: "من يكتب المحتوى، وكيف نتحقق منه آليًا، ما المصادر المعتمدة، وأين حدود مسؤوليتنا — بلا مبالغة وبلا مصطلحات غير حقيقية.",
        h1: "من يكتب المحتوى وكيف نتحقق منه",
        // (2026-09-28) قرار المالك: العناوين تطابق src/routes/medical-review-board.tsx
        // حرفياً (نفس نصوص H2 الستة) حتى لا يرى الزاحف هيكلًا مختلفاً عن الحقيقي.
        body:
          "<h2>كيف ينشأ المحتوى ويُتحقق منه</h2>" +
          "<p>الخطوات الحقيقية كما تتم فعلًا — من غير مبالغة.</p>" +
          "<h2>من يكتب المحتوى؟</h2>" +
          "<p>المحتوى الأصلي في الموقع كُتب شخصيًا من د. أحمد عابد — بكالوريوس صيدلة — بمسؤوليته التحريرية المباشرة، ويعتمد على بيانات المنتجات الأصلية ومصادر طبية معتمدة مثل منظمة الصحة العالمية وMayo Clinic وCleveland Clinic وMedlinePlus. المحتوى الجديد — بما في ذلك ما يُنجز بمساعدة الذكاء الاصطناعي — يُنشر تحت نفس المسؤولية التحريرية ونفس المعايير (مصادر موثوقة وتحذيرات واضحة)، ويمر بنفس الفحص الآلي. كل مقالة تحمل اسم كاتبها وتاريخ النشر وآخر تحديث.</p>" +
          "<h2>كيف نتحقق من المحتوى؟</h2>" +
          "<p>فحص آلي (CI) + مسؤولية تحرير المالك: كل مقالة تمر بفحص برمجي آلي قبل وبعد النشر: حيوية روابط المصادر، موثوقية النطاقات (مؤسسات طبية رسمية)، وجود تحذيرات الاستخدام، ومطابقة البيانات المنظمة. الفشل في أي فحص يمنع النشر.</p>" +
          "<h2>المصادر العلمية المعتمدة</h2>" +
          "<p>نعتمد على مصادر طبية عالمية موثوقة ومحكّمة. كل مقالة تحتوي على قسم المصادر في نهايتها مع روابط مباشرة للمصادر المستخدمة، وتُفحص صلاحية الروابط آليًا (في CI) في كل دورة نشر وتُحدَّث عند التغيير.</p>" +
          "<h2>سياسة التحرير والمحتوى</h2>" +
          "<p>بشفافية: لا يوجد لدينا لجنة مراجعة طبية دائمة ولا فريق مراجعة داخلية بالمعنى المؤسسي ولا إعادة مراجعة دورية تلقائية. سلامة عملائنا أولوية: لا نقدم تشخيصًا ولا وعودًا علاجية، ومحتوانا والمنتجات التي نقدمها لا تغني عن استشارة الطبيب المختص.</p>" +
          "<h2>وجدت خطأ أو معلومة غير دقيقة؟</h2>" +
          "<p>نرحب بملاحظاتك. إذا وجدت معلومة طبية غير دقيقة أو تحذيراً ناقصاً أو رابط مصدر معطّل، تواصل معنا فوراً وسنراجع ونحدّث المحتوى خلال 48 ساعة.</p>",
      },
      {
        path: "/about",
        // نفس قيم head() في src/routes/about.tsx (مصدر واحد بعد إزالة
        // applySeo() المكرر) — وكان العنوان/الوصف الثابت يختلف عمّا يُنشر
        // بعد الـ hydration.
        title: "من نحن — اليسر ميديكال | أكبر شركة متخصصة",
        desc: "تعرف على اليسر ميديكال، أكبر شركة متخصصة في منتجات الصحة الزوجية الأصلية في مصر، مع كتالوج مختار بعناية وشحن سري ودفع عند الاستلام.",
        h1: "اليسر ميديكال — أكبر شركة متخصصة",
        // (2026-09-28) قرار المالك: بنية العناوين تطابق src/routes/about.tsx
        // حرفياً (H2/H3 العشرة) مع نفس نصوص الصفحة الحقيقية.
        body:
          "<h2>قصتنا</h2>" +
          "<p>بدأت اليسر ميديكال كمبادرة صغيرة لحل مشكلة حقيقية: صعوبة حصول المصريين على منتجات صحة زوجية أصلية بأسعار معقولة وبخصوصية تامة. كان السوق مليئاً بالمنتجات المقلدة والأسعار المبالغة والتجارب المحرجة عند الشراء.</p>" +
          "<p>نعمل على مراجعة مصادر التوريد ووصف المنتجات، ونوفر نظام شحن سري يحترم خصوصية كل عميل، ومنصة إلكترونية تجعل تجربة الشراء أبسط وأكثر وضوحاً.</p>" +
          `<p>اليوم نحدّث كتالوجاً يضم ${products.length} منتجاً، مع توصيل سري إلى 27 محافظة والدفع عند الاستلام حيثما كان متاحاً.</p>` +
          "<h2>مهمتنا</h2>" +
          "<p>توفير منتجات صحة زوجية أصلية وموثوقة لكل مصري، بأسعار عادلة وشحن سري، مع محتوى تعليمي مسؤول يساعد على اتخاذ قرارات مستنيرة.</p>" +
          "<h2>رؤيتنا</h2>" +
          "<p>أن نكون المرجع الأول في العالم العربي لمنتجات الصحة الزوجية الأصلية، بمنصة تجمع بين الجودة والمصداقية والخصوصية والمحتوى التعليمي العلمي.</p>" +
          "<h2>لماذا يختار بعض العملاء اليسر؟</h2>" +
          "<h3>منتجات من مصادر موثوقة</h3>" +
          "<p>كل منتج مستورد مباشرة من المصنع الأصلي. لا نتعامل مع وسطاء أو مصادر مجهولة. نوفر صور العبوة الأصلية وكود التحقق عند توفره.</p>" +
          "<h3>خصوصية مطلقة</h3>" +
          "<p>تغليف محايد لا يدل على المحتوى. نوضح سياسة الخصوصية، ولا نعرض بيانات الطلب إلا للجهات اللازمة لتجهيزه وتوصيله.</p>" +
          "<h3>توصيل لكل مصر</h3>" +
          `<p>${esc(SHIPPING_DELIVERY_TEXT)}. الدفع عند الاستلام — لا نطلب بيانات دفع إلكتروني.</p>` +
          "<h3>دعم واتساب فوري</h3>" +
          "<p>فريق دعم متاح على واتساب للإجابة على أسئلتك ومساعدتك في اختيار المنتج المناسب بسرية تامة. تواصل معنا قبل أو بعد الطلب.</p>" +
          "<h3>محتوى تعليمي مسؤول</h3>" +
          "<p>مكتبة مقالات توعوية وأدلة مكتوبة بمسؤولية مع مصادر طبية موثوقة وتحذيرات واضحة. لا نقدم وعوداً علاجية ولا نستبدل الطبيب.</p>" +
          "<h3>نظام امتثال صارم</h3>" +
          "<p>كل منتج مصنّف (أخضر/أصفر/أحمر) بناءً على مكوناته. المنتجات عالية الحساسية تحمل تحذيرات واضحة. لا نروّج لمنتجات بادعاءات طبية مبالغة.</p>" +
          "<h2>فريق العمل</h2>" +
          "<p>يعمل خلف اليسر ميديكال فريق متكامل يضمن جودة كل خطوة من الاستيراد للتوصيل: فريق الاستيراد والجودة، فريق المحتوى، وفريق خدمة العملاء.</p>" +
          "<h3>د. أحمد عابد</h3>" +
          "<p>المؤسس — بكالوريوس صيدلة — المسؤولية التحريرية المباشرة لكل محتوى الموقع. صيدلي ومؤسس اليسر ميديكال، يكتب المحتوى التعليمي ووصف المنتجات شخصيًا بمسؤوليته التحريرية المباشرة، ويعتمد على مصادر طبية معتمدة (WHO، Mayo Clinic، Cleveland Clinic، NIH) مع فحص آلي (CI) لكل مقال قبل النشر.</p>" +
          "<h3>فريق الاستيراد والجودة</h3>" +
          "<p>مسؤول عن العلاقات مع الموردين الأصليين في أوروبا وآسيا، فحص جودة الشحنات، والتأكد من أصالة كل منتج قبل عرضه.</p>" +
          "<h3>فريق المحتوى</h3>" +
          "<p>د. أحمد عابد (صيدلي) يكتب المحتوى التعليمي ووصف المنتجات بمسؤوليته التحريرية المباشرة، ويتحقق الفحص الآلي (CI) من المصادر والتحذيرات. نلتزم بعدم تقديم أي وعود علاجية.</p>" +
          "<h3>فريق خدمة العملاء</h3>" +
          "<p>متاح على واتساب للإجابة عن الاستفسارات، المساعدة في اختيار المنتج، ومتابعة الطلبات والشحنات بسرية تامة.</p>" +
          "<h2>بيانات الثقة والمصداقية</h2>" +
          "<p>نلتزم بمعايير Google E-E-A-T (الخبرة — التخصص — السلطة — الثقة) في كل محتوى ننشره.</p>" +
          "<h3>الخبرة (Experience)</h3>" +
          "<p>نستخدم مصادر صحية منشورة في المقالات التوعوية، ونوضح حدود المحتوى وننصح بالرجوع إلى الطبيب أو الصيدلي عند الحاجة.</p>" +
          "<h3>التخصص (Expertise)</h3>" +
          "<p>مكتبة مقالات توعوية بمصادر مذكورة من WHO وMayo Clinic وCleveland Clinic، مع نظام تصنيف داخلي للمنتجات والتحذيرات.</p>" +
          "<h3>السلطة (Authoritativeness)</h3>" +
          "<p>نوضح مصدر المعلومات وسياسات الشحن والاسترجاع، ونفصل بين المراجعات المعتمدة من API والمحتوى التسويقي.</p>" +
          "<h3>الثقة (Trustworthiness)</h3>" +
          "<p>شحن سري وتغليف محايد، ودفع عند الاستلام حيثما كان متاحاً، وسياسة استرجاع منشورة لمدة 14 يوماً. لا وعود علاجية.</p>" +
          "<h3>شفافية المحتوى</h3>" +
          "<p>من يكتب المحتوى وكيف نتحقق منه.</p>" +
          "<h3>المقالات التعليمية</h3>" +
          "<p>مقالة توعوية بمصادر موثوقة.</p>" +
          "<h3>تواصل معنا</h3>" +
          "<p>واتساب + بريد إلكتروني.</p>",
        // (2026-09-16) E-E-A-T: كيان Person للمؤسس-الصيدلي — نفس الـ @id
        // اللي بيوصل له author في Article schema لكل المقالات (seo.ts)،
        // فكل المحتوى التعليمي مربوطة بهيكلية بذات الكيان صاحب الاعتمادات.
        extraJsonLd: [
          {
            "@context": "https://schema.org",
            "@type": "Person",
            "@id": `${SITE_URL}/about#founder`,
            name: "د. أحمد عابد",
            jobTitle: "المؤسس والمسؤولية التحريرية المباشرة",
            description:
              "بكالوريوس صيدلة — مؤسس اليسر ميديكال، يكتب المحتوى التعليمي ووصف المنتجات بمسؤوليته التحريرية المباشرة، مع تحقق آلي (CI) من المصادر والتحذيرات.",
            url: `${SITE_URL}/about`,
            worksFor: { "@type": "Organization", name: "اليسر ميديكال", url: SITE_URL },
            knowsAbout: ["الصحة الزوجية", "الصيدلة", "المكملات الغذائية", "الأجهزة الطبية"],
          },
        ],
      },
      {
        path: "/contact",
        title: "تواصل معنا — اليسر ميديكال",
        desc: "تواصل مع فريق اليسر ميديكال عبر واتساب للاستفسار عن المنتجات والطلبات والشحن، برد سريع وسرية تامة وخدمة عملاء تفهم حساسية الموضوع.",
        h1: "تواصل معنا",
        // (2026-09-28) القرار: الصفحة الحقيقية تبسّطت (hero + كارت واتساب) —
        // النسخة الثابتة تطابقها بدل أقسام قديمة لا تُرسم.
        bodyDescription:
          "التواصل متاح عبر واتساب فقط لضمان سرعة الرد، الخصوصية، والمتابعة المباشرة مع فريق اليسر ميديكال.",
        // (2026-09-29) توسعة الصفحات الرقيقة: نفس أقسام src/routes/contact.tsx حرفياً.
        body:
          "<p><strong>تواصل عبر واتساب</strong> — اضغط هنا لفتح المحادثة مباشرة.</p>" +
          "<h2>فريق خدمة العملاء جاهز لمساعدتك في</h2>" +
          "<ul><li>الاستفسار عن أي منتج ووصفه وطريقة استخدامه المعروضة في صفحته.</li><li>متابعة طلبك قبل التأكيد أو بعده حتى الاستلام.</li><li>معرفة رسوم الشحن ومدة التوصيل لمحافظتك.</li><li>ترتيب الاستبدال أو الاسترجاع وفق السياسة المعلنة.</li><li>أي مشكلة تواجهك أثناء تصفح الموقع أو إتمام الطلب.</li></ul>" +
          "<h2>كيف تحصل على رد أسرع؟</h2>" +
          "<p>جهّز رقم طلبك إن كان لديك طلب قائم، واذكر محافظتك لنوافيك برسوم الشحن ومدة التوصيل الدقيقة، واكتب استفسارك في رسالة واحدة واضحة لنتمكن من مساعدتك مباشرة. وإذا كان استفسارك عن منتج محدد فاذكر اسمه كما يظهر في المتجر لنصل إليه مباشرة.</p>" +
          "<h2>أين تجد إجابات سريعة؟</h2>" +
          `<p>قبل المراسلة قد تجد إجابتك مباشرة في صفحاتنا: <a href="${SITE_URL}/shipping">سياسة الشحن</a> توضح المواعيد والرسوم، <a href="${SITE_URL}/returns">سياسة الاسترجاع</a> تشرح الخطوات والشروط، <a href="${SITE_URL}/terms">الشروط والأحكام</a> تغطي الاستخدام والدفع، ومكتبة <a href="${SITE_URL}/education">التوعية</a> تضم مقالات وأدلة مفصلة عن الصحة الزوجية.</p>` +
          "<h2>ماذا تتوقع بعد إرسال طلبك؟</h2>" +
          "<p>بعد إرسال طلبك عبر واتساب يقوم فريقنا بمراجعته والتواصل معك لتأكيد البيانات والعنوان، ثم يخرج الطلب للشحن، ويمكنك متابعة أي استفسار لاحق في نفس المحادثة حتى الاستلام. وإذا احتجت تعديل العنوان قبل خروج الطلب للشحن فأخبرنا فوراً في نفس المحادثة.</p>" +
          "<h2>خصوصيتك أولاً</h2>" +
          `<p>التواصل عبر واتساب فقط يضمن سرعة الرد وسرية المحادثة والمتابعة المباشرة. تُعامَل بيانات طلبك بسرية تامة، والوصول إليها مقتصر على من يحتاجها لأداء عمله فقط. لا نطلب منك أي بيانات حساسة عبر المحادثة، وكل ما نحتاجه لتنفيذ طلبك هو الاسم ورقم الهاتف والعنوان — والتفاصيل في <a href="${SITE_URL}/privacy">سياسة الخصوصية</a>.</p>`,
      },
      {
        path: "/shipping",
        title: "سياسة الشحن — اليسر ميديكال",
        desc: "تعرف على خدمة الشحن السري لجميع محافظات مصر: تغليف محايد يحفظ خصوصيتك، مواعيد توصيل واضحة، الدفع عند الاستلام، وتكاليف شحن منافسة.",
        h1: "نوصّل طلبك بسرعة وسرية",
        // (2026-09-29) توسعة الصفحات الرقيقة: نفس عناوين وفقرات
        // src/routes/shipping.tsx حرفياً (5 أقسام).
        body:
          "<h2>مدة التوصيل</h2>" +
          `<p>${esc(SHIPPING_DELIVERY_TEXT)}. يتم تأكيد الطلبات عبر واتساب قبل الشحن، ويمكن معرفة موعد وصول تقريبي عند تأكيد الطلب. وتبدأ مدة التوصيل من وقت تأكيد الطلب وخروجه للشحن.</p>` +
          "<h2>رسوم الشحن</h2>" +
          `<p>${esc(SHIPPING_FEES_TEXT)} وتُوضح لك رسوم الشحن لمحافظتك عند تأكيد الطلب.</p>` +
          "<h2>نطاق التغطية</h2>" +
          `<p>نشحن إلى جميع محافظات مصر: ${GOVERNORATE_SHIPPING.map((e) => e.name).join("، ")}. وتصل الطلبات حتى باب العنوان الذي تحدده عبر شركات شحن موثوقة.</p>` +
          "<h2>السرية</h2>" +
          "<p>جميع الطلبات تُغلَّف في عبوات محايدة لا تكشف هوية المنتج، ولا تُكتب أي تفاصيل عن المحتوى على العبوة الخارجية أو بوليصة الشحن. يصلك الطلب وكأنه أي شحنة تسوق عادية، ويمكنك استلامه بنفسك أو عبر من تنوبه.</p>" +
          "<h2>طرق الدفع</h2>" +
          "<p>يمكنك الدفع نقداً عند الاستلام أو الدفع إلكترونياً، ويتم تأكيد الطلب عبر واتساب قبل الشحن لضمان وضوح التفاصيل. والدفع عند الاستلام متاح حسب المحافظة وتفاصيل الشحن المتاحة وقت تأكيد الطلب.</p>" +
          "<h2>الدعم ومتابعة الشحن</h2>" +
          `<p>لأي استفسار عن شحنة أو موعد وصول راسل خدمة العملاء عبر واتساب من <a href="${SITE_URL}/contact">صفحة التواصل</a>، ويمكنك مراجعة <a href="${SITE_URL}/returns">سياسة الاسترجاع</a> إذا احتجت الاستبدال أو الإرجاع. وإذا تأخر طلبك عن المدة المعلنة راسلنا وسنتابعه مع شركة الشحن مباشرة.</p>`,
      },
      {
        path: "/returns",
        title: "سياسة الاسترجاع — اليسر ميديكال",
        desc: "سياسة الاسترجاع والاستبدال في اليسر ميديكال: ضمان المنتجات الأصلية، إجراءات استبدال واضحة، وشروط الإرجاع خلال 14 يوماً لحماية حقك.",
        h1: "سياسة واضحة وعادلة",
        // ⚠️ النسخة الثابتة لازم تنقل نفس شروط الصفحة الحقيقية حرفياً في
        // المعنى (src/routes/returns.tsx): 14 يوماً + المنتج غير مفتوح +
        // العميل يتحمل شحن الإرجاع + الاسترداد خلال 7 أيام عمل بعد الفحص.
        // النسخة السابقة كانت أوسع («بأي حل يرضيك») وأسقطت الشروط — أي أن
        // الزاحف/القارئ بلا JavaScript كان يرى سياسة مختلفة عن الحقيقية.
        // (2026-09-29) توسعة الصفحات الرقيقة: نفس عناوين ونصوص
        // src/routes/returns.tsx حرفياً (7 أقسام) — نفس الحقائق: 14 يوماً،
        // غير مفتوح، شحن الإرجاع الفعلي حسب المحافظة، 7 أيام عمل بعد الفحص.
        body:
          "<h2>مدة الاسترجاع</h2>" +
          "<p>يحق لك استبدال أو استرجاع المنتج خلال 14 يوم من تاريخ الاستلام، شرط أن يكون المنتج بحالته الأصلية وغير مفتوح.</p>" +
          "<h2>شروط قبول الإرجاع</h2>" +
          "<p>لضمان قبول طلب الإرجاع تأكد من ثلاثة أمور:</p>" +
          "<ul><li>أن يتم التواصل خلال 14 يوماً من تاريخ الاستلام.</li><li>أن يكون المنتج غير مفتوح وبحالته الأصلية.</li><li>أن يتم التنسيق معنا عبر واتساب قبل إرسال أي منتج.</li></ul>" +
          "<h2>المنتجات غير القابلة للاسترجاع</h2>" +
          "<p>لأسباب صحية، لا يمكن استرجاع المنتجات المفتوحة أو المستخدمة.</p>" +
          "<h2>رسوم وطريقة الاسترجاع</h2>" +
          "<p>يتحمل العميل تكلفة شحن الإرجاع الفعلية التي تحددها شركة الشحن حسب المحافظة، ولا توجد رسوم ثابتة موحدة للإرجاع. تواصل معنا عبر واتساب وسنتولى ترتيب الاستلام والاسترداد خلال 7 أيام عمل بعد فحص المنتج والتأكد من استيفاء الشروط.</p>" +
          "<h2>خطوات الإرجاع</h2>" +
          "<ol><li>راسلنا عبر واتساب مع رقم طلبك والمنتج المراد إرجاعه.</li><li>نرتب معك الاستلام عبر شركة الشحن ونوضح لك تكلفة شحن الإرجاع حسب محافظتك.</li><li>بعد الاستلام نفحص المنتج للتأكد من استيفاء الشروط أعلاه.</li><li>يتم الاسترداد خلال 7 أيام عمل من الفحص.</li></ol>" +
          "<h2>الاستبدال</h2>" +
          `<p>إذا فضّلت استبدال المنتج بمنتج آخر فتسري نفس الشروط، وسيساعدك فريقنا في اختيار البديل المناسب لاحتياجك من <a href="${SITE_URL}/products/men">منتجات الرجال</a> أو <a href="${SITE_URL}/products/women">منتجات النساء</a> أو <a href="${SITE_URL}/products/devices">الأجهزة الطبية</a>.</p>` +
          "<h2>الدعم والتواصل</h2>" +
          `<p>لأي سؤال قبل الطلب أو بعده راسلنا عبر واتساب من <a href="${SITE_URL}/contact">صفحة التواصل</a> وسنرافقك خطوة بخطوة، ويمكنك مراجعة <a href="${SITE_URL}/shipping">سياسة الشحن</a> لمعرفة مواعيد التوصيل والرسوم. وإذا وصلك منتج تالف أو خاطئ راسلنا فوراً عبر واتساب وسننظر في حالتك وفق سياسة المتجر.</p>`,
      },
      {
        path: "/terms",
        title: "الشروط والأحكام — اليسر ميديكال",
        desc: "الشروط والأحكام التي تحكم استخدامك لشركة اليسر ميديكال: سياسات الشراء، الشحن، الاسترجاع، المسؤولية القانونية، وحقوقك كمستخدم.",
        h1: "استخدام واضح وآمن للموقع",
        // (2026-09-28) قرار المالك: نفس عناوين وفقرات src/routes/terms.tsx حرفياً.
        // (2026-09-29) توسعة الصفحات الرقيقة: نفس عناوين ونصوص
        // src/routes/terms.tsx حرفياً (9 أقسام + روابط لباقي السياسات).
        body:
          "<p>باستخدامك لموقع اليسر ميديكال فإنك توافق على الشروط التالية:</p>" +
          "<h2>المنتجات</h2>" +
          "<p>جميع منتجاتنا أصلية ومستوردة، ونعرض في صفحة كل منتج وصفه وطريقة استخدامه. المعلومات المقدمة في الموقع توعوية ولا تُغني عن استشارة الطبيب، خاصة إذا كنت تعاني من حالة صحية مزمنة أو تتناول أدوية أخرى.</p>" +
          "<h2>الطلبات والدفع</h2>" +
          "<p>يتم تأكيد الطلبات عبر واتساب قبل الشحن، والدفع متاح عند الاستلام أو إلكترونياً. بإتمام الطلب فإنك تؤكد أن البيانات التي تقدمها (الاسم، رقم الهاتف، المحافظة، والعنوان) صحيحة حتى نتمكن من تنفيذ التوصيل.</p>" +
          "<h2>الأسعار</h2>" +
          "<p>جميع الأسعار المعروضة بالجنيه المصري وقد تُحدَّث من وقت لآخر، والسعر المعتمد لطلبك هو السعر المؤكد وقت تأكيد الطلب عبر واتساب.</p>" +
          "<h2>الشحن والتوصيل</h2>" +
          `<p>نشحن إلى جميع محافظات مصر بتغليف محايد تماماً لا يكشف طبيعة المنتج، ومواعيد التوصيل ورسوم الشحن موضحة بالتفصيل في <a href="${SITE_URL}/shipping">سياسة الشحن</a>.</p>` +
          "<h2>الاستبدال والاسترجاع</h2>" +
          `<p>يحق لك الاستبدال أو الاسترجاع خلال 14 يوماً من تاريخ الاستلام بشرط أن يكون المنتج غير مفتوح وبحالته الأصلية، والتفاصيل والخطوات في <a href="${SITE_URL}/returns">سياسة الاسترجاع</a>.</p>` +
          "<h2>المسؤولية</h2>" +
          "<p>الالتزام بطريقة الاستخدام الموصى بها مسؤولية المستخدم. استشر طبيبك في حال وجود حالة صحية، فمحتوى الموقع توعوي ولا يشكّل تشخيصاً أو وصفة طبية.</p>" +
          "<h2>الخصوصية</h2>" +
          `<p>نجمع فقط البيانات الضرورية لمعالجة طلبك، ولا نبيعها ولا نشاركها لأغراض تسويقية، والتفاصيل كاملة في <a href="${SITE_URL}/privacy">سياسة الخصوصية</a>.</p>` +
          "<h2>تعديل الشروط</h2>" +
          "<p>قد نُحدِّث هذه الشروط من وقت لآخر، والنسخة المنشورة على هذه الصفحة وقت الاستخدام هي السارية.</p>" +
          "<h2>التواصل</h2>" +
          `<p>لأي استفسار حول هذه الشروط أو حول طلبك، تواصل معنا عبر واتساب من <a href="${SITE_URL}/contact">صفحة التواصل</a>.</p>`,
      },
      {
        path: "/privacy",
        title: "سياسة الخصوصية — اليسر ميديكال",
        desc: "سياسة خصوصية اليسر ميديكال: لا نبيع بياناتك ولا نشاركها لأغراض تسويقية، مع توضيح دقيق لجهات المعالجة التقنية، وخصوصية الطلبات أولويتنا.",
        h1: "سياسة الخصوصية",
        body:
          // (2026-09-28) قرار المالك: نفس عناوين src/routes/privacy.tsx السبعة.
          "<h2>البيانات التي نجمعها</h2>" +
          "<p>نجمع المعلومات الضرورية فقط لمعالجة طلبك: الاسم، رقم الهاتف، المحافظة، والعنوان لأغراض الشحن. لا نجمع أي بيانات دفع إلكترونية لأننا نعتمد الدفع عند الاستلام في معظم الحالات.</p>" +
          "<p>وفيما يخص التحليل: نجمع بيانات تقنية زيارية مجمعة (الصفحات الزائرة ونوع الجهاز) عبر أدوات التحليل لتحسين الموقع.</p>" +
          "<h2>كيف تُستخدم بياناتك ومن يتعامل معها</h2>" +
          "<p>نستخدم بيانات الطلب حصرياً لتنفيذ طلبك والتواصل معك حوله. <strong>لا نبيع بياناتك الشخصية ولا نشاركها مع أي طرف لأغراض تسويقية</strong> — هذا التزام قاطع. ونوضح بدقة كل خدمة وما تتعامل معه: Google Analytics — بيانات زيارات تقنية مجمعة فقط (الصفحات والجهاز والمصدر) ولا تصلها أي بيانات طلب، وVercel — بيانات أداء وأمان تقنية على مستوى المنصة، وGoogle Sheets — بيانات الطلب التشغيلية نفسها (الاسم والهاتف والمحافظة والعنوان والمنتجات) وهي ضرورية لمعالجة طلبك والشحن ولا تُستخدم لأي غرض آخر ولا تصلها أدوات التحليل. نتعامل مع بياناتك بسرية تامة، ونحد من الوصول إليها لمن يحتاجها فقط لأداء مهامه.</p>" +
          "<h2>التحليلات والموافقة</h2>" +
          "<p>يُحمَّل كود التحليل بعد أول تفاعل حقيقي فقط. الخدمة تجمع بيانات استخدام تقنية/إحصائية (الصفحات الزائرة ونوع الجهاز) وتضع معرف زائر تقنيًا (cookie) لتمييز الزيارات إحصائيًا فقط، ولا تُستخدم هذه البيانات للتواصل معك أو للتعرف عليك شخصيًا أو لأي غرض تسويقي. يمكنك منعها كليًا من إعدادات المتصفح دون أن يتأثر استخدامك للموقع.</p>" +
          "<h2>السرية التامة</h2>" +
          "<p>جزء من خصوصيتك أن طلبك يصل إليك بتغليف محايد تماماً لا يكشف طبيعته، ولا يتم ذكر تفاصيل المنتج على العبوة الخارجية أو في بوليصة الشحن. بهذا نحفظ سرية مشترياتك حتى أمام من يستلم الطلب معك.</p>" +
          "<h2>تخزين البيانات على جهازك</h2>" +
          "<p>نخزّن في متصفحك (localStorage) بيانات ضرورية لتحسين تجربتك فقط، مثل محتويات سلة التسوق وقائمة المنتجات التي شاهدتها مؤخراً والمفضلة. لا نخزّن على جهازك أي بيانات شخصية (لا اسمك ولا هاتفك ولا عنوانك) — وما يُحفظ محلياً يقتصر على ما يخص متابعة تجربتك، ويمكنك مسح كل ذلك في أي وقت من إعدادات المتصفح.</p>" +
          "<h2>حقوقك</h2>" +
          "<p>يمكنك في أي وقت طلب حذف بياناتك أو الاستفسار عن كيفية استخدامها — تواصل معنا عبر واتساب وسننّفذ طلبك يدويًا ونؤكد لك تنفيذه.</p>" +
          "<h2>الاتصال</h2>" +
          "<p>لأي استفسار حول خصوصيتك تواصل معنا عبر واتساب.</p>",
      },
      // SPA client-only routes (need static HTML for cleanUrls + Vercel fallback)
      {
        path: "/cart",
        title: "سلة التسوق — اليسر ميديكال",
        desc: "سلة التسوق الخاصة بك في اليسر ميديكال. أكمل طلبك بسهولة عبر واتساب أو طلب مباشر مع خصومات متدرجة.",
        h1: "سلة التسوق",
        noindex: true,
      },
      {
        path: "/order-confirmed",
        title: "تم استلام طلبك — اليسر ميديكال",
        desc: "تم استلام طلبك بنجاح. سنتواصل معك قريباً لتأكيد التفاصيل والشحن.",
        h1: "تم استلام طلبك",
        noindex: true,
      },
      // (2026-09-15) /thank-you كان route legacy بدون أي روابط داخلية —
      // اتشال من الـ prerender والـ route tree، و301 → /order-confirmed
      // (في sync-vercel-redirects.mjs) يحمي أي روابط خارجية قديمة.
      // User-specific SPA route — needs static HTML for cleanUrls + Vercel fallback
      {
        path: "/wishlist",
        title: "المفضلة ❤️ | اليسر ميديكال",
        desc: "قائمة المنتجات المفضلة في مكان واحد. اضغط على أيقونة القلب على أي بطاقة منتج لحفظه، ثم أكمل الطلب بسهولة.",
        h1: "المفضلة",
        noindex: true,
      },
      // Global search results page — target of the home SearchAction.
      // noindex like the cart: dynamic query content, crawler-visible via
      // SearchAction/sitemap template only (individual /search?q= URLs stay
      // unindexed to avoid thin duplicate content of product pages).
      {
        path: "/search",
        title: "نتائج البحث — اليسر ميديكال",
        desc: "نتائج البحث في منتجات اليسر ميديكال — كل المنتجات رجالي ونساء وأجهزة في مكان واحد، بالاسم العربي أو الإنجليزي.",
        h1: "نتائج البحث",
        noindex: true,
      },
      {
        path: "/refer",
        title: "برنامج الإحالة — شارك رابطك مع أصدقائك | اليسر ميديكال",
        desc: "لكل زائر كود إحالة فريد لا يحتوي بيانات شخصية. شاركه عبر واتساب؛ وعند الطلب يُسجّل الكود لمتابعة مصدر الإحالة مع شحن سري لكل مصر.",
        h1: "شارك اليسر مع أصدقائك — ورابطك يتسجل في الطلب 🎁",
        // (2026-09-28) قرار المالك: نفس عنواني وخطوات src/routes/refer.tsx.
        body:
          "<h2>كود الإحالة الخاص بك</h2>" +
          "<p>لكل زائر كود مشاركة فريد لا يحتوي أي بيانات شخصية — مجرد رمز عشوائي. انسخ رابط الإحالة الخاص بك وشاركه عبر واتساب برسالة جاهزة.</p>" +
          "<h2>كيف يعمل؟</h2>" +
          "<p>انسخ رابط الإحالة الخاص بك أعلاه، ثم شاركه مع صديق عبر واتساب (رسالة جاهزة). صديقك يفتح الرابط — الكود يتحفظ تلقائياً لمدة 30 يوم. عندما يطلب، يُسجّل كودك في الطلب لمتابعة الإحالة؛ وأي مكافأة تُراجع وفق سياسة المتجر. شحن سري وتغليف محايد يحفظ خصوصية الطلبات.</p>" +
          // (2026-09-29) توسعة الصفحات الرقيقة: نفس قسم «ملاحظات مهمة»
          // في src/routes/refer.tsx حرفياً.
          "<h2>ملاحظات مهمة</h2>" +
          "<ul><li>كود الإحالة رمز عشوائي لا يحتوي أي بيانات شخصية — خصوصيتك محفوظة.</li><li>يمكنك مشاركة نفس الرابط مع أكثر من صديق، ويُسجَّل كودك في كل طلب يتم عبره.</li><li>يُحفظ الكود تلقائياً على جهاز صديقك لمدة 30 يوماً من أول زيارة عبر رابطك.</li><li>أي مكافأة تُراجع وفق سياسة المتجر، وجميع الطلبات تُشحن بتغليف سري محايد يحفظ خصوصية المشتري.</li><li>الكود يعمل على أي جهاز ومتصفح ويُحفظ تلقائياً دون الحاجة لإنشاء حساب.</li><li>إذا فتحت رابط صديقك بالخطأ فلا تتأثر إحالته — يمكنك توليد رابطك الخاص من هذه الصفحة في أي وقت ومشاركته عبر واتساب أو أي قناة أخرى.</li></ul>" +
          `<p>للتفاصيل الكاملة عن كيفية التعامل مع البيانات راجع <a href="${SITE_URL}/privacy">سياسة الخصوصية</a>، ولأي سؤال عن البرنامج راسلنا عبر واتساب من <a href="${SITE_URL}/contact">صفحة التواصل</a>.</p>` +
          "<h2>لماذا تشارك رابطك؟</h2>" +
          "<p>مشاركة رابطك تساعد أصدقاءك على الوصول لمتجر بمنتجات أصلية وشحن سري وتغليف محايد، وتتيح لنا متابعة مصدر الإحالة ومكافأتك وفق سياسة المتجر. كلما وصل رابطك لأشخاص أكثر زادت فرص تسجيل إحالاتك في طلباتهم.</p>",
      },
    ];

    for (const r of staticRoutes) {
      // Use the exact same category selector/order as the React route. A raw
      // products.filter() here used to put the prerendered links in a
      // different order from the hydrated cards and could include a product
      // in a different position after pinned/stock sorting.
      const catItems = r.path.includes("/products/men")
        ? getProductsByCategory("men")
        : r.path.includes("/products/women")
          ? getProductsByCategory("women")
          : r.path === "/products/devices"
            ? getProductsByCategory("devices")
            : [];

      const categoryType = r.path.endsWith("/men")
        ? "men"
        : r.path.endsWith("/women")
          ? "women"
          : r.path.endsWith("/devices")
            ? "devices"
            : null;
      const jsonLd = [];
      // Category routes clear every prerendered block after hydration and
      // re-inject ItemList + BreadcrumbList (+ FAQPage for men/women). Emitting
      // a WebPage node here instead meant the initial HTML and the rendered DOM
      // declared different structured data, so category pages get exactly the
      // nodes the SPA injects. Other static routes keep their WebPage node
      // because those routes neither clear nor re-inject JSON-LD.
      if (categoryType) {
        jsonLd.push({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "الرئيسية", item: `${SITE_URL}/` },
            { "@type": "ListItem", position: 2, name: r.h1, item: `${SITE_URL}${r.path}` },
          ],
        });
      } else {
        jsonLd.push({
          "@context": "https://schema.org",
          "@type": "WebPage",
          "@id": `${SITE_URL}${r.path}`,
          name: r.title,
          description: r.desc,
          url: `${SITE_URL}${r.path}`,
        });
      }

      const structuredCatItems = catItems;
      if (structuredCatItems.length > 0) {
        jsonLd.push({
          "@context": "https://schema.org",
          "@type": "ItemList",
          // نفس الاسم الذي يحقنه الـ route بعد الـ hydration
          // (itemListSchema(items, PAGE_TITLE)) — وليس عنوان السيو الذي يحمل
          // لاحقة العلامة، حتى تتطابق البيانات المنظمة الثابتة مع الحقيقية.
          name: r.h1 || r.title,
          numberOfItems: structuredCatItems.length,
          itemListElement: structuredCatItems.map((p, i) => ({
            "@type": "ListItem",
            position: i + 1,
            url: `${SITE_URL}/products/${p.slug}`,
            name: p.name,
            image: p.image ? `${SITE_URL}${p.image}` : undefined,
          })),
        });
      }

      if (Array.isArray(r.faqs) && r.faqs.length > 0) {
        jsonLd.push({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: r.faqs.map((f) => ({
            "@type": "Question",
            name: f.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: f.answer,
            },
          })),
        });
      }

      // JSON-LD إضافي محدد للصفحة (مثلاً: كيان Person للمؤسس في /about)
      if (Array.isArray(r.extraJsonLd)) {
        jsonLd.push(...r.extraJsonLd);
      }

      const faqBody = Array.isArray(r.faqs)
        ? `<h2>${esc(r.faqTitle || "الأسئلة الشائعة")}</h2>${r.faqs
            .map((f) => `<p><strong>${esc(f.question)}</strong></p><p>${esc(f.answer)}</p>`)
            .join("")}`
        : "";

      // 🚀 روابط داخلية للمنتجات داخل HTML الثابت (crawler-visible)
      // لولا هذه الروابط لما وجد جوجل أي طريقة للوصول إلى صفحات المنتجات
      // الفردية، لأن قائمة المنتجات تُرسم عبر JavaScript (SPA) ولا يقرؤها
      // الزاحف. وجود روابط <a href="/products/..."> ثابتة يجعل كل منتج
      // "مكتشفاً" وقابلاً للفهرسة، ويربط صفحات الأقسام بمنتجاتها.
      // ⚠️ العنوان هنا لازم يكون نصاً نظيفاً (r.h1) وليس عنوان السيو (r.title):
      // r.title يحمل لاحقة العلامة («… | اليسر ميديكال») فينتج عنوان مثل
      // «منتجات منتجات الصحة الزوجية للرجال في مصر | اليسر ميديكال» — كلمة
      // مكررة + لاحقة تسويقية داخل <h2> في أهم ثلاث صفحات أقسام.
      const productLinksBody =
        catItems.length > 0
          ? `<p><strong>${esc(r.h1 || r.title)} — ${catItems.length} ${arabicCountNoun(catItems.length)}</strong></p><ul>${catItems
              .map(
                (p) =>
                  `<li><a href="${SITE_URL}/products/${p.slug}">${esc(p.name)}</a> — ${p.price} ج.م${p.stock <= 0 ? " — نفد المخزون" : ""}${p.rating && p.reviews ? ` — ${p.rating} (${p.reviews} تقييم سابق)` : ""}</li>`,
              )
              .join("")}</ul>`
          : "";

      // 🚀 روابط داخلية للمقالات في صفحة /education (crawler-visible)
      // صفحة الفهرس ترسم قائمة المقالات عبر JS (SPA) ولا يقرؤها الزاحف،
      // لذلك نضيف هنا قائمة روابط ثابتة لجميع المقالات حتى تكون كل مقالة
      // "مكتشفة" ومربوطة من الفهرس بمسار زحف حقيقي — كما فُعل مع المنتجات.
      const articleLinksBody =
        r.path === "/education" && articles.length > 0
          ? `<ul>${articles
              .map(
                (a) =>
                  `<li><h2><a href="${SITE_URL}/education/${a.slug}">${esc(a.title)}</a></h2> — ${esc(a.category)} — ${esc(a.excerpt)} — ${a.readMin} دقائق قراءة</li>`,
              )
              .join("")}</ul>`
          : "";

      const html = buildHtml(template, {
        title: r.title,
        description: r.desc,
        image: `${SITE_URL}/og-default.webp`,
        canonical: `${SITE_URL}${r.path}`,
        type: "website",
        noindex: Boolean(r.noindex),
        jsonLd,
        // (2026-09-17) og-default 1200×631 (الأبعاد الافتراضية في buildHtml)
        imageAlt: r.title,
        preloadImage:
          r.path === "/education" && articles[0]?.image ? assetUrl(articles[0].image) : "",
        // The visible SSG fallback carries the canonical H1 and is replaced
        // by the React route after boot. It is not a hidden crawler copy.
        bodyContent: `<h1>${esc(r.h1)}</h1><p>${esc(r.bodyDescription || r.desc)}</p>${r.body ? r.body : ""}${productLinksBody}${articleLinksBody}${faqBody}`,
      });

      // Write to dist/<path>.html (cleanUrls handles trailing-slash routing)
      const outPath = resolve(DIST, r.path.slice(1) + ".html");
      mkdirSync(dirname(outPath), { recursive: true });
      writeFileSync(outPath, html);
      staticCount++;
      console.log(`✓ static  ${r.path}`);
    }

    /* ========== 3) Products ========== */
    const productsDir = resolve(DIST, "products");
    if (!existsSync(productsDir)) mkdirSync(productsDir, { recursive: true });

    for (const product of products) {
      // Same helper + default length as src/routes/products.$slug.tsx head().
      const title = makeProductMetaTitle(product.name);
      // 🎯 وصف غني بالبيانات الفريدة (السعر، الشحن، ومعلومات المنتج) لمنع Google من إعادة كتابته بوصف الموقع العام
      const desc = makeProductMetaDescription(product);
      // absoluteProductImage() in src/lib/seo.ts (the hydrated copy) resolves
      // product images without the cache-busting suffix; keep both identical.
      const img = product.image ? `${SITE_URL}${product.image}` : `${SITE_URL}/og-default.webp`;
      const canonical = `${SITE_URL}/products/${product.slug}`;
      const productReviews = Number.isInteger(product.reviews) ? Math.max(0, product.reviews) : 0;
      const productRating = Number.isFinite(product.rating)
        ? Math.max(0, Math.min(5, product.rating))
        : 0;
      const hasLegacyRating = productReviews > 0 && productRating >= 1;
      // (2026-09-28) مطابقة القسم المرئي: الأرشيف تحت «تجارب عملاء حقيقية».
      const legacyList = getProductReviews(product.slug, product.category, 5).reviews || [];
      const legacyReviewsHtml = legacyList.length
        ? `<h2>تجارب عملاء حقيقية</h2>` +
          legacyList
            .map((r) => `<p><strong>${esc(r.name)}</strong> — ${r.rating}/5: ${esc(r.text)}</p>`)
            .join("")
        : "";
      const productJsonLd = {
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.name,
        // ألقاب بحثية بديلة (عامية) — إشارة مهيكلة لجوجل بنفس كلمة البحث المصرية
        ...(product.searchAliases?.length ? { alternativeName: product.searchAliases } : {}),
        description: product.description,
        sku: product.id,
        ...(product.mpn?.trim() ? { mpn: product.mpn.trim() } : {}),
        ...(product.gtin?.trim() ? { gtin: product.gtin.trim() } : {}),
        image: img,
        ...(hasLegacyRating
          ? {
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: productRating,
                reviewCount: productReviews,
                bestRating: 5,
                worstRating: 1,
              },
            }
          : {}),
        ...(product.brand?.trim()
          ? { brand: { "@type": "Brand", name: product.brand.trim() } }
          : {}),
        offers: {
          "@type": "Offer",
          price: product.price,
          priceCurrency: "EGP",
          availability:
            product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          url: canonical,
          priceValidUntil,
          validFrom: "2026-01-01",
          shippingDetails: merchantShippingDetails,
          hasMerchantReturnPolicy: {
            "@type": "MerchantReturnPolicy",
            applicableCountry: "EG",
            returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
            merchantReturnDays: 14,
            returnMethod: "https://schema.org/ReturnByMail",
            returnFees: "https://schema.org/ReturnFeesCustomerResponsibility",
          },
        },
      };

      const breadcrumb = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "الرئيسية", item: `${SITE_URL}/` },
          {
            "@type": "ListItem",
            position: 2,
            name:
              product.category === "men"
                ? "منتجات الصحة الزوجية للرجال"
                : product.category === "women"
                  ? "منتجات الصحة الزوجية للنساء"
                  : "الأجهزة والمستلزمات الطبية",
            item: `${SITE_URL}/products/${product.category}`,
          },
          { "@type": "ListItem", position: 3, name: product.name, item: canonical },
        ],
      };

      const benefits = (product.benefits || [])
        .slice(0, 4)
        .map((b) => `<li>${esc(b)}</li>`)
        .join("");

      // اسم القسم + رابط القسم (crawler-visible)
      const categoryName =
        product.category === "men"
          ? "منتجات الصحة الزوجية للرجال"
          : product.category === "women"
            ? "منتجات الصحة الزوجية للنساء"
            : "الأجهزة والمستلزمات الطبية";
      const categoryUrl = `${SITE_URL}/products/${product.category}`;

      // Keep related-product membership/order identical to the hydrated route:
      // React removes the two cross-sell members, applies the catalog sorter,
      // then takes four cards. The old prerender used the raw catalog prefix,
      // so 14 product pages showed different related products before hydration.
      const crossSells = getCrossSellsForProduct(product);
      const relatedProducts = getProductsByCategory(product.category)
        .filter((p) => p.id !== product.id && !crossSells.some((c) => c.id === p.id))
        .sort((a, b) => a.id.localeCompare(b.id))
        .slice(0, 4);
      const relatedBody =
        relatedProducts.length > 0
          ? `<h2>منتجات قد تعجبك أيضاً</h2><ul>${relatedProducts
              .map(
                (p) =>
                  `<li><a href="${SITE_URL}/products/${p.slug}"><img src="${assetUrl(p.image)}" alt="${esc(p.name)}" title="${esc(p.name)}" width="240" height="240" loading="lazy" />${esc(p.name)}</a> — ${p.price} ج.م</li>`,
              )
              .join("")}</ul>`
          : "";

      // (2026-09-28) نفس مصدر القسم المرئي «📚 مقالات تهمك» حرفياً.
      const productArticleSlugs = getArticlesForProduct(product) || [];
      const productArticlesHtml = productArticleSlugs.length
        ? `<h2>📚 مقالات تهمك</h2>` +
          productArticleSlugs
            .map(
              (slug) =>
                `<h3><a href="${SITE_URL}/education/${slug}">${esc(articleTitleOf(slug))}</a></h3>`,
            )
            .join("")
        : "";
      const bundleItems = [product, ...crossSells];
      const bundleTotal = bundleItems.reduce((sum, item) => sum + item.price, 0);
      const bundleDiscount = Math.round(bundleTotal * BUNDLE_DISCOUNT_RATE);
      const bundleBody =
        crossSells.length === 2
          ? `<section><h3>باقة التوفير والأداء المتكامل</h3><p>منتجات متكاملة تغطي احتياجك — أضفها دفعة واحدة واحصل على خصم الباقة (${Math.round(BUNDLE_DISCOUNT_RATE * 100)}%) تلقائياً.</p><ul>${bundleItems
              .map(
                (p, index) =>
                  `<li><a href="${SITE_URL}/products/${p.slug}">${esc(p.name)}</a> — ${p.price} ج.م${index === 0 ? " — المنتج الحالي" : ""}</li>`,
              )
              .join(
                "",
              )}</ul><p>الإجمالي العادي: ${bundleTotal} ج.م — سعر الباقة: ${bundleTotal - bundleDiscount} ج.م</p></section>`
          : "";

      const body = `
        <nav aria-label="Breadcrumb">
          <a href="${SITE_URL}/">الرئيسية</a> › <a href="${categoryUrl}">${esc(categoryName)}</a> › ${esc(product.name)}
        </nav>
        <h1>${esc(product.name)}</h1>
        <p><strong>${esc(product.nameEn || "")}</strong></p>
        <p>${esc(product.description)}</p>
        ${benefits ? `<ul>${benefits}</ul>` : ""}
        ${product.ingredients ? `<h2>المكونات / التركيبة</h2><p>${esc(product.ingredients)}</p>` : ""}
        ${product.usage ? `<h2>طريقة الاستخدام</h2><p>${esc(product.usage)}</p>` : ""}
        <p>السعر: ${product.price} ج.م</p>
        ${hasLegacyRating ? `<h2>آراء وتقييمات العملاء</h2><p>التقييم العام: ${productRating} من 5 (${productReviews} تقييم سابق).</p>` : ""}
        ${legacyReviewsHtml}
        <h3>شاركنا تجربتك</h3>
        <p>يمكنك إرسال تجربتك بعد الاستخدام، وتُنشر المراجعة بعد اعتمادها.</p>
        <section><h2>لماذا تطلب من اليسر؟</h2><ul><li>منتجات أصلية مختارة بعناية</li><li>شحن سري بدون اسم المنتج على العبوة</li><li>الدفع عند الاستلام</li><li>خصوصية كاملة لبيانات الطلب</li><li>دعم سريع قبل وبعد الطلب</li><li>تأكيد التفاصيل قبل الشحن</li></ul></section>
        <section><h2>كيف يتم الشحن بسرية؟</h2><ul><li>يتم تغليف الطلب في عبوة محايدة بدون ذكر اسم المنتج.</li><li>لا تظهر طبيعة المنتج على الشحنة أو من الخارج.</li><li>يتم التواصل معك لتأكيد التفاصيل قبل الشحن.</li><li>بياناتك تُستخدم لإتمام الطلب والتوصيل فقط.</li></ul></section>
        <p><a href="${categoryUrl}">تصفح كل ${esc(categoryName)}</a></p>
        ${bundleBody}
        <section><h2>الأسئلة الشائعة</h2>${productFAQs
          .map((faq) => `<p><strong>${esc(faq.question)}</strong></p><p>${esc(faq.answer)}</p>`)
          .join("")}</section>
        ${relatedBody}
        ${productArticlesHtml}
        ${topicLinksHtml("product", product.id)}
      `;

      const html = buildHtml(template, {
        title,
        description: desc,
        image: img,
        canonical,
        type: "product",
        noindex: false,
        jsonLd: [productJsonLd, breadcrumb],
        bodyContent: body,
        // (2026-09-17) أبعاد حقيقية + alt وصفية (صور المنتجات 800×800)
        imageAlt: product.name,
        imageWidth: 800,
        imageHeight: 800,
      });

      writeFileSync(resolve(DIST, "products", `${product.slug}.html`), html);
      productsCount++;
    }
    console.log(`✓ products: ${productsCount}`);

    /* ========== 4) Articles ========== */
    if (articles.length > 0) {
      const eduDir = resolve(DIST, "education");
      if (!existsSync(eduDir)) mkdirSync(eduDir, { recursive: true });

      for (const article of articles) {
        // 🎯 العنوان بلا لاحقة brand لتفادي تجاوز 65 حرفاً (الـ brand في schema).
        const title = article.title;
        // 🎯 meta description مُقتطع (الـ excerpt قد يطُول أحياناً).
        const desc = makeMetaDescription(article.excerpt);
        // Hydrated articleSchema() uses absoluteUrl() (no ?v= suffix).
        const img = article.image
          ? article.image.startsWith("http")
            ? article.image
            : `${SITE_URL}${article.image}`
          : `${SITE_URL}/og-default.webp`;
        const canonical = `${SITE_URL}/education/${article.slug}`;

        // These are the same loaders/selectors used by the hydrated article
        // route. Keeping them here prevents the static copy from omitting
        // linked products/articles or showing a different recommendation set.
        const relatedSlugs = getRelatedArticles(article.slug, article.category, articles);
        const relatedArticles = relatedSlugs
          .map((slug) => articles.find((candidate) => candidate.slug === slug))
          .filter(Boolean);
        const linkedProducts = getProductsForArticle(article.slug)
          .map((id) => products.find((product) => product.id === id))
          .filter(Boolean)
          .slice(0, 6);

        const articleJsonLd = {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: article.title,
          description: article.excerpt,
          image: img,
          articleSection: article.category,
          timeRequired: `PT${article.readMin}M`,
          inLanguage: "ar-EG",
          mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
          // (2026-09-16) مطابقه هوكلية مع Article schema في seo.ts:
          // كيان Person واحد للمؤسس (نفس الـ @id في /about#founder) —
          // النسخة القديمة هنا كانت author = Organization، فـ Googlebot
          // كان يقرأ مؤلف منظمة بدل صيدلي صاحب اعتمادات (تضليل E-E-A-T).
          author: {
            "@type": "Person",
            "@id": `${SITE_URL}/about#founder`,
            name: article.author?.name || "د. أحمد عابد",
            description: article.author?.credentials,
            jobTitle: article.author?.role || "إعداد ومراجعة المحتوى",
            url: `${SITE_URL}/about`,
            worksFor: { "@type": "Organization", name: "اليسر ميديكال", url: SITE_URL },
          },
          publisher: {
            "@type": "Organization",
            name: "اليسر ميديكال",
            logo: { "@type": "ImageObject", url: `${SITE_URL}/logo.png` },
          },
          citation: (article.sources || []).map((source) => ({
            "@type": "CreativeWork",
            name: source.title,
            url: source.url,
            publisher: { "@type": "Organization", name: source.publisher },
          })),
          // (2026-09-17) مفيش fallback مزيف: التاريخ الحقيقي من بيانات
          // المقال — لو ناقص الحقل بيختفي (undefined) بدل 2025-01-01.
          datePublished: article.publishedAt,
          dateModified: article.updatedAt,
        };

        const breadcrumb = {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "الرئيسية", item: `${SITE_URL}/` },
            { "@type": "ListItem", position: 2, name: "المقالات", item: `${SITE_URL}/education` },
            { "@type": "ListItem", position: 3, name: article.title, item: canonical },
          ],
        };

        // Match ArticleContentWithAds: it splits only on blank lines and
        // injects the same linked products at the same paragraph positions.
        const contentParagraphs = (article.content || "").split(/\n{2,}/).filter((p) => p.trim());
        const adPositions =
          contentParagraphs.length < 4 || linkedProducts.length === 0
            ? []
            : linkedProducts.length === 1 || contentParagraphs.length < 8
              ? [{ index: Math.floor(contentParagraphs.length / 2), product: linkedProducts[0] }]
              : [
                  { index: Math.floor(contentParagraphs.length / 3), product: linkedProducts[0] },
                  {
                    index: Math.floor((contentParagraphs.length * 2) / 3),
                    product: linkedProducts[1],
                  },
                ];
        // (2026-09-28) يطابق ArticleContentWithAds: الشارة نص عادي وh3 باسم
        // المنتج فقط — العنوان القديم «الحل المقترح: X» كان يختلف عمّا يُرسم.
        const articleAdHtml = (product) =>
          `<section><p>الحل المقترح</p><h3>${esc(product.name)}</h3><p>${esc(product.description)}</p><p><a href="${SITE_URL}/products/${product.slug}">عرض المنتج والشراء</a></p></section>`;
        const paragraphs = contentParagraphs
          .map((paragraph, index) => {
            const ad = adPositions.find((position) => position.index === index);
            return `<p>${esc(paragraph.trim())}</p>${ad ? articleAdHtml(ad.product) : ""}`;
          })
          .join("");

        const sourcesBody = (article.sources || [])
          .map(
            (source) =>
              `<li><a href="${esc(source.url)}" rel="nofollow noopener">${esc(source.title)}</a> — ${esc(source.publisher)}</li>`,
          )
          .join("");
        const linkedProductsBody = linkedProducts.length
          ? `<section><h2>🛒 منتجات ذات صلة</h2><ul>${linkedProducts
              .map(
                (product) =>
                  `<li><h3><a href="${SITE_URL}/products/${product.slug}">${esc(product.name)}</a></h3> — ${product.price} ج.م</li>`,
              )
              .join("")}</ul></section>`
          : "";
        const suggestedProductsBody = linkedProducts.length
          ? `<section><h2>🛍️ منتجات تساعد في حل المشكلة</h2><p>مجموعة مختارة من أفضل المنتجات ذات الصلة بموضوع المقال لتعزيز صحتك وراحتك.</p><ul>${linkedProducts
              .slice(0, 4)
              .map(
                (product) =>
                  `<li><h3><a href="${SITE_URL}/products/${product.slug}">${esc(product.name)}</a></h3> — ${product.price} ج.م</li>`,
              )
              .join("")}</ul></section>`
          : "";
        const relatedArticlesBody =
          relatedArticles.length > 0
            ? `<section><h2>مقالات ذات صلة</h2><ul>${relatedArticles
                .map(
                  (related) =>
                    `<li><h3><a href="${SITE_URL}/education/${related.slug}">${esc(related.title)}</a></h3></li>`,
                )
                .join("")}</ul></section>`
            : "";

        const body = `
          <article>
            <h1>${esc(article.title)}</h1>
            <p><em>${esc(article.category)} — ${article.readMin} دقائق قراءة — آخر تحديث: ${esc(article.updatedAt || "")}</em></p>
            ${article.image ? `<img src="${article.image.startsWith("http") ? article.image : assetUrl(article.image)}" alt="${esc(article.title)}" width="800" height="450" loading="eager" style="width:100%;height:auto;border-radius:16px;margin:16px 0" />` : ""}
            <p><strong>${esc(article.excerpt)}</strong></p>
            ${
              Array.isArray(article.keyTakeaways) && article.keyTakeaways.length > 0
                ? `<section><p><strong>أهم النقاط</strong></p><ul>${article.keyTakeaways
                    .map((p) => `<li>${esc(p)}</li>`)
                    .join("")}</ul></section>`
                : ""
            }
            <section>
              <p>إعداد: ${esc(article.author?.name || "فريق المحتوى الصحي — اليسر ميديكال")}</p>
              <p>${esc(article.author?.credentials || "")}</p>
              <p>فحص آلي: ${esc(article.reviewer?.name || "فحص سلامة المحتوى — اليسر ميديكال")}</p>
              <p>${esc(article.reviewer?.credentials || "")}</p>
              <p>هذا المحتوى توعوي ولا يغني عن استشارة الطبيب المختص.</p>
            </section>
            ${paragraphs}
            <section>
              <h2>منهجية الثقة والمراجعة</h2>
              <ul>${editorialTrustSignals.map((signal) => `<li>${esc(signal)}</li>`).join("")}</ul>
            </section>
            <section>
              <h2>المصادر الطبية المستخدمة</h2>
              <p>نستخدم مصادر طبية وتعليمية موثوقة لدعم المحتوى العام، مع مراعاة أن التشخيص والعلاج يحتاجان إلى طبيب مختص.</p>
              <ul>${sourcesBody}</ul>
            </section>
            <p>⚠️ هذا المحتوى توعوي عام ولا يُعدّ بديلاً عن استشارة الطبيب المختص.</p>
            ${linkedProductsBody}
            ${suggestedProductsBody}
            ${relatedArticlesBody}
            <p><a href="${SITE_URL}/education">← تصفح جميع المقالات التوعوية</a></p>
            ${topicLinksHtml("article", article.slug)}
          </article>
        `;

        const html = buildHtml(template, {
          title,
          description: desc,
          image: img,
          canonical,
          type: "article",
          jsonLd: [articleJsonLd, breadcrumb],
          bodyContent: body,
          // (2026-09-17) أبعاد حقيقية + alt بوصية (صور المقالات 800×800)
          imageAlt: article.title,
          imageWidth: 800,
          imageHeight: 800,
        });

        writeFileSync(resolve(DIST, "education", `${article.slug}.html`), html);
        articlesCount++;
      }
      console.log(`✓ articles: ${articlesCount}`);
    }

    /* ========== 5) SEO landing guide pages ========== */
    if (seoLandingPages.length > 0) {
      const guidesDir = resolve(DIST, "products", "guides");
      if (!existsSync(guidesDir)) mkdirSync(guidesDir, { recursive: true });

      for (const page of seoLandingPages) {
        const canonical = `${SITE_URL}/products/guides/${page.slug}`;
        const selectedProducts = (page.productIds || [])
          .map((id) => products.find((p) => p.id === id))
          .filter(Boolean);
        const linkedArticleSlugs = getArticlesForLandingPage(page.slug, page.title);
        const linkedArticles = linkedArticleSlugs
          .map((slug) => articles.find((article) => article.slug === slug))
          .filter(Boolean);

        const webPageJsonLd = {
          "@context": "https://schema.org",
          "@type": "WebPage",
          "@id": canonical,
          name: page.title,
          headline: page.title,
          description: page.metaDescription,
          url: canonical,
          inLanguage: "ar-EG",
          about: page.primaryKeyword,
        };

        const breadcrumb = {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "الرئيسية", item: `${SITE_URL}/` },
            {
              "@type": "ListItem",
              position: 2,
              name: "المنتجات",
              item: `${SITE_URL}/products/men`,
            },
            { "@type": "ListItem", position: 3, name: page.title, item: canonical },
          ],
        };

        const faqJsonLd = {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: (page.faqs || []).map((f) => ({
            "@type": "Question",
            name: f.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: f.answer,
            },
          })),
        };

        const itemList = {
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: page.title,
          numberOfItems: selectedProducts.length,
          itemListElement: selectedProducts.map((product, i) => ({
            "@type": "ListItem",
            position: i + 1,
            url: `${SITE_URL}/products/${product.slug}`,
            name: product.name,
            image: product.image ? `${SITE_URL}${product.image}` : undefined,
          })),
        };

        const sections = (page.sections || [])
          .map((section) => `<h2>${esc(section.heading)}</h2><p>${esc(section.body)}</p>`)
          .join("");
        const links = (page.links || [])
          .map(
            (link) =>
              `<li><h3><a href="${SITE_URL}${link.href}">${esc(link.label)}</a></h3> — ${esc(link.description)}</li>`,
          )
          .join("");
        const faqs = (page.faqs || [])
          .map((faq) => `<p><strong>${esc(faq.question)}</strong></p><p>${esc(faq.answer)}</p>`)
          .join("");
        const productsBody = selectedProducts
          .map(
            (product) =>
              `<li><a href="${SITE_URL}/products/${product.slug}"><img src="${assetUrl(product.image)}" alt="${esc(product.name)}" title="${esc(product.name)}" width="240" height="240" loading="lazy" />${esc(product.name)}</a> — ${product.price} ج.م</li>`,
          )
          .join("");
        const relatedKeywords = (page.relatedKeywords || [])
          .slice(0, 4)
          .map((keyword) => `<li>${esc(keyword)}</li>`)
          .join("");
        const linkedArticlesBody =
          linkedArticles.length > 0
            ? `<section><h2>📚 مقالات تعليمية ذات صلة</h2><ul>${linkedArticles
                .map(
                  (article) =>
                    `<li><a href="${SITE_URL}/education/${article.slug}">${esc(article.title)}</a> — ${article.readMin} دقائق قراءة</li>`,
                )
                .join("")}</ul></section>`
            : "";

        const body = `
          <article>
            <h1>${esc(page.title)}</h1>
            <p><strong>${esc(page.heroDescription)}</strong></p>
            <ul>${relatedKeywords}</ul>
            <p>${esc(page.intro)}</p>
            <section><p><strong>علامات الاختيار الواعي</strong></p><ul><li>اختيار واعٍ</li><li>شحن سري داخل مصر</li><li>تنبيه طبي واضح</li></ul></section>
            ${sections}
            <h2>ابدأ من الأقسام الحالية</h2>
            <ul>${links}</ul>
            ${selectedProducts.length > 0 ? `<h2>منتجات مختارة مرتبطة بالبحث</h2><ul>${productsBody}</ul>` : ""}
            ${linkedArticlesBody}
            <h2>أسئلة شائعة عن ${esc(page.primaryKeyword)}</h2>
            ${faqs}
            ${topicLinksHtml("guide", page.slug)}
          </article>
        `;

        const html = buildHtml(template, {
          title: page.metaTitle,
          description: page.metaDescription,
          image: `${SITE_URL}/og-default.webp`,
          canonical,
          type: "website",
          noindex: Boolean(page.noindex),
          jsonLd: [webPageJsonLd, breadcrumb, faqJsonLd, itemList],
          bodyContent: body,
          // (2026-09-17) og-default 1200×631 (الأبعاد الافتراضية في buildHtml)
          imageAlt: page.metaTitle,
        });

        writeFileSync(resolve(guidesDir, `${page.slug}.html`), html);
        landingCount++;
      }
      console.log(`✓ landing pages: ${landingCount}`);
    }

    console.log(
      `\n✅ Prerender complete: ${staticCount} static + ${productsCount} products + ${articlesCount} articles + ${landingCount} landing pages = ${staticCount + productsCount + articlesCount + landingCount} pages`,
    );

    // الوصف المقتطع بـ «…» يظهر في نتائج Google بنص ناقص — التصحيح الصحيح هو
    // تقصير النص في مصدر البيانات، لا الاقتطاع وقت البناء. كان الاقتطاع
    // صامتاً تماماً قبل هذا التحذير.
    if (TRUNCATED_META.length > 0) {
      console.warn(
        `\n⚠️  ${TRUNCATED_META.length} meta description اقتُطع بـ «…» أثناء البناء — قصّر النص في المصدر:`,
      );
      for (const t of TRUNCATED_META.slice(0, 10))
        console.warn(`    · ${t.length} حرف (الحد ${t.maxLength}) …${t.preview}`);
    }
  } finally {
    await vite.close();
  }
}

prerender().catch((err) => {
  console.error("Prerender failed:", err);
  process.exit(1);
});
