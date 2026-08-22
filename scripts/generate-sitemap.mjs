import { createServer } from "vite";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const SITE_URL = (process.env.SITE_URL || "https://elysrmedical.store").replace(/\/$/, "");

/** 🗂️ رقم إصدار الكاش المركزي — نفس القيمة في src/lib/cache.ts و scripts/prerender-seo.mjs */
const CACHE_VERSION = "28";

/** يلحق رقم الإصدار بمسار صورة/أصل (يزيل أي ?v= قديم أولاً). */
function assetUrl(path) {
  const base = String(path).split("?")[0];
  return `${base}?v=${CACHE_VERSION}`;
}

function getGitLastmod(filePath, fallback) {
  try {
    const out = execSync(`git log -1 --format=%cs -- ${filePath}`, {
      cwd: ROOT,
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf-8",
    }).trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(out) ? out : fallback;
  } catch {
    return fallback;
  }
}

// 🗓️ الـ lastmod يجب أن يعكس "آخر تعديل حقيقي" للملف، لا تاريخ اليوم دائماً.
// لو رجعنا دائماً "النهاردة" (حتى بدون تعديل)، ستلاحظ Google ذلك وتتجاهل
// إشارة lastmod للموقع كله — مما يقلل كفاءة إعادة الزحف.
// نستخدم تاريخ آخر commit حقيقي للملف عبر git log، ونستخدم اليوم فقط
// كـ fallback للملفات الجديدة التي ليس لها تاريخ commit بعد.
function freshLastmod(filePath, fallback) {
  return getGitLastmod(filePath, fallback);
}

const esc = (s = "") =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

async function generateSitemap() {
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: "custom",
    optimizeDeps: { noDiscovery: true, include: [] },
    plugins: [],
    logLevel: "silent",
  });

  try {
    // 1. جلب البيانات بشكل برمجي حقيقي بدلاً من الـ Regex
    const { products } = await vite.ssrLoadModule("/src/data/products.ts");

    // حفظ نسخة من الكتالوج كـ JSON للسيرفر للتحقق من الأسعار في الخلفية (Server-side Price Lookup)
    const apiLibDir = resolve(ROOT, "api", "lib");
    mkdirSync(apiLibDir, { recursive: true });
    writeFileSync(
      resolve(apiLibDir, "products-db.json"),
      JSON.stringify(products, null, 2),
      "utf-8",
    );

    // حفظ إعدادات الشحن والعروض الترويجية المشتركة للسيرفر (Single Source of Truth)
    const { GOVERNORATE_SHIPPING, FREE_SHIPPING_THRESHOLD } = await vite.ssrLoadModule(
      "/src/lib/governorates.ts",
    );
    const { PROMO_TIERS } = await vite.ssrLoadModule("/src/lib/promo.ts");
    const configDb = {
      GOVERNORATE_SHIPPING,
      FREE_SHIPPING_THRESHOLD,
      PROMO_TIERS,
    };
    writeFileSync(resolve(apiLibDir, "config-db.json"), JSON.stringify(configDb, null, 2), "utf-8");
    const { isCatalogFeedEligible, GOOGLE_SHOPPING_BLOCKED } = await vite.ssrLoadModule(
      "/src/lib/product-compliance.ts",
    );
    const catalogProducts = products.filter(isCatalogFeedEligible);

    let articles = [];
    try {
      const mod = await vite.ssrLoadModule("/src/data/articles.ts");
      articles = mod.articles || [];
    } catch {}

    let seoLandingPages = [];
    try {
      const mod = await vite.ssrLoadModule("/src/data/landing-pages.ts");
      seoLandingPages = mod.seoLandingPages || [];
    } catch {}

    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Cairo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    const productLastmod = freshLastmod("src/data/products.ts", today);
    const landingLastmod = freshLastmod("src/data/landing-pages.ts", today);

    const staticRoutes = [
      {
        path: "/",
        priority: "1.0",
        changefreq: "daily",
        lastmod: freshLastmod("src/routes/index.tsx", today),
      },
      {
        path: "/products/men",
        priority: "0.9",
        changefreq: "weekly",
        lastmod: freshLastmod("src/routes/products.men.tsx", productLastmod),
      },
      {
        path: "/products/women",
        priority: "0.9",
        changefreq: "weekly",
        lastmod: freshLastmod("src/routes/products.women.tsx", productLastmod),
      },
      {
        path: "/products/devices",
        priority: "0.9",
        changefreq: "weekly",
        lastmod: freshLastmod("src/routes/products.devices.tsx", productLastmod),
      },
      {
        path: "/education",
        priority: "0.8",
        changefreq: "weekly",
        lastmod: freshLastmod("src/routes/education.tsx", today),
      },
      {
        path: "/about",
        priority: "0.5",
        changefreq: "monthly",
        lastmod: freshLastmod("src/routes/about.tsx", today),
      },
      {
        path: "/contact",
        priority: "0.6",
        changefreq: "monthly",
        lastmod: freshLastmod("src/routes/contact.tsx", today),
      },
      {
        path: "/medical-review-board",
        priority: "0.5",
        changefreq: "monthly",
        lastmod: freshLastmod("src/routes/medical-review-board.tsx", today),
      },
      {
        path: "/shipping",
        priority: "0.4",
        changefreq: "yearly",
        lastmod: freshLastmod("src/routes/shipping.tsx", today),
      },
      {
        path: "/returns",
        priority: "0.4",
        changefreq: "yearly",
        lastmod: freshLastmod("src/routes/returns.tsx", today),
      },
      {
        path: "/terms",
        priority: "0.3",
        changefreq: "yearly",
        lastmod: freshLastmod("src/routes/terms.tsx", today),
      },
      {
        path: "/privacy",
        priority: "0.3",
        changefreq: "yearly",
        lastmod: freshLastmod("src/routes/privacy.tsx", today),
      },
    ];

    const urls = [
      ...staticRoutes,
      ...products
        .filter((p) => !GOOGLE_SHOPPING_BLOCKED.has(p.id)) // الأدوية المرفوضة خارج sitemap (لا تُفهرس)
        .map((p) => ({
          path: `/products/${p.slug}`,
          priority: "0.8",
          changefreq: "weekly",
          lastmod: productLastmod,
          image: p.image,
          imageTitle: p.name,
        })),
      ...articles.map((a) => ({
        path: `/education/${a.slug}`,
        priority: "0.7",
        changefreq: "monthly",
        lastmod: freshLastmod("src/data/articles.ts", a.updatedAt || a.publishedAt || today),
        image: a.image,
        imageTitle: a.title,
      })),
      ...seoLandingPages
        .filter((page) => !page.noindex)
        .map((page) => ({
          path: `/products/guides/${page.slug}`,
          priority: "0.75",
          changefreq: "monthly",
          lastmod: landingLastmod,
        })),
    ];

    // 2. بناء ملفات الـ XML
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls
  .map((u) => {
    const imageBlock = u.image
      ? `
    <image:image>
      <image:loc>${SITE_URL}${assetUrl(u.image)}</image:loc>
      <image:title>${esc(u.imageTitle)}</image:title>
    </image:image>`
      : "";
    return `  <url>
    <loc>${SITE_URL}${u.path}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
    <xhtml:link rel="alternate" hreflang="ar-eg" href="${SITE_URL}${u.path}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE_URL}${u.path}" />${imageBlock}
  </url>`;
  })
  .join("\n")}
