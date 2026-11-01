import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { products } from "../data/products";
import { assetUrl } from "../lib/cache";

const robots = readFileSync("public/robots.txt", "utf8");
const groups = robots.split(/(?=^User-agent:)/mu);
const groupFor = (agent: string) =>
  groups.find((group) => group.split(/\r?\n/u)[0] === `User-agent: ${agent}`);

describe("Google product and image crawlability", () => {
  it.each(["*", "Googlebot", "Googlebot-Image"])(
    "%s explicitly allows all paths, including versioned images",
    (agent) => {
      const group = groupFor(agent);
      expect(group).toBeDefined();
      expect(group).toMatch(/^Allow: \/\s*$/mu);
      expect(group).not.toMatch(/^Disallow:\s*\S/mu);
    },
  );

  it("keeps the generated robots file identical to its build source", () => {
    const script = readFileSync("scripts/generate-sitemap.mjs", "utf8");
    const template = script.match(/const robots = `([\s\S]*?)`;/u)?.[1];
    expect(template).toBeDefined();
    expect(template!.replaceAll("${SITE_URL}", "https://elysrmedical.store")).toBe(robots);
  });

  it("retains cache-versioned product images and checks their local files", () => {
    for (const product of products) {
      if (!product.image) throw new Error(`Missing product image: ${product.id}`);
      const url = assetUrl(product.image);
      expect(url).toMatch(/^\/images\/.+\?v=\d+$/u);
      expect(existsSync(`public${product.image.split("?")[0]}`)).toBe(true);
    }
  });

  it("allows the exact image URLs supplied in the Merchant feed without rewriting them", () => {
    const feed = readFileSync("public/catalog-feed.xml", "utf8");
    const images = [...feed.matchAll(/<g:image_link>(.*?)<\/g:image_link>/gu)].map((match) =>
      match[1].replaceAll("&amp;", "&"),
    );
    expect(images.length).toBeGreaterThan(0);
    for (const image of images) {
      const url = new URL(image);
      expect(url.origin).toBe("https://elysrmedical.store");
      expect(url.pathname).toMatch(/^\/images\//u);
      expect(url.searchParams.get("v")).toMatch(/^\d+$/u);
      expect(existsSync(`public${url.pathname}`)).toBe(true);
    }
    expect(groupFor("Googlebot-Image")).not.toMatch(/^Disallow:\s*\S/mu);
  });

  it("preserves unrelated bot exclusions and the sitemap index", () => {
    for (const agent of ["CCBot", "Bytespider"])
      expect(groupFor(agent)).toMatch(/^Disallow: \/\s*$/mu);
    expect(robots).toContain("Sitemap: https://elysrmedical.store/sitemap-index.xml");
  });
});
