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
  // اقتطاع عند آخر مسافة قبل الحد
  const cut = clean.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  const base = lastSpace > 40 ? cut.slice(0, lastSpace) : cut;
  return `${base}…`;
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
    ? "noindex,follow"
    : "index,follow,max-image-preview:large,max-snippet:-1";
  if (/<meta name="robots"[^>]*>/.test(html)) {
    html = html.replace(
      /<meta name="robots"[^>]*>/,
      `<meta name="robots" content="${robotsContent}" />`,
    );
  } else {
    html = html.replace("</head>", `  <meta name="robots" content="${robotsContent}" />\n</head>`);
  }

  // Home-only hero preload: keeps the LCP image discoverable in the initial
  // document without globally preloading it on routes that do not render Hero.
  if (heroPreload) {
    html = html.replace(
      "</head>",
      `  <link rel="preload" as="image" href="/images/hero-banner.webp?v=27" imagesrcset="/images/hero-banner-768.webp?v=27 768w, /images/hero-banner.webp?v=27 1200w" imagesizes="100vw" fetchpriority="high" />
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
      const title = "اليسر — منتجات الصحة الزوجية الأصلية في مصر";
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
                urlTemplate: `${SITE_URL}/products/men?q={search_term_string}`,
              },
              "query-input": "required name=search_term_string",
            },
          },
        ],
        bodyContent: `<h1>اليسر — منتجات الصحة الزوجية الأصلية في مصر</h1>
<p>${esc(desc)}</p>
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
      },
      {
        path: "/about",
        title: "عن اليسر ميديكال — Elysr Medical Group",
        desc: "تعرف على اليسر ميديكال ومسيرتنا في مجال الصحة الزوجية بمصر: رؤيتنا في المنتجات الأصلية، المراجعة الطبية للمحتوى، الخصوصية، وثقة عملائنا منذ سنوات.",
        h1: "عن اليسر ميديكال",
      },
      {
        path: "/contact",
        title: "تواصل معنا — اليسر ميديكال",
        desc: "تواصل مع فريق اليسر ميديكال عبر الواتساب أو البريد الإلكتروني للاستفسارات والطلبات والاستشارات، باستجابة سريعة وسرية تامة وخدمة عملاء تفهم احتياجك.",
        h1: "تواصل معنا",
      },
      {
        path: "/shipping",
        title: "سياسة الشحن — اليسر ميديكال",
        desc: "تعرف على خدمة الشحن السري لجميع محافظات مصر: تغليف محايد يحفظ خصوصيتك، مواعيد توصيل واضحة، الدفع عند الاستلام، وتكاليف شحن منافسة.",
        h1: "سياسة الشحن",
      },
      {
        path: "/returns",
        title: "سياسة الاسترجاع — اليسر ميديكال",
        desc: "سياسة الاسترجاع والاستبدال في اليسر ميديكال: ضمان المنتجات الأصلية، إجراءات استبدال واضحة، وشروط الإرجاع خلال 14 يوماً لحماية حقك.",
        h1: "سياسة الاسترجاع",
      },
      {
        path: "/terms",
        title: "الشروط والأحكام — اليسر ميديكال",
        desc: "الشروط والأحكام التي تحكم استخدامك لشركة اليسر ميديكال: سياسات الشراء، الشحن، الاسترجاع، المسؤولية القانونية، وحقوقك كمستخدم.",
        h1: "الشروط والأحكام",
      },
      {
        path: "/privacy",
        title: "سياسة الخصوصية — اليسر ميديكال",
        desc: "سياسة خصوصية اليسر ميديكال: كيف نحمي بياناتك الشخصية، لا نشارك معلوماتك مع أي طرف، ولا نحتفظ ببيانات الدفع، خصوصيتك أولويتنا.",
        h1: "سياسة الخصوصية",
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

      if (catItems.length > 0) {
        jsonLd.push({
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: r.title,
          numberOfItems: catItems.length,
          itemListElement: catItems.map((p, i) => ({
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
                  `<li><a href="${SITE_URL}/products/${p.slug}">${esc(p.name)}</a> — ${esc(
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
        bodyContent: `<h1>${esc(r.h1)}</h1><p>${esc(r.desc)}</p>${productLinksBody}${articleLinksBody}${faqBody}`,
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
      // 🎯 العنوان بلا لاحقة "— اليسر ميديكال" لأن أسماء المنتجات طويلة بطبيعتها
      // (تحتوي وصفاً + اسم إنجليزي). اللاحقة كانت تُطيل العنوان فوق 65 حرفاً
      // فتُقتطع في نتائج Google وتُفقد كلمات مفتاحية. الـ brand موجود في
      // Organization + Product schema، فحذفها من العنوان لا يضر العلامة.
      const title = product.name;
      // 🎯 meta description مُقتطع إلى ~155 حرفاً (يُعرض كاملاً في نتائج Google).
      // الوصف الكامل (product.description) يبقى في JSON-LD ومحتوى الصفحة.
      const desc = makeMetaDescription(product.description);
      const img = product.image ? `${SITE_URL}${product.image}` : `${SITE_URL}/og-default.webp`;
      const canonical = `${SITE_URL}/products/${product.slug}`;

      // ⭐ aggregateRating — لعرض نجوم التقييم في نتائج Google.
      // القيم معقولة ومطابقة لما يظهر فعلاً على الصفحة:
      //  - reviewCount = product.reviews (5-13) وهو نفس الرقم المعروض في عنوان القسم
      //  - ratingValue = product.rating وهو نفس المتوسط المعروض
      // ملاحظة: لا تُضاف إلا عند وجود تقييمات >= 1.
      const productReviews = Math.max(0, Math.floor(product.reviews ?? 0));
      const productRating = Math.max(0, Math.min(5, Number(product.rating ?? 0)));

      const productJsonLd = {
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.name,
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
          shippingDetails: {
            "@type": "OfferShippingDetails",
            shippingDestination: {
              "@type": "DefinedRegion",
              addressCountry: "EG",
            },
            shippingRate: {
              "@type": "MonetaryAmount",
              value: 50,
              currency: "EGP",
            },
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
          },
          hasMerchantReturnPolicy: {
            "@type": "MerchantReturnPolicy",
            applicableCountry: "EG",
            returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
            merchantReturnDays: 14,
            returnMethod: "https://schema.org/ReturnByMail",
            returnFees: "https://schema.org/ReturnShippingFees",
            returnShippingFeesAmount: {
              "@type": "MonetaryAmount",
              value: 50,
              currency: "EGP",
            },
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
      const body = `
        <h1>${esc(product.name)}</h1>
        <p><strong>${esc(product.nameEn || "")}</strong></p>
        <p>${esc(product.description)}</p>
        ${benefits ? `<h2>المميزات</h2><ul>${benefits}</ul>` : ""}
        ${product.ingredients ? `<h2>المكونات</h2><p>${esc(product.ingredients)}</p>` : ""}
        ${product.usage ? `<h2>طريقة الاستخدام</h2><p>${esc(product.usage)}</p>` : ""}
        <p>السعر: ${product.price} ج.م</p>
        ${
          productReviews > 0
            ? `<h2>تقييمات العملاء</h2><p>التقييم العام: ${productRating} من 5 (${productReviews} تقييم)</p>`
            : ""
        }
      `;

      const html = buildHtml(template, {
        title,
        description: desc,
        image: img,
        canonical,
        type: "product",
        jsonLd: [productJsonLd, breadcrumb],
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
            : `${SITE_URL}${article.image}`
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
            ${article.image ? `<img src="${article.image.startsWith("http") ? article.image : article.image}" alt="${esc(article.title)}" width="800" height="450" loading="eager" style="width:100%;height:auto;border-radius:16px;margin:16px 0" />` : ""}
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
            image: product.image ? `${SITE_URL}${product.image}` : undefined,
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
              `<li><a href="${SITE_URL}/products/${product.slug}">${esc(product.name)}</a> — ${esc(product.description)}</li>`,
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
