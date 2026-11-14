/**
 * 📦 ميزانية جافاسكربت المسار الحرج (2026-11-14 · H5)
 *
 * يقيس مجموع أحجام **الحِزم التي تُحمَّل فعليًا قبل أول رسم** لصفحة معينة
 * (كل ما يعلنه index.html كـ modulepreload/entry)، مضغوطًا gzip — ويفشل إذا
 * تجاوز السقف. السبب: عيب H5 («89 منتجًا بوصفها الكامل في كل صفحة») لم يلاحظه
 * أي اختبار قائم؛ حجم الحزمة يتدهور ببطء وبصمت، والقياس اليدوي لا يتكرر.
 *
 * الاستخدام: node scripts/check-js-budget.mjs [--page index.html] [--budget 160]
 * يخرج بالرمز 1 عند التجاوز، فيصلح لـ CI مباشرة.
 */
import { readFileSync, existsSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = resolve(ROOT, "dist");

const args = process.argv.slice(2);
const argValue = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};

const PAGE = argValue("--page", "index.html");
// السقف 160KB: القياس بعد إصلاح H5 = 149.1KB، وقبله كان 196KB (الفرق هو
// حزمة الكتالوج الكامل 46.9KB). أي عودة للكتالوج إلى المسار الحرج تُفشل هذا
// الفحص فورًا، مع هامش بسيط للنمو الطبيعي.
const BUDGET_KB = Number(argValue("--budget", "160"));

const pagePath = resolve(DIST, PAGE);
if (!existsSync(pagePath)) {
  console.error(`✖ check-js-budget: ${PAGE} غير موجود — نفّذ npm run build أولًا.`);
  process.exit(1);
}

const html = readFileSync(pagePath, "utf-8");
// كل الأصول JS المعلنة للتحميل المسبق أو كسكربت نقطة الدخول.
const assets = new Set();
for (const m of html.matchAll(/rel="modulepreload"[^>]*href="([^"]+\.js)"/g)) assets.add(m[1]);
for (const m of html.matchAll(/<script[^>]*src="([^"]+\.js)"/g)) assets.add(m[1]);

let total = 0;
const rows = [];
for (const href of assets) {
  const file = resolve(DIST, href.replace(/^\//, ""));
  if (!existsSync(file)) continue;
  const gz = gzipSync(readFileSync(file)).length;
  total += gz;
  rows.push({ file: href.split("/").pop(), kb: gz / 1024 });
}

rows.sort((a, b) => b.kb - a.kb);
const totalKb = total / 1024;

console.log(`📦 ${PAGE} — جافاسكربت المسار الحرج (${rows.length} ملفًا):`);
for (const r of rows) console.log(`   ${r.kb.toFixed(1).padStart(6)} KB  ${r.file}`);
console.log(`   ${"—".repeat(28)}`);
console.log(`   ${totalKb.toFixed(1).padStart(6)} KB  الإجمالي · السقف ${BUDGET_KB} KB`);

if (totalKb > BUDGET_KB) {
  console.error(
    `\n✖ تجاوزت ميزانية المسار الحرج: ${totalKb.toFixed(1)} KB > ${BUDGET_KB} KB.\n` +
      "   الأغلب أن بيانات أو مكتبة ثقيلة عادت إلى الحزمة الأولى — راجع manualChunks\n" +
      "   واستيرادات الصفحة (راجع سجل H5 في تقرير الفحص).",
  );
  process.exit(1);
}

console.log("✓ داخل الميزانية.");
