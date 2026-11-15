import { describe, expect, it } from "vitest";
import { products } from "@/data/products";
import { seoLandingPages } from "@/data/landing-pages";
import { WHATSAPP_NUMBER } from "@/lib/whatsapp";

/**
 * (2026-11-15 · مراجعة نهائية) أسعار مكتوبة باليد داخل أدلة SEO كانت تتقادم
 * بصمت: «ريال هني 160» والمنتج 180، «فيتامكس 500» والمنتج 400، ومضخات بأرقام
 * قديمة — العميل يقرأ سعرًا في الدليل ثم يراه مختلفًا في السلة.
 *
 * الحارس لا يمنع ذكر السعر، لكنه يمنع رقمًا لا يوجد له أصل في مصدر واحد:
 * سعر منتج حالي، أو حد الشحن المجاني، أو رسم شحن محافظة.
 */
const FREE_SHIPPING_THRESHOLD = 2000;
const SHIPPING_FEES = new Set([50, 70, 90, 120]);
const CATALOG_PRICES = new Set(products.map((p) => p.price));

const NUM = "(?:\\d{1,3}(?:,\\d{3})+|\\d+)";
const CURRENCY = new RegExp(`${NUM}\\s*(?:ج\\.م|جنيه|جنية)`, "g");

function guideTexts(): { slug: string; text: string }[] {
  return seoLandingPages.map((page) => ({
    slug: page.slug,
    text: JSON.stringify(page),
  }));
}

describe("hand-written prices in SEO guides", () => {
  it("never quotes an amount that matches no catalog price, shipping fee or free-shipping threshold", () => {
    const offenders: string[] = [];
    for (const { slug, text } of guideTexts()) {
      for (const match of text.matchAll(CURRENCY)) {
        const amount = Number(match[0].replace(/[^\d]/g, "").replace(/,/g, ""));
        if (!Number.isFinite(amount)) continue;
        if (amount < 100) continue; // رسوم صغيرة/نسب تُذكر عرضًا (مثال: «50 جنيه» شحن)
        const allowed =
          CATALOG_PRICES.has(amount) ||
          amount === FREE_SHIPPING_THRESHOLD ||
          SHIPPING_FEES.has(amount);
        if (!allowed) offenders.push(`${slug}: ${match[0]}`);
      }
    }
    expect(offenders, `أسعار بلا أصل في الكتالوج:\n${offenders.join("\n")}`).toEqual([]);
  });

  it("keeps the pump guide on the current device prices", () => {
    const page = seoLandingPages.find((p) => p.slug === "manual-vs-electric-vacuum-pump");
    expect(page, "guide page missing").toBeTruthy();
    const text = JSON.stringify(page);
    // الأجهزة الأربعة التي يسردها الدليل بالاسم والسعر.
    for (const slug of [
      "manual-ved-pump",
      "manual-vacuum-pump-sawft",
      "konsa-electric-pump",
      "digital-vacuum-pump",
    ]) {
      const product = products.find((p) => p.slug === slug);
      expect(product, `missing catalog product ${slug}`).toBeTruthy();
      expect(text, `${slug} price ${product!.price} missing from guide`).toContain(
        `${product!.price.toLocaleString("en-US")} ج.م`,
      );
    }
  });

  it("keeps the honey family guide on the current honey prices", () => {
    const page = seoLandingPages.find((p) => p.slug === "royal-honey-products");
    expect(page).toBeTruthy();
    const text = JSON.stringify(page);
    for (const [id, price] of [
      ["m-18", 180],
      ["m-11", 400],
      ["m-12", 300],
    ] as const) {
      expect(products.find((p) => p.id === id)!.price, `${id} price changed`).toBe(price);
      expect(text, `${id} price ${price} ج.م missing from the guide`).toContain(`${price} ج.م`);
    }
  });

  it("keeps the storefront on the published WhatsApp number", () => {
    expect(WHATSAPP_NUMBER.replace(/\D/g, "")).toMatch(/^20\d{10}$/);
  });
});
