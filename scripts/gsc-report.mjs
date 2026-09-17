#!/usr/bin/env node
/**
 * ============================================================
 * GSC Performance Report — تحليل فرص الظهور (2026-09-18)
 * ============================================================
 * بدون أي API/credentials: بتعمل export من Google Search Console
 * (Performance) CSV وتخلي السكربت يحللها.
 *
 * الاستخدام:
 *   1) GSC → Performance → (آخر 28 يوم)
 *      • التقرير الافتراضي (Pages)   → ⬇ CSV → scripts/gsc/pages.csv
 *      • شريط "Queries" بالأعلى      → ⬇ CSV → scripts/gsc/queries.csv
 *   2) node scripts/gsc-report.mjs
 *      (أو npm run gsc)
 *
 * لو مفيش ملفات، السكربت يشتغل على بيانات تجريبية (sample) عشان
 * تشوف شكل التقرير — بتحذير واضح.
 *
 * التحليلات:
 *   • ملخص الفترة (نقرات/ظهورات/CTR/موضع متوسط)
 *   • 🎯 فرص: صفحات بموضع 4-10 (قريبة من التوب-3) + إجراء مقترح لكل واحدة
 *   • 🎯 فرص: queries بموضع 4-10 (مواضيع تستاهل محتوى)
 *   • ⚠️ ظهورات عالية + CTR ضعيف (title/meta محتاجة Rewrite)
 *   • 🏷️ Brand queries (تتبع ظهور البراند)
 *   • 📊 تاج "عقدة الموضوع" لكل فرصة (من topics.ts — source واحد)
 *   • قائمة أفعال مقترحة (Top 5)
 *
 * ملاحظة: بيانات GSC فيها تأخير ~يومين.
 * ============================================================
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const GSC_DIR = resolve(__dirname, "gsc");

// ── CLI args ──
const args = process.argv.slice(2);
const argVal = (flag) => {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : null;
};
const minImpArg = argVal("--min-imp");
const MIN_IMP = minImpArg ? Math.max(1, parseInt(minImpArg, 10) || 10) : 10;
const SAMPLE = args.includes("--sample") || !existsSync(resolve(GSC_DIR, "pages.csv"));

let pagesFile = argVal("--pages") || resolve(GSC_DIR, SAMPLE ? "sample-pages.csv" : "pages.csv");
let queriesFile =
  argVal("--queries") || resolve(GSC_DIR, SAMPLE ? "sample-queries.csv" : "queries.csv");

// ── CSV parsing (robust: BOM, quotes, commas in fields, GSC header variants) ──
function parseCsv(text) {
  const clean = text.replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (inQuotes) {
      if (c === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && clean[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    if (row.some((f) => f.trim() !== "")) rows.push(row);
  }
  if (rows.length < 2) throw new Error("CSV file is empty or has no data rows");
  return { headers: rows[0].map((h) => h.trim().toLowerCase()), rows: rows.slice(1) };
}

const num = (v) => {
  if (v === undefined || v === null || v === "") return 0;
  const n = parseFloat(String(v).replace(/[,%\s]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

/**
 * يقرأ ملف GSC (pages أو queries) ويرجّع سطور مجمّعة بالمفتاح
 * (لو التصدير فيه country/device/date بيتم aggregation بوزن
 * impressions — نفس طريقة احتساب GSC).
 */
function loadReport(file, kind) {
  const { headers, rows } = parseCsv(readFileSync(file, "utf-8"));
  const keyCol = headers.includes(kind)
    ? headers.indexOf(kind)
    : headers.indexOf(kind === "pages" ? "page" : "query");
  if (keyCol < 0)
    throw new Error(`${file}: expected a "${kind}" column, got: ${headers.join(", ")}`);
  const col = (name) => (headers.includes(name) ? headers.indexOf(name) : -1);
  const ci = col("clicks");
  const ii = col("impressions");
  const pi = col("position");
  if (ci < 0 || ii < 0 || pi < 0)
    throw new Error(
      `${file}: missing clicks/impressions/position columns (got: ${headers.join(", ")})`,
    );
  const dateI = col("date");
  const hasDates = dateI >= 0;
  const dates = new Set();

  const byKey = new Map();
  for (const r of rows) {
    const key = (r[keyCol] || "").trim();
    if (!key) continue;
    const clicks = num(r[ci]);
    const impressions = num(r[ii]);
    const position = num(r[pi]);
    if (hasDates) dates.add(r[dateI]);
    const cur = byKey.get(key) || { key, clicks: 0, impressions: 0, posWeighted: 0 };
    cur.clicks += clicks;
    cur.impressions += impressions;
    cur.posWeighted += position * impressions;
    byKey.set(key, cur);
  }
  const out = [...byKey.values()].map((e) => ({
    key: e.key,
    clicks: Math.round(e.clicks),
    impressions: Math.round(e.impressions),
    ctr: e.impressions > 0 ? e.clicks / e.impressions : 0,
    position: e.impressions > 0 ? e.posWeighted / e.impressions : 0,
  }));
  out.sort((a, b) => b.impressions - a.impressions);
  return { kind, rows: out, dates: hasDates ? [...dates].sort() : null };
}

