import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * (2026-11-15 · §32) قرار المالكة: «شركة متخصصة» بلا «أكبر» أو «أفضل».
 * ادعاءات التفوّق الشركاتية (أكبر/أفضل/الأولى/رقم واحد) لا يمكن إثباتها،
 * وتقع تحت وصف الإعلان المضلل في قانون حماية المستهلك المصري 181/2018،
 * ولا تكسب شيئًا في نتائج البحث.
 *
 * الحارس يقرأ قالب الـHTML الثابت (حيث كانت العبارة تعيش خارج أي ملف TS،
 * فتنجو من كل تعديل سابق) + المواضع التي تُنتج نص العلامة في التطبيق.
 */
const ROOT = resolve(__dirname, "../..");
const BRAND_SURFACES = [
  "index.html",
  "src/routes/index.tsx",
  "src/lib/seo.ts",
  "src/components/sections/Hero.tsx",
  "src/components/layout/Header.tsx",
];

const SUPERLATIVE_COMPANY =
  /(?:أكبر|أفضل|أقوى|الأولى|أول|رقم\s*(?:١|1))\s+شركة|شركة\s+(?:الأولى|الأكبر|الأفضل)/;

describe("company positioning claims", () => {
  it("never claims to be the biggest or the best company", () => {
    for (const relative of BRAND_SURFACES) {
      const source = readFileSync(resolve(ROOT, relative), "utf-8");
      const match = source.match(SUPERLATIVE_COMPANY);
      expect(match?.[0] ?? null, `ادعاء تفوّق في ${relative}`).toBeNull();
    }
  });

  it("keeps the approved, verifiable positioning on the home page", () => {
    const home = readFileSync(resolve(ROOT, "index.html"), "utf-8");
    expect(home).toContain("اليسر ميديكال شركة متخصصة في منتجات الصحة والسعادة الزوجية");
    const hero = readFileSync(resolve(ROOT, "src/components/sections/Hero.tsx"), "utf-8");
    expect(hero).toContain("شركة متخصصة في منتجات الصحة والسعادة الزوجية الأصلية في مصر");
  });
});
