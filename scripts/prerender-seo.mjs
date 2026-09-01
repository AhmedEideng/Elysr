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
 *   • A <noscript>-friendly content block holding the real text
 *     (product name, description, benefits, article body) so
 *     Googlebot and social previewers see real content even
 *     before the React app boots.
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
 * يبني meta description بطول مثالي (~150-155 حرف) للظهور الكامل في نتائج Google.
 * يقطع عند حدود كلمة حتى لا يترك كلمة مقطوعة، ويضيف "…" عند الاقتطاع.
 * يُستخدم للـ <meta name="description"> وog/twitter فقط،
 * بينما يبقى الوصف الكامل في JSON-LD والـ body.
 */
function makeMetaDescription(text = "", maxLength = 155) {
  const clean = String(text).trim().replace(/\s+/g, " ");
  if (clean.length <= maxLength) return clean;
  const cut = clean.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  const base = lastSpace > 40 ? cut.slice(0, lastSpace) : cut;
  return `${base}…`;
}

function makeProductMetaDescription(p, maxLength = 155) {
  const firstBenefit = p.benefits?.[0] ? ` - ${String(p.benefits[0]).slice(0, 50)}` : "";
  const ratingPart = p.reviews > 0 ? ` ⭐${p.rating}/5 (${p.reviews} تقييم)` : "";
  const pricePart = ` - ${p.price} ج.م - شحن سري، دفع عند الاستلام`;
  // لقب البحثي البديل (عامي/شعبي) — يعرض الكلمة المصرية اللي بيبحثوا بيها (نقط)
  const aliasPart = p.searchAliases?.length ? ` «${p.searchAliases[0]}»` : "";
  const candidate = `${p.name}${aliasPart}${firstBenefit}${ratingPart}${pricePart} - اليسر ميديكال`;
  if (candidate.length <= maxLength) return candidate;
  const baseDesc = String(p.description).split("。")[0].split(".")[0].slice(0, 80);
  const short = `${p.name}${aliasPart} - ${baseDesc}${ratingPart} - ${p.price} ج.م - شحن سري - اليسر ميديكال`;
  return makeMetaDescription(short, maxLength);
}

/**
 * يبني <title> بطول مثالي للظهور الكامل في نتائج Google.
 * - المنتجات: أسماؤها ≤ 65 حرفاً، فلا تُقتطع إطلاقاً (كل اسم منتج يظهر كاملاً).
 * - المقالات/الـ landing: العناوين طويلة، فيُقصّ العنوان عند حدود الكلمة
 *   (لا يقطع منتصف كلمة) مع محاولة إغلاق القوس ")" إن كان مفتوحاً.
 */
