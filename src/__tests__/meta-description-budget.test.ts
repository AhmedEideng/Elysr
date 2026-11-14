import { describe, expect, it } from "vitest";

import { articles } from "../data/articles";
import { seoLandingPages } from "../data/landing-pages";
import { makeMetaDescription } from "../lib/seo";

/**
 * 🛡️ حارس انحدار (2026-11-14) — ميزانية الوصف في مصدر البيانات
 *
 * العيب الأصلي: 6 أوصاف (3 مقالات + 3 صفحات هبوط) تتجاوز 155 حرفًا، فيقتطعها
 * البناء بـ «…» ويظهر الوصف ناقصًا في نتائج البحث. التحذير كان موجودًا لكنه
 * غير قابل للتنفيذ عمليًا: لا يذكر الصفحة، ويكرّر النص، ويبلّغ عن نصوص
 * مقتطعة مسبقًا. أُصلح البلاغ، وقُصِّرت النصوص في المصدر، وهذا الاختبار يمنع
 * رجوعها — بما في ذلك المقالات التي تُولَّد ميتاداتاتها وقت البناء.
 */

const MAX = 155;
const normalize = (text: string) => String(text).trim().replace(/\s+/g, " ");

describe("meta descriptions fit the 155-char budget at the source", () => {
  it("every article excerpt fits without truncation", () => {
    const over = articles
      .map((a) => ({ slug: a.slug, length: normalize(a.excerpt).length }))
      .filter((a) => a.length > MAX);
    expect(over, `truncated excerpts: ${over.map((a) => a.slug).join(", ")}`).toEqual([]);
  });

  it("every SEO landing page description fits without truncation", () => {
    const over = seoLandingPages
      .map((p) => ({ slug: p.slug, length: normalize(p.metaDescription || "").length }))
      .filter((p) => p.length > MAX);
    expect(over, `truncated landing pages: ${over.map((p) => p.slug).join(", ")}`).toEqual([]);
  });

  it("no produced description ends in an ellipsis", () => {
    // الاقتطاع يعني «…» في نهاية الوصف — وهو ما نريد ألا يظهر في الإنتاج.
    const truncated = [
      ...articles.map((a) => ({ id: `article:${a.slug}`, text: a.excerpt })),
      ...seoLandingPages.map((p) => ({
        id: `landing:${p.slug}`,
        text: p.metaDescription || "",
      })),
    ].filter((entry) => makeMetaDescription(entry.text, MAX).endsWith("…"));
    expect(truncated.map((t) => t.id)).toEqual([]);
  });
});
