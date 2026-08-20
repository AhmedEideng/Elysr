#!/usr/bin/env node
/**
 * ============================================================
 * 🏷️ سكربت إصدار نسخة (Release) رسمي
 * ============================================================
 * الاستخدام:
 *   node scripts/release.mjs patch   → 2.0.0 → 2.0.1
 *   node scripts/release.mjs minor   → 2.0.0 → 2.1.0
 *   node scripts/release.mjs major   → 2.0.0 → 3.0.0
 *   node scripts/release.mjs 2.3.1   → يحدّد إصداراً محدداً
 *   node scripts/release.mjs         → (بدون وسيط) يرفع patch تلقائياً
 *
 * ماذا يفعل؟
 *   1. يقرأ version الحالي من package.json
 *   2. يرفع الإصدار حسب الوسيط (patch/minor/major أو قيمة صريحة)
 *   3. يحدّث package.json
 *   4. يعمل git add + commit برسالة "release: vX.Y.Z"
 *   5. يعمل git tag "vX.Y.Z"
 *
 * ملاحظة: لا يقوم بالـ push — افعل `git push && git push --tags`
 * بنفسك بعد مراجعة التغيير.
 * ============================================================
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const PKG_PATH = new URL("../package.json", import.meta.url);
const pkg = JSON.parse(readFileSync(PKG_PATH, "utf-8"));
const current = pkg.version || "0.0.0";

const arg = process.argv[2];

function bump(version, kind) {
  const [maj, min, pat] = version.split(".").map((n) => parseInt(n, 10) || 0);
  switch (kind) {
    case "major":
      return `${maj + 1}.0.0`;
    case "minor":
      return `${maj}.${min + 1}.0`;
    case "patch":
    default:
      return `${maj}.${min}.${pat + 1}`;
  }
}

let next;
if (!arg) {
  next = bump(current, "patch");
} else if (/^\d+\.\d+\.\d+$/.test(arg)) {
  next = arg;
} else if (["patch", "minor", "major"].includes(arg)) {
  next = bump(current, arg);
} else {
  console.error(`❌ وسيط غير صالح: "${arg}".\n   استخدم: patch | minor | major | X.Y.Z`);
  process.exit(1);
}

console.log(`🏷️  رفع الإصدار: ${current} → ${next}`);
pkg.version = next;
writeFileSync(PKG_PATH, JSON.stringify(pkg, null, 2) + "\n");

// ── 🔄 رفع رقم إصدار الكاش تلقائياً (لكسر كاش الصور/الأصول في المتصفحات) ──
// نزيّد CACHE_VERSION في الملفات الثلاثة التي تعرّفه حتى تظهر أي صور معدّلة
// فوراً بعد كل إصدار، بدون أي تدخل يدوي.
function bumpCacheVersion() {
  const files = [
    { path: "../src/lib/cache.ts", re: /CACHE_VERSION = "\d+"/ },
    { path: "../scripts/prerender-seo.mjs", re: /CACHE_VERSION = "\d+"/ },
    { path: "../scripts/generate-sitemap.mjs", re: /CACHE_VERSION = "\d+"/ },
  ];
  for (const { path, re } of files) {
    const abs = new URL(path, import.meta.url);
    const content = readFileSync(abs, "utf-8");
    const match = content.match(re);
    if (!match) {
      console.warn(`⚠️  لم أجد CACHE_VERSION في ${path}`);
      continue;
    }
    const currentV = parseInt(match[0].match(/\d+/)[0], 10) || 0;
    const newV = currentV + 1;
    writeFileSync(abs, content.replace(re, `CACHE_VERSION = "${newV}"`), "utf-8");
    console.log(`🗂️  رفع كاش ${path} → ${newV}`);
  }
}
bumpCacheVersion();

try {
  execSync(
    "git add package.json src/lib/cache.ts scripts/prerender-seo.mjs scripts/generate-sitemap.mjs",
    { stdio: "inherit" },
  );
  execSync(`git commit -m "release: v${next}"`, { stdio: "inherit" });
  execSync(`git tag "v${next}"`, { stdio: "inherit" });
  console.log(`✅ تم إنشاء tag: v${next}`);
  console.log(`\n📌 الخطوات التالية (يدوياً):`);
  console.log(`   git push && git push --tags`);
} catch (err) {
  console.error("\n⚠️  فشل git commit/tag:", err.message);
  console.log("   (package.json حُدّث لكن git لم يُنفَّذ — راجِع الحالة)");
}