function makeTitle(text = "", maxLength = 65) {
  const clean = String(text).trim().replace(/\s+/g, " ");
  if (clean.length <= maxLength) return clean;
  // اقتطاع عند آخر مسافة قبل الحد
  const cut = clean.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  let base = lastSpace > 40 ? cut.slice(0, lastSpace) : cut;
  // إن كانت النهاية داخل قوس مفتوح "(..." نغلق القوس لئلا يظهر الاقتطاع بلا إغلاق
  const openParen = base.lastIndexOf("(");
  const closeParen = base.lastIndexOf(")");
  if (openParen > closeParen && openParen > base.length - 30) {
    base = base.slice(0, openParen).trimEnd();
  }
  return `${base}…`;
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
  if (html.match(/<meta name="description"[^>]*>/)) {
    html = html.replace(
      /<meta name="description"[^>]*>/,
      `<meta name="description" content="${safeDesc}" />`,
    );
  } else {
    html = html.replace("</head>", `  <meta name="description" content="${safeDesc}" />\n</head>`);
  }

  // og + twitter
  const replaceOrInsert = (regex, tag) => {
    if (regex.test(html)) html = html.replace(regex, tag);
    else html = html.replace("</head>", `  ${tag}\n</head>`);
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
      `  <link rel="preload" as="image" href="${assetUrl("/images/hero-banner-480.webp")}" imagesrcset="${assetUrl("/images/hero-banner-480.webp")} 480w, ${assetUrl("/images/hero-banner-768.webp")} 768w, ${assetUrl("/images/hero-banner.webp")} 1200w" imagesizes="100vw" fetchpriority="high" />
</head>`,
    );
  }

  // JSON-LD blocks
  jsonLd.forEach((data, i) => {
    const tag = `<script type="application/ld+json" data-prerender="${i}">${JSON.stringify(data)}</script>`;
    html = html.replace("</head>", `${tag}\n</head>`);
  });

  // Inject crawler-friendly content right inside #root (will be replaced
  // by React when JS boots — but bots see it instantly).
  if (bodyContent) {
    html = html.replace(
      '<div id="root"></div>',
      `<div id="root"><div data-prerender-content style="position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden;">${bodyContent}</div></div>`,
    );
  }

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
    const { products } = await vite.ssrLoadModule("/src/data/products.ts");
    const { GOVERNORATE_SHIPPING } = await vite.ssrLoadModule("/src/lib/site-config.ts");
    const shippingBands = new Map();
    for (const entry of GOVERNORATE_SHIPPING) {
      const regions = shippingBands.get(entry.shipping) ?? [];
      regions.push(entry.name);
      shippingBands.set(entry.shipping, regions);
    }
    const merchantShippingDetails = [...shippingBands.entries()].map(([rate, regions]) => ({
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
          maxValue: 1,
          unitCode: "DAY",
        },
        transitTime: {
          "@type": "QuantitativeValue",
          minValue: 1,
          maxValue: 5,
          unitCode: "DAY",
        },
      },
    }));
    const { GOOGLE_SHOPPING_BLOCKED } = await vite.ssrLoadModule("/src/lib/product-compliance.ts");
    // صفحات المنتجات الدوائية المرفوضة: noindex حتى لا يزحفها جوجل (تبقى على الموقع
    // وقابلة للشراء عبر الروابط المباشرة/واتساب، لكن لا تُفهرس في نتائج البحث).
    const isNoindexProduct = (p) => GOOGLE_SHOPPING_BLOCKED.has(p.id);
    let articles = [];
    try {
      const mod = await vite.ssrLoadModule("/src/data/articles.ts");
      articles = mod.articles || [];
    } catch {
      /* no articles */
    }

    let seoLandingPages = [];
    try {
      const mod = await vite.ssrLoadModule("/src/data/landing-pages.ts");
      seoLandingPages = mod.seoLandingPages || [];
    } catch {
      /* no landing pages */
    }

    /* ========== 1) Home page ========== */
    {
      const title = "اليسر — منتجات الصحة الزوجية الأصلية في مصر | شحن سري";
      const desc =
        "اليسر أكبر شركة متخصصة في منتجات الصحة الزوجية الأصلية للرجال والنساء في مصر. شحن سري وتغليف محايد ودفع عند الاستلام مع دعم متخصص عبر واتساب.";
      let html = buildHtml(template, {
        title,
        description: desc,
        image: `${SITE_URL}/og-default.webp`,
        canonical: `${SITE_URL}/`,
        type: "website",
        heroPreload: true,
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
        bodyContent: `<h1>اليسر — منتجات الصحة الزوجية الأصلية في مصر | شحن سري</h1>
<p>${esc(desc)}</p>
<p>اليسر ميديكال هي وجهتك الأولى في مصر للحصول على منتجات الصحة الزوجية الأصلية والمضمونة للرجال والنساء. نقدم تشكيلة مختارة بعناية من المكملات الغذائية، والعسل الملكي المدعم بالأعشاب، والمنتجات الموضعية من جل وكريمات وبخاخات، والقطرات، والأجهزة الطبية المساعدة — وكلها من مصادر موثوقة وبجودة أصلية معتمدة.</p>
<p>نفهم أن هذا النوع من المنتجات يتطلب خصوصية تامة وثقة كاملة، لذلك صممنا تجربتنا حول مبدأين: الأصالة والسرية. جميع طلباتك تصلك بتغليف محايد لا يكشف طبيعة المنتج، مع شحن سري لجميع محافظات مصر، وخيار الدفع عند الاستلام الذي يتيح لك معاينة شحنتك قبل الدفع. كما يقدم فريقنا الصيدلاني دعماً متخصصاً عبر واتساب لمساعدتك في اختيار الأنسب لحالتك والإجابة عن أي استفسار باحترام وخصوصية.</p>
<h2>أقسام الشركة</h2>
<ul>
  <li><a href="${SITE_URL}/products/men">منتجات الصحة الزوجية للرجال</a> — مكملات، عسل، جل وبخاخات مختارة لدعم الصحة الزوجية للرجال</li>
  <li><a href="${SITE_URL}/products/women">منتجات الصحة الزوجية للنساء</a> — منتجات مختارة لدعم الراحة والحيوية والثقة للنساء</li>
  <li><a href="${SITE_URL}/products/devices">الأجهزة والمستلزمات الطبية</a> — أجهزة احترافية للاستخدام الشخصي</li>
  <li><a href="${SITE_URL}/education">مقالات التوعية الصحية</a> — مقالات علمية موثوقة عن الصحة الزوجية</li>
</ul>
<h2>لماذا اليسر ميديكال؟</h2>
<ul>
  <li>منتجات أصلية 100% مستوردة من المصانع العالمية</li>
  <li>شحن سري وتغليف محايد لجميع محافظات مصر</li>
  <li>الدفع عند الاستلام مع إمكانية معاينة الشحنة</li>
  <li>خبرة 10 سنوات في مجال الصحة الزوجية</li>
  <li>تواصل مباشر عبر واتساب على مدار الساعة</li>
</ul>`,
      });
      // Hero preload is already handled by buildHtml with heroPreload:true above.
      // No need for a duplicate preload here — it would cause unused-preload browser warnings.
      writeFileSync(resolve(DIST, "index.html"), html);
      staticCount++;
    }

    /* ========== 2) Static routes ========== */
    const menCategoryFaqs = [
      {
        question: "ما هي منتجات الصحة الزوجية للرجال؟",
        answer:
          "منتجات مختارة لدعم احتياجات الرجل داخل العلاقة الزوجية مثل الطاقة والحيوية، التحكم في التوقيت، الراحة والثقة، مع ضرورة قراءة التعليمات واستشارة الطبيب عند وجود أمراض مزمنة.",
      },
      {
        question: "كيف أختار بين العسل، الكبسولات، الجل أو البخاخ؟",
        answer:
          "العسل والمكملات تناسب غالباً دعم الطاقة والحيوية، بينما المنتجات الموضعية مثل الجل أو البخاخ تُستخدم حسب التعليمات لاحتياج محدد. اقرأ وصف المنتج ومكوناته قبل الطلب.",
      },
      {
        question: "هل منتجات السعادة الزوجية للرجال آمنة؟",
        answer:
          "الأمان يعتمد على المكونات والجرعة والحالة الصحية. لا تستخدم المنتجات القوية مع أدوية القلب أو الضغط أو النترات إلا بعد استشارة الطبيب.",
      },
      {
        question: "هل يوجد شحن سري لمنتجات الصحة الزوجية داخل مصر؟",
        answer:
          "نعم، يتم الشحن بتغليف محايد وسري لجميع المحافظات ولا يتم توضيح طبيعة المنتج على العبوة الخارجية.",
      },
      {
        question: "متى يجب استشارة الطبيب قبل الاستخدام؟",
        answer:
          "استشر الطبيب عند وجود أمراض القلب أو الضغط أو السكر أو استخدام أدوية مزمنة أو وجود حساسية من المكونات.",
      },
    ];

    const womenCategoryFaqs = [
      {
        question: "ما هي منتجات الصحة الزوجية للنساء؟",
        answer:
          "منتجات مختارة لدعم الراحة والحيوية والترطيب والثقة وتحسين التجربة الزوجية للمرأة، مع مراعاة قراءة المكونات والتعليمات قبل الاستخدام.",
      },
      {
        question: "كيف أختار بين القطرات، العسل، الجل أو المنتجات الموضعية؟",
        answer:
          "القطرات والعسل تناسب غالباً دعم الحيوية والطاقة، بينما الجل والمنتجات الموضعية تُستخدم لاحتياجات مثل الترطيب أو الراحة حسب تعليمات المنتج.",
      },
      {
        question: "هل منتجات السعادة الزوجية للنساء مناسبة لكل السيدات؟",
        answer:
          "ليست كل المنتجات مناسبة للجميع. يجب استشارة الطبيب في حالات الحمل والرضاعة، اضطرابات الهرمونات، الأمراض المزمنة أو استخدام أدوية منتظمة.",
      },
      {
        question: "هل الشحن سري لمنتجات الصحة الزوجية للنساء؟",
        answer:
          "نعم، يتم تجهيز الطلبات بتغليف محايد وسري ولا يتم ذكر طبيعة المنتج على العبوة الخارجية حفاظاً على الخصوصية.",
      },
      {
        question: "هل يمكن الدفع عند الاستلام؟",
        answer:
          "نعم، يمكنك إتمام الطلب عبر واتساب أو الطلب المباشر مع إمكانية الدفع عند الاستلام حسب المحافظة وتفاصيل الشحن المتاحة وقت التأكيد.",
      },
    ];

    const staticRoutes = [
      {
        path: "/products/men",
        title: "منتجات الصحة الزوجية للرجال في مصر | اليسر ميديكال",
        desc: "تسوق منتجات الصحة الزوجية للرجال الأصلية في مصر: مكملات، عسل، جل وبخاخات للطاقة والأداء والتحكم، مختارة بعناية مع شحن سري ودفع عند الاستلام وتغليف محايد.",
        h1: "منتجات الصحة الزوجية للرجال",
        faqs: menCategoryFaqs,
      },
      {
        path: "/products/women",
        title: "منتجات الصحة الزوجية للنساء في مصر | اليسر ميديكال",
        desc: "تسوق منتجات الصحة الزوجية للنساء الأصلية في مصر: قطرات، عسل، جل ومنتجات مختارة للراحة والحيوية مع شحن سري ودفع عند الاستلام.",
        h1: "منتجات الصحة الزوجية للنساء",
        faqs: womenCategoryFaqs,
      },
      {
        path: "/products/devices",
        title: "الأجهزة والمستلزمات الطبية — اليسر ميديكال",
        desc: "تصفح أجهزة الصحة الزوجية والمستلزمات الطبية المساعدة: مضخات التفريغ، أجهزة الشد، وأدوات التأهيل، بجودة مضمونة وشحن سري ودفع عند الاستلام وتغليف محايد.",
        h1: "الأجهزة والمستلزمات الطبية",
      },
      {
        path: "/education",
        title: "التوعية الجنسية — مقالات علمية موثوقة | اليسر ميديكال",
        desc: `مكتبة من المقالات التوعوية الموثوقة بالعربية عن الصحة الجنسية والعلاقات الزوجية، تغطي ضعف الانتصاب، سرعة القذف، الرغبة، والتواصل بين الزوجين بإشراف مختصين.`,
        h1: "مقالات التوعية الجنسية",
      },
      {
        path: "/medical-review-board",
        title: "سياسة المراجعة الطبية والتحريرية — اليسر ميديكال",
        desc: "تعرف على منهج اليسر ميديكال في مراجعة المحتوى الصحي والتحذيرات الطبية ومصادر المعلومات وسياسة عدم استبدال الاستشارة الطبية.",
        h1: "سياسة مراجعة المحتوى والسلامة",
        body:
          "<h2>منهجنا في المراجعة الطبية</h2>" +
          "<p>نلتزم في اليسر ميديكال بتقديم محتوى صحي دقيق وموثوق، مبني على مصادر علمية معتمدة مثل منظمة الصحة العالمية ومراكز طبية مرموقة. نراجع المعلومات الصحية والزوجية بعناية لضمان دقتها ومواكبتها لأحدث المعرفة الطبية.</p>" +
          "<h2>التحذيرات والسلامة</h2>" +
          "<p>نولي التحذيرات الطبية أهمية قصوى. نحرص على توضيح موانع الاستخدام والتحذيرات الخاصة بكل منتج، خصوصاً لمن يعانون من أمراض القلب أو الضغط أو الكبد أو الكلى أو يتناولون أدوية معينة. سلامة عملائنا هي أساس كل ما نقدمه.</p>" +
          "<h2>مصادر المعلومات</h2>" +
          "<p>نعتمد في محتوانا التوعوي على مصادر موثوقة وموثقة، ونذكرها في مقالاتنا لدعم المصداقية والشفافية. نراجع التحديثات الطبية باستمرار لتحديث محتوانا وفق أحدث المعلومات.</p>" +
          "<h2>لست بديلاً عن الاستشارة الطبية</h2>" +
          "<p>نؤكد دائماً أن محتوانا والمنتجات التي نقدمها لا تغني عن استشارة الطبيب المختص. عند وجود أعراض مستمرة أو حالات صحية خاصة، ننصح بالتواصل مع مقدم الرعاية الصحية. موقعنا أداة توعية ودعم، وليس بديلاً عن الرعاية الطبية المتخصصة.</p>",
      },
      {
        path: "/about",
        title: "عن اليسر ميديكال — Elysr Medical Group",
        desc: "تعرف على اليسر ميديكال ومسيرتنا في مجال الصحة الزوجية بمصر: رؤيتنا في المنتجات الأصلية، المراجعة الطبية للمحتوى، الخصوصية، وثقة عملائنا منذ سنوات.",
        h1: "عن اليسر ميديكال",
        body:
          "<h2>شركتنا ورؤيتنا</h2>" +
          "<p>اليسر ميديكال شركة مصرية متخصصة في منتجات الصحة الزوجية الأصلية للرجال والنساء. انطلقنا من إيماننا بأن الرعاية الصحية والزوجية حق أساسي للجميع، وأن الوصول إلى منتجات أصلية وآمنة بمعلومات صادقة يجب ألا يكون صعباً أو محرجاً.</p>" +
          "<p>على مدار سنوات، بنينا سمعتنا على ثلاثة مبادئ ثابتة: الأصالة في المنتجات، والشفافية في المعلومات، واحترام خصوصية كل عميل. نختار منتجاتنا بعناية من موردين موثوقين، ونراجع معلوماتها طبيًا وصيدلانيًا قبل عرضها، ونلتزم بعدم تقديم وعود مبالغ فيها.</p>" +
          "<h2>لماذا يثق بنا العملاء</h2>" +
          "<p>يختار عملاؤنا اليسر ميديكال لعدة أسباب: منتجات أصلية 100% من مصادر موثوقة، تغليف محايد وسري لا يكشف طبيعة الطلب، شحن لجميع محافظات مصر، ودفع عند الاستلام يمنحهم طمأنينة كاملة. كما نقدم دعماً متخصصاً عبر واتساب للإجابة عن استفساراتهم قبل وبعد الشراء.</p>" +
          "<p>نؤمن بأن التوعية جزء من رسالتنا، لذلك نوفر مكتبة مقالات علمية موثوقة تساعد عملاءنا على فهم صحتهم واتخاذ قرارات واعية، بعيداً عن الخرافات والوعود الوهمية المنتشرة في السوق.</p>",
      },
      {
        path: "/contact",
        title: "تواصل معنا — اليسر ميديكال",
        desc: "تواصل مع فريق اليسر ميديكال عبر الواتساب أو البريد الإلكتروني للاستفسارات والطلبات والاستشارات، باستجابة سريعة وسرية تامة وخدمة عملاء تفهم احتياجك.",
        h1: "تواصل معنا",
        body:
          "<h2>كيف تتواصل معنا</h2>" +
          "<p>فريق اليسر ميديكال جاهز لمساعدتك في كل ما يخص منتجات الصحة الزوجية، من اختيار المنتج المناسب إلى الاستفسار عن الطلب والشحن. نرد على استفساراتك بسرعة وبسرية تامة، وبأسلوب محترم يفهم حساسية الموضوع.</p>" +
          "<h2>قنوات التواصل</h2>" +
          "<p>يمكنك التواصل معنا عبر واتساب مباشرة، حيث يتلقى فريقنا استفساراتك ويقدم لك النصح الصيدلاني حول المنتجات المتاحة وكيفية استخدامها بأمان. كما نوفر البريد الإلكتروني للاستفسارات الرسمية والتجارية.</p>" +
          "<h2>ماذا نساعدك فيه</h2>" +
          "<p>يمكننا مساعدتك في اختيار المنتج المناسب لاحتياجك، توضيح طريقة الاستخدام والجرعات، الإجابة عن استفسارات الشحن والتوصيل، ومتابعة حالة طلبك حتى يصلك. كما نقدم توجيهاً حول الاحتياطات والتحذيرات لمن يستخدمون أدوية أو يعانون من حالات صحية معينة.</p>" +
          "<p>نحرص على أن تكون تجربتك مريحة من أول تواصل، فخدمة العملاء لدينا تفهم أنك قد تكون بحاجة إلى استشارة خاصة، وتتعامل معك باحترام وخصوصية كاملة في كل خطوة. سواء كان سؤالك بسيطاً أو معقداً، ستجد دائماً من يستمع إليك ويرشدك بصدق.</p>",
      },
      {
        path: "/shipping",
        title: "سياسة الشحن — اليسر ميديكال",
        desc: "تعرف على خدمة الشحن السري لجميع محافظات مصر: تغليف محايد يحفظ خصوصيتك، مواعيد توصيل واضحة، الدفع عند الاستلام، وتكاليف شحن منافسة.",
        h1: "سياسة الشحن",
        body:
          "<h2>الشحن السري لجميع المحافظات</h2>" +
          "<p>نوصل طلباتك إلى جميع محافظات مصر مع خدمة شحن سري وموثوقة. داخل القاهرة الكبرى يصل طلبك عادة خلال 24 إلى 48 ساعة، بينما تتغير المدة قليلاً حسب بعد المحافظة، مع إمكانية معرفة موعد وصول تقريبي عند تأكيد الطلب.</p>" +
          "<h2>خصوصيتك أولاً</h2>" +
          "<p>نجهز جميع الطلبات بتغليف محايد تماماً لا يكشف طبيعة المنتج، ولا يتم كتابة أي تفاصيل عن المحتوى على العبوة الخارجية أو في بوليصة الشحن. هذا جزء من التزامنا بحماية خصوصيتك من لحظة الطلب حتى استلامه.</p>" +
          "<h2>الدفع عند الاستلام</h2>" +
          "<p>نعتمد نظام الدفع عند الاستلام في معظم الحالات، فلا تدفع أي مبلغ مقدم إلا عند استلام طلبك بيدك والتحقق منه. كما نقدم خيارات دفع مريحة وآمنة تمنحك ثقة كاملة في عملية الشراء.</p>" +
          "<p>نحرص على وصول طلبك بأمان وفي الوقت المحدد، ومعالجة أي استفسار عن الشحن بسرعة عبر خدمة العملاء.</p>",
      },
      {
        path: "/returns",
        title: "سياسة الاسترجاع — اليسر ميديكال",
        desc: "سياسة الاسترجاع والاستبدال في اليسر ميديكال: ضمان المنتجات الأصلية، إجراءات استبدال واضحة، وشروط الإرجاع خلال 14 يوماً لحماية حقك.",
        h1: "سياسة الاسترجاع",
        body:
          "<h2>حقك في الاسترجاع والاستبدال</h2>" +
          "<p>نلتزم في اليسر ميديكال بتقديم منتجات أصلية 100%، ونريدك أن تكون راضياً تماماً عن طلبك. لهذا نوفر سياسة استرجاع واستبدال واضحة تحمي حقك، وتضمن لك تجربة شراء آمنة ومطمئنة.</p>" +
          "<h2>شروط الاسترجاع</h2>" +
          "<p>إذا استلمت طلبك وواجهت مشكلة في المنتج، تواصل معنا خلال 14 يوماً من تاريخ الاستلام وسنساعدك. تشمل حالات الاسترجاع المنتجات التالفة أو غير المطابقة للطلب أو التي تصل بحالة مغايرة للوصف. نعاين الشكوى ونعمل على حلها بأسرع وقت، سواء بالاستبدال أو بأي حل يرضيك.</p>" +
          "<h2>كيف تطلب استرجاعاً</h2>" +
          "<p>تواصل مع خدمة العملاء عبر واتساب مع ذكر رقم الطلب، وسيرافقك فريقنا خلال الإجراءات بخطوات واضحة وبسيطة. نتعامل مع شكواك بجدية واحترام، ونحرص على حل أي مشكلة تعترض تجربتك.</p>" +
          "<h2>متى نعالج طلبك</h2>" +
          "<p>بعد استلامنا لشكواك وتأكيد الحالة، نبدأ في معالجتها بأسرع وقت ونوافيك بكل خطوة. هدفنا دائماً أن تخرج من أي تجربة استرجاع راضياً ومطمئناً، مع حرصنا الكامل على حماية حقك وخصوصيتك طوال الوقت.</p>" +
          "<p>المنتجات المخصصة لأغراض شخصية قد تخضع لشروط خاصة لأسباب صحية، وسيوضح لك فريقنا أي تفاصيل عند الطلب.</p>",
      },
      {
        path: "/terms",
        title: "الشروط والأحكام — اليسر ميديكال",
        desc: "الشروط والأحكام التي تحكم استخدامك لشركة اليسر ميديكال: سياسات الشراء، الشحن، الاسترجاع، المسؤولية القانونية، وحقوقك كمستخدم.",
        h1: "الشروط والأحكام",
        body:
          "<h2>مقدمة</h2>" +
          "<p>تحكم هذه الشروط والأحكام استخدامك لموقع اليسر ميديكال وخدماته. باستخدامك للموقع والطلب من خلاله، فإنك توافق على هذه الشروط. ننصحك بقراءتها بعناية قبل إتمام أي عملية شراء.</p>" +
          "<h2>استخدام الموقع والمنتجات</h2>" +
          "<p>المنتجات المعروضة على موقعنا مخصصة لدعم الصحة والراحة والعافية، وهي أدوات دعم وليست علاجاً لأي مرض. يجب قراءة التعليمات والتحذيرات بعناية، واستشارة الطبيب قبل الاستخدام إذا كنت تعاني من أمراض مزمنة أو تتناول أدوية، خصوصاً أمراض القلب أو الضغط أو الكبد أو الكلى.</p>" +
          "<h2>الطلبات والأسعار</h2>" +
          "<p>الأسعار المعروضة بالجنيه المصري وقد تتغير دون إشعار مسبق. نتحقق من صحة الطلبات والأسعار قبل تأكيدها، وقد نتواصل معك للتأكيد قبل الشحن. لا تعتبر أي طلب مؤكداً حتى يتم تأكيده معك.</p>" +
          "<h2>المسؤولية</h2>" +
          "<p>نبذل قصارى جهدنا لضمان دقة المعلومات المعروضة، لكننا لا نضمن خلوها من الأخطاء. استخدامك للمنتجات يكون وفق تعليمات الاستخدام وتحت مسؤوليتك، وننصح دائماً بالاستشارة الطبية المتخصصة عند الحاجة.</p>" +
          "<p>أي محتوى توعوي في موقعنا لا يغني عن استشارة الطبيب، ويجب ألا يُعتبر توصية طبية شخصية.</p>",
      },
      {
        path: "/privacy",
        title: "سياسة الخصوصية — اليسر ميديكال",
        desc: "سياسة خصوصية اليسر ميديكال: لا نبيع بياناتك ولا نشاركها لأغراض تسويقية، مع توضيح دقيق لجهات المعالجة التقنية، وخصوصية الطلبات أولويتنا.",
        h1: "سياسة الخصوصية",
        body:
          "<h2>خصوصيتك أولويتنا</h2>" +
          "<p>نفهم تماماً حساسية المعلومات المتعلقة بالمنتجات الشخصية والصحية، ونلتزم بحماية بياناتك بكل الوسائل المتاحة. خصوصيتك ليست مجرد سياسة، بل جزء أساسي من تجربتك معنا منذ لحظة الطلب.</p>" +
          "<h2>ما المعلومات التي نجمعها</h2>" +
          "<p>نجمع المعلومات الضرورية فقط لمعالجة طلبك: الاسم، رقم الهاتف، المحافظة، والعنوان لأغراض الشحن. لا نجمع أي بيانات دفع إلكترونية لأننا نعتمد الدفع عند الاستلام في معظم الحالات.</p>" +
          "<p>وفيما يخص التحليل: نجمع بيانات تقنية زيارية مجمعة (الصفحات الزائرة ونوع الجهاز) عبر أدوات التحليل لتحسين الموقع.</p>" +
          "<h2>كيف نستخدم بياناتك ومن يتعامل معها</h2>" +
          "<p>نستخدم بيانات الطلب حصرياً لتنفيذ طلبك والتواصل معك حوله. <strong>لا نبيع بياناتك الشخصية ولا نشاركها مع أي طرف لأغراض تسويقية</strong> — هذا التزام قاطع. ونوضح بدقة كل خدمة وما تتعامل معه: Google Analytics — بيانات زيارات تقنية مجمعة فقط (الصفحات والجهاز والمصدر) ولا تصلها أي بيانات طلب، وVercel — بيانات أداء وأمان تقنية على مستوى المنصة، وGoogle Sheets — بيانات الطلب التشغيلية نفسها (الاسم والهاتف والمحافظة والعنوان والمنتجات) وهي ضرورية لمعالجة طلبك والشحن ولا تُستخدم لأي غرض آخر ولا تصلها أدوات التحليل. يُحمَّل كود التحليل بعد تأجيل قصير ويعمل دون كوكيز تعريفية، ويمكنك منعه من إعدادات المتصفح دون تأثر استخدامك للموقع.</p>" +
          "<p>نتعامل مع بياناتك بسرية تامة، ونحد من الوصول إليها لمن يحتاجها فقط لأداء مهامه.</p>" +
          "<h2>التغليف السري</h2>" +
          "<p>جزء من خصوصيتك أن طلبك يصل إليك بتغليف محايد تماماً لا يكشف طبيعته، ولا يتم ذكر تفاصيل المنتج على العبوة الخارجية أو في بوليصة الشحن. بهذا نحفظ سرية مشترياتك حتى أمام من يستلم الطلب معك.</p>" +
          "<h2>حقوقك</h2>" +
          "<p>يمكنك في أي وقت طلب حذف بياناتك أو الاستفسار عن كيفية استخدامها — تواصل معنا عبر واتساب وسننفي الطلب يدوياً ونؤكد لك تنفيذه.</p>",
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
      {
        path: "/thank-you",
        title: "شكراً لك — اليسر ميديكال",
        desc: "شكراً لإرسال طلبك عبر واتساب. سنقوم بمعالجته فوراً.",
        h1: "شكراً لك",
        noindex: true,
      },
      // User-specific SPA route — needs static HTML for cleanUrls + Vercel fallback
      {
        path: "/wishlist",
        title: "المفضلة ❤️ — اليسر ميديكال",
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
    ];

    for (const r of staticRoutes) {
      const catItems = r.path.includes("/products/men")
        ? products.filter((p) => p.category === "men")
        : r.path.includes("/products/women")
          ? products.filter((p) => p.category === "women")
          : r.path === "/products/devices"
            ? products.filter((p) => p.category === "devices")
            : [];

      const jsonLd = [];
      jsonLd.push({
        "@context": "https://schema.org",
        "@type": "WebPage",
        "@id": `${SITE_URL}${r.path}`,
        name: r.title,
        description: r.desc,
        url: `${SITE_URL}${r.path}`,
      });

      const structuredCatItems = catItems.filter((p) => !GOOGLE_SHOPPING_BLOCKED.has(p.id));
      if (structuredCatItems.length > 0) {
        jsonLd.push({
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: r.title,
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

      const faqBody = Array.isArray(r.faqs)
        ? `<h2>أسئلة شائعة</h2>${r.faqs
            .map((f) => `<h3>${esc(f.question)}</h3><p>${esc(f.answer)}</p>`)
            .join("")}`
        : "";

      // 🚀 روابط داخلية للمنتجات داخل HTML الثابت (crawler-visible)
      // لولا هذه الروابط لما وجد جوجل أي طريقة للوصول إلى صفحات المنتجات
      // الفردية، لأن قائمة المنتجات تُرسم عبر JavaScript (SPA) ولا يقرؤها
      // الزاحف. وجود روابط <a href="/products/..."> ثابتة يجعل كل منتج
      // "مكتشفاً" وقابلاً للفهرسة، ويربط صفحات الأقسام بمنتجاتها.
      const productLinksBody =
        catItems.length > 0
          ? `<h2>منتجات ${r.title}</h2><ul>${catItems
              .map(
                (p) =>
                  `<li><a${GOOGLE_SHOPPING_BLOCKED.has(p.id) ? ' rel="nofollow"' : ""} href="${SITE_URL}/products/${p.slug}">${esc(p.name)}</a> — ${esc(
                    makeMetaDescription(p.description),
                  )}</li>`,
              )
              .join("")}</ul>`
          : "";

      // 🚀 روابط داخلية للمقالات في صفحة /education (crawler-visible)
      // صفحة الفهرس ترسم قائمة المقالات عبر JS (SPA) ولا يقرؤها الزاحف،
      // لذلك نضيف هنا قائمة روابط ثابتة لجميع المقالات حتى تكون كل مقالة
      // "مكتشفة" ومربوطة من الفهرس بمسار زحف حقيقي — كما فُعل مع المنتجات.
      const articleLinksBody =
        r.path === "/education" && articles.length > 0
          ? `<h2>جميع المقالات التوعوية</h2><ul>${articles
              .map(
                (a) =>
                  `<li><a href="${SITE_URL}/education/${a.slug}">${esc(a.title)}</a> — ${esc(
                    makeMetaDescription(a.excerpt),
                  )}</li>`,
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
        bodyContent: `<h1>${esc(r.h1)}</h1><p>${esc(r.desc)}</p>${r.body ? r.body : ""}${productLinksBody}${articleLinksBody}${faqBody}`,
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
      const title = product.name;
      // 🎯 وصف غني بالبيانات الفريدة (سعر، تقييم) لمنع Google من إعادة كتابته بوصف الموقع العام
      const desc = makeProductMetaDescription(product);
      const img = product.image
        ? `${SITE_URL}${assetUrl(product.image)}`
        : `${SITE_URL}/og-default.webp`;
      const canonical = `${SITE_URL}/products/${product.slug}`;
      const productReviews = Math.max(0, Math.floor(product.reviews ?? 0));
      const productRating = Math.max(0, Math.min(5, Number(product.rating ?? 0)));

      const productJsonLd = {
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.name,
        // ألقاب بحثية بديلة (عامية) — إشارة مهيكلة لجوجل بنفس كلمة البحث المصرية
        ...(product.searchAliases?.length ? { alternativeName: product.searchAliases } : {}),
        description: product.description,
        sku: product.id,
        mpn: product.id,
        image: img,
        ...(productReviews > 0
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
        brand: { "@type": "Brand", name: "Elysr Medical" },
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

      const benefits = (product.benefits || []).map((b) => `<li>${esc(b)}</li>`).join("");

      // اسم القسم + رابط القسم (crawler-visible)
      const categoryName =
        product.category === "men"
          ? "منتجات الصحة الزوجية للرجال"
          : product.category === "women"
            ? "منتجات الصحة الزوجية للنساء"
            : "الأجهزة والمستلزمات الطبية";
      const categoryUrl = `${SITE_URL}/products/${product.category}`;

      // منتجات مشابهة من نفس القسم (حتى 4، مع استبعاد المنتج الحالي) - مع صور واضحة alt/title لمنع لخبطة Google Images
      const relatedProducts = products
        .filter(
          (p) =>
            p.category === product.category &&
            p.slug !== product.slug &&
            !GOOGLE_SHOPPING_BLOCKED.has(p.id),
        )
        .slice(0, 4);
      const relatedBody =
        relatedProducts.length > 0
          ? `<h2>منتجات مشابهة</h2><ul>${relatedProducts
              .map(
                (p) =>
                  `<li><a href="${SITE_URL}/products/${p.slug}"><img src="${SITE_URL}${assetUrl(p.image)}" alt="${esc(p.name)}" title="${esc(p.name)}" width="240" height="240" loading="lazy" />${esc(p.name)}</a></li>`,
              )
              .join("")}</ul>`
          : "";

      const body = `
        <nav aria-label="Breadcrumb">
          <a href="${SITE_URL}/">الرئيسية</a> › <a href="${categoryUrl}">${esc(categoryName)}</a> › ${esc(product.name)}
        </nav>
        <h1>${esc(product.name)}</h1>
        <p><strong>${esc(product.nameEn || "")}</strong></p>
        <p>${esc(product.description)}</p>
        ${benefits ? `<h2>المميزات</h2><ul>${benefits}</ul>` : ""}
        ${product.ingredients ? `<h2>المكونات</h2><p>${esc(product.ingredients)}</p>` : ""}
        ${product.usage ? `<h2>طريقة الاستخدام</h2><p>${esc(product.usage)}</p>` : ""}
        <p>السعر: ${product.price} ج.م</p>
        ${productReviews > 0 ? `<h2>تقييمات العملاء</h2><p>التقييم العام: ${productRating} من 5 (${productReviews} تقييم)</p>` : ""}
        <p><a href="${categoryUrl}">تصفح كل ${esc(categoryName)}</a></p>
        ${relatedBody}
      `;

      const html = buildHtml(template, {
        title,
        description: desc,
        image: img,
        canonical,
        type: "product",
        noindex: isNoindexProduct(product),
        jsonLd: isNoindexProduct(product) ? [breadcrumb] : [productJsonLd, breadcrumb],
        bodyContent: body,
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
        const img = article.image
          ? article.image.startsWith("http")
            ? article.image
            : `${SITE_URL}${assetUrl(article.image)}`
          : `${SITE_URL}/og-default.webp`;
        const canonical = `${SITE_URL}/education/${article.slug}`;

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
          author: {
            "@type": "Organization",
            name: article.author?.name || "Elysr Medical Group",
            description: article.author?.credentials,
            url: SITE_URL,
          },
          reviewedBy: {
            "@type": "Organization",
            name: article.reviewer?.name || "Elysr Medical Group",
            description: article.reviewer?.credentials,
            url: SITE_URL,
          },
          publisher: {
            "@type": "Organization",
            name: "Elysr Medical Group",
            logo: { "@type": "ImageObject", url: `${SITE_URL}/logo.png` },
          },
          citation: (article.sources || []).map((source) => source.url),
          datePublished: article.publishedAt || "2025-01-01",
          dateModified: article.updatedAt || new Date().toISOString().slice(0, 10),
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

        // Convert article content (plain text with line breaks) → paragraphs
        const paragraphs = (article.content || "")
          .split(/\n+/)
          .filter((p) => p.trim())
          .map((p) => `<p>${esc(p.trim())}</p>`)
          .join("");

        const sourcesBody = (article.sources || [])
          .map(
            (source) =>
              `<li><a href="${esc(source.url)}" rel="nofollow noopener">${esc(source.title)}</a> — ${esc(source.publisher)}</li>`,
          )
          .join("");

        const body = `
          <article>
            <h1>${esc(article.title)}</h1>
            <p><em>${esc(article.category)} — ${article.readMin} دقائق قراءة — آخر تحديث: ${esc(article.updatedAt || "")}</em></p>
            ${article.image ? `<img src="${article.image.startsWith("http") ? article.image : assetUrl(article.image)}" alt="${esc(article.title)}" width="800" height="450" loading="eager" style="width:100%;height:auto;border-radius:16px;margin:16px 0" />` : ""}
            <p><strong>${esc(article.excerpt)}</strong></p>
            <section>
              <h2>بيانات الثقة والمراجعة</h2>
              <p>إعداد: ${esc(article.author?.name || "فريق المحتوى الصحي — اليسر ميديكال")}</p>
              <p>مراجعة: ${esc(article.reviewer?.name || "فريق المراجعة الطبية والصيدلانية — اليسر ميديكال")}</p>
              <p>هذا المحتوى توعوي ولا يغني عن استشارة الطبيب المختص.</p>
            </section>
            ${paragraphs}
            <section>
              <h2>المصادر الطبية المستخدمة</h2>
              <ul>${sourcesBody}</ul>
            </section>
            <p><a href="${SITE_URL}/education">← تصفح جميع المقالات التوعوية</a></p>
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
          .filter(Boolean)
          .filter((p) => !GOOGLE_SHOPPING_BLOCKED.has(p.id));

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
          keywords: [page.primaryKeyword, ...(page.relatedKeywords || [])].join(", "),
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
            image: product.image ? `${SITE_URL}${assetUrl(product.image)}` : undefined,
          })),
        };

        const sections = (page.sections || [])
          .map((section) => `<h2>${esc(section.heading)}</h2><p>${esc(section.body)}</p>`)
          .join("");
        const links = (page.links || [])
          .map(
            (link) =>
              `<li><a href="${SITE_URL}${link.href}">${esc(link.label)}</a> — ${esc(link.description)}</li>`,
          )
          .join("");
        const faqs = (page.faqs || [])
          .map((faq) => `<h3>${esc(faq.question)}</h3><p>${esc(faq.answer)}</p>`)
          .join("");
        const productsBody = selectedProducts
          .map(
            (product) =>
              `<li><a href="${SITE_URL}/products/${product.slug}"><img src="${SITE_URL}${assetUrl(product.image)}" alt="${esc(product.name)}" title="${esc(product.name)}" width="240" height="240" loading="lazy" />${esc(product.name)}</a> — ${esc(makeMetaDescription(product.description))}</li>`,
          )
          .join("");

        const body = `
          <article>
            <h1>${esc(page.title)}</h1>
            <p><strong>${esc(page.heroDescription)}</strong></p>
            <p>${esc(page.intro)}</p>
            ${sections}
            <h2>ابدأ من الأقسام الحالية</h2>
            <ul>${links}</ul>
            <h2>منتجات مختارة مرتبطة بالبحث</h2>
            <ul>${productsBody}</ul>
            <h2>أسئلة شائعة</h2>
            ${faqs}
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
        });

        writeFileSync(resolve(guidesDir, `${page.slug}.html`), html);
        landingCount++;
      }
      console.log(`✓ landing pages: ${landingCount}`);
    }

    console.log(
      `\n✅ Prerender complete: ${staticCount} static + ${productsCount} products + ${articlesCount} articles + ${landingCount} landing pages = ${staticCount + productsCount + articlesCount + landingCount} pages`,
    );
  } finally {
    await vite.close();
  }
}

prerender().catch((err) => {
  console.error("Prerender failed:", err);
  process.exit(1);
});
