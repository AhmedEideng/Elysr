import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * 🛡️ حارس انحدار (2026-11-14) — lastmod خارج git
 *
 * العيب الأصلي: `scripts/generate-sitemap.mjs` كان يستخرج `lastmod` من
 * `git log` فقط. داخل صورة Docker (بدون .git) كانت 218 من 282 مدخلًا تفقد
 * lastmod (64/282 فقط). الحل: أثر نصّي `config/content-dates.json` يُحدَّث
 * تلقائيًا عند كل تشغيل داخل git، ويُقرأ كبديل عند غياب .git.
 *
 * هذا الاختبار يحمي الأثر نفسه: لو حُذف أو تلف أو تُرك يشيخ مع ملفات
 * جديدة، نفشل هنا بدل أن نفقد lastmod بصمت في الإنتاج.
 */

const ROOT = resolve(__dirname, "../..");
const ARTIFACT = resolve(ROOT, "config/content-dates.json");
const DATE = /^\d{4}-\d{2}-\d{2}$/;

describe("config/content-dates.json (lastmod artifact)", () => {
  it("exists and is a non-empty map of file → date", () => {
    expect(existsSync(ARTIFACT)).toBe(true);
    const dates = JSON.parse(readFileSync(ARTIFACT, "utf-8")) as Record<string, string>;
    const entries = Object.entries(dates);
    expect(entries.length).toBeGreaterThan(0);
    for (const [file, date] of entries) {
      expect(DATE.test(date), `${file} has malformed date "${date}"`).toBe(true);
    }
  });

  it("points at files that still exist", () => {
    const dates = JSON.parse(readFileSync(ARTIFACT, "utf-8")) as Record<string, string>;
    const missing = Object.keys(dates).filter((file) => !existsSync(resolve(ROOT, file)));
    expect(missing, `stale entries: ${missing.join(", ")}`).toEqual([]);
  });

  it("contains no dates in the future", () => {
    const dates = JSON.parse(readFileSync(ARTIFACT, "utf-8")) as Record<string, string>;
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    const future = Object.entries(dates).filter(([, date]) => date > tomorrow);
    expect(future, `future-dated: ${future.map(([f]) => f).join(", ")}`).toEqual([]);
  });

  it("is wired into the sitemap generator as the fallback source", () => {
    const script = readFileSync(resolve(ROOT, "scripts/generate-sitemap.mjs"), "utf-8");
    expect(script).toContain("CONTENT_DATES_PATH");
    expect(script).toContain("persistContentDates");
  });
});
