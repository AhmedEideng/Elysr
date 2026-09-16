/**
 * (2026-09-16) Share loop — WhatsApp share messages.
 * The messages are the growth surface: they must be natural (not
 * promotional), URL-encoded, and always end with a clean absolute
 * link (shareable, no query params).
 */
import { describe, it, expect } from "vitest";
import {
  waShareUrl,
  absoluteUrl,
  shareProductText,
  shareArticleText,
  shareGuideText,
} from "@/lib/share";

describe("waShareUrl", () => {
  it("uses the no-recipient wa.me share API with encoded text", () => {
    const url = waShareUrl("مرحباً بالعالم");
    expect(url).toBe(`https://wa.me/?text=${encodeURIComponent("مرحباً بالعالم")}`);
  });

  it("encodes newlines and special chars", () => {
    const url = waShareUrl("سطر 1\nhttps://x.com/a?b=1&c=2 «نص»");
    expect(url).toContain("%0A"); // newline encoded
    expect(url).not.toContain("\n");
  });
});

describe("absoluteUrl", () => {
  it("prefixes the site origin to a path", () => {
    expect(absoluteUrl("/products/x")).toBe("https://elysrmedical.store/products/x");
  });

  it("keeps an already-absolute URL untouched", () => {
    expect(absoluteUrl("https://elysrmedical.store/a")).toBe("https://elysrmedical.store/a");
  });
});

describe("shareProductText", () => {
  it("includes name, price and ends with a clean absolute link", () => {
    const text = shareProductText("جل كريفا 50 جم", 300, "/products/kreva-gel-for-men");
    expect(text).toContain("جل كريفا 50 جم");
    expect(text).toContain("300 ج.م");
    const lines = text.split("\n");
    expect(lines[lines.length - 1]).toBe("https://elysrmedical.store/products/kreva-gel-for-men");
  });
});

describe("shareArticleText / shareGuideText", () => {
  it("article: title + clean link, no price/sales language", () => {
    const text = shareArticleText(
      "ضعف الانتصاب: الأسباب والحلول",
      "/education/erectile-dysfunction",
    );
    expect(text).toContain("ضعف الانتصاب: الأسباب والحلول");
    expect(text).not.toContain("ج.م");
    const lines = text.split("\n");
    expect(lines[lines.length - 1]).toBe(
      "https://elysrmedical.store/education/erectile-dysfunction",
    );
  });

  it("guide: title + clean link", () => {
    const text = shareGuideText(
      "دليل منتجات التأخير",
      "/products/guides/best-delay-products-egypt",
    );
    expect(text).toContain("دليل منتجات التأخير");
    const lines = text.split("\n");
    expect(lines[lines.length - 1]).toBe(
      "https://elysrmedical.store/products/guides/best-delay-products-egypt",
    );
  });
});
