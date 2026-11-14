/**
 * 🔍 مدقّق SEO/جودة شامل لصفحات `dist/` — سبق نشر قابل للتكرار.
 *
 * لماذا؟ لأن «الموقع صديق لمحركات البحث» ليس شعورًا بل قياس: عنوان بمئة حرف،
 * ووصف مكرر في 40 صفحة، أو صفحة بلا H1، أو رابط داخلي ميت — كلها أعطال لا
 * تظهر في أي اختبار وظيفي، ولا يكشفها Lighthouse (الذي يفحص صفحة واحدة).
 *
 * الاستخدام:
 *   node scripts/seo-audit.mjs               # ملخص + أعطال
 *   node scripts/seo-audit.mjs --json out.json
 *   node scripts/seo-audit.mjs --strict      # يخرج بـ 1 عند وجود أي عطل
 */
import { readdirSync, readFileSync, statSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = resolve(ROOT, "dist");
const SITE_URL = "https://elysrmedical.store";

const args = process.argv.slice(2);
const jsonIndex = args.indexOf("--json");
const JSON_OUT = jsonIndex !== -1 ? args[jsonIndex + 1] : null;
const STRICT = args.includes("--strict");

/* ─────────────────────────── أدوات قراءة ─────────────────────────── */

/** @param {string} dir @param {string[]} out */
function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "assets" || entry.name === "landing-pages") continue;
      walk(full, out);
    } else if (entry.name.endsWith(".html")) out.push(full);
  }
  return out;
}

const stripTags = (html) =>
  html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " ");
const decode = (s) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ");

const textOf = (html) => decode(stripTags(html)).replace(/\s+/g, " ").trim();
const attr = (tag, name) => {
  const m = new RegExp(`${name}\\s*=\\s*"([^"]*)"`, "i").exec(tag);
  return m ? m[1] : null;
};
const routeOf = (file) => {
  const rel = relative(DIST, file).replace(/\\/g, "/");
  if (rel === "index.html") return "/";
  return `/${rel.replace(/\.html$/, "").replace(/\/index$/, "")}`;
};

/* ───────────────────── قائمة المسارات القابلة للفهرسة ───────────────────── */

const sitemapPath = resolve(DIST, "sitemap.xml");
const sitemapRoutes = new Set();
if (existsSync(sitemapPath)) {
  const xml = readFileSync(sitemapPath, "utf-8");
  for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    sitemapRoutes.add(m[1].replace(SITE_URL, "").replace(/\/$/, "") || "/");
  }
}

/* ───────────────────────────── الفحص ───────────────────────────── */

const files = walk(DIST);
const pages = [];
const issues = [];
const add = (severity, code, route, detail) => issues.push({ severity, code, route, detail });

/** @type {Map<string, string[]>} */ const titles = new Map();
/** @type {Map<string, string[]>} */ const descriptions = new Map();
/** @type {Map<string, string[]>} */ const canonicals = new Map();

const INTERNAL_LINKS = new Set();
const IMG_SRCS = new Set();

