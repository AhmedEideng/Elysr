/**
 * ============================================================
 * Real-browser prerender ↔ hydrated parity + health audit
 * ============================================================
 * Static text comparison cannot see what a browser does. This script drives
 * headless Chromium against the production Express server (dist/ + redirects
 * + real 404s) and, for every page:
 *
 *   1. loads it with JavaScript blocked  → the *prerendered* DOM
 *   2. loads it normally and waits for hydration → the *real* DOM
 *   3. diffs: <title>, <h1>, heading outline, visible text, internal hrefs,
 *      meta description, canonical, JSON-LD node types
 *   4. records console errors/warnings (React hydration mismatches surface
 *      here) and uncaught page errors
 *   5. measures CLS (layout-shift entries) and LCP
 *   6. records the HTTP status actually served
 *
 * Usage:
 *   node scripts/browser-parity.mjs [--limit N] [--only /products/x] [--json]
 * Requires: npm run build && node server/index.js  (default http://127.0.0.1:8080)
 * ============================================================
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DIST = resolve(ROOT, "dist");
const BASE = process.env.BASE_URL || "http://127.0.0.1:8080";
const SITE = "https://elysrmedical.store";

const args = process.argv.slice(2);
const LIMIT = args.includes("--limit") ? Number(args[args.indexOf("--limit") + 1]) : Infinity;
const ONLY = args.includes("--only") ? args[args.indexOf("--only") + 1] : null;
const WANT_JSON = args.includes("--json");
const CONCURRENCY = 6;

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = resolve(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith(".html")) out.push(p);
  }
  return out;
}
const urlOf = (file) => {
  const rel = relative(DIST, file).replace(/\\/g, "/");
  if (rel === "index.html") return "/";
  if (rel.endsWith("/index.html")) return "/" + rel.slice(0, -"/index.html".length);
  return "/" + rel.slice(0, -".html".length);
};

let pages = walk(DIST)
  .map(urlOf)
  .filter((u) => u !== "/404");
if (ONLY) pages = pages.filter((p) => p.includes(ONLY));
pages = pages.slice(0, LIMIT);

const results = {
  generatedAt: new Date().toISOString(),
  base: BASE,
  checked: 0,
  httpErrors: [],
  consoleErrors: [],
  hydrationWarnings: [],
  diffs: [],
  cls: [],
  lcp: [],
  notes: [],
};

/** snapshot everything we care about, from inside the page */
const SNAPSHOT_JS = () => {
  const txt = (el) => (el ? el.textContent.replace(/\s+/g, " ").trim() : "");
  const heads = [...document.querySelectorAll("h1,h2,h3")]
    .slice(0, 40)
    .map((h) => `${h.tagName}:${txt(h)}`);
  const links = [...document.querySelectorAll("a[href]")]
    .map((a) => a.getAttribute("href"))
    .filter((h) => h && (h.startsWith("/") || h.startsWith("https://elysrmedical.store")))
    .map((h) => h.replace("https://elysrmedical.store", "").split("?")[0].split("#")[0])
    .filter(Boolean);
  const meta = (sel) => txt(document.querySelector(sel));
  const ld = [...document.querySelectorAll('script[type="application/ld+json"]')]
    .map((s) => {
      try {
        const o = JSON.parse(s.textContent);
        const nodes = o["@graph"] ? o["@graph"] : [o];
        return nodes
          .map((n) => (Array.isArray(n["@type"]) ? n["@type"].join("+") : n["@type"]))
          .join(",");
      } catch {
        return "PARSE_ERROR";
      }
    })
    .sort()
    .join("|");
  const body = document.body.innerText.replace(/\s+/g, " ").trim();
  return {
    title: document.title,
    h1: txt(document.querySelector("h1")),
    h1Count: document.querySelectorAll("h1").length,
    heads,
    links: [...new Set(links)].sort(),
    description: meta('meta[name="description"]')?.slice(0, 400) || "",
    canonical: document.querySelector('link[rel="canonical"]')?.href || "",
    jsonLdTypes: ld,
    textStart: body.slice(0, 600),
    textLength: body.length,
  };
};

const PERF_JS = () => {
  const cls = performance
    .getEntriesByType("layout-shift")
    .filter((e) => !e.hadRecentInput)
    .reduce((s, e) => s + e.value, 0);
  const lcpEntries = performance.getEntriesByType("largest-contentful-paint");
  const lcp = lcpEntries.length ? lcpEntries[lcpEntries.length - 1].startTime : null;
  return { cls: +cls.toFixed(4), lcp: lcp == null ? null : Math.round(lcp) };
};

