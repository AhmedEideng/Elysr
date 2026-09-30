/**
 * ============================================================
 * Final whole-site audit (post prerender-parity pass)
 * ============================================================
 * Dimensions NOT covered by prerender-vs-hydrated.mjs:
 *   A. Link & asset integrity — every internal href/src in the 252 built
 *      pages must resolve to a real file, a real page, or a redirect rule.
 *      Plus orphan-page detection (indexed pages nothing links to).
 *   B. Head hygiene — one title/description/canonical/og:image, duplicates
 *      across pages, length limits, lang/dir/viewport/charset, placeholder
 *      leaks (undefined / NaN / [object Object] / http:// / localhost).
 *   C. Images — missing alt, missing width/height (CLS), missing files,
 *      dead image files, oversized assets, LCP hints.
 *   D. Structured data depth — offers.price vs visible price vs feed price,
 *      recommended merchant fields, BreadcrumbList contiguity, ItemList
 *      counts, aggregateRating sanity + visible parity.
 *   E. Content policy — banned hedging phrasing, absolute medical / safety
 *      claims, regulatory claims (وزارة الصحة / FDA / مرخص), drug names.
 *   F. Feed parity — catalog-feed.xml vs .txt vs .csv vs sitemap-images vs
 *      built pages: ids, prices, availability, links, images, description
 *      length, required attributes, product category ids.
 *   G. Delivery — dist weight, largest pages, bundle sizes, preload
 *      correctness, critical-CSS budget headroom.
 *   H. Misc — 404 noindex, service-worker kill-switch, webmanifest icons,
 *      dead public files, security.txt reachability.
 *
 * Usage: node scripts/final-site-audit.mjs [--json] [--strict]
 * Requires a build (dist/). --strict exits 1 on warnings too.
 * ============================================================
 */
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { resolve, dirname, relative, join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DIST = resolve(ROOT, "dist");
const PUB = resolve(ROOT, "public");
const SITE = "https://elysrmedical.store";
const WANT_JSON = process.argv.includes("--json");
const STRICT = process.argv.includes("--strict");

const issues = [];
const warns = [];
const notes = [];
const add = (bucket, kind, page, detail) => bucket.push({ kind, page, detail });
const err = (kind, page, detail) => add(issues, kind, page, detail);
const warn = (kind, page, detail) => add(warns, kind, page, detail);
const note = (kind, page, detail) => add(notes, kind, page, detail);

if (!existsSync(DIST)) {
  console.error("❌ dist/ not found — run `npm run build` first.");
  process.exit(1);
}

/* ───────────────────────── helpers ───────────────────────── */

function walk(dir, filter = () => true, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walk(p, filter, out);
    else if (filter(p)) out.push(p);
  }
  return out;
}

const stripQuery = (u) => u.split("?")[0].split("#")[0];
const isExternal = (u) => /^(https?:)?\/\//.test(u) || /^[a-z]+:/i.test(u);
/** same-origin absolute URL → path (so the link graph sees it as internal) */
const toInternal = (u) => {
  if (!u) return u;
  if (u.startsWith(SITE)) return u.slice(SITE.length) || "/";
  if (/^https?:\/\/elysrmedical\.store/.test(u))
    return u.replace(/^https?:\/\/elysrmedical\.store/, "") || "/";
  return u;
};
const isSameOriginAbsolute = (u) => /^https?:\/\/elysrmedical\.store/.test(u);

/** url path ("/products/x") → dist file path or null */
function pageFileFor(urlPath) {
  const p = stripQuery(urlPath) || "/";
  const clean = p.replace(/\/+$/, "") || "/";
  const candidates =
    clean === "/"
      ? ["index.html"]
      : [`${clean.slice(1)}.html`, `${clean.slice(1)}/index.html`, clean.slice(1)];
  for (const c of candidates) {
    const abs = resolve(DIST, c);
    if (existsSync(abs) && statSync(abs).isFile()) return abs;
  }
  return null;
}

function assetFileFor(urlPath) {
  const clean = stripQuery(urlPath).replace(/^\/+/, "");
  if (!clean) return null;
  const abs = resolve(DIST, clean);
  return abs.startsWith(DIST) && existsSync(abs) && statSync(abs).isFile() ? abs : null;
}

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

function jsonLdBlocks(html) {
  return [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)]
    .map((m) => {
      try {
        return JSON.parse(decodeEntities(m[1]));
      } catch {
        return { __parseError: true };
      }
    })
    .flat();
}

/** all meta values for a given name/property (detects duplicates) */
function metaAll(html, key) {
  const re = new RegExp(
    `<meta\\b[^>]*(?:name|property)\\s*=\\s*"${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*>`,
    "gi",
  );
  return [...html.matchAll(re)].map((m) => {
    const c = m[0].match(/content\s*=\s*"([^"]*)"/i);
    return c ? decodeEntities(c[1]) : null;
  });
}
const metaOne = (html, key) => metaAll(html, key)[0] ?? null;

function linkAll(html, rel) {
  const re = new RegExp(`<link\\b[^>]*rel\\s*=\\s*"${rel}"[^>]*>`, "gi");
  return [...html.matchAll(re)].map((m) => {
    const h = m[0].match(/href\s*=\s*"([^"]*)"/i);
    return h ? h[1] : null;
  });
}

const textOf = (html) =>
  decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " "),
  ).trim();

/* ───────────────────────── inventory ───────────────────────── */

const htmlFiles = walk(DIST, (p) => p.endsWith(".html")).sort();
const distFiles = walk(DIST).sort();
const distSet = new Set(distFiles.map((f) => relative(DIST, f)));
const urlOf = (file) => {
  const rel = relative(DIST, file).replace(/\\/g, "/");
  if (rel === "index.html") return "/";
  if (rel.endsWith("/index.html")) return "/" + rel.slice(0, -"/index.html".length);
  if (rel.endsWith(".html")) return "/" + rel.slice(0, -".html".length);
  return "/" + rel;
};

const vercel = JSON.parse(readFileSync(resolve(ROOT, "vercel.json"), "utf-8"));
const redirectSources = new Set((vercel.redirects || []).map((r) => r.source));
const redirectDest = new Map((vercel.redirects || []).map((r) => [r.source, r.destination]));

const sitemap = readFileSync(resolve(PUB, "sitemap.xml"), "utf-8");
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
  (m) => m[1].replace(SITE, "") || "/",
);
const sitemapSet = new Set(sitemapUrls);

// pages that must stay out of the index
const NOINDEX_EXPECTED = new Set(["/cart", "/wishlist", "/search", "/order-confirmed", "/404"]);

console.log(
  `\n🔎 Final site audit — ${htmlFiles.length} built pages, ${distFiles.length} dist files\n`,
);

const referencedImages = new Set();

/* ════════════════ A. links & assets ════════════════ */

const linkTargets = new Map(); // page → Set(internal url paths)
let checkedLinks = 0;
const brokenLinks = [];
const brokenAssets = [];
/** روابط داخلية تشير لـ slug قديم (مصدر تحويل) بدل الصفحة النهائية القانونية.
 *  تعمل ظاهرياً عبر 301 لكنها تسرّب سلطة الروابط وتخفي انجراف الـ slugs —
 *  نفس فئة ثغرة emla-7-lidocaine-cream. */
const crutchLinks = [];

for (const file of htmlFiles) {
  const html = readFileSync(file, "utf-8");
  const page = urlOf(file);
  const seen = new Set();

  const hrefs = [...html.matchAll(/\b(?:href|src)\s*=\s*"([^"]*)"/gi)].map((m) => m[1]);
  for (const raw of hrefs) {
    if (!raw) continue;
    if (
      raw.startsWith("#") ||
      raw.startsWith("data:") ||
      raw.startsWith("mailto:") ||
      raw.startsWith("tel:")
    )
      continue;
    if (isSameOriginAbsolute(raw)) {
      const p = toInternal(raw);
      checkedLinks++;
      seen.add(stripQuery(p));
      const sp = stripQuery(p);
      if (!sp.startsWith("/api/") && redirectSources.has(sp)) {
        crutchLinks.push({ page, url: raw });
      } else if (
        !sp.startsWith("/api/") &&
        !pageFileFor(sp) &&
        !assetFileFor(sp)
      )
        brokenLinks.push({ page, url: raw });
      if (/\.(webp|png|jpe?g|gif|svg|woff2?|css|js|ico|webmanifest)$/i.test(sp))
        referencedImages.add(sp);
      continue;
    }
    if (isExternal(raw)) continue;
    if (!raw.startsWith("/")) {
      // relative link — resolve against page dir
      if (/\.(js|css|webp|png|jpg|svg|woff2|json|xml)$/.test(raw)) {
        const abs =
          "/" +
          resolve(dirname(resolve(DIST, page.slice(1) || "index.html")), raw)
            .slice(DIST.length + 1)
            .replace(/\\/g, "/");
        if (!assetFileFor(abs) && !pageFileFor(abs)) brokenAssets.push({ page, url: raw });
      }
      continue;
    }
    checkedLinks++;
    const path = stripQuery(raw);
    seen.add(path);
    if (path.startsWith("/api/")) continue;
    if (redirectSources.has(path)) {
      crutchLinks.push({ page, url: raw });
      continue;
    }
    if (pageFileFor(path)) continue;
    if (assetFileFor(path)) continue;
    brokenLinks.push({ page, url: raw });
  }
  linkTargets.set(page, seen);
}