for (const file of files) {
  const html = readFileSync(file, "utf-8");
  const route = routeOf(file);
  const head = (html.match(/<head[\s\S]*?<\/head>/i) || [""])[0];
  const body = html.replace(head, "");
  const page = { route, bytes: statSync(file).size };

  // 1) اللغة والاتجاه
  const htmlTag = (html.match(/<html[^>]*>/i) || [""])[0];
  page.lang = attr(htmlTag, "lang");
  page.dir = attr(htmlTag, "dir");
  if (!page.lang) add("error", "html-lang-missing", route, "<html> بلا lang");
  if (page.lang === "ar" && page.dir !== "rtl")
    add("error", "html-dir-wrong", route, "عربي بلا dir=rtl");

  // 2) العنوان
  const titleMatches = [...html.matchAll(/<title>([\s\S]*?)<\/title>/gi)];
  page.title = titleMatches.length ? decode(titleMatches[0][1]).trim() : null;
  if (titleMatches.length === 0) add("error", "title-missing", route, "لا يوجد <title>");
  else if (titleMatches.length > 1)
    add("error", "title-duplicate-tag", route, `${titleMatches.length} عناوين`);
  if (page.title) {
    const len = page.title.length;
    page.titleLength = len;
    if (len < 15) add("warn", "title-too-short", route, `${len} حرف`);
    // (2026-11-15) سياسة من طبقتين:
    //   • العناوين التحريرية (مقالات/أدلة/ثابتة/إنجليزية) ≤ 62 حرفًا —
    //     يفرضها src/lib/serp-title.ts + اختبار seo-titles.test.ts.
    //   • أسماء المنتجات تُنشر حرفيًا من الكتالوج (≤ 70) لأن تعديل اسم SKU
    //     قرار تجاري لا تحريري؛ هنا ننبّه فقط عند تجاوز 65.
    if (len > 65) add("warn", "title-too-long", route, `${len} حرف: ${page.title.slice(0, 70)}`);
    if (!titles.has(page.title)) titles.set(page.title, []);
    titles.get(page.title).push(route);
  }

  // 3) الوصف
  const descTag = head.match(/<meta[^>]*name="description"[^>]*>/i);
  page.description = descTag ? decode(attr(descTag[0], "content") || "").trim() : null;
  if (!page.description) add("error", "description-missing", route, "لا يوجد meta description");
  else {
    const len = page.description.length;
    page.descriptionLength = len;
    if (len < 50) add("warn", "description-too-short", route, `${len} حرف`);
    if (len > 165) add("warn", "description-too-long", route, `${len} حرف`);
    if (!descriptions.has(page.description)) descriptions.set(page.description, []);
    descriptions.get(page.description).push(route);
  }

  // 4) Canonical
  const canonicalTags = [...head.matchAll(/<link[^>]*rel="canonical"[^>]*>/gi)];
  page.canonical = canonicalTags.length ? attr(canonicalTags[0][0], "href") : null;
  // (2026-11-15) صفحة noindex (مثل /404) لا تحتاج canonical — Google يتجاهله
  // هناك، وتصريح «no canonical» مقصود لا نقص. الشرط يبقى على الصفحات القابلة
  // للفهرسة وحدها.
  const isNoindex = /<meta[^>]*name="robots"[^>]*content="[^"]*noindex/i.test(head);
  if (canonicalTags.length === 0 && !isNoindex) {
    add("error", "canonical-missing", route, "لا يوجد canonical");
  } else if (canonicalTags.length > 1)
    add("error", "canonical-duplicate", route, `${canonicalTags.length} canonical`);
  if (page.canonical) {
    if (!page.canonical.startsWith("https://"))
      add("error", "canonical-not-https", route, page.canonical);
    if (page.canonical.includes("?")) add("error", "canonical-has-query", route, page.canonical);
    if (page.canonical.endsWith("/") && route !== "/")
      add("warn", "canonical-trailing-slash", route, page.canonical);
    const expected = route === "/" ? `${SITE_URL}/` : `${SITE_URL}${route}`;
    if (page.canonical !== expected && page.canonical !== expected.replace(/\/$/, ""))
      add("error", "canonical-not-self", route, `متوقع ${expected} · وجد ${page.canonical}`);
    if (!canonicals.has(page.canonical)) canonicals.set(page.canonical, []);
    canonicals.get(page.canonical).push(route);
  }

  // 5) robots
  const robotsTag = head.match(/<meta[^>]*name="robots"[^>]*>/i);
  page.robots = robotsTag ? attr(robotsTag[0], "content") : null;
  page.noindex = Boolean(page.robots && /noindex/i.test(page.robots));

  // 6) العناوين
  const h1s = [...body.matchAll(/<h1[^>]*>/gi)];
  page.h1Count = h1s.length;
  if (h1s.length === 0) add("error", "h1-missing", route, "لا يوجد <h1>");
  if (h1s.length > 1) add("error", "h1-multiple", route, `${h1s.length} عناوين h1`);
  const headingLevels = [...body.matchAll(/<h([1-6])[^>]*>/gi)].map((m) => Number(m[1]));
  for (let i = 1; i < headingLevels.length; i += 1) {
    if (headingLevels[i] - headingLevels[i - 1] > 1) {
      add("warn", "heading-skip", route, `h${headingLevels[i - 1]} → h${headingLevels[i]}`);
      break;
    }
  }

  // 6.5) hreflang — تُجمَع هنا وتُتحقّق من التبادل بعد الحلقة
  page.hreflangs = [
    ...head.matchAll(/<link[^>]*rel="alternate"[^>]*hreflang="([^"]+)"[^>]*>/gi),
  ].map((m) => ({ lang: m[1], href: attr(m[0], "href") }));

  // 7) Open Graph / Twitter
  for (const tag of ["og:title", "og:description", "og:image", "og:url", "og:type"]) {
    if (!head.includes(`property="${tag}"`) && !head.includes(`property='${tag}'`))
      add("warn", "og-missing", route, tag);
  }
  if (!/name="twitter:card"/i.test(head))
    add("warn", "twitter-card-missing", route, "twitter:card");

  // 8) JSON-LD
  const jsonLdBlocks = [
    ...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi),
  ];
  page.jsonLdCount = jsonLdBlocks.length;
  const types = [];
  for (const block of jsonLdBlocks) {
    try {
      const parsed = JSON.parse(block[1].trim());
      const items = Array.isArray(parsed) ? parsed : [parsed];
      const blockHasGraph = items.some((i) => i && typeof i === "object" && "@graph" in i);
      for (const item of items) {
        if (!item["@context"] && !blockHasGraph)
          add("error", "jsonld-no-context", route, "بدون @context");
        // الصفحة قد تُغلِّف كل شيء في @graph — حينها النوع المطلوب داخل كل عنصر.
        const nodes = Array.isArray(item["@graph"]) ? item["@graph"] : [item];
        for (const node of nodes) {
          const type = node["@type"];
          if (!type) {
            add("error", "jsonld-no-type", route, "عنصر بلا @type");
            continue;
          }
          for (const t of Array.isArray(type) ? type : [type]) types.push(t);
        }
      }
    } catch {
      add("error", "jsonld-invalid-json", route, "JSON غير صالح");
    }
  }
  const dupTypes = types.filter((t, i) => types.indexOf(t) !== i);
  if (dupTypes.length)
    add("warn", "jsonld-duplicate-type", route, [...new Set(dupTypes)].join(", "));
  page.jsonLdTypes = types;

  // 9) الصور
  const imgs = [...body.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  page.images = imgs.length;
  const noAlt = imgs.filter((t) => !/\balt\s*=\s*"/i.test(t));
  if (noAlt.length) add("error", "img-no-alt", route, `${noAlt.length} صورة بلا alt`);
  const noDims = imgs.filter((t) => !/\bwidth\s*=\s*"/i.test(t) || !/\bheight\s*=\s*"/i.test(t));
  if (noDims.length)
    add("warn", "img-no-dimensions", route, `${noDims.length} صورة بلا width/height`);
  for (const t of imgs) {
    const src = attr(t, "src");
    if (src) IMG_SRCS.add(src.replace(/^https?:\/\/[^/]+/, ""));
  }

  // 10) الروابط الداخلية
  const anchors = [...body.matchAll(/<a\b[^>]*>/gi)].map((m) => m[0]);
  for (const a of anchors) {
    const href = attr(a, "href");
    if (href === null) add("error", "link-no-href", route, a.slice(0, 60));
    else if (href === "#" || href === "") add("warn", "link-empty", route, "href فارغ");
    else if (href.startsWith("http://")) add("error", "link-insecure", route, href.slice(0, 80));
    else if (href.startsWith("/") && !href.startsWith("//")) {
      INTERNAL_LINKS.add(href.split(/[?#]/)[0] || "/");
    } else if (href.startsWith(SITE_URL) || href.startsWith(`${SITE_URL}/`)) {
      // روابط داخلية مكتوبة بالمطلق — شائعة هنا لأن الـ prerender يبني روابط
      // مطلقة. تُحسب داخلية وتُفحص مثل النسبية تمامًا.
      const path = href.slice(SITE_URL.length).split(/[?#]/)[0] || "/";
      INTERNAL_LINKS.add(path);
    }
  }

  // 11) المحتوى الرقيق
  const words = textOf(body)
    .split(/\s+/)
    .filter((w) => w.length > 1).length;
  page.words = words;
  if (!page.noindex && words < 150) add("warn", "thin-content", route, `${words} كلمة`);

  // 12) أساسيات الرأس
  if (!/<meta[^>]*name="viewport"/i.test(head))
    add("error", "viewport-missing", route, "بلا viewport");
  if (!/<meta[^>]*charset=/i.test(head)) add("error", "charset-missing", route, "بلا charset");

  // 13) sitemap مقابل الصفحة
  const inSitemap = sitemapRoutes.has(route);
  page.inSitemap = inSitemap;
  if (!page.noindex && !inSitemap && route !== "/404")
    add("error", "missing-from-sitemap", route, "صفحة قابلة للفهرسة خارج sitemap");
  if (page.noindex && inSitemap)
    add("error", "noindex-in-sitemap", route, "noindex لكنها في sitemap");

  pages.push(page);
}

/* ───────────────── hreflang متبادل ───────────────── */

const hreflangTargets = new Map();
for (const page of pages) {
  for (const alt of page.hreflangs) {
    if (!alt.href) continue;
    const path = alt.href.startsWith(SITE_URL) ? alt.href.slice(SITE_URL.length) || "/" : alt.href;
    hreflangTargets.set(path, page.route);
  }
}
for (const page of pages) {
  for (const alt of page.hreflangs) {
    const path =
      alt.href && alt.href.startsWith(SITE_URL) ? alt.href.slice(SITE_URL.length) || "/" : null;
    if (!path) continue;
    const target = pages.find((p) => p.route === path);
    if (!target) {
      add("error", "hreflang-target-missing", page.route, `${alt.lang} → ${path} غير موجود`);
      continue;
    }
    const reciprocal = target.hreflangs.some((other) => {
      const otherPath =
        other.href && other.href.startsWith(SITE_URL)
          ? other.href.slice(SITE_URL.length) || "/"
          : null;
      return otherPath === page.route;
    });
    if (!reciprocal) add("warn", "hreflang-not-reciprocal", page.route, `${alt.lang} → ${path}`);
  }
}

/* ───────────────── تكرارات + روابط ميتة ───────────────── */

for (const [title, routes] of titles) {
  if (routes.length > 1)
    add(
      "error",
      "title-not-unique",
      routes.slice(1).join(", "),
      `مكرر مع ${routes[0]}: ${title.slice(0, 50)}`,
    );
}
for (const [, routes] of descriptions) {
  if (routes.length > 1)
    add("error", "description-not-unique", routes.slice(1).join(", "), `مكرر مع ${routes[0]}`);
}
for (const [canonical, routes] of canonicals) {
  if (routes.length > 1)
    add("error", "canonical-not-unique", routes.slice(1).join(", "), `نفس canonical: ${canonical}`);
}

const knownRoutes = new Set(pages.map((p) => p.route));
const PUBLIC = resolve(DIST);
const deadLinks = [];
for (const link of INTERNAL_LINKS) {
  if (link === "/" || knownRoutes.has(link)) continue;
  const asFile = resolve(PUBLIC, `.${link}`);
  if (existsSync(asFile) || existsSync(`${asFile}.html`) || existsSync(join(asFile, "index.html")))
    continue;
  deadLinks.push(link);
}
for (const link of deadLinks) add("error", "dead-internal-link", link, "هدف غير موجود في dist");

const missingImages = [...IMG_SRCS].filter((src) => {
  if (!src || src.startsWith("data:") || src.startsWith("http")) return false;
  const file = resolve(PUBLIC, `.${src.split("?")[0]}`);
  return !existsSync(file);
});
for (const src of missingImages)
  add("error", "missing-image-file", src, "ملف الصورة غير موجود في dist");

/* ───────────────────────────── التقرير ───────────────────────────── */

const bySeverity = { error: 0, warn: 0 };
const byCode = new Map();
for (const issue of issues) {
  bySeverity[issue.severity] += 1;
  byCode.set(issue.code, (byCode.get(issue.code) || 0) + 1);
}

const median = (nums) => {
  const sorted = [...nums].sort((a, b) => a - b);
  return sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
};

const summary = {
  pages: pages.length,
  sitemapRoutes: sitemapRoutes.size,
  internalLinkTargets: INTERNAL_LINKS.size,
  deadLinks: deadLinks.length,
  missingImages: missingImages.length,
  medianTitleLength: median(pages.map((p) => p.titleLength).filter(Boolean)),
  medianDescriptionLength: median(pages.map((p) => p.descriptionLength).filter(Boolean)),
  medianWords: median(pages.map((p) => p.words)),
  pagesWithoutH1: pages.filter((p) => p.h1Count !== 1).length,
  pagesWithJsonLd: pages.filter((p) => p.jsonLdCount > 0).length,
  errors: bySeverity.error,
  warnings: bySeverity.warn,
};

console.log("\n📊 ملخص التدقيق");
console.table(summary);

if (byCode.size) {
  console.log("\n📋 الأعطال حسب النوع");
  const rows = [...byCode.entries()].sort((a, b) => b[1] - a[1]).map(([code, n]) => ({ code, n }));
  console.table(rows);
}

const errors = issues.filter((i) => i.severity === "error");
if (errors.length) {
  console.log(`\n❌ أول ${Math.min(25, errors.length)} عطل:`);
  for (const e of errors.slice(0, 25)) console.log(`   [${e.code}] ${e.route} — ${e.detail}`);
}

if (JSON_OUT) {
  writeFileSync(JSON_OUT, JSON.stringify({ summary, issues, pages }, null, 2));
  console.log(`\n💾 ${JSON_OUT}`);
}

if (STRICT && errors.length) {
  console.error(`\n✖ ${errors.length} عطل — التدقيق فشل.`);
  process.exit(1);
}
console.log("\n✓ اكتمل التدقيق.");
