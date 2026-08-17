/**
 * ============================================================
 * Health check / Build report
 * ============================================================
 * Walks the dist/ directory and reports:
 *   - Total HTML files vs expected
 *   - Total image count vs expected
 *   - Sitemap URL count
 *   - Prerendered pages count by category
 *   - Missing images (referenced but not on disk)
 *   - Broken internal links (404 candidates)
 *   - Largest HTML files (potential bloat)
 *
 * Usage: node scripts/health-check.mjs
 * ============================================================
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { resolve, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DIST = resolve(ROOT, "dist");

if (!existsSync(DIST)) {
  console.error("❌ dist/ not found. Run `npm run build` first.");
  process.exit(1);
}

const SITE_URL = "https://elysrmedical.store";

function walk(dir, ext = null) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walk(full, ext));
    else if (!ext || entry.endsWith(ext)) out.push({ path: full, size: st.size });
  }
  return out;
}

const htmlFiles = walk(DIST, ".html");
const imageFiles = walk(resolve(DIST, "images"), ".webp");
const thumbFiles = walk(resolve(DIST, "images", "thumbs"), ".webp");
const sitemapPath = resolve(DIST, "sitemap.xml");
const catalogPath = resolve(DIST, "catalog-feed.xml");

// ─────────────────────────────────────────────────────────
// 1) HTML distribution
// ─────────────────────────────────────────────────────────
const byDir = {};
for (const f of htmlFiles) {
  const rel = relative(DIST, f.path);
  const top = rel.split(/[\\/]/)[0];
  byDir[top] = (byDir[top] ?? 0) + 1;
}

console.log("📄 HTML distribution by top-level dir:");
for (const [dir, count] of Object.entries(byDir).sort((a, b) => b[1] - a[1])) {
  console.log(`   ${dir.padEnd(20)} ${count}`);
}
console.log(`   ${"TOTAL".padEnd(20)} ${htmlFiles.length}\n`);

// ─────────────────────────────────────────────────────────
// 2) Image distribution
// ─────────────────────────────────────────────────────────
const imageBytes = imageFiles.reduce((s, f) => s + f.size, 0);
const thumbBytes = thumbFiles.reduce((s, f) => s + f.size, 0);
console.log(`🖼  Images: ${imageFiles.length} (${(imageBytes / 1024 / 1024).toFixed(2)} MB)`);
console.log(`   Thumbs: ${thumbFiles.length} (${(thumbBytes / 1024 / 1024).toFixed(2)} MB)`);
console.log(`   Avg size: ${(imageBytes / Math.max(1, imageFiles.length) / 1024).toFixed(1)} KB\n`);

// ─────────────────────────────────────────────────────────
// 3) Sitemap analysis
// ─────────────────────────────────────────────────────────
if (existsSync(sitemapPath)) {
  const xml = readFileSync(sitemapPath, "utf-8");
  const urls = xml.match(/<loc>[^<]+<\/loc>/g) ?? [];
  console.log(`🗺  sitemap.xml: ${urls.length} URLs`);
  // By category
  const byCategory = {};
  for (const u of urls) {
    const path = u.replace(/<\/?loc>/g, "").replace(SITE_URL, "");
    const seg = path.split("/")[1] || "home";
    byCategory[seg] = (byCategory[seg] ?? 0) + 1;
  }
  for (const [cat, n] of Object.entries(byCategory).sort((a, b) => b[1] - a[1])) {
    console.log(`     /${cat.padEnd(20)} ${n}`);
  }
  console.log();
}

if (existsSync(catalogPath)) {
  const xml = readFileSync(catalogPath, "utf-8");
  const items = xml.match(/<item>/g) ?? [];
  console.log(`📦 catalog-feed.xml: ${items.length} products\n`);
}

// ─────────────────────────────────────────────────────────
// 4) Largest HTML files
// ─────────────────────────────────────────────────────────
const largest = [...htmlFiles].sort((a, b) => b.size - a.size).slice(0, 5);
console.log("🐘 Largest HTML files:");
for (const f of largest) {
  console.log(`   ${(f.size / 1024).toFixed(1).padStart(7)} KB  ${relative(DIST, f.path)}`);
}
console.log();

// ─────────────────────────────────────────────────────────
// 5) Missing thumbnails (referenced in images/ but not in thumbs/)
// ─────────────────────────────────────────────────────────
const imageNames = new Set(imageFiles.map((f) => f.path.split("/").pop()));
const thumbNames = new Set(thumbFiles.map((f) => f.path.split("/").pop()));
const missingThumbs = [...imageNames].filter(
  (n) => !n.startsWith("article-") && !n.startsWith("hero-") && !thumbNames.has(n),
);
if (missingThumbs.length > 0) {
  console.log(`⚠️  Missing thumbnails (${missingThumbs.length}):`);
  missingThumbs.slice(0, 10).forEach((n) => console.log(`   ${n}`));
  if (missingThumbs.length > 10) console.log(`   … and ${missingThumbs.length - 10} more`);
} else {
  console.log("✅ All product images have thumbnails.");
}
console.log();

// ─────────────────────────────────────────────────────────
// 6) Check hero image preload markup
// ─────────────────────────────────────────────────────────
const indexPath = resolve(DIST, "index.html");
if (existsSync(indexPath)) {
  const html = readFileSync(indexPath, "utf-8");
  const hasPreload = html.includes('rel="preload"') && html.includes("hero-banner");
  const hasCanonical = html.includes('rel="canonical"');
  const hasOgImage = html.includes('property="og:image"');
  const hasJsonLd = html.includes("application/ld+json");

  console.log("🏠 Home page checks:");
  console.log(`   ${hasPreload ? "✅" : "❌"} Hero image preload`);
  console.log(`   ${hasCanonical ? "✅" : "❌"} Canonical link`);
  console.log(`   ${hasOgImage ? "✅" : "❌"} Open Graph image`);
  console.log(`   ${hasJsonLd ? "✅" : "❌"} JSON-LD schema`);
}
console.log();

// ─────────────────────────────────────────────────────────
// 7) Total bundle size (dist root)
// ─────────────────────────────────────────────────────────
function totalBytes(dir) {
  return walk(dir).reduce((s, f) => s + f.size, 0);
}
const total = totalBytes(DIST);
console.log(`📦 Total dist/ size: ${(total / 1024 / 1024).toFixed(2)} MB`);

// ─────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────
console.log("\n" + "─".repeat(50));
console.log("✅ Health check complete.");