// ── Topic tagging (source of truth: src/data/topics.ts عبر ssrLoadModule) ──
let topicTagFor = null;
try {
  const { createServer } = await import("vite");
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: "custom",
    optimizeDeps: { noDiscovery: true, include: [] },
    plugins: [],
    logLevel: "silent",
  });
  const { TOPICS, topicForArticle, topicForGuide, topicForProduct } =
    await vite.ssrLoadModule("/src/data/topics.ts");
  let products = null;
  try {
    ({ products } = await vite.ssrLoadModule("/src/data/products.ts"));
  } catch {
    /* products غير متاح — product tagging هيتخطى */
  }
  const productSlugToId = products ? new Map(products.map((p) => [p.slug, p.id])) : null;
  topicTagFor = (url) => {
    try {
      // GSC keys are full URLs — strip origin to get the site path
      const raw = url.split(/[?#]/)[0].replace(/\/+$/, "");
      const path = raw.includes("://") ? new URL(raw).pathname : raw;
      const slug = path.split("/").pop() || "";
      let t = null;
      if (path.startsWith("/education/")) t = topicForArticle(slug);
      else if (path.startsWith("/products/guides/")) t = topicForGuide(slug);
      else if (path.startsWith("/products/")) {
        if (productSlugToId) t = topicForProduct(productSlugToId.get(slug) || "");
      }
      return t ? t.name : null;
    } catch {
      return null;
    }
  };
  await vite.close();
} catch (err) {
  console.warn(`⚠️  topic tagging غير متاح (${err.message}) — التاجات هتبقى "—"`);
  topicTagFor = () => null;
}

// ── التحميل ──
if (SAMPLE && !(argVal("--pages") || argVal("--queries"))) {
  console.log("📊 لم يتم العثور على scripts/gsc/pages.csv — التشغيل على بيانات تجريبية (sample).");
  console.log("   شغّل بدون --sample بعد ما تحمّل ملفات GSC (شوف scripts/gsc/README.md).\n");
}
const pages = loadReport(pagesFile, "pages");
const queries = existsSync(queriesFile) ? loadReport(queriesFile, "queries") : null;

// ── التحليل ──
const totals = (rows) => {
  const clicks = rows.reduce((s, r) => s + r.clicks, 0);
  const impressions = rows.reduce((s, r) => s + r.impressions, 0);
  const posW = rows.reduce((s, r) => s + r.position * r.impressions, 0);
  return {
    clicks,
    impressions,
    ctr: impressions ? clicks / impressions : 0,
    position: impressions ? posW / impressions : 0,
  };
};
const T = totals(pages.rows);
const avgCtr = T.ctr;

const in4to10 = (r) => r.position >= 4 && r.position <= 10 && r.impressions >= MIN_IMP;
const pageOpportunities = pages.rows.filter(in4to10).sort((a, b) => b.impressions - a.impressions);
const queryOpportunities = queries
  ? queries.rows.filter(in4to10).sort((a, b) => b.impressions - a.impressions)
  : [];
const lowCtr = pages.rows
  .filter((r) => r.impressions >= MIN_IMP * 2 && r.ctr < Math.min(0.03, avgCtr * 0.7))
  .sort((a, b) => b.impressions - a.impressions);
const deepPages = pages.rows
  .filter((r) => r.position > 10 && r.impressions >= MIN_IMP)
  .sort((a, b) => b.impressions - a.impressions);
const brandQueries = queries
  ? queries.rows
      .filter((r) => /اليسر|elysr/i.test(r.key))
      .sort((a, b) => b.impressions - a.impressions)
  : [];
const topQueries = (queries ? queries.rows : []).slice(0, 10);

const pct = (v) => `${(v * 100).toFixed(1)}%`;
const tag = (key) => topicTagFor(key) || "—";

// ── اقتراح إجراء لكل فرصة (heuristic واضح) ──
function suggestAction(r, kind) {
  const isNewAsset = /glossary|checklist/.test(r.key);
  if (isNewAsset) return "وزّع (شارك) لجمع أول إشارات ظهور — asset جديد عليه فرص سريعة";
  if (r.ctr < avgCtr * 0.8)
    return "Rewrite title/meta description يطابق query الظاهرة — الـ CTR أقل من متوسط الموقع";
  if (r.position <= 5.5)
    return "اقرب فرصة للتوب-3: عزّز المحتوى الداخلي (روابط من الـ pillar + مقالات ذات صلة)";
  return "حسّن عمق المحتوى + internal links من صفحات العقدة المرتبطة";
}

// ── قائمة الأفعال (Top 5) ──
const actions = [];
for (const r of pageOpportunities.slice(0, 4)) {
  actions.push(
    `صفحة ${r.key} (موضع ${r.position.toFixed(1)}, ${r.impressions} ظهور): ${suggestAction(r, "pages")}`,
  );
}
const brandImp = brandQueries.reduce((s, r) => s + r.impressions, 0);
actions.push(
  brandImp > 0
    ? `Brand queries: ${brandImp} ظهور (CTR ${pct(brandQueries.reduce((s, r) => s + r.clicks, 0) / brandImp)}) — البراند بيتشاف؛ ثبّت أول نتيجة بالبراند (about + نفس اسم البراند في meta)`
    : "Brand queries لسه قليلة — ابدأ توزيع المحتوى (واتساب/فيسبوك) لجمع إشارات البراند",
);
if (lowCtr.length)
  actions.push(
    `Rewrite meta لـ ${lowCtr.length} صفحة عالية الظهور ضعيفة الـ CTR (أولهم: ${lowCtr[0].key})`,
  );
if (actions.length < 5)
  actions.push(
    "استمر: ارفع تقرير GSC أسبوعيًا لنفس الفترة (28 يوم) وتتبّع حركة الموضع لنفس الصفحات",
  );

// ── الإخراج ──
const line = (n = 62) => "─".repeat(n);
const out = [];
const P = (s = "") => out.push(s);

P("╔══════════════════════════════════════════════════════════╗");
P("   📊 تقرير GSC — فرص الظهور (Elysr Medical)");
P("╚══════════════════════════════════════════════════════════╝");
P();
if (pages.dates) P(`الفترة: ${pages.dates[0]} ← ${pages.dates[pages.dates.length - 1]}`);
else P("الفترة: كما تم اختيارها في GSC (المقترح: آخر 28 يوم)");
P(`أدنى ظهورات للفرص: ${MIN_IMP} (--min-imp لتغييره)`);
P(line());
P(
  `📈 الملخص: ${T.clicks.toLocaleString("en")} نقرات · ${T.impressions.toLocaleString("en")} ظهورات · CTR ${pct(T.ctr)} · موضع متوسط ${T.position.toFixed(2)}`,
);
P();

P(`🎯 فرص الصفحات — موضع 4–10 (${pageOpportunities.length}):`);
P(line());
pageOpportunities.slice(0, 12).forEach((r, i) => {
  P(`${String(i + 1).padStart(2)}. ${r.key}`);
  P(
    `   ${r.impressions} ظهور · موضع ${r.position.toFixed(1)} · CTR ${pct(r.ctr)} · عقدة: ${tag(r.key)}`,
  );
  P(`   → ${suggestAction(r, "pages")}`);
});
if (pageOpportunities.length > 12)
  P(`   ... و${pageOpportunities.length - 12} صفحات تانية (في التقرير الكامل)`);
P();

if (queries) {
  P(`🎯 فرص الـ Queries — موضع 4–10 (${queryOpportunities.length}):`);
  P(line());
  queryOpportunities.slice(0, 10).forEach((r, i) => {
    P(`${String(i + 1).padStart(2)}. «${r.key}»`);
    P(`   ${r.impressions} ظهور · موضع ${r.position.toFixed(1)} · CTR ${pct(r.ctr)}`);
  });
  P();
  P(`🏷️ Brand queries (${brandQueries.length}):`);
  if (brandQueries.length) {
    brandQueries.forEach((r) =>
      P(
        `   «${r.key}» — ${r.impressions} ظهور · CTR ${pct(r.ctr)} · موضع ${r.position.toFixed(1)}`,
      ),
    );
  } else P("   (مفيش queries براند بعد — طبيعي لنطاق جديد)");
  P();
}

if (lowCtr.length) {
  P(`⚠️ ظهورات عالية + CTR ضعيف (${lowCtr.length}) — title/meta محتاجة Rewrite:`);
  lowCtr.slice(0, 6).forEach((r) => P(`   ${r.key} — ${r.impressions} ظهور · CTR ${pct(r.ctr)}`));
  P();
}
if (deepPages.length) {
  P(`🔭 صفحات بعيدة (موضع > 10) بمظهرات كافية — للمتابعة (${deepPages.length}):`);
  deepPages
    .slice(0, 5)
    .forEach((r) => P(`   ${r.key} — موضع ${r.position.toFixed(1)} · ${r.impressions} ظهور`));
  P();
}

P("✅ أفعال مقترحة (Top 5):");
actions.forEach((a, i) => P(`   ${i + 1}. ${a}`));
P();

// ── Markdown report ──
const md = [];
const M = (s = "") => md.push(s);
M("# 📊 تقرير GSC — فرص الظهور (Elysr Medical)");
M();
if (pages.dates) M(`**الفترة:** ${pages.dates[0]} ← ${pages.dates[pages.dates.length - 1]}`);
M(
  `**الملخص:** ${T.clicks.toLocaleString("en")} نقرات · ${T.impressions.toLocaleString("en")} ظهورات · CTR ${pct(T.ctr)} · موضع متوسط ${T.position.toFixed(2)}`,
);
M();
M("## 🎯 فرص الصفحات (موضع 4–10)");
M();
M("| الصفحة | ظهور | موضع | CTR | عقدة الموضوع | إجراء مقترح |");
M("|---|---|---|---|---|---|");
pageOpportunities.forEach((r) =>
  M(
    `| \`${r.key}\` | ${r.impressions} | ${r.position.toFixed(1)} | ${pct(r.ctr)} | ${tag(r.key)} | ${suggestAction(r, "pages")} |`,
  ),
);
M();
if (queries) {
  M("## 🎯 فرص الـ Queries (موضع 4–10)");
  M();
  M("| الـ Query | ظهور | موضع | CTR |");
  M("|---|---|---|---|");
  queryOpportunities.forEach((r) =>
    M(`| «${r.key}» | ${r.impressions} | ${r.position.toFixed(1)} | ${pct(r.ctr)} |`),
  );
  M();
  if (brandQueries.length) {
    M("## 🏷️ Brand queries");
    M();
    M("| الـ Query | ظهور | CTR | موضع |");
    M("|---|---|---|---|");
    brandQueries.forEach((r) =>
      M(`| «${r.key}» | ${r.impressions} | ${pct(r.ctr)} | ${r.position.toFixed(1)} |`),
    );
    M();
  }
}
if (lowCtr.length) {
  M("## ⚠️ ظهورات عالية + CTR ضعيف");
  M();
  lowCtr.forEach((r) => M(`- \`${r.key}\` — ${r.impressions} ظهور · CTR ${pct(r.ctr)}`));
  M();
}
M("## ✅ أفعال مقترحة");
M();
actions.forEach((a, i) => M(`${i + 1}. ${a}`));
M();
M("---");
M("_توليد تلقائي: `node scripts/gsc-report.mjs` — بيانات GSC فيها تأخير ~يومين._");

const stamp = new Date().toISOString().slice(0, 10);
const mdFile = resolve(GSC_DIR, `report-${stamp}.md`);
mkdirSync(GSC_DIR, { recursive: true });
writeFileSync(mdFile, md.join("\n"), "utf-8");

console.log(out.join("\n"));
console.log(`💾 التقرير الكامل (Markdown): ${mdFile}`);