for (const b of brokenLinks) err("A1.broken-internal-link", b.page, b.url);
for (const b of brokenAssets) err("A2.broken-asset", b.page, b.url);
for (const b of crutchLinks)
  err(
    "A7.redirect-crutch-link",
    b.page,
    `${b.url} — رابط داخلي يعتمد على تحويل من slug قديم؛ وجّهه للصفحة النهائية مباشرة`,
  );

// A3 — redirect destinations must exist (or be external)
let redirectDead = 0;
for (const r of vercel.redirects || []) {
  const d = r.destination;
  if (isExternal(d)) continue;
  if (/[:*(]/.test(d)) continue; // pattern redirect (:slug / *) — resolved at runtime
  const dp = stripQuery(d);
  if (!pageFileFor(dp) && !assetFileFor(dp) && !redirectSources.has(dp)) {
    err("A3.dead-redirect-destination", r.source, `${d} (permanent=${!!r.permanent})`);
    redirectDead++;
  }
}

// A4 — sitemap ↔ indexability
for (const u of sitemapUrls) {
  if (!pageFileFor(u)) err("A4.sitemap-url-without-page", u, "no built HTML file");
}
const notInSitemap = htmlFiles
  .map(urlOf)
  .filter((p) => !sitemapSet.has(p) && !NOINDEX_EXPECTED.has(p));
for (const p of notInSitemap) err("A5.indexed-page-missing-from-sitemap", p, "not in sitemap.xml");

// A6 — orphan pages: nothing internal links to them
const inbound = new Map();
for (const [, set] of linkTargets) for (const t of set) inbound.set(t, (inbound.get(t) || 0) + 1);
const orphans = [...sitemapSet].filter((u) => u !== "/" && !(inbound.get(u) || 0));
note("A6.orphan-pages", `${orphans.length}`, orphans.slice(0, 40).join(", "));

/* ════════════════ B. head hygiene ════════════════ */

const titles = new Map();
const descriptions = new Map();
const canonicals = new Map();
let dupTagPages = 0;

for (const file of htmlFiles) {
  const html = readFileSync(file, "utf-8");
  const page = urlOf(file);
  const head = html.slice(0, html.indexOf("</head>") + 7);

  const titleTags = [...head.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title>/gi)].map((m) =>
    decodeEntities(m[1]).trim(),
  );
  if (titleTags.length !== 1) err("B1.title-count", page, `${titleTags.length} <title> tags`);
  const title = titleTags[0] || "";
  if (!title) err("B2.empty-title", page, "");
  if (title.length > 70) warn("B3.long-title", page, `${title.length} chars — ${title}`);
  if (/[…]$/.test(title)) err("B4.truncated-title", page, title);
  if (titles.has(title)) err("B5.duplicate-title", page, `same as ${titles.get(title)} — ${title}`);
  else titles.set(title, page);

  const descs = metaAll(head, "description");
  if (descs.length !== 1) {
    err("B6.description-count", page, `${descs.length} meta description tags`);
    dupTagPages++;
  }
  const desc = descs[0] || "";
  if (!desc) err("B7.empty-description", page, "");
  if (desc.length > 160) warn("B8.long-description", page, `${desc.length} chars`);
  if (/[…]$/.test(desc)) err("B9.truncated-description", page, desc.slice(-40));
  if (descriptions.has(desc))
    err("B10.duplicate-description", page, `same as ${descriptions.get(desc)}`);
  else descriptions.set(desc, page);

  const cans = linkAll(head, "canonical");
  if (cans.length > 1) err("B11.canonical-count", page, `${cans.length} canonical tags`);
  else if (cans.length === 0 && !NOINDEX_EXPECTED.has(page))
    err("B11b.missing-canonical", page, "no canonical on an indexable page");
  const can = cans[0] || "";
  const expectCan = page === "/" ? SITE + "/" : SITE + page;
  const isNoindex = NOINDEX_EXPECTED.has(page);
  if (!isNoindex && can !== expectCan) err("B12.canonical-mismatch", page, `${can} ≠ ${expectCan}`);
  if (canonicals.has(can)) err("B13.duplicate-canonical", page, `same as ${canonicals.get(can)}`);
  else canonicals.set(can, page);

  // og / twitter singletons
  for (const k of ["og:title", "og:description", "og:image", "og:url", "og:type", "og:site_name"]) {
    const n = metaAll(head, k).length;
    if (n > 1) err("B14.duplicate-meta", page, `${k} ×${n}`);
  }
  for (const k of ["twitter:card", "twitter:title", "twitter:description", "twitter:image"]) {
    const n = metaAll(head, k).length;
    if (n > 1) err("B15.duplicate-meta", page, `${k} ×${n}`);
  }
  const robots = metaAll(head, "robots");
  if (robots.length > 1) err("B16.duplicate-robots", page, robots.join(" | "));
  const robotsVal = (robots[0] || "").toLowerCase();
  if (isNoindex && !robotsVal.includes("noindex"))
    err("B17.missing-noindex", page, robotsVal || "(none)");
  if (!isNoindex && robotsVal.includes("noindex")) err("B18.unexpected-noindex", page, robotsVal);
  if (!isNoindex && !robotsVal.includes("index"))
    warn("B19.no-robots-meta", page, robotsVal || "(none)");

  // og:url parity with canonical
  const ogUrl = metaOne(head, "og:url");
  if (!isNoindex && ogUrl && can && ogUrl !== can)
    err("B20.og-url-vs-canonical", page, `${ogUrl} ≠ ${can}`);

  // html attributes
  const htmlTag = (html.match(/<html\b[^>]*>/i) || [""])[0];
  if (!/lang="ar"/.test(htmlTag)) err("B21.html-lang", page, htmlTag.slice(0, 80));
  if (!/dir="rtl"/.test(htmlTag)) err("B22.html-dir", page, htmlTag.slice(0, 80));
  if (!/<meta charset="UTF-8"/i.test(head)) err("B23.charset", page, "");
  if (!/name="viewport"/.test(head)) err("B24.viewport", page, "");

  // exactly one h1
  const h1s = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => textOf(m[1]));
  if (h1s.length !== 1) err("B25.h1-count", page, `${h1s.length}: ${h1s.join(" / ").slice(0, 90)}`);
  if (h1s.length === 1 && !h1s[0]) err("B26.empty-h1", page, "");

  // placeholder leaks in the whole document
  const body = html.slice(html.indexOf("</head>") + 7);
  for (const bad of [
    "undefined",
    "NaN",
    "[object Object]",
    "TODO",
    "Lorem ipsum",
    "localhost",
    "127.0.0.1",
    "example.com",
  ]) {
    if (new RegExp(`(^|[^\\w])${bad.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(body))
      err("B27.placeholder-leak", page, bad);
  }
  if (/"http:\/\/(?!localhost)/.test(html)) warn("B28.insecure-url", page, "http:// reference");
  if (/href="#"/.test(html)) warn("B29.dead-hash-link", page, 'href="#"');
}

/* ════════════════ C. images ════════════════ */

let imgNoAlt = 0;
let imgNoDims = 0;
let imgTotal = 0;

for (const file of htmlFiles) {
  const html = readFileSync(file, "utf-8");
  const page = urlOf(file);
  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    imgTotal++;
    const t = m[0];
    const src = (t.match(/src\s*=\s*"([^"]*)"/i) || [])[1];
    if (src) {
      if (!isExternal(src)) referencedImages.add(stripQuery(src));
      if (!assetFileFor(src) && !isExternal(src)) err("C1.img-src-missing", page, src);
    }
    if (!/\balt\s*=/.test(t)) {
      imgNoAlt++;
      if (imgNoAlt <= 25) err("C2.img-missing-alt", page, (src || t).slice(0, 90));
    }
    if (!/\bwidth\s*=/.test(t) || !/\bheight\s*=/.test(t)) {
      imgNoDims++;
      if (imgNoDims <= 25) warn("C3.img-missing-dimensions", page, (src || t).slice(0, 90));
    }
    if (/\bloading\s*=\s*"lazy"/i.test(t) && /fetchpriority\s*=\s*"high"/i.test(t))
      err("C4.lazy+high-priority", page, src || "");
  }
  // og:image / twitter:image / preload / css url()
  for (const key of ["og:image", "twitter:image"]) {
    const v = metaOne(html, key);
    if (v) {
      if (isExternal(v)) {
        const p = v.replace(SITE, "");
        if (p && !assetFileFor(p)) err("C5.og-image-missing", page, v);
        else referencedImages.add(stripQuery(p));
      } else referencedImages.add(stripQuery(v));
    } else if (!NOINDEX_EXPECTED.has(page)) warn("C6.no-og-image", page, key);
  }
  for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
    const h = (m[0].match(/href\s*=\s*"([^"]*)"/i) || [])[1];
    if (h && !isExternal(h)) referencedImages.add(stripQuery(h));
  }
  for (const m of html.matchAll(/srcset\s*=\s*"([^"]*)"/gi)) {
    for (const part of m[1].split(",")) {
      const u = toInternal(part.trim().split(/\s+/)[0] || "");
      if (u.startsWith("/")) referencedImages.add(stripQuery(u));
      if (u.startsWith("/") && !assetFileFor(u)) err("C0.srcset-missing", page, u);
    }
  }
  for (const m of html.matchAll(/<img\b[^>]*srcset="([^"]*)"/gi)) void m;
  for (const m of html.matchAll(/<link\b[^>]*rel="preload"[^>]*>/gi)) {
    const h = (m[0].match(/href\s*=\s*"([^"]*)"/i) || [])[1];
    const as = (m[0].match(/\bas\s*=\s*"([^"]*)"/i) || [])[1];
    if (!h) continue;
    if (!isExternal(h) && !assetFileFor(h)) err("C7.preload-missing", page, h);
    if (/\.(woff2?|ttf|otf)$/.test(stripQuery(h)) && as !== "font")
      err("C8.preload-wrong-as", page, `${h} as="${as}"`);
    if (/\.(woff2?|ttf|otf)$/.test(stripQuery(h)) && !/crossorigin/.test(m[0]))
      warn("C9.font-preload-no-crossorigin", page, h);
    referencedImages.add(stripQuery(h));
  }
  for (const m of html.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) {
    const u = m[1];
    if (u.startsWith("/") && !isExternal(u)) referencedImages.add(stripQuery(u));
  }
  for (const m of html.matchAll(/<script\b[^>]*src="([^"]+)"/gi)) {
    const s = m[1];
    if (!isExternal(s) && !assetFileFor(s)) err("C10.script-missing", page, s);
  }
  for (const m of html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"/gi)) {
    const s = m[1];
    if (!isExternal(s) && !assetFileFor(s)) err("C11.stylesheet-missing", page, s);
  }
}

// dead public assets (images/fonts/scripts shipped but never referenced)
const publicAssets = walk(PUB, (p) =>
  /\.(webp|png|jpe?g|svg|gif|woff2?|ttf|js|json|webmanifest|ico)$/i.test(p),
);
const dead = [];
for (const p of publicAssets) {
  const rel = "/" + relative(PUB, p).replace(/\\/g, "/");
  if (distSet.has(rel.replace(/^\//, ""))) {
    // shipped; is it referenced by any page / manifest / sitemap / feed?
    if (referencedImages.has(rel)) continue;
    dead.push(rel);
  }
}
// manifest + sitemap-images + feeds reference assets too
const extraRefs = [
  existsSync(resolve(PUB, "site.webmanifest"))
    ? readFileSync(resolve(PUB, "site.webmanifest"), "utf-8")
    : "",
  readFileSync(resolve(PUB, "sitemap-images.xml"), "utf-8"),
  readFileSync(resolve(PUB, "catalog-feed.xml"), "utf-8"),
].join("\n");
// Runtime-constructed URLs (src/lib/cache.ts): /images/<x>.webp → /images/thumbs{,-180,-120}/<x>.webp
// plus every JS/CSS bundle may reference assets by name, so scan them too.
const bundleText = distFiles
  .filter((f) => /\.(js|css|json|webmanifest)$/i.test(f))
  .map((f) => readFileSync(f, "utf-8"))
  .join("\n");
const DYNAMIC_DIRS = ["/images/thumbs/", "/images/thumbs-180/", "/images/thumbs-120/"];
const trulyDead = dead.filter((d) => {
  if (extraRefs.includes(d)) return false;
  if (bundleText.includes(d)) return false;
  const bare = d.replace(/^\/images\/(thumbs|thumbs-180|thumbs-120)\//, "/images/");
  if (bare !== d && bundleText.includes(bare)) return false;
  return true;
});
note("C12.unreferenced-public-assets", `${trulyDead.length}`, trulyDead.slice(0, 40).join(", "));

const imgFiles = walk(DIST, (p) => /\.(webp|png|jpe?g|gif|svg)$/i.test(p)).map((p) => ({
  p,
  size: statSync(p).size,
}));
const heavy = imgFiles.filter((f) => f.size > 200_000).sort((a, b) => b.size - a.size);
note(
  "C13.heavy-images",
  `${heavy.length} >200KB`,
  heavy
    .slice(0, 12)
    .map((f) => `${relative(DIST, f.p)} ${(f.size / 1024).toFixed(0)}KB`)
    .join(", "),
);
note(
  "C14.img-stats",
  `${imgTotal} <img>`,
  `missing alt: ${imgNoAlt}, missing width/height: ${imgNoDims}`,
);

/* ════════════════ D. structured data depth ════════════════ */

const feedXml = readFileSync(resolve(PUB, "catalog-feed.xml"), "utf-8");
const feedItems = [...feedXml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => {
  const g = (k) => {
    const mm = m[1].match(new RegExp(`<g:${k}>([\\s\\S]*?)</g:${k}>`));
    return mm ? decodeEntities(mm[1]).trim() : null;
  };
  return {
    id: g("id"),
    title: g("title"),
    description: g("description"),
    link: g("link"),
    image: g("image_link"),
    availability: g("availability"),
    price: g("price"),
    condition: g("condition"),
    category: g("google_product_category"),
    identifierExists: g("identifier_exists"),
    brand: g("brand"),
    gtin: g("gtin"),
    mpn: g("mpn"),
    raw: m[1],
  };
});
const feedById = new Map(feedItems.map((i) => [i.id, i]));
// I14 — prescription-only actives. Owner decision 2026-09-28: these products are
//      deliberately EXCLUDED from the Merchant feed (Google prohibits prescription
//      drugs in free listings) while their pages stay live and indexable. The set
//      is computed early so D26 (feed parity) can honour the exclusion.
const RX =
  /sildenafil|tadalafil|vardenafil|dapoxetine|سيلدينافيل|تادالافيل|دابوكستين|finasteride|فيناسترايد/i;
const rxDbPath = resolve(ROOT, "api/lib/products-db.json");
const rxProducts = [];
if (existsSync(rxDbPath)) {
  const rows = JSON.parse(readFileSync(rxDbPath, "utf-8"));
  for (const row of Array.isArray(rows) ? rows : rows.products || []) {
    const hay = `${row.name} ${row.nameEn} ${row.description} ${row.ingredients || ""}`;
    if (RX.test(hay)) rxProducts.push(row);
  }
}
const rxIds = new Set(rxProducts.map((r) => r.id));
const rxSlugs = new Set(rxProducts.map((r) => r.slug));
const rxInFeed = rxProducts.filter((r) => feedById.has(r.id));
const rxIndexed = rxProducts.filter((r) => {
  const f = pageFileFor(`/products/${r.slug}`);
  return f && !/noindex/.test(metaOne(readFileSync(f, "utf-8"), "robots") || "");
});
const feedByLink = new Map(feedItems.map((i) => [stripQuery((i.link || "").replace(SITE, "")), i]));

let productPages = 0;
let skuIsInternalId = 0;
let offerChecks = 0;
const recommendedMissing = { priceValidUntil: 0, shippingDetails: 0, hasMerchantReturnPolicy: 0 };

for (const file of htmlFiles) {
  const html = readFileSync(file, "utf-8");
  const page = urlOf(file);
  const blocks = jsonLdBlocks(html);
  for (const b of blocks) if (b && b.__parseError) err("D0.jsonld-parse-error", page, "");

  const flat = [];
  const push = (n) => {
    if (!n || typeof n !== "object") return;
    flat.push(n);
    if (Array.isArray(n["@graph"])) n["@graph"].forEach(push);
  };
  blocks.forEach(push);

  const byType = (t) =>
    flat.filter((n) => (Array.isArray(n["@type"]) ? n["@type"] : [n["@type"]]).includes(t));

  // BreadcrumbList contiguity
  for (const bc of byType("BreadcrumbList")) {
    const items = bc.itemListElement || [];
    if (!items.length) err("D1.empty-breadcrumb", page, "");
    items.forEach((it, i) => {
      if (it.position !== i + 1)
        err("D2.breadcrumb-position", page, `position=${it.position} at index ${i}`);
      if (!it.name) err("D3.breadcrumb-name", page, `item ${i}`);
      const u = typeof it.item === "string" ? it.item : it.item?.["@id"] || it.item?.url;
      if (i < items.length - 1) {
        if (!u) err("D4.breadcrumb-no-url", page, `item ${i}`);
        else {
          const p = stripQuery(String(u).replace(SITE, "")) || "/";
          if (!pageFileFor(p)) err("D5.breadcrumb-dead-url", page, String(u));
        }
      }
    });
  }

  // ItemList counts
  for (const il of byType("ItemList")) {
    const items = il.itemListElement || [];
    if (il.numberOfItems != null && Number(il.numberOfItems) !== items.length)
      err("D6.itemlist-count", page, `numberOfItems=${il.numberOfItems} but ${items.length} items`);
    for (const it of items) {
      const u = typeof it.url === "string" ? it.url : it.item?.url;
      if (u) {
        const p = stripQuery(String(u).replace(SITE, ""));
        if (p.startsWith("/") && !pageFileFor(p)) err("D7.itemlist-dead-url", page, String(u));
      }
      if (it.offers?.price != null && /NaN|undefined/.test(String(it.offers.price)))
        err("D8.itemlist-price", page, String(it.offers.price));
    }
  }

  // Product nodes
  for (const prod of byType("Product")) {
    productPages++;
    const offers = prod.offers || (Array.isArray(prod.offers) ? prod.offers[0] : null);
    if (!offers) {
      err("D9.product-no-offers", page, prod.name || "");
      continue;
    }
    offerChecks++;
    const price = Number(offers.price);
    if (!Number.isFinite(price) || price <= 0) err("D10.bad-price", page, String(offers.price));
    if (offers.priceCurrency !== "EGP") err("D11.currency", page, String(offers.priceCurrency));
    const avail = String(offers.availability || "");
    if (!/InStock|OutOfStock|PreOrder|SoldOut/.test(avail)) err("D12.availability", page, avail);
    if (!offers.priceValidUntil) recommendedMissing.priceValidUntil++;
    if (!offers.shippingDetails) recommendedMissing.shippingDetails++;
    if (!offers.hasMerchantReturnPolicy) recommendedMissing.hasMerchantReturnPolicy++;

    // images
    const imgs = Array.isArray(prod.image) ? prod.image : prod.image ? [prod.image] : [];
    if (!imgs.length) err("D13.product-no-image", page, prod.name || "");
    for (const im of imgs) {
      const u = typeof im === "string" ? im : im?.url;
      if (!u) continue;
      if (!String(u).startsWith(SITE)) err("D14.image-not-absolute", page, String(u));
      const p = stripQuery(String(u).replace(SITE, ""));
      if (p && !assetFileFor(p)) err("D15.image-file-missing", page, String(u));
    }

    // rating sanity + visible parity
    const ar = prod.aggregateRating;
    if (ar) {
      const rv = Number(ar.ratingValue);
      const rc = Number(ar.reviewCount ?? ar.ratingCount);
      if (!(rv >= 1 && rv <= 5)) err("D16.rating-range", page, String(ar.ratingValue));
      if (!(rc > 0)) err("D17.review-count", page, String(ar.reviewCount ?? ar.ratingCount));
      const vis = textOf(html);
      const shown = vis.match(/(\d[.,]\d)\s*(?:من\s*5|\/\s*5)/);
      if (shown) {
        const shownVal = Number(shown[1].replace(",", "."));
        if (Math.abs(shownVal - rv) > 0.05)
          err("D18.rating-vs-visible", page, `schema=${rv} visible=${shownVal}`);
      }
      if (!ar.bestRating) warn("D19.no-bestRating", page, prod.name || "");
    }

    // identifiers must not be invented
    for (const k of ["brand", "mpn", "gtin", "sku"]) {
      const v = prod[k];
      if (v == null) continue;
      const val = typeof v === "object" ? v?.name : v;
      if (!val) continue;
      if (k === "gtin" && !/^\d{8,14}$/.test(String(val))) err("D20.bad-gtin", page, String(val));
      if (k === "sku" && /^([mwd])-\d+$/.test(String(val))) skuIsInternalId++;
    }

    // feed parity by canonical link
    const feed = feedByLink.get(page);
    if (feed) {
      const feedPrice = Number((feed.price || "").replace(/[^\d.]/g, ""));
      if (Math.abs(feedPrice - price) > 0.001)
        err("D22.price-feed-mismatch", page, `schema=${price} feed=${feed.price}`);
      const feedAvail = (feed.availability || "").toLowerCase();
      const schemaInStock = /InStock/.test(avail);
      if (schemaInStock !== (feedAvail === "in stock"))
        err("D23.availability-feed-mismatch", page, `schema=${avail} feed=${feedAvail}`);
      const schemaImg = stripQuery(String(imgs[0] || "").replace(SITE, ""));
      const feedImg = stripQuery((feed.image || "").replace(SITE, ""));
      if (schemaImg && feedImg && schemaImg !== feedImg)
        warn("D24.image-feed-mismatch", page, `${schemaImg} vs ${feedImg}`);
      if (feed.title && prod.name && feed.title.trim() !== String(prod.name).trim())
        warn("D25.title-feed-mismatch", page, `"${feed.title}" vs "${prod.name}"`);
    } else if (page.startsWith("/products/") && !rxSlugs.has(page.slice("/products/".length))) {
      // استثناء موثق: أدوية الوصفة خارج الفيد بقرار المالك 2026-09-28 (انظر I14/I15).
      err("D26.product-not-in-feed", page, "missing from catalog-feed.xml");
    }
  }

  // Article nodes
  for (const a of byType("Article").concat(byType("BlogPosting"))) {
    if (!a.headline) err("D27.article-no-headline", page, "");
    if (!a.datePublished) err("D28.article-no-datePublished", page, a.headline || "");
    if (!a.dateModified) warn("D29.article-no-dateModified", page, a.headline || "");
    if (!a.author) err("D30.article-no-author", page, a.headline || "");
    if (!a.publisher) warn("D31.article-no-publisher", page, a.headline || "");
    for (const d of [a.datePublished, a.dateModified]) {
      if (!d) continue;
      const t = Date.parse(d);
      if (Number.isNaN(t)) err("D32.bad-date", page, String(d));
      else if (t > Date.now() + 86400000) err("D33.future-date", page, String(d));
    }
    const im = Array.isArray(a.image) ? a.image[0] : a.image;
    const iu = typeof im === "string" ? im : im?.url;
    if (!iu) warn("D34.article-no-image", page, a.headline || "");
    else {
      const p = stripQuery(String(iu).replace(SITE, ""));
      if (p && !assetFileFor(p)) err("D35.article-image-missing", page, String(iu));
    }
  }

  // FAQPage / HowTo — retired rich results, must not be the only value
  for (const f of byType("FAQPage")) {
    const qs = f.mainEntity || [];
    if (!qs.length) err("D36.empty-faq", page, "");
    for (const q of qs) {
      const ans = q.acceptedAnswer?.text || q.answer?.text;
      if (!q.name || !ans) err("D37.faq-missing-part", page, String(q.name || "(no name)"));
    }
  }

  // WebSite / Organization presence on home
  if (page === "/") {
    if (!byType("WebSite").length) warn("D38.no-website-node", page, "");
    if (!byType("Organization").length && !byType("LocalBusiness").length)
      warn("D39.no-organization-node", page, "");
    const org = byType("Organization")[0] || byType("LocalBusiness")[0];
    if (org && !org.sameAs?.length) warn("D40.org-no-sameAs", page, "");
  }
}

/* ════════════════ E. content policy ════════════════ */

// (E1) phrasing the owner explicitly rejected: hedging that pushes verification
//      onto the customer instead of stating known facts.
const HEDGE = [
  "بناء على العبوة",
  "بناءً على العبوة",
  "حسب العبوة",
  "وفقاً للعبوة",
  "وفق العبوة",
  "كما هو موضح على العبوة",
  "تأكيد الشكل من العبوة",
  "الشكل من العبوة",
  "بحسب ما هو مدون",
  "لا يمكننا تأكيد",
  "الشكل غير مؤكد",
  "قد يختلف الشكل",
  "الشكل قد يختلف",
];
// (E2) absolute medical / safety / regulatory claims — unsubstantiated risk
const CLAIMS = [
  {
    re: /دون أي أعراض جانبية|بدون أي أعراض جانبية|بلا أعراض جانبية|لا أعراض جانبية|دون آثار جانبية|بدون آثار جانبية/,
    why: "absolute safety claim (no side effects)",
  },
  {
    re: /آمن تماماً|آمن وصحي كلياً|آمن كلياً|آمن 100|بأمان كامل|بأمان فسيولوجي كامل|بأمان فسيولوجي كلي|سلامة كلياً|مضمون 100|مضمون تماماً|نتيجة مضمونة|فعالية مضمونة|فعّال 100|فعال 100/,
    why: "absolute safety / guarantee",
  },
  {
    re: /يشفي|علاج نهائي|علاجاً نهائياً|يقضي على|يخلصك نهائياً|يشفي تماماً|علاج جذري/,
    why: "cure claim",
  },
  {
    re: /معتمد من وزارة الصحة|مرخص من وزارة الصحة|مسجل بوزارة الصحة|موافقة وزارة الصحة|معتمد من FDA|موافقة FDA|معتمد من منظمة الصحة|مرخّص من وزارة/,
    why: "regulatory approval claim",
  },
  {
    re: /لا حاجة لاستشارة الطبيب|لا يحتاج وصفة طبية|بدون وصفة طبية|لا يستلزم استشارة/,
    why: "medical-advice override",
  },
  {
    re: /لا يشوبه شائبة|لا يسبب أي|لا تسبب أي|لا يسبب أي ضرر|دون أي ضرر|بدون أي ضرر/,
    why: "absolute harmlessness",
  },
  {
    re: /الأقوى عالمياً|الأشهر والأقوى|الأكثر شهرة على الإطلاق|الأقوى على الإطلاق|رقم 1 عالمياً|الأول عالمياً/,
    why: "unverifiable superlative",
  },
];
const DRUG_WORDS = [
  "sildenafil",
  "tadalafil",
  "vardenafil",
  "سيلدينافيل",
  "تادالافيل",
  "فياجرا",
  "Viagra",
  "CIALIS",
  "سياليس",
];

// (E3) mixed-script corruption: Latin letters glued to two or more Arabic
//      letters inside one word (e.g. "ومayo Clinic" instead of "وMayo Clinic").
//      Single-letter Arabic prefixes (و/ف/ب/ك/ل) before a Latin word are correct
//      orthography and are not flagged.
const MIXED_SCRIPT = /[\u0600-\u06FF]{2,}[A-Za-z]|[A-Za-z][\u0600-\u06FF]{2,}/;

const claimHits = [];
const hedgeHits = [];
const drugHits = [];
const mixedHits = [];

for (const file of htmlFiles) {
  const html = readFileSync(file, "utf-8");
  const page = urlOf(file);
  const visible = textOf(html);
  // scan visible copy + meta (not code comments)
  const scope =
    visible +
    "\n" +
    (metaOne(html, "description") || "") +
    "\n" +
    (metaOne(html, "og:description") || "");
  for (const h of HEDGE) if (scope.includes(h)) hedgeHits.push({ page, h });
  for (const c of CLAIMS) {
    const m = scope.match(c.re);
    if (m) claimHits.push({ page, text: m[0], why: c.why });
  }
  const mixed = visible.match(MIXED_SCRIPT);
  if (mixed) {
    const i = visible.indexOf(mixed[0]);
    mixedHits.push({ page, text: visible.slice(Math.max(0, i - 30), i + 40) });
  }
  for (const d of DRUG_WORDS) {
    const re = new RegExp(`(^|[^\\w])${d.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i");
    if (re.test(scope)) drugHits.push({ page, d });
  }
}

/* ════════════════ F. feed parity ════════════════ */

const feedTxt = readFileSync(resolve(PUB, "catalog-feed.txt"), "utf-8");
const feedCsv = existsSync(resolve(PUB, "catalog-feed.csv"))
  ? readFileSync(resolve(PUB, "catalog-feed.csv"), "utf-8")
  : "";

const txtRows = feedTxt
  .trim()
  .split("\n")
  .slice(1)
  .map((l) => l.split("\t"));
const txtById = new Map(txtRows.map((r) => [r[0], r]));
const TXT = {
  id: 0,
  title: 1,
  description: 2,
  link: 3,
  image: 4,
  brand: 5,
  gtin: 6,
  mpn: 7,
  ident: 8,
  condition: 9,
  availability: 10,
  price: 11,
  category: 12,
};

for (const item of feedItems) {
  const t = txtById.get(item.id);
  if (!t) err("F1.feed-txt-missing-id", item.id, "in xml, not in txt");
  else {
    if ((t[TXT.price] || "").trim() !== (item.price || "").trim())
      err("F2.feed-price-txt-mismatch", item.id, `${item.price} vs ${t[TXT.price]}`);
    if ((t[TXT.link] || "").trim() !== (item.link || "").trim())
      err("F3.feed-link-txt-mismatch", item.id, `${item.link} vs ${t[TXT.link]}`);
    if ((t[TXT.availability] || "").trim() !== (item.availability || "").trim())
      err(
        "F4.feed-availability-txt-mismatch",
        item.id,
        `${item.availability} vs ${t[TXT.availability]}`,
      );
    if ((t[TXT.image] || "").trim() !== (item.image || "").trim())
      warn("F5.feed-image-txt-mismatch", item.id, `${item.image} vs ${t[TXT.image]}`);
    if ((t[TXT.title] || "").trim() !== (item.title || "").trim())
      warn("F6.feed-title-txt-mismatch", item.id, "titles differ");
  }
  if (feedCsv && !feedCsv.includes(item.id))
    err("F7.feed-csv-missing-id", item.id, "in xml, not in csv");

  // required attributes
  for (const [k, v] of Object.entries({
    id: item.id,
    title: item.title,
    description: item.description,
    link: item.link,
    image_link: item.image,
    availability: item.availability,
    price: item.price,
    condition: item.condition,
  }))
    if (!v) err("F8.feed-missing-attribute", item.id, k);
  if (!item.brand && !item.gtin && !item.mpn && item.identifierExists !== "no")
    err("F9.feed-identifier", item.id, "no brand/gtin/mpn and identifier_exists≠no");
  if (item.brand || item.gtin || item.mpn)
    err(
      "F10.feed-invented-identifier",
      item.id,
      `brand=${item.brand} gtin=${item.gtin} mpn=${item.mpn}`,
    );
  if ((item.description || "").length > 5000)
    err("F11.feed-description-too-long", item.id, `${item.description.length} chars`);
  if ((item.title || "").length > 150)
    warn("F12.feed-title-long", item.id, `${item.title.length} chars`);
  if (!/^\d+(\.\d+)? EGP$/.test(item.price || ""))
    err("F13.feed-price-format", item.id, item.price);
  if (
    !["in stock", "out of stock", "preorder", "backorder"].includes(
      (item.availability || "").toLowerCase(),
    )
  )
    err("F14.feed-availability-value", item.id, item.availability);
  if (!item.link?.startsWith(SITE)) err("F15.feed-link-origin", item.id, item.link);
  else if (!pageFileFor(stripQuery(item.link.replace(SITE, ""))))
    err("F16.feed-link-404", item.id, item.link);
  if (item.image && !assetFileFor(item.image.replace(SITE, "")))
    err("F17.feed-image-404", item.id, item.image);
  if (!item.category) warn("F18.feed-no-category", item.id, item.title);
}

// every built product page must be in the feed
const builtProducts = htmlFiles
  .map(urlOf)
  .filter(
    (p) =>
      p.startsWith("/products/") &&
      !p.startsWith("/products/men") &&
      !p.startsWith("/products/women") &&
      !p.startsWith("/products/devices") &&
      !p.startsWith("/products/guides"),
  );
for (const p of builtProducts)
  if (!feedByLink.has(p) && !rxSlugs.has(p.slice("/products/".length)))
    err("F19.built-product-not-in-feed", p, "");
for (const id of txtById.keys()) if (!feedById.has(id)) err("F20.txt-id-not-in-xml", id, "");

// category ids used
const cats = {};
for (const i of feedItems) cats[i.category || "(none)"] = (cats[i.category || "(none)"] || 0) + 1;
note(
  "F21.feed-categories",
  Object.keys(cats).length + " distinct",
  Object.entries(cats)
    .map(([k, v]) => `${k}×${v}`)
    .join(", "),
);

// sitemap-images coverage
const sitemapImages = readFileSync(resolve(PUB, "sitemap-images.xml"), "utf-8");
const siUrls = [...sitemapImages.matchAll(/<image:loc>([^<]+)<\/image:loc>/g)].map((m) => m[1]);
let siMissing = 0;
for (const u of siUrls)
  if (!assetFileFor(u.replace(SITE, ""))) {
    err("F22.sitemap-image-404", u, "");
    siMissing++;
  }
const siPages = [...sitemapImages.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) =>
  m[1].replace(SITE, ""),
);
for (const p of siPages) if (!pageFileFor(p)) err("F23.sitemap-image-page-404", p, "");
note(
  "F24.sitemap-images",
  `${siPages.length} urls / ${siUrls.length} images`,
  `product pages in feed: ${builtProducts.length}`,
);

/* ════════════════ G. delivery ════════════════ */

const size = (p) => statSync(p).size;
const totalDist = distFiles.reduce((s, f) => s + size(f), 0);
const htmlSizes = htmlFiles.map((f) => ({ f, s: size(f) })).sort((a, b) => b.s - a.s);
const avg = htmlSizes.reduce((s, x) => s + x.s, 0) / htmlSizes.length;
const jsFiles = distFiles.filter((f) => f.endsWith(".js"));
const cssFiles = distFiles.filter((f) => f.endsWith(".css"));
const biggestJs = jsFiles
  .map((f) => ({ f, s: size(f) }))
  .sort((a, b) => b.s - a.s)
  .slice(0, 5);
const biggestCss = cssFiles
  .map((f) => ({ f, s: size(f) }))
  .sort((a, b) => b.s - a.s)
  .slice(0, 5);

if (avg > 90_000) warn("G1.avg-page-heavy", `${(avg / 1024).toFixed(1)}KB`, "budget 90KB");
for (const h of htmlSizes.slice(0, 5))
  if (h.s > 200_000) warn("G2.huge-page", urlOf(h.f), `${(h.s / 1024).toFixed(0)}KB`);

// inline critical CSS budget
const inlineCss = htmlFiles.map((f) => {
  const html = readFileSync(f, "utf-8");
  return [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].reduce(
    (s, m) => s + m[1].length,
    0,
  );
});
const maxInline = Math.max(...inlineCss);
// The inline budget lives in inject-critical-css.mjs; read it instead of
// hardcoding a second copy here (the audit kept warning "over 40KB" after the
// budget was deliberately raised to 45KB to stop dropping .space-y-* rules).
const criticalBudget = (() => {
  const p = resolve(ROOT, "scripts/inject-critical-css.mjs");
  const m = existsSync(p)
    ? readFileSync(p, "utf-8").match(/CRITICAL_BUDGET\s*=\s*(\d+(?:\.\d+)?)\s*\*\s*1024/)
    : null;
  return m ? Math.round(parseFloat(m[1]) * 1024) : 30 * 1024;
})();
if (maxInline > criticalBudget + 4096)
  warn(
    "G3.inline-css-heavy",
    `${(maxInline / 1024).toFixed(1)}KB`,
    `over the ${(criticalBudget / 1024).toFixed(0)}KB generation budget +4KB headroom`,
  );

note("G4.dist-weight", `${(totalDist / 1024 / 1024).toFixed(2)} MB`, `${distFiles.length} files`);
note(
  "G5.html-weight",
  `avg ${(avg / 1024).toFixed(1)}KB`,
  `largest ${urlOf(htmlSizes[0].f)} ${(htmlSizes[0].s / 1024).toFixed(0)}KB`,
);
note(
  "G6.js-bundles",
  `${jsFiles.length} files`,
  biggestJs
    .map((b) => `${relative(DIST, b.f).split("/").pop()} ${(b.s / 1024).toFixed(0)}KB`)
    .join(", "),
);
note(
  "G7.css-bundles",
  `${cssFiles.length} files`,
  biggestCss
    .map((b) => `${relative(DIST, b.f).split("/").pop()} ${(b.s / 1024).toFixed(0)}KB`)
    .join(", "),
);
note(
  "G8.inline-critical-css",
  `max ${(maxInline / 1024).toFixed(1)}KB`,
  `budget ${(criticalBudget / 1024).toFixed(0)}KB at generation`,
);

/* ════════════════ H. misc ════════════════ */

const notFound = resolve(DIST, "404.html");
if (!existsSync(notFound)) err("H1.no-404-page", "/404.html", "missing");
else {
  const h = readFileSync(notFound, "utf-8");
  if (!/noindex/.test(h)) err("H2.404-indexable", "/404", "no noindex meta");
}
if (!existsSync(resolve(DIST, "sw.js")))
  warn("H3.no-sw-killswitch", "/sw.js", "legacy workers may persist");
else {
  const sw = readFileSync(resolve(DIST, "sw.js"), "utf-8");
  if (/cache\.put|respondWith/.test(sw) && !/unregister/.test(sw))
    err("H4.sw-caches", "/sw.js", "service worker still caching responses");
}
if (existsSync(resolve(PUB, "site.webmanifest"))) {
  const man = JSON.parse(readFileSync(resolve(PUB, "site.webmanifest"), "utf-8"));
  for (const ic of man.icons || []) {
    if (!assetFileFor(ic.src)) err("H5.manifest-icon-missing", ic.src, "");
  }
  if (!man.name) err("H6.manifest-no-name", "/site.webmanifest", "");
  if (man.start_url && !pageFileFor(man.start_url)) err("H7.manifest-start-url", man.start_url, "");
}
if (!existsSync(resolve(DIST, "robots.txt"))) err("H8.no-robots", "/robots.txt", "");
else {
  const rt = readFileSync(resolve(DIST, "robots.txt"), "utf-8");
  for (const m of rt.matchAll(/^Sitemap:\s*(\S+)/gm)) {
    const p = m[1].replace(SITE, "");
    if (!assetFileFor(p)) err("H9.robots-sitemap-404", m[1], "");
  }
  if (!rt.includes("Sitemap:")) err("H10.robots-no-sitemap", "/robots.txt", "");
}
if (existsSync(resolve(PUB, "security.txt"))) {
  const st = readFileSync(resolve(PUB, "security.txt"), "utf-8");
  if (!/Contact:/i.test(st)) err("H11.security-txt-no-contact", "/security.txt", "");
  if (!/Expires:/i.test(st)) warn("H12.security-txt-no-expires", "/security.txt", "");
  const exp = (st.match(/Expires:\s*(.+)/i) || [])[1];
  if (exp && Date.parse(exp) < Date.now())
    err("H13.security-txt-expired", "/security.txt", exp.trim());
}
if (
  !existsSync(resolve(DIST, ".well-known/security.txt")) &&
  !redirectSources.has("/.well-known/security.txt")
)
  warn("H14.no-well-known-security", "/.well-known/security.txt", "only served via header rule");

/* ════════════════ I. runtime data parity (drift guards) ════════════════ */

// I1 — every prerendered guide page must have the JSON its loader fetches,
//      otherwise hydrated navigation throws notFound() → soft 404.
const guidePages = htmlFiles.map(urlOf).filter((p) => p.startsWith("/products/guides/"));
const lpDir = resolve(PUB, "landing-pages");
const lpFiles = existsSync(lpDir) ? readdirSync(lpDir).filter((f) => f.endsWith(".json")) : [];
const lpBySlug = new Map(lpFiles.map((f) => [f.replace(/\.json$/, ""), f]));
let guideJsonMissing = 0;
let guideJsonOrphan = 0;
for (const g of guidePages) {
  const slug = g.replace("/products/guides/", "");
  if (!lpBySlug.has(slug)) {
    err("I1.guide-json-missing", g, "loader fetch would 404 after hydration");
    guideJsonMissing++;
  }
}
for (const [slug] of lpBySlug) {
  if (!guidePages.includes(`/products/guides/${slug}`)) {
    warn("I2.guide-json-orphan", `/landing-pages/${slug}.json`, "no prerendered page uses it");
    guideJsonOrphan++;
  }
}

// I3 — guide JSON content must equal what the prerender declared in <head>
let guideDrift = 0;
for (const g of guidePages) {
  const slug = g.replace("/products/guides/", "");
  const f = lpBySlug.get(slug);
  if (!f) continue;
  const json = JSON.parse(readFileSync(resolve(lpDir, f), "utf-8"));
  const html = readFileSync(pageFileFor(g), "utf-8");
  const head = html.slice(0, html.indexOf("</head>"));
  const title = (head.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1];
  const desc = metaOne(head, "description");
  if (title && json.metaTitle && decodeEntities(title).trim() !== String(json.metaTitle).trim()) {
    err(
      "I3.guide-title-drift",
      g,
      `html="${decodeEntities(title).trim()}" json="${json.metaTitle}"`,
    );
    guideDrift++;
  }
  if (desc && json.metaDescription) {
    const expect = String(json.metaDescription).slice(0, 155);
    if (desc !== expect && desc !== String(json.metaDescription)) {
      err(
        "I4.guide-description-drift",
        g,
        `html="${desc.slice(0, 60)}…" json="${expect.slice(0, 60)}…"`,
      );
      guideDrift++;
    }
  }
  if (json.noindex && !/noindex/.test(metaOne(head, "robots") || ""))
    err("I5.guide-noindex-drift", g, "json says noindex, html indexes it");
}

// I6 — api/lib/products-db.json (server-side order validation) vs built pages
const dbPath = resolve(ROOT, "api/lib/products-db.json");
if (existsSync(dbPath)) {
  const db = JSON.parse(readFileSync(dbPath, "utf-8"));
  const rows = Array.isArray(db) ? db : db.products || [];
  let dbDrift = 0;
  for (const row of rows) {
    const f = pageFileFor(`/products/${row.slug}`);
    if (!f) {
      err("I6.db-slug-without-page", row.slug, "server knows a product with no page");
      dbDrift++;
      continue;
    }
    const html = readFileSync(f, "utf-8");
    const prod = jsonLdBlocks(html)
      .flatMap((b) => (Array.isArray(b?.["@graph"]) ? b["@graph"] : [b]))
      .find((n) => (Array.isArray(n?.["@type"]) ? n["@type"] : [n?.["@type"]]).includes("Product"));
    if (!prod) continue;
    const price = Number(prod.offers?.price);
    if (Math.abs(price - Number(row.price)) > 0.001) {
      err("I7.db-price-drift", `/products/${row.slug}`, `db=${row.price} page=${price}`);
      dbDrift++;
    }
    if (prod.name && String(prod.name).trim() !== String(row.name).trim()) {
      err("I8.db-name-drift", `/products/${row.slug}`, `"${row.name}" vs "${prod.name}"`);
      dbDrift++;
    }
    const inStock = Number(row.stock) > 0;
    const pageInStock = /InStock/.test(String(prod.offers?.availability || ""));
    if (inStock !== pageInStock) {
      err(
        "I9.db-stock-drift",
        `/products/${row.slug}`,
        `db.stock=${row.stock} page=${prod.offers?.availability}`,
      );
      dbDrift++;
    }
  }
  note(
    "I10.server-db-parity",
    `${rows.length} products`,
    dbDrift ? `${dbDrift} drift issue(s)` : "no drift",
  );
} else warn("I11.no-server-db", "api/lib/products-db.json", "server cannot validate orders");

// I12 — cache-busting version drift
const cacheVersion = existsSync(resolve(ROOT, "config/cache-version.json"))
  ? JSON.parse(readFileSync(resolve(ROOT, "config/cache-version.json"), "utf-8")).version
  : null;
if (cacheVersion) {
  const tpl = readFileSync(resolve(ROOT, "index.html"), "utf-8");
  const hardcoded = [...tpl.matchAll(/\?v=(\d+)/g)].map((m) => m[1]);
  const off = hardcoded.filter((v) => v !== String(cacheVersion));
  if (off.length)
    warn(
      "I12.cache-version-drift",
      "index.html",
      `config=${cacheVersion} but hardcoded ?v=${[...new Set(off)].join(",")}`,
    );
  // images referenced with a stale ?v= in built pages
  let staleV = 0;
  for (const file of htmlFiles) {
    const html = readFileSync(file, "utf-8");
    for (const m of html.matchAll(/\?v=(\d+)/g)) if (m[1] !== String(cacheVersion)) staleV++;
  }
  note(
    "I13.built-v-params",
    `config v${cacheVersion}`,
    staleV ? `${staleV} stale ?v= params in dist` : "all ?v= params current",
  );
}

note(
  "I14.prescription-actives",
  `${rxProducts.length} products`,
  rxProducts.map((r) => `${r.id}:${r.slug}`).join(", "),
);
note(
  "I15.rx-exposure",
  `feed=${rxInFeed.length} indexable=${rxIndexed.length}`,
  [...new Set([...rxInFeed, ...rxIndexed].map((r) => r.id))].join(", ") || "none",
);

// I16 — dead public files: shipped but referenced by nothing at all
const allBuiltText = htmlFiles.map((f) => readFileSync(f, "utf-8")).join("\n") + bundleText;
const shippedNeverUsed = distFiles
  .map((f) => "/" + relative(DIST, f).replace(/\\/g, "/"))
  .filter((rel) => {
    if (rel.endsWith(".html")) return false;
    const name = rel.split("/").pop();
    if (
      /^(robots\.txt|sitemap|security\.txt|404\.html|favicon|site\.webmanifest|sw\.js|catalog-feed|og-default|logo|apple-touch)/.test(
        name,
      )
    )
      return false;
    if (rel.startsWith("/.well-known/")) return false;
    if (/\.(woff2?|ttf)$/.test(rel)) return false;
    const bare = stripQuery(rel);
    return !referencedImages.has(bare) && !allBuiltText.includes(bare);
  });
note(
  "I16.shipped-never-referenced",
  `${shippedNeverUsed.length}`,
  shippedNeverUsed.slice(0, 30).join(", "),
);

/* ════════════════ J. content uniqueness & share previews ════════════════ */

// J1 — near-duplicate visible copy between pages (thin/templated risk)
function shingles(text, k = 6) {
  const words = text.split(/\s+/).filter((w) => w.length > 2);
  const set = new Set();
  for (let i = 0; i + k <= words.length; i++) set.add(words.slice(i, i + k).join(" "));
  return { set, words: words.length };
}
const pageText = new Map();
for (const file of htmlFiles) {
  const html = readFileSync(file, "utf-8");
  const body = html.slice(html.indexOf("<body") || 0);
  pageText.set(urlOf(file), shingles(textOf(body)));
}
const thinPages = [...pageText]
  .filter(([, v]) => v.words < 250)
  .map(([p, v]) => `${p} (${v.words}w)`);
note("J1.thin-pages", `${thinPages.length} <250 words`, thinPages.slice(0, 20).join(", "));

const nearDup = [];
const keys = [...pageText.keys()].filter((k) => !NOINDEX_EXPECTED.has(k));
// bucket by type to keep the comparison quadratic cost sane
const bucketOf = (p) =>
  p.startsWith("/products/guides/")
    ? "guide"
    : p.startsWith("/education/")
      ? "article"
      : p.startsWith("/products/")
        ? "product"
        : "static";
const buckets = new Map();
for (const k of keys) {
  const b = bucketOf(k);
  if (!buckets.has(b)) buckets.set(b, []);
  buckets.get(b).push(k);
}
for (const [, list] of buckets) {
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = pageText.get(list[i]).set;
      const b = pageText.get(list[j]).set;
      if (!a.size || !b.size) continue;
      let inter = 0;
      const [small, big] = a.size < b.size ? [a, b] : [b, a];
      for (const x of small) if (big.has(x)) inter++;
      const jac = inter / (a.size + b.size - inter);
      if (jac > 0.45) nearDup.push({ a: list[i], b: list[j], jac: +jac.toFixed(2) });
    }
  }
}
nearDup.sort((x, y) => y.jac - x.jac);
note(
  "J2.near-duplicate-pages",
  `${nearDup.length} pairs >0.45 Jaccard`,
  nearDup
    .slice(0, 10)
    .map((d) => `${d.a} ≈ ${d.b} (${d.jac})`)
    .join(" | "),
);

