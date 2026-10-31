import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { restoredLandingPages } from "../data/restored-landing-pages";
import { restoredNutritionArticle } from "../data/restored-nutrition-article";
import { seoLandingPages } from "../data/landing-pages";
import { products } from "../data/products";
import { topicForGuide, topicForArticle } from "../data/topics";
import vercel from "../../vercel.json";

const redirects = new Map(vercel.redirects.map((rule) => [rule.source, rule.destination]));
const wordCount = (text: string) => text.trim().split(/\s+/u).length;

describe("restored GSC editorial URLs", () => {
  it.each(restoredLandingPages)(
    "$slug has substantial, sourced, indexable content at its own URL",
    (page) => {
      const path = `/products/guides/${page.slug}`;
      expect(redirects.has(path)).toBe(false);
      expect(seoLandingPages.filter((item) => item.slug === page.slug)).toHaveLength(1);
      expect(page.noindex).not.toBe(true);
      expect(topicForGuide(page.slug)).toBeDefined();
      expect(page.sources?.length).toBeGreaterThanOrEqual(1);
      const generated = JSON.parse(readFileSync(`public/landing-pages/${page.slug}.json`, "utf8"));
      expect(generated.sources).toEqual(page.sources);
      expect(generated.updatedAt).toBe(page.updatedAt);
      expect(page.updatedAt).toBe("2026-10-31");
      const text = [
        page.intro,
        ...page.sections.map((section) => section.body),
        ...page.faqs.map((faq) => faq.answer),
      ].join(" ");
      expect(wordCount(text)).toBeGreaterThanOrEqual(600);
      expect(page.sections).toHaveLength(7);
      expect(page.productIds).toEqual([]);
      for (const source of page.sources ?? []) expect(source.url).toMatch(/^https:\/\//u);
    },
  );

  it("does not reuse section paragraphs across restored guides or existing guides", () => {
    for (const page of restoredLandingPages) {
      const otherBodies = new Set(
        seoLandingPages
          .filter((other) => other.slug !== page.slug)
          .flatMap((other) => other.sections.map((section) => section.body)),
      );
      for (const section of page.sections) expect(otherBodies.has(section.body)).toBe(false);
    }
  });

  it("restores the nutrition article without pretending it has a human medical review", () => {
    expect(redirects.has(`/education/${restoredNutritionArticle.slug}`)).toBe(false);
    expect(topicForArticle(restoredNutritionArticle.slug)).toBeDefined();
    expect(wordCount(restoredNutritionArticle.content)).toBeGreaterThanOrEqual(850);
    expect(restoredNutritionArticle.autoReviewed).toBe(true);
    expect(restoredNutritionArticle.sources).toHaveLength(2);
  });

  it("does not invent sale records for the 14 legacy product URLs", () => {
    const legacySlugs = [
      "fox-170-sildenafil-tablets",
      "viagra-1-2-3-2-10-tablets",
      "royal-honey-malaysian",
      "lovezone-vaginal-gel",
      "60-minutes-delay-men-delay-gel",
      "hilti-wonderful-honey-for-men",
      "dooz-gel",
      "max-man-extra-power-premium-cream",
      "coffemix-caviar-original-for-men",
      "overlord-rhino-power-mmc",
      "turbo-fitness-gel-50gm",
      "brioge-gel",
      "hulk-gel-50gm",
      "tiger-power-tablets",
    ];
    for (const slug of legacySlugs) {
      expect(products.some((product) => product.slug === slug)).toBe(false);
      expect(redirects.has(`/products/${slug}`)).toBe(true);
    }
    expect(redirects.get("/products/lovezone-vaginal-gel")).toBe("/products/women");
    expect(redirects.get("/products/fox-170-sildenafil-tablets")).toBe(
      "/products/guides/sildenafil-products-guide",
    );
    expect(redirects.get("/products/viagra-1-2-3-2-10-tablets")).toBe(
      "/products/guides/viagra-products-egypt",
    );
    expect(redirects.get("/products/dooz-gel")).toBe("/products/dooz-14000-delay-cream");
  });
});
