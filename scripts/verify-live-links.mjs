#!/usr/bin/env node
/**
 * verify-live-links.mjs — فحص حي شامل لسلامة الروابط على الإنتاج.
 *
 * لماذا يوجد هذا السكربت؟
 *   audit:site يفحص الروابط الداخلية داخل الصفحات المبنية فقط. الروابط
 *   التاريخية (slugs قديمة محفوظة في فهرس Google من نسخ أقدم للموقع) لا
 *   تظهر في أي صفحة حالية، فلا تراها أي بوابة محلية — حالة
 *   /products/emla-7-lidocaine-cream (7,676 ظهوراً في GSC على 404) أثبتت
 *   هذه الفجوة. هذا السكربت يفحص من الخارج:
 *
 *   1) كل URL في public/sitemap.xml ⇒ يجب أن يعيد 200 على الإنتاج.
 *   2) كل مصدر في vercel.json redirects ⇒ يجب أن يعيد 301/308 مع Location
 *      مطابق للوجهة المضبوطة (بلا انحراف).
 *   3) كل وجهة حرفية ⇒ يجب أن تعيد 200 (لا وجهات ميتة).
 *   4) القواعد ذات المعاملات (:slug) ⇒ تُختبر بعينات حقيقية لكل مسار.
 *
 * الاستخدام:
 *   npm run verify:live-links
 *   LIVE_BASE=https://staging.example.com npm run verify:live-links
 *
 * رمز الخروج: 0 = كل شيء سليم، 1 = وجود أي فشل (صالح كبوابة نشر).
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = (process.env.LIVE_BASE || "https://elysrmedical.store").replace(/\/$/, "");
const CONCURRENCY = 10;
const TIMEOUT_MS = 20_000;

/* عينات اختبار قواعد :slug — تُحدَّث إذا تغيّرت المسارات */
const PARAM_SAMPLES = {
  "/products/:slug": "kreva-gel-for-men",
  "/education/:slug": "royal-honey-benefits",
};
const SAMPLE_BY_PREFIX = [
  ["/products/", "kreva-gel-for-men"],
  ["/education/", "royal-honey-benefits"],
];

function sampleFor(destination) {
  if (PARAM_SAMPLES[destination]) return PARAM_SAMPLES[destination];
  for (const [prefix, sample] of SAMPLE_BY_PREFIX) {
    if (destination.startsWith(prefix)) return sample;
  }
  return "men";
}

function substitute(pattern, sample) {
  return pattern.replace(/:slug/g, sample);
}

async function probe(path, redirect = "manual") {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(BASE + path, { redirect, signal: controller.signal });
    return { status: res.status, location: res.headers.get("location") || "" };
  } catch (err) {
    return { status: 0, location: "", error: String(err?.message || err) };
  } finally {
    clearTimeout(timer);
  }
}

async function runQueue(items, worker) {
  const results = [];
  let index = 0;
  async function lane() {
    while (index < items.length) {
      const i = index++;
      results[i] = await worker(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, lane));
  return results;
}

const failures = [];
let checks = 0;

/* ── 1) sitemap URLs ⇒ 200 ─────────────────────────────────────────── */
const sitemapXml = readFileSync(resolve(ROOT, "public/sitemap.xml"), "utf-8");
const sitemapPaths = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)]
  .map((m) => m[1].replace(BASE, "").replace(/^https?:\/\/[^/]+/, ""))
  .filter(Boolean);

const sitemapResults = await runQueue(sitemapPaths, async (path) => {
  const r = await probe(path);
  checks++;
  if (r.status !== 200) failures.push(`[sitemap] ${path} ⇒ ${r.status || "ERR"} ${r.error || ""}`);
  return r;
});
console.log(`✓ sitemap: ${sitemapResults.length} URLs probed`);

/* ── 2–4) redirects: sources, destinations, parameterized rules ─────── */
const vercel = JSON.parse(readFileSync(resolve(ROOT, "vercel.json"), "utf-8"));
const redirects = vercel.redirects ?? [];
const literalDests = new Set();
const paramRules = [];

for (const rule of redirects) {
  const srcIsParam = rule.source.includes(":");
  const destIsParam = rule.destination.includes(":");
  if (srcIsParam || destIsParam) {
    paramRules.push(rule);
  } else {
    literalDests.add(rule.destination);
  }
}

const redirectResults = await runQueue(redirects, async (rule) => {
  const destIsParam = rule.destination.includes(":");
  const sample = destIsParam ? sampleFor(rule.destination) : null;
  const probeSrc = sample ? substitute(rule.source, sample) : rule.source;
  const expected = BASE + (sample ? substitute(rule.destination, sample) : rule.destination);
  const r = await probe(probeSrc);
  checks++;
  if (r.status !== 301 && r.status !== 308) {
    failures.push(`[redirect] ${probeSrc} ⇒ ${r.status || "ERR"} (توقع 301/308) ${r.error || ""}`);
    return r;
  }
  // Vercel قد يعيد Location نسبياً أو مطلقاً — نقبل الصيغتين بعد التوحيد
  const absolute = r.location.startsWith("http") ? r.location : BASE + r.location;
  if (absolute !== expected) {
    failures.push(`[redirect] ${probeSrc} ⇒ Location=${r.location} (توقع ${expected})`);
  }
  return r;
});
console.log(`✓ redirects: ${redirectResults.length} sources probed (منها ${paramRules.length} قواعد :slug بعينات حية)`);

const destResults = await runQueue([...literalDests], async (path) => {
  const r = await probe(path);
  checks++;
  if (r.status !== 200) failures.push(`[destination] ${path} ⇒ ${r.status || "ERR"} (وجهة تحويل ميتة) ${r.error || ""}`);
  return r;
});
console.log(`✓ destinations: ${destResults.length} literal destinations probed`);

/* ── النتيجة ────────────────────────────────────────────────────────── */
console.log(`\nإجمالي الفحوصات الحية: ${checks} على ${BASE}`);
if (failures.length) {
  console.error(`\n✗ ${failures.length} فشل:`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
console.log("✓ لا روابط ميتة: كل صفحات الـ sitemap حية 200، وكل التحويلات 301/308 بوجهات صحيحة وحية.");