// J3 — share preview aspect ratio (WhatsApp/Facebook/X crop to 1.91:1)
function webpDims(file) {
  const b = readFileSync(file);
  const fourcc = b.toString("ascii", 12, 16);
  try {
    if (fourcc === "VP8X")
      return [
        1 + (b[24] | (b[25] << 8) | (b[26] << 16)),
        1 + (b[27] | (b[28] << 8) | (b[29] << 16)),
      ];
    if (fourcc === "VP8 ") return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
    if (fourcc === "VP8L") {
      const n = b.readUInt32LE(21);
      return [(n & 0x3fff) + 1, ((n >> 14) & 0x3fff) + 1];
    }
    if (b.slice(1, 4).toString() === "PNG") return [b.readUInt32BE(16), b.readUInt32BE(20)];
  } catch {
    /* ignore */
  }
  return null;
}
const ogRatios = new Map();
let ogSmall = 0;
for (const file of htmlFiles) {
  const html = readFileSync(file, "utf-8");
  const page = urlOf(file);
  const og = metaOne(html, "og:image");
  if (!og) continue;
  const local = assetFileFor(og.replace(SITE, ""));
  if (!local) continue;
  const d = webpDims(local);
  if (!d) continue;
  const ratio = +(d[0] / d[1]).toFixed(2);
  const key = `${d[0]}x${d[1]}`;
  if (!ogRatios.has(key)) ogRatios.set(key, []);
  ogRatios.get(key).push(page);
  if (d[0] < 600 || d[1] < 315) ogSmall++;
  const card = metaOne(html, "twitter:card");
  if (card === "summary_large_image" && Math.abs(ratio - 1.91) > 0.35)
    warn(
      "J3.og-aspect-vs-large-card",
      page,
      `${key} (ratio ${ratio}) with twitter:card=summary_large_image`,
    );
}
note(
  "J4.og-image-sizes",
  [...ogRatios.keys()].join(", "),
  [...ogRatios.entries()].map(([k, v]) => `${k}×${v.length}`).join(", "),
);
if (ogSmall) warn("J5.og-image-too-small", `${ogSmall} pages`, "below 600×315 minimum");