</urlset>
`;

    const articleImageEntries = articles
      .filter((a) => a.image)
      .map(
        (a) => `  <url>
    <loc>${SITE_URL}/education/${a.slug}</loc>
    <image:image>
      <image:loc>${SITE_URL}${assetUrl(a.image)}</image:loc>
      <image:title>${esc(a.title)}</image:title>
      <image:caption>${esc(a.title)} — اليسر ميديكال</image:caption>
    </image:image>
  </url>`,
      )
      .join("\n");

    const imageXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${products
  .map(
    (p) => `  <url>
    <loc>${SITE_URL}/products/${p.slug}</loc>
    <image:image>
      <image:loc>${SITE_URL}${assetUrl(p.image)}</image:loc>
      <image:title>${esc(p.name)}</image:title>
      <image:caption>${esc(p.name)} — اليسر ميديكال</image:caption>
    </image:image>
  </url>`,
  )
  .join("\n")}
${articleImageEntries}
</urlset>
`;

    const indexXml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${SITE_URL}/sitemap.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${SITE_URL}/sitemap-images.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${SITE_URL}/catalog-feed.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
</sitemapindex>
`;

    // 4. بناء ملف الكتالوج لفيسبوك وجوجل (Facebook / Google Merchant Feed)
    const catalogXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>اليسر ميديكال - كتالوج المنتجات</title>
    <link>${SITE_URL}</link>
    <description>كتالوج منتجات الصحة الزوجية الأصلية من اليسر ميديكال</description>
${catalogProducts
  .map((p) => {
    // 🛒 Google Merchant Center يطلب المكونات داخل الوصف
    // ندمج description + ingredients + usage لوصف شامل
    let fullDesc = p.description || "";
    if (p.ingredients) {
      fullDesc += " المكونات: " + p.ingredients;
    }
    if (p.usage) {
      fullDesc += " طريقة الاستخدام: " + p.usage;
    }
    // Google Merchant يقبل حتى 5000 حرف في الوصف
    fullDesc = fullDesc.slice(0, 5000);

    return `    <item>
      <g:id>${esc(p.id)}</g:id>
      <g:title>${esc(p.name)}</g:title>
      <g:description>${esc(fullDesc)}</g:description>
      <g:link>${SITE_URL}/products/${p.slug}</g:link>
      <g:image_link>${SITE_URL}${assetUrl(p.image)}</g:image_link>
      <g:brand>اليسر ميديكال</g:brand>
      <g:condition>new</g:condition>
      <g:availability>${p.stock > 0 ? "in stock" : "out of stock"}</g:availability>
      <g:price>${p.price} EGP</g:price>
    </item>`;
  })
  .join("\n")}
  </channel>
</rss>
`;

    const robots = `# robots.txt — Elysr Medical Group
# ${SITE_URL}

User-agent: *
Allow: /

# ملاحظة: صفحات /cart و /wishlist و /order-confirmed و /thank-you تحمل وسم
# noindex في HTML مباشرة. لذا لا نضعها في Disallow هنا — لأن منع الزحف
# (Disallow) يمنع Google من قراءة وسم noindex، والتكرار بينهما غير مفيد.

# Allow AI bots for AI Overviews, ChatGPT discovery, Perplexity, etc.
User-agent: GPTBot
Allow: /
User-agent: ChatGPT-User
Allow: /
User-agent: Google-Extended
Allow: /
User-agent: PerplexityBot
Allow: /
User-agent: anthropic-ai
Allow: /
User-agent: Claude-Web
Allow: /
User-agent: CCBot
Disallow: /
User-agent: Bytespider
Disallow: /

User-agent: Googlebot-Image
Allow: /images/
Allow: /logo.png
Allow: /og-default.webp
Allow: /apple-touch-icon.png

Sitemap: ${SITE_URL}/sitemap-index.xml
Sitemap: ${SITE_URL}/sitemap.xml
Sitemap: ${SITE_URL}/sitemap-images.xml
Sitemap: ${SITE_URL}/catalog-feed.xml
`;

    const outDir = resolve(ROOT, "public");
    mkdirSync(outDir, { recursive: true });
    writeFileSync(resolve(outDir, "sitemap.xml"), xml, "utf-8");
    writeFileSync(resolve(outDir, "sitemap-images.xml"), imageXml, "utf-8");
    writeFileSync(resolve(outDir, "sitemap-index.xml"), indexXml, "utf-8");
    writeFileSync(resolve(outDir, "catalog-feed.xml"), catalogXml, "utf-8");
    writeFileSync(resolve(outDir, "robots.txt"), robots, "utf-8");

    // ⚡ تحسين الأداء: توليد ملفات JSON فردية لكل Landing Page
    // بدلاً من تحميل كل الـ 125 صفحة في bundle واحد 396KB
    console.log("\n⚡ Generating individual landing page JSON files...");
    const landingPagesDir = resolve(outDir, "landing-pages");
    if (!existsSync(landingPagesDir)) mkdirSync(landingPagesDir, { recursive: true });

    const mod2 = await vite.ssrLoadModule("/src/data/landing-pages.ts");
    const allPages = mod2.seoLandingPages || [];

    // 🧹 حذف ملفات JSON القديمة غير الموجودة بعد الآن في المصدر (عند حذف/دمج
    // أي landing page). يمنع بقاء صفحات محذوفة في public/ من تحديثات سابقة.
    const { readdirSync, unlinkSync } = await import("node:fs");
    const validSlugs = new Set(allPages.map((p) => p.slug));
    for (const f of readdirSync(landingPagesDir)) {
      if (f.endsWith(".json") && !validSlugs.has(f.replace(/\.json$/, ""))) {
        unlinkSync(resolve(landingPagesDir, f));
      }
    }

    for (const page of allPages) {
      const safeData = {
        slug: page.slug,
        title: page.title,
        metaTitle: page.metaTitle,
        metaDescription: page.metaDescription,
        eyebrow: page.eyebrow,
        heroDescription: page.heroDescription,
        intro: page.intro,
        sections: page.sections,
        links: page.links,
        productIds: page.productIds,
        faqs: page.faqs,
        primaryKeyword: page.primaryKeyword,
        relatedKeywords: page.relatedKeywords,
        noindex: page.noindex,
      };
      writeFileSync(
        resolve(landingPagesDir, `${page.slug}.json`),
        JSON.stringify(safeData, null, 2),
        "utf-8",
      );
    }
    console.log(`   ✅ ${allPages.length} individual JSON files generated (${landingPagesDir})`);

    console.log(`✓ sitemaps & catalog feed generated successfully.`);
  } finally {
    await vite.close();
  }
}

generateSitemap().catch((err) => {
  console.error("Sitemap generation failed:", err);
  process.exit(1);
});