const browser = await chromium.launch();
const queue = [...pages];
let done = 0;

async function worker() {
  while (queue.length) {
    const path = queue.shift();
    const url = BASE + path;
    const record = {
      path,
      status: null,
      static: null,
      hydrated: null,
      perf: null,
      console: [],
      pageErrors: [],
    };
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const consoleMsgs = [];
    try {
      // ── pass 1: prerendered DOM (JS blocked) ──
      const p1 = await ctx.newPage();
      await p1.route("**/*.js", (r) => r.abort());
      await p1.route("**/api/**", (r) => r.abort());
      const res1 = await p1.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      record.status = res1 ? res1.status() : null;
      record.static = await p1.evaluate(SNAPSHOT_JS);
      await p1.close();

      // ── pass 2: hydrated DOM ──
      const p2 = await ctx.newPage();
      p2.on("console", (m) => {
        if (m.type() === "error" || m.type() === "warning")
          consoleMsgs.push(`${m.type()}: ${m.text().slice(0, 240)}`);
      });
      p2.on("pageerror", (e) => record.pageErrors.push(String(e.message).slice(0, 240)));
      await p2.addInitScript(() => {
        window.__cls = 0;
        window.__lcp = null;
        try {
          new PerformanceObserver((list) => {
            for (const e of list.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
          }).observe({ type: "layout-shift", buffered: true });
        } catch {
          /* ignore */
        }
        try {
          new PerformanceObserver((list) => {
            const es = list.getEntries();
            if (es.length) window.__lcp = es[es.length - 1].startTime;
          }).observe({ type: "largest-contentful-paint", buffered: true });
        } catch {
          /* ignore */
        }
      });
      const res2 = await p2.goto(url, { waitUntil: "load", timeout: 45000 });
      // let the SPA finish mounting + its loaders settle
      await p2.waitForTimeout(1800);
      record.hydrated = await p2.evaluate(SNAPSHOT_JS);
      const perf = await p2.evaluate(PERF_JS);
      const clsObserved = await p2.evaluate(() => +(window.__cls || 0).toFixed(4));
      const lcpObserved = await p2.evaluate(() =>
        window.__lcp == null ? null : Math.round(window.__lcp),
      );
      record.perf = {
        ...perf,
        cls: Math.max(perf.cls || 0, clsObserved),
        lcp: lcpObserved != null ? lcpObserved : perf.lcp,
      };
      record.status = res2 ? res2.status() : record.status;
      await p2.close();
    } catch (e) {
      record.pageErrors.push(`HARNESS: ${String(e.message).slice(0, 200)}`);
    }
    record.console = consoleMsgs;
    results.checked++;
    done++;
    if (record.status !== 200) results.httpErrors.push({ path, status: record.status });
    for (const m of record.console) {
      if (/hydrat/i.test(m)) results.hydrationWarnings.push({ path, msg: m });
      else if (m.startsWith("error")) results.consoleErrors.push({ path, msg: m });
    }
    for (const e of record.pageErrors) {
      if (!e.startsWith("HARNESS")) results.consoleErrors.push({ path, msg: `pageerror: ${e}` });
    }
    if (record.static && record.hydrated) {
      const s = record.static;
      const h = record.hydrated;
      const diffs = [];
      if (s.title !== h.title) diffs.push({ field: "title", static: s.title, hydrated: h.title });
      if (s.h1 !== h.h1) diffs.push({ field: "h1", static: s.h1, hydrated: h.h1 });
      if (s.h1Count !== h.h1Count)
        diffs.push({ field: "h1Count", static: s.h1Count, hydrated: h.h1Count });
      if (s.canonical !== h.canonical)
        diffs.push({ field: "canonical", static: s.canonical, hydrated: h.canonical });
      if (s.description !== h.description)
        diffs.push({
          field: "description",
          static: s.description.slice(0, 120),
          hydrated: h.description.slice(0, 120),
        });
      if (s.jsonLdTypes !== h.jsonLdTypes)
        diffs.push({ field: "jsonLdTypes", static: s.jsonLdTypes, hydrated: h.jsonLdTypes });
      const headsStatic = new Set(s.heads);
      const headsHydrated = new Set(h.heads);
      const headsOnlyStatic = [...headsStatic].filter((x) => !headsHydrated.has(x));
      const headsOnlyHydrated = [...headsHydrated].filter((x) => !headsStatic.has(x));
      if (headsOnlyStatic.length || headsOnlyHydrated.length)
        diffs.push({
          field: "headingOutline",
          static: headsOnlyStatic.slice(0, 8),
          hydrated: headsOnlyHydrated.slice(0, 8),
        });
      const linksStatic = new Set(s.links);
      const linksHydrated = new Set(h.links);
      const linksOnlyStatic = [...linksStatic].filter((x) => !linksHydrated.has(x));
      const linksOnlyHydrated = [...linksHydrated].filter((x) => !linksStatic.has(x));
      if (linksOnlyStatic.length || linksOnlyHydrated.length)
        diffs.push({
          field: "internalLinks",
          static: linksOnlyStatic.slice(0, 6),
          hydrated: linksOnlyHydrated.slice(0, 6),
          counts: { static: linksStatic.size, hydrated: linksHydrated.size },
        });
      if (diffs.length) results.diffs.push({ path, diffs });
      if (record.perf) {
        if (record.perf.cls > 0.1) results.cls.push({ path, cls: record.perf.cls });
        if (record.perf.lcp != null) results.lcp.push({ path, lcp: record.perf.lcp });
      }
    }
    await ctx.close();
    if (done % 25 === 0) console.log(`  … ${done}/${pages.length}`);
  }
}

console.log(`\n🌐 Browser parity audit — ${pages.length} pages @ ${BASE}\n`);
await Promise.all(Array.from({ length: CONCURRENCY }, worker));
await browser.close();

/* ── report ── */
const tally = (arr, key) => {
  const m = new Map();
  for (const r of arr) for (const d of r[key] || []) m.set(d.field, (m.get(d.field) || 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
};

console.log(`pages checked      : ${results.checked}`);
console.log(`non-200 responses  : ${results.httpErrors.length}`);
for (const h of results.httpErrors.slice(0, 15)) console.log(`   · ${h.path} → HTTP ${h.status}`);
console.log(`hydration warnings : ${results.hydrationWarnings.length}`);
for (const h of results.hydrationWarnings.slice(0, 10)) console.log(`   · ${h.path} → ${h.msg}`);
console.log(`console errors     : ${results.consoleErrors.length}`);
const errKinds = new Map();
for (const c of results.consoleErrors) {
  const key = c.msg.replace(/[0-9]+/g, "n").slice(0, 110);
  errKinds.set(key, (errKinds.get(key) || 0) + 1);
}
for (const [k, n] of [...errKinds].sort((a, b) => b[1] - a[1]).slice(0, 15))
  console.log(`   · ×${n} ${k}`);
console.log(`pages with diffs   : ${results.diffs.length}`);
for (const [field, n] of tally(results.diffs, "diffs")) console.log(`   · ${field}: ${n}`);
console.log(`CLS > 0.1          : ${results.cls.length}`);
for (const c of results.cls.sort((a, b) => b.cls - a.cls).slice(0, 12))
  console.log(`   · ${c.path} → ${c.cls}`);
const lcpSorted = results.lcp.sort((a, b) => b.lcp - a.lcp);
console.log(`LCP samples        : ${results.lcp.length}`);
if (lcpSorted.length) {
  const vals = lcpSorted.map((x) => x.lcp);
  const p = (q) => vals[Math.min(vals.length - 1, Math.floor(vals.length * q))];
  console.log(`   · p50 ${p(0.5)}ms · p90 ${p(0.9)}ms · max ${vals[0]}ms (${lcpSorted[0].path})`);
}

// sample diffs for the report
const samples = results.diffs.slice(0, 6);
if (samples.length) {
  console.log("\nsample diffs:");
  for (const s of samples) {
    console.log(`  ${s.path}`);
    for (const d of s.diffs)
      console.log(
        `     ${d.field}: ${JSON.stringify(d.static).slice(0, 110)} → ${JSON.stringify(d.hydrated).slice(0, 110)}`,
      );
  }
}

const outPath = resolve(ROOT, "AUDIT-BROWSER-PARITY.json");
writeFileSync(outPath, JSON.stringify(results, null, 2));
console.log(`\n📄 wrote ${relative(ROOT, outPath)}`);

const bad = results.httpErrors.length + results.hydrationWarnings.length;
process.exit(bad ? 1 : 0);
