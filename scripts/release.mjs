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

// ── 🔄 رفع رقم إصدار الكاش من المصدر المركزي الوحيد ──
function bumpCacheVersion() {
  const cachePath = new URL("../config/cache-version.json", import.meta.url);
  const cacheConfig = JSON.parse(readFileSync(cachePath, "utf-8"));
  const currentV = parseInt(cacheConfig.version, 10) || 0;
  cacheConfig.version = String(currentV + 1);
  writeFileSync(cachePath, JSON.stringify(cacheConfig, null, 2) + "\n", "utf-8");
  console.log(`🗂️  رفع إصدار الكاش المركزي → ${cacheConfig.version}`);
  return cacheConfig.version;
}
const newCacheVersion = bumpCacheVersion();

// ──  مزامنة آخر رقم مبعثر يدوياً: ga-loader.js?v=XX في index.html ──
// (باقي أرقام ?v= في الأصول ديناميكية من CACHE_VERSION وقت البناء — هذا هو
// الرقم الوحيد الثابت، فيُزامَن هنا حتى يتحرك كل الأرقام معاً في كل release)
function syncGaLoaderVersion(newVersion) {
  const indexPath = new URL("../index.html", import.meta.url);
  const html = readFileSync(indexPath, "utf-8");
  const updated = html.replace(/(\/scripts\/ga-loader\.js\?v=)\d+/, `$1${newVersion}`);
  if (updated !== html) {
    writeFileSync(indexPath, updated, "utf-8");
    console.log(`🔗 مزامنة ga-loader.js?v=${newVersion} في index.html`);
  } else {
    console.log("🔗 ga-loader.js ?v= بالفعل على الإصدار الحالي");
  }
}
syncGaLoaderVersion(newCacheVersion);

try {
  execSync("git add package.json config/cache-version.json index.html", { stdio: "inherit" });
  execSync(`git commit -m "release: v${next}"`, { stdio: "inherit" });
  execSync(`git tag "v${next}"`, { stdio: "inherit" });
  console.log(`✅ تم إنشاء tag: v${next}`);
  console.log(`\n📌 الخطوات التالية (يدوياً):`);
  console.log(`   git push && git push --tags`);
} catch (err) {
  console.error("\n⚠️  فشل git commit/tag:", err.message);
  console.log("   (package.json حُدّث لكن git لم يُنفَّذ — راجِع الحالة)");
}
