import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  HTML_MAX_AGE,
  REVALIDATED_FILES,
  STATIC_MAX_AGE,
  cachePolicyForFile,
} from "../../server/cache-policy.js";

/**
 * 🛡️ حارس انحدار (2026-11-14)
 *
 * العيب الأصلي: `express.static` في server/index.js كان يمنح **كل** ملف غير
 * HTML — بما فيه sitemap.xml و robots.txt و catalog-feed.xml و sw.js —
 * ترويسة `max-age=31536000, immutable`. النتيجة على Docker/VPS: تعديلات
 * الموقع لا تصل لجوجل لمدة سنة، بينما vercel.json يضبط لها 3600/86400.
 *
 * هذه الاختبارات تُثبّت السلوك الصحيح من الجهتين:
 *   1) السياسة نفسها (fingerprint vs path-based).
 *   2) التكافؤ مع vercel.json (لا انزلاق بين منصتَي النشر).
 */

const ROOT = resolve(__dirname, "../..");

describe("server cache policy (self-hosted parity)", () => {
  it("keeps fingerprinted assets immutable but revalidates path-named files", () => {
    // أصول Vite تحمل بصمة في اسمها → immutable صحيح.
    expect(cachePolicyForFile(`${ROOT}/dist/assets/index-DACm5ny3.js`)).toBe(STATIC_MAX_AGE);
    expect(cachePolicyForFile(`${ROOT}/dist/images/kreva-gel.webp`)).toBe(STATIC_MAX_AGE);

    // ملفات بنفس الاسم ومحتوى متغير → كاش قصير إلزامي.
    expect(cachePolicyForFile(`${ROOT}/dist/sitemap.xml`)).toBe("public, max-age=3600");
    expect(cachePolicyForFile(`${ROOT}/dist/robots.txt`)).toBe("public, max-age=86400");
    expect(cachePolicyForFile(`${ROOT}/dist/catalog-feed.xml`)).toBe("public, max-age=3600");
    expect(cachePolicyForFile(`${ROOT}/dist/site.webmanifest`)).toBe("public, max-age=86400");

    // kill-switch الـ PWA يجب أن يُقرأ من الشبكة دائمًا.
    expect(cachePolicyForFile(`${ROOT}/dist/sw.js`)).toBe("no-cache");

    // صفحات HTML المسبقة: كاش قصير + revalidation.
    expect(cachePolicyForFile(`${ROOT}/dist/products/men.html`)).toBe(HTML_MAX_AGE);
  });

  it("never marks a revalidated file as immutable", () => {
    for (const [name, policy] of Object.entries(REVALIDATED_FILES)) {
      expect(policy, `${name} must not be immutable`).not.toContain("immutable");
      expect(cachePolicyForFile(`${ROOT}/dist/${name}`)).toBe(policy);
    }
  });

  it("matches the Cache-Control values declared in vercel.json", () => {
    interface HeaderRule {
      source: string;
      headers: Array<{ key: string; value: string }>;
    }
    const vercel = JSON.parse(readFileSync(resolve(ROOT, "vercel.json"), "utf-8")) as {
      headers: HeaderRule[];
    };
    const headerRules = vercel.headers;
    const cacheFor = (source: string) =>
      headerRules
        .find((rule) => rule.source === source)
        ?.headers.find((header) => header.key.toLowerCase() === "cache-control")?.value;

    expect(cacheFor("/sitemap.xml")).toBe(REVALIDATED_FILES["sitemap.xml"]);
    expect(cacheFor("/robots.txt")).toBe(REVALIDATED_FILES["robots.txt"]);
    expect(cacheFor("/sitemap-images.xml")).toBe(REVALIDATED_FILES["sitemap-images.xml"]);
    expect(cacheFor("/sitemap-index.xml")).toBe(REVALIDATED_FILES["sitemap-index.xml"]);
  });

  it("documents every dist file the policy revalidates", () => {
    // حماية من إضافة ملف جديد باسم ثابت ونسيانه هنا.
    const expected = [
      "sitemap.xml",
      "sitemap-images.xml",
      "sitemap-index.xml",
      "robots.txt",
      "catalog-feed.xml",
      "catalog-feed.csv",
      "catalog-feed.txt",
      "site.webmanifest",
      "sw.js",
    ];
    expect(Object.keys(REVALIDATED_FILES).sort()).toEqual(expected.sort());
  });
});
