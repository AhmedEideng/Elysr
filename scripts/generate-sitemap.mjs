// توليد sitemap.xml تلقائياً عند البناء.
// يقرأ المنتجات والمقالات من ملفات البيانات ويُنشئ sitemap كامل.
import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const SITE_URL = process.env.SITE_URL || "https://elysrmedical.com";

// استخراج معرّفات المنتجات من ملف البيانات (regex بسيط)
const productsSrc = readFileSync(resolve(ROOT, "src/data/products.ts"), "utf-8");
const productIds = [...productsSrc.matchAll(/id:\s*"([^"]+)"/g)].map((m) => m[1]);

// استخراج slugs المقالات
let articleSlugs = [];
try {
  const articlesSrc = readFileSync(resolve(ROOT, "src/data/articles.ts"), "utf-8");
  articleSlugs = [...articlesSrc.matchAll(/slug:\s*"([^"]+)"/g)].map((m) => m[1]);
} catch {
  /* لا يوجد articles.ts */
}

const staticRoutes = [
  { path: "/", priority: "1.0", changefreq: "daily" },
  { path: "/products/men", priority: "0.9", changefreq: "weekly" },
  { path: "/products/women", priority: "0.9", changefreq: "weekly" },
  { path: "/products/devices", priority: "0.9", changefreq: "weekly" },
  { path: "/education", priority: "0.7", changefreq: "weekly" },
  { path: "/wholesale", priority: "0.8", changefreq: "monthly" },
  { path: "/about", priority: "0.5", changefreq: "monthly" },
  { path: "/contact", priority: "0.6", changefreq: "monthly" },
  { path: "/cart", priority: "0.3", changefreq: "yearly" },
  { path: "/shipping", priority: "0.4", changefreq: "yearly" },
  { path: "/returns", priority: "0.4", changefreq: "yearly" },
  { path: "/terms", priority: "0.3", changefreq: "yearly" },
  { path: "/privacy", priority: "0.3", changefreq: "yearly" },
];

const today = new Date().toISOString().slice(0, 10);

const urls = [
  ...staticRoutes.map((r) => ({ ...r, lastmod: today })),
  ...productIds.map((id) => ({
    path: `/products/${id}`,
    priority: "0.8",
    changefreq: "weekly",
    lastmod: today,
  })),
  ...articleSlugs.map((slug) => ({
    path: `/education/${slug}`,
    priority: "0.6",
    changefreq: "monthly",
    lastmod: today,
  })),
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${SITE_URL}${u.path}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>
`;

const outDir = resolve(ROOT, "public");
mkdirSync(outDir, { recursive: true });
writeFileSync(resolve(outDir, "sitemap.xml"), xml, "utf-8");
console.log(`✓ sitemap.xml generated (${urls.length} URLs) → public/sitemap.xml`);
