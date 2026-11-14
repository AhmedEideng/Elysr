import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * 🛡️ حارس انحدار (2026-11-14 · M2) — مخرجات البناء لا تُلتزم في git
 *
 * العيب الأصلي: `scripts/generate-sitemap.mjs` يكتب `public/sitemap.xml`
 * (وsitemap-images/index وrobots.txt وملفات السوق و113 ملف JSON لصفحات
 * الهبوط) في كل بناء — وكانت كلها **متتبَّعة في git**. النتيجة: الشجرة تتسخ
 * بعد كل بناء، وتعارضات merge متكررة، ونسخة «حقيقية» في المستودع بتواريخ
 * lastmod قديمة لأي أداة تقرأ الملف من git. وأخطر ما في الأمر: البناء الذي
 * يولّدها لم يكن أحد يضمن ترتيبه، فكان الملف الملتزم يُقرأ كأنه مصدر حقيقة.
 *
 * الإصلاح: `.gitignore` يغطيها، و`prebuild`/`predev` يولّدانها دائمًا.
 * هذا الاختبار يفشل لو عاد أي منها إلى التتبّع أو خرج من التجاهل.
 */

const ROOT = resolve(__dirname, "../..");
const gitignore = readFileSync(resolve(ROOT, ".gitignore"), "utf-8");
const generator = readFileSync(resolve(ROOT, "scripts/generate-sitemap.mjs"), "utf-8");

/** المخرجات المولَّدة التي يجب ألا تُلتزم. */
const GENERATED = [
  "public/sitemap.xml",
  "public/sitemap-images.xml",
  "public/sitemap-index.xml",
  "public/robots.txt",
  "public/catalog-feed.xml",
  "public/catalog-feed.csv",
  "public/catalog-feed.txt",
  "public/landing-pages/*.json",
];

describe("build outputs stay out of git", () => {
  it.each(GENERATED)("%s is git-ignored", (pattern) => {
    expect(gitignore).toContain(pattern);
  });

  it("the generator still writes every ignored artifact", () => {
    // لو توقف المولِّد عن كتابة أحدها وصار متجاهلًا، سيختفي من النشر بصمت.
    for (const file of ["sitemap.xml", "sitemap-images.xml", "sitemap-index.xml", "robots.txt"]) {
      expect(generator).toContain(`"${file}"`);
    }
    expect(generator).toContain('"catalog-feed.xml"');
    expect(generator).toContain('"landing-pages"');
  });

  it("both build and dev regenerate them before they are needed", () => {
    const pkg = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf-8")) as {
      scripts: Record<string, string>;
    };
    expect(pkg.scripts.prebuild).toContain("generate-sitemap.mjs");
    // بدون predev، استنساخ جديد ثم `npm run dev` سيجد صفحات الهبوط بلا JSON.
    expect(pkg.scripts.predev).toContain("generate-sitemap.mjs");
  });
});