// J6 — sitemap lastmod sanity
const lastmods = [...sitemap.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1]);
let badLastmod = 0;
for (const l of lastmods) {
  const t = Date.parse(l);
  if (Number.isNaN(t)) {
    err("J6.bad-lastmod", l, "unparseable");
    badLastmod++;
  } else if (t > Date.now() + 86400000) {
    err("J7.future-lastmod", l, "");
    badLastmod++;
  }
}
note(
  "J8.sitemap-lastmod",
  `${lastmods.length} entries`,
  badLastmod
    ? `${badLastmod} invalid`
    : `all valid; range ${lastmods.sort()[0]} … ${lastmods.sort().slice(-1)[0]}`,
);

/* ════════════════ K. static-page prerender ↔ route copy ════════════════ */

// The prerender writes its own body copy for the static routes. If that copy
// drifts from what the route actually renders, crawlers (and no-JS visitors)
// read one page while users see another — including policy facts.
const STATIC_ROUTE_FILES = {
  "/about": "about",
  "/contact": "contact",
  "/shipping": "shipping",
  "/returns": "returns",
  "/terms": "terms",
  "/privacy": "privacy",
  "/refer": "refer",
  "/medical-review-board": "medical-review-board",
  "/education": "education",
  "/products/men": "products.men",
  "/products/women": "products.women",
  "/products/devices": "products.devices",
};
const h1Mismatch = [];
const headingOverlap = [];
for (const [url, file] of Object.entries(STATIC_ROUTE_FILES)) {
  const dist = pageFileFor(url);
  const srcPath = resolve(ROOT, `src/routes/${file}.tsx`);
  if (!dist || !existsSync(srcPath)) continue;
  const html = readFileSync(dist, "utf-8");
  const start = html.indexOf("<div data-prerender-content");
  if (start < 0) continue;
  const endMark = html.indexOf("<!-- Meta Pixel", start);
  const block = html.slice(start, endMark > 0 ? endMark : html.indexOf("</body>", start));
  const prH1 = ((block.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || "")
    .replace(/<[^>]+>/g, "")
    .trim();
  const prHeads = [...block.matchAll(/<h([23])[^>]*>([\s\S]*?)<\/h\1>/gi)].map((m) =>
    m[2]
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim(),
  );

  const src = readFileSync(srcPath, "utf-8");
  const consts = new Map(
    [...src.matchAll(/const\s+([A-Z_][A-Z0-9_]*)\s*=\s*"([^"]*)"/g)].map((m) => [m[1], m[2]]),
  );
  let heroTitle = (src.match(/<PageHero[\s\S]{0,400}?title\s*=\s*"([^"]+)"/) || [])[1];
  if (!heroTitle) {
    const varName = (src.match(/<PageHero[\s\S]{0,400}?title\s*=\s*\{([A-Z_][A-Z0-9_]*)\}/) ||
      [])[1];
    if (varName) heroTitle = consts.get(varName);
  }
  const srcHeads = [...src.matchAll(/<h([234])[^>]*>([\s\S]*?)<\/h\1>/gi)]
    .map((m) =>
      m[2]
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter((h) => /[\u0600-\u06FF]/.test(h));

  if (prH1 && heroTitle && prH1 !== heroTitle)
    h1Mismatch.push({ url, prerender: prH1, route: heroTitle });
  if (prHeads.length && srcHeads.length) {
    const shared = prHeads.filter((h) => srcHeads.includes(h));
    headingOverlap.push({
      url,
      prerenderHeadings: prHeads.length,
      routeHeadings: srcHeads.length,
      shared: shared.length,
    });
  }
}
for (const m of h1Mismatch)
  warn("K1.static-h1-mismatch", m.url, `prerender="${m.prerender}" vs rendered="${m.route}"`);
for (const h of headingOverlap) {
  if (h.shared === 0)
    warn(
      "K2.static-sections-diverge",
      h.url,
      `prerender ${h.prerenderHeadings} headings, rendered ${h.routeHeadings}, 0 in common`,
    );
  else if (h.shared < Math.min(h.prerenderHeadings, h.routeHeadings))
    note(
      "K3.static-sections-partial",
      h.url,
      `${h.shared}/${Math.min(h.prerenderHeadings, h.routeHeadings)} headings shared`,
    );
}

// K4 — policy facts stated in the prerendered copy must also exist in the
// rendered route (numbers such as 14 days / 7 working days / delivery windows).
const POLICY_FACTS = [
  { url: "/returns", fact: "14", label: "14-day return window" },
  { url: "/returns", fact: "7 أيام عمل", label: "7 working days refund" },
  { url: "/returns", fact: "غير مفتوح", label: "unopened condition" },
  { url: "/shipping", fact: "24–48", label: "Cairo/Giza delivery window" },
  { url: "/shipping", fact: "مجاني", label: "free shipping threshold" },
];
/**
 * Routes render some policy facts through imported constants
 * (`<p>{SHIPPING_DELIVERY_TEXT}.</p>`), so a literal grep of the route source
 * reports them as missing. Pull the declaration text of every constant the
 * route imports from site-config/governorates and treat it as route content.
 */
function importedConstantText(src) {
  const imports = new Set();
  for (const m of src.matchAll(
    /import\s*\{([^}]+)\}\s*from\s*"@\/lib\/(?:site-config|governorates)"/g,
  ))
    for (const n of m[1].split(",")) if (n.trim()) imports.add(n.trim());
  let out = "";
  for (const lib of ["site-config", "governorates"]) {
    const p = resolve(ROOT, `src/lib/${lib}.ts`);
    if (!existsSync(p)) continue;
    const text = readFileSync(p, "utf-8");
    const decls = [...text.matchAll(/^export const ([A-Z_][A-Z0-9_]*)/gm)].map((m) => m[1]);
    const blocks = new Map();
    decls.forEach((name, i) => {
      const start = text.indexOf(`export const ${name}`);
      const next =
        i + 1 < decls.length ? text.indexOf(`export const ${decls[i + 1]}`) : text.length;
      blocks.set(name, text.slice(start, next));
    });
    // constants compose (SHIPPING_DELIVERY_TEXT embeds SHIPPING_DELIVERY_WINDOWS),
    // so follow references two levels deep.
    const wanted = new Set([...imports].filter((n) => blocks.has(n)));
    for (let pass = 0; pass < 2; pass++)
      for (const name of [...wanted])
        for (const other of decls)
          if (other !== name && (blocks.get(name) || "").includes(other)) wanted.add(other);
    for (const name of wanted) out += ` ${blocks.get(name) || ""}`;
  }
  return out;
}

for (const pf of POLICY_FACTS) {
  const dist = pageFileFor(pf.url);
  const srcPath = resolve(ROOT, `src/routes/${STATIC_ROUTE_FILES[pf.url]}.tsx`);
  if (!dist || !existsSync(srcPath)) continue;
  const htmlText = textOf(readFileSync(dist, "utf-8")).replace(/\s+/g, " ");
  // JSX sources wrap long Arabic sentences across lines, so a fact such as
  // "7 أيام عمل" can be split by a newline + indentation in the route while
  // rendering as one phrase. Compare on whitespace-normalised text.
  const srcRaw = readFileSync(srcPath, "utf-8");
  const srcText = `${srcRaw} ${importedConstantText(srcRaw)}`.replace(/\s+/g, " ");
  const inStatic = htmlText.includes(pf.fact);
  const inRoute = srcText.includes(pf.fact) || srcText.includes(pf.fact.replace("–", "-"));
  if (inRoute && !inStatic)
    err(
      "K4.policy-fact-only-in-route",
      pf.url,
      `${pf.label} ("${pf.fact}") missing from the prerendered copy`,
    );
  if (inStatic && !inRoute)
    warn(
      "K5.policy-fact-only-in-prerender",
      pf.url,
      `${pf.label} ("${pf.fact}") not in the rendered route`,
    );
}

/* ════════════════ report ════════════════ */

const group = (arr) => {
  const m = new Map();
  for (const i of arr) {
    if (!m.has(i.kind)) m.set(i.kind, []);
    m.get(i.kind).push(i);
  }
  return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
};

const out = {
  generatedAt: new Date().toISOString(),
  pages: htmlFiles.length,
  distFiles: distFiles.length,
  checkedLinks,
  redirectRules: (vercel.redirects || []).length,
  feedItems: feedItems.length,
  builtProductPages: builtProducts.length,
  productSchemas: productPages,
  offersChecked: offerChecks,
  recommendedOfferFieldsMissing: recommendedMissing,
  issues: issues.length,
  warnings: warns.length,
  notesCount: notes.length,
  issueGroups: group(issues).map(([k, v]) => ({ kind: k, count: v.length, sample: v.slice(0, 6) })),
  warningGroups: group(warns).map(([k, v]) => ({
    kind: k,
    count: v.length,
    sample: v.slice(0, 6),
  })),
  notes: notes,
  claims: claimHits,
  hedges: hedgeHits,
  drugs: drugHits,
  mixedScript: mixedHits,
  orphans,
  unreferencedAssets: trulyDead,
  sitemapUrls: sitemapUrls.length,
  skuIsInternalId,
  guidePages: guidePages.length,
  guideJsonMissing,
  guideJsonOrphan,
  guideDrift,
  rxProducts: rxProducts.map((r) => r.id),
  staticH1Mismatch: h1Mismatch,
  staticHeadingOverlap: headingOverlap,
  nearDuplicatePairs: nearDup,
  thinPages,
  ogImageSizes: [...ogRatios.entries()].map(([k, v]) => ({ size: k, pages: v.length })),
};

if (WANT_JSON) {
  writeFileSync(resolve(ROOT, "AUDIT-FINAL-SITE.json"), JSON.stringify(out, null, 2));
  console.log("📄 wrote AUDIT-FINAL-SITE.json");
}

const print = (title, groups, limit = 8) => {
  if (!groups.length) {
    console.log(`\n✅ ${title}: none`);
    return;
  }
  console.log(`\n── ${title} ──`);
  for (const [kind, list] of groups) {
    console.log(`  ${kind}  ×${list.length}`);
    for (const i of list.slice(0, limit))
      console.log(`      · ${i.page} → ${i.detail}`.slice(0, 240));
    if (list.length > limit) console.log(`      … +${list.length - limit} more`);
  }
};

print("ERRORS", group(issues), 6);
print("WARNINGS", group(warns), 5);

console.log("\n── NOTES ──");
for (const n of notes) console.log(`  ${n.kind}  ${n.page} — ${n.detail}`.slice(0, 300));

console.log("\n── CONTENT POLICY ──");
console.log(`  absolute/medical claims: ${claimHits.length}`);
for (const c of claimHits.slice(0, 15)) console.log(`      · ${c.page} → "${c.text}" (${c.why})`);
console.log(`  banned hedging phrases: ${hedgeHits.length}`);
for (const h of hedgeHits.slice(0, 15)) console.log(`      · ${h.page} → "${h.h}"`);
console.log(`  drug-name mentions: ${drugHits.length}`);
for (const d of drugHits.slice(0, 15)) console.log(`      · ${d.page} → ${d.d}`);
console.log(`  mixed-script corruption: ${mixedHits.length}`);
for (const m of mixedHits.slice(0, 10)) console.log(`      · ${m.page} → "…${m.text}…"`);
console.log(`  orphan pages (in sitemap, no internal link): ${orphans.length}`);
console.log(`  unreferenced public assets: ${trulyDead.length}`);

console.log(
  `\n${issues.length ? "❌" : "✅"} ${issues.length} error(s), ${warns.length} warning(s), ${notes.length} note(s) across ${htmlFiles.length} pages\n`,
);

writeFileSync(resolve(ROOT, "AUDIT-FINAL-SITE.json"), JSON.stringify(out, null, 2));
process.exit(issues.length || (STRICT && warns.length) ? 1 : 0);
