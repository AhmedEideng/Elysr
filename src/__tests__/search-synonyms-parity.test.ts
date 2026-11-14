import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { products } from "../data/products";
import { productSearchScore, rankProductSearch } from "../lib/product-search";
import { SEARCH_SYNONYMS, expandSearchTerm, synonymsFor } from "../lib/search-terms";

/**
 * 🛡️ حارس انحدار (2026-11-14) — مصدر واحد لمرادفات البحث
 *
 * العيب الأصلي: قاموسان متوازيان — `search-terms.ts` (مدخلان، يستخدمه هيدر
 * البحث) و`product-search.ts` (خمسة مداخل، يستخدمه `/search` والأقسام).
 * النتيجة: ما يقترحه الهيدر لا يطابق ما تعرضه صفحة النتائج، وأي مرادف جديد
 * يجب إضافته مرتين — ونسيان إحداهما صامت تمامًا. وكان في منطق البحث استثناء
 * صلب `product.id === "m-60"` يخصّ منتجًا واحدًا.
 */

const SRC = resolve(__dirname, "..");

/** الملف بلا أسطر التعليقات — للتحقق من الكود نفسه لا من الشرح. */
const readCode = (path: string) =>
  readFileSync(path, "utf-8")
    .split("\n")
    .filter((line) => !line.trim().startsWith("//"))
    .join("\n");

describe("search synonyms live in exactly one place", () => {
  it("product-search has no inline synonym dictionary", () => {
    const src = readCode(resolve(SRC, "lib/product-search.ts"));
    expect(src).toContain('from "./search-terms"');
    // أي قاموس محلي سيظهر كخاصية لكلمة مفتاحية عربية داخل كائن — نمنع ذلك.
    expect(src).not.toMatch(/spray"\s*\]/);
    expect(src).not.toContain("چل: [");
  });

  it("product-search carries no hard-coded product exception", () => {
    // نستثني التعليقات: الشرح يذكر الاستثناء المحذوف بالاسم.
    const code = readCode(resolve(SRC, "lib/product-search.ts"));
    expect(code).not.toMatch(/product\.id\s*===/);
    expect(code).not.toContain('"m-60"');
  });

  it("keeps the historical five entries so results do not regress", () => {
    // المرادفات الخمسة التي كانت في product-search.ts، بلا زيادة ولا نقصان.
    expect(new Set(Object.keys(SEARCH_SYNONYMS))).toEqual(
      new Set(["نقط", "قطرات", "سبراي", "جيل", "چل"]),
    );
  });
});

describe("header suggestions and results page agree", () => {
  it("expanding a term includes every synonym the ranker accepts", () => {
    for (const term of Object.keys(SEARCH_SYNONYMS)) {
      const expanded = expandSearchTerm(term).slice(1);
      expect(expanded, `expandSearchTerm(${term})`).toEqual(synonymsFor(term));
    }
  });

  it("a query suggested as a synonym actually finds the same products", () => {
    // «سبراي» في الهيدر تُوسَّع إلى «بخاخ» — يجب أن تجد منتجات البخاخ فعلًا.
    expect(expandSearchTerm("سبراي")).toContain("بخاخ");
    const spray = products.find((p) => p.name.includes("بخاخ"))!;
    expect(productSearchScore(spray, "سبراي")).toBeGreaterThan(0);
  });

  it("empty and unknown terms stay neutral", () => {
    expect(expandSearchTerm("   ")).toEqual([]);
    expect(synonymsFor("غير-موجود")).toEqual([]);
    expect(expandSearchTerm("كريفا")).toEqual(["كريفا"]);
  });
});

describe("Kreva aliases survive without the removed exception", () => {
  const kreva = products.find((p) => p.id === "m-60")!;

  it.each(["جيل", "چل", "كريفا جيل", "كريفا چل"])("still matches %s", (query) => {
    expect(productSearchScore(kreva, query)).toBeGreaterThan(0);
  });

  it("is still the top hit for «كريفا جيل»", () => {
    expect(rankProductSearch(products, "كريفا جيل")[0]?.id).toBe("m-60");
  });
});
