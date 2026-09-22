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
const problems = [];

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
const imagesDir = resolve(DIST, "images");
const thumbsDir = resolve(DIST, "images", "thumbs");
const imageFiles = existsSync(imagesDir) ? walk(imagesDir, ".webp") : [];
const thumbFiles = existsSync(thumbsDir) ? walk(thumbsDir, ".webp") : [];
const sitemapPath = resolve(DIST, "sitemap.xml");
const catalogFeedPath = resolve(DIST, "catalog-feed.xml");

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

if (existsSync(catalogFeedPath)) {
  const feed = readFileSync(catalogFeedPath, "utf-8");
  const items = feed.match(/<item>/g) ?? [];
  const categories = feed.match(/<g:google_product_category>/g) ?? [];
  console.log(`📦 catalog-feed.xml: ${items.length} products, ${categories.length} categorized\n`);
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
  (n) =>
    !n.startsWith("article-") &&
    !n.startsWith("hero-") &&
    !n.startsWith("logo") &&
    !n.startsWith("og-default") &&
    !thumbNames.has(n),
);
if (missingThumbs.length > 0) {
  console.log(`⚠️  Missing thumbnails (${missingThumbs.length}):`);
  missingThumbs.slice(0, 10).forEach((n) => console.log(`   ${n}`));
  if (missingThumbs.length > 10) console.log(`   … and ${missingThumbs.length - 10} more`);
} else {
  console.log("✅ All product images have thumbnails (brand/OG images are exempt).");
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
// 8) Internal-link and generated-head integrity
// ─────────────────────────────────────────────────────────
// The old checker documented this scan but never executed it. Resolve clean
// URLs against the actual dist artifact so this gate works without a running
// server and catches both broken route links and missing static assets.
function localPathFromReference(raw, pageFile) {
  const value = String(raw || "").trim();
  if (!value || value.startsWith("#") || /^(?:data|blob|mailto|tel|javascript):/i.test(value)) {
    return null;
  }

  let parsed;
  try {
    const pageRel = relative(DIST, pageFile)
      .replace(/\\/g, "/")
      .replace(/\.html$/, "");
    const pageUrl = `${SITE_URL}/${pageRel === "index" ? "" : pageRel}`;
    parsed = new URL(value, pageUrl);
  } catch {
    return null;
  }
  if (![SITE_URL, "https://www.elysrmedical.store"].includes(parsed.origin)) return null;

  const path = decodeURIComponent(parsed.pathname || "/");
  if (path.startsWith("/api/") || path.startsWith("/_vercel/")) return null;
  return path;
}

function resolveDistReference(pathname) {
  const cleanPath = pathname.length > 1 ? pathname.replace(/\/$/, "") : "/";
  if (cleanPath === "/") return resolve(DIST, "index.html");
  const parts = cleanPath.split("/").filter(Boolean);
  if (parts.some((part) => part === ".." || part === ".")) return null;

  const candidates = [
    resolve(DIST, ...parts),
    resolve(DIST, ...parts) + ".html",
    resolve(DIST, ...parts, "index.html"),
  ];
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

const references = new Map();
const attrPattern = /\b(?:href|src|poster)=["']([^"']+)["']/gi;
const srcsetPattern = /\bsrcset=["']([^"']+)["']/gi;
for (const htmlFile of htmlFiles) {
  const html = readFileSync(htmlFile.path, "utf-8");
  for (const match of html.matchAll(attrPattern)) {
    const path = localPathFromReference(match[1], htmlFile.path);
    if (path) {
      const current = references.get(path) ?? [];
      current.push(relative(DIST, htmlFile.path));
      references.set(path, current);
    }
  }
  for (const match of html.matchAll(srcsetPattern)) {
    for (const candidate of match[1].split(",")) {
      const path = localPathFromReference(candidate.trim().split(/\\s+/)[0], htmlFile.path);
      if (path) {
        const current = references.get(path) ?? [];
        current.push(relative(DIST, htmlFile.path));
        references.set(path, current);
      }
    }
  }
}

const brokenReferences = [];
for (const [pathname, from] of references) {
  if (!resolveDistReference(pathname)) {
    brokenReferences.push({ pathname, from: [...new Set(from)].slice(0, 3) });
  }
}
if (brokenReferences.length > 0) {
  console.error(`❌ Broken internal references (${brokenReferences.length}):`);
  for (const item of brokenReferences.slice(0, 30)) {
    console.error(`   ${item.pathname} ← ${item.from.join(", ")}`);
  }
  if (brokenReferences.length > 30) {
    console.error(`   … and ${brokenReferences.length - 30} more`);
  }
  problems.push(`${brokenReferences.length} broken internal references`);
} else {
  console.log(`✅ Internal references: ${references.size} unique route/asset targets checked.`);
}

const descriptionMeta = /<meta\b(?=[^>]*\bname=["']description["'])[^>]*>/gi;
const duplicateDescriptionPages = htmlFiles
  .map((file) => ({
    file: relative(DIST, file.path),
    count: [...readFileSync(file.path, "utf-8").matchAll(descriptionMeta)].length,
  }))
  .filter((item) => item.count !== 1 && item.file !== "404.html");
if (duplicateDescriptionPages.length > 0) {
  console.error("❌ Every indexable generated page must contain exactly one meta description:");
  for (const item of duplicateDescriptionPages) console.error(`   ${item.file}: ${item.count}`);
  problems.push(`${duplicateDescriptionPages.length} pages with invalid description metadata`);
} else {
  console.log("✅ Generated pages contain exactly one meta description.");
}

// ─────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────
console.log("\n" + "─".repeat(50));
if (problems.length > 0) {
  console.error(`❌ Health check failed: ${problems.join("; ")}`);
  process.exitCode = 1;
} else {
  console.log("✅ Health check complete.");
}
