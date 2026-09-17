/**
 * (2026-09-17) Topic Authority model — determinism, membership, pillars.
 */
import { describe, it, expect } from "vitest";
import {
  TOPICS,
  pillarPath,
  topicForArticle,
  topicForGuide,
  topicForProduct,
  topicsForPage,
  isPillarPath,
} from "@/data/topics";

describe("topics model", () => {
  it("has 7 topics, each with a distinct pillar", () => {
    expect(TOPICS).toHaveLength(7);
    const paths = TOPICS.map(pillarPath);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("every pillar resolves to an existing kind/slug pair", () => {
    for (const t of TOPICS) {
      expect(["article", "guide"]).toContain(t.pillarKind);
      expect(t.pillarSlug.length).toBeGreaterThan(0);
      const path = pillarPath(t);
      expect(path.startsWith("/education/") || path.startsWith("/products/guides/")).toBe(true);
      // الـ pillar داخل membership الموضوع نفسه
      if (t.pillarKind === "article") {
        expect(t.articleSlugs).toContain(t.pillarSlug);
      } else {
        expect(t.guideSlugs).toContain(t.pillarSlug);
      }
    }
  });

  it("isPillarPath matches exactly the 7 pillar paths", () => {
    for (const t of TOPICS) expect(isPillarPath(pillarPath(t))).toBe(true);
    expect(isPillarPath("/education")).toBe(false);
    expect(isPillarPath("/products/men")).toBe(false);
  });

  it("assigns each page to exactly one primary topic (spot checks)", () => {
    // مقال
    const ed = topicForArticle("erectile-dysfunction");
    expect(ed?.id).toBe("erectile-dysfunction");
    // دليل
    expect(topicForGuide("manual-vs-electric-vacuum-pump")?.id).toBe("devices");
    // منتج
    expect(topicForProduct("d-01")?.id).toBe("devices");
    expect(topicForProduct("m-44")?.id).toBe("premature-ejaculation");
    // صفحات الخدمة → مفيش موضوع
    expect(topicForGuide("how-to-order-from-elysr")).toBeUndefined();
    expect(topicForArticle("no-such-article")).toBeUndefined();
    expect(topicForProduct("no-such-product")).toBeUndefined();
  });

  it("no article/guide/product is double-assigned (whole-corpus check)", () => {
    const counts = (list: string[]) => {
      const seen = new Map<string, number>();
      for (const s of list) seen.set(s, (seen.get(s) || 0) + 1);
      return [...seen.entries()].filter(([, n]) => n > 1);
    };
    expect(counts(TOPICS.flatMap((t) => t.articleSlugs))).toEqual([]);
    expect(counts(TOPICS.flatMap((t) => t.guideSlugs))).toEqual([]);
    expect(counts(TOPICS.flatMap((t) => t.productIds))).toEqual([]);
  });

  it("topicsForPage: own topic first, then deterministic others, capped", () => {
    const devices = TOPICS.find((t) => t.id === "devices")!;
    const out = topicsForPage(devices, 4);
    expect(out).toHaveLength(4);
    expect(out[0].id).toBe("devices");
    expect(out).not.toContain(undefined);
    // بدون موضوع أساسي: ثابت الترتيب (TOPICS order)
    const outNone = topicsForPage(undefined, 3);
    expect(outNone.map((t) => t.id)).toEqual(TOPICS.slice(0, 3).map((t) => t.id));
  });
});
