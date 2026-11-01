import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { articles } from "../data/articles";
import { articlePublicationDates } from "../data/article-publication-dates";
import { seoLandingPages } from "../data/landing-pages";

const week = 7 * 24 * 60 * 60 * 1000;

describe("owner-confirmed publication history and editorial corrections", () => {
  it("preserves the confirmed 64-article display order with one week between publication dates", () => {
    const slugs = Object.keys(articlePublicationDates);
    const confirmed = articles.filter((article) => slugs.includes(article.slug));
    expect(slugs).toHaveLength(64);
    expect(confirmed.map((article) => article.slug)).toEqual(slugs);
    expect(confirmed[0].publishedAt).toBe("2026-09-30");
    expect(confirmed[0].slug).toBe("nutrition-mental-health-testosterone-balance");
    expect(confirmed.at(-1)?.publishedAt).toBe("2025-07-16");
    confirmed.forEach((article, index) => {
      expect(article.publishedAt).toBe(articlePublicationDates[article.slug]);
      if (index > 0)
        expect(Date.parse(confirmed[index - 1].publishedAt) - Date.parse(article.publishedAt)).toBe(
          week,
        );
    });
  });

  it("keeps the actual correction date separate from historical publication dates", () => {
    for (const article of articles.filter((item) => item.slug in articlePublicationDates)) {
      expect(article.updatedAt >= "2026-11-01").toBe(true);
      expect(article.updatedAt >= article.publishedAt).toBe(true);
    }
  });

  it("removes slug-hashed dates and the old blanket review date", () => {
    const source = readFileSync("src/data/articles.ts", "utf8");
    expect(source).not.toContain("deterministicPublishedAt");
    expect(source).not.toContain("h % 360");
    expect(source).not.toContain('publishedAt >= "2026-08-15"');
  });

  it("does not prescribe a blanket Hard On dose or promise no systemic effects", () => {
    const article = articles.find((item) => item.slug === "hard-on-sildenafil-dapoxetine-guide")!;
    const text = [article.content, ...(article.keyTakeaways ?? [])].join(" ");
    expect(text).not.toMatch(
      /قرص واحد قبل|قرص واحد كحد|طريقة الاستخدام العامة|من غير أثر جهازي|أبسط وأأمن/u,
    );
    expect(text).toContain("تقييم");
    expect(text).toContain("130 مجم");
    expect(text).toContain("60 مجم");
    expect(text).toContain("100 مجم");
    expect(article.autoReviewed).toBe(true);
    expect(
      article.sources.some(
        (source) => source.url === "https://www.medicines.org.uk/emc/product/7978/smpc",
      ),
    ).toBe(true);
  });

  it("removes blanket natural-product safety and automatic dose escalation from the delay guide", () => {
    const guide = seoLandingPages.find(
      (page) => page.slug === "complete-guide-premature-ejaculation-delay",
    )!;
    const text = [
      ...guide.sections.map((section) => section.body),
      ...guide.faqs.map((faq) => faq.answer),
      ...guide.links.map((link) => link.description),
    ].join(" ");
    expect(text).not.toMatch(
      /أمانه أعلى للمبتدئين|آمنة ومناسبة للدعم طويل الأمد|أمانها يسمح بالاستخدام المستمر|بتركيز أعلى|تركيبات مهدئة وآمنة|10-15 دقيقة/u,
    );
    expect(guide.updatedAt).toBe("2026-11-01");
    expect(guide.sources?.length).toBeGreaterThanOrEqual(2);
  });
});
