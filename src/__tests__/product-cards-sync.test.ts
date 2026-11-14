import { describe, expect, it } from "vitest";

import { productCards } from "../data/product-cards.generated";
import {
  getFeaturedCards,
  getCardsByCategory,
  getCardById,
  getCardBySlug,
} from "../data/product-cards";
import { products, getFeaturedProducts, getProductsByCategory } from "../data/products";
import { getUseBadge } from "../lib/product-badge";

/**
 * 🛡️ حارس انحدار (2026-11-14 · H5) — طبقة البطاقات لا تنحرف عن الكتالوج
 *
 * العيب الأصلي: كل صفحة (بما فيها الرئيسية) كانت تحمّل الكتالوج الكامل —
 * 89 منتجًا بوصفها ومكوناتها — لأن الرئيسية والسلة تحتاجانه. الحل: طبقة
 * بطاقات خفيفة مولَّدة. الخطر الجديد الذي يفتحه هذا الحل: أن تنحرف البطاقة عن
 * الكتالوج (سعر/مخزون/اسم) إذا عُدِّل الكتالوج ولم يُعَد التوليد.
 *
 * هذا الاختبار يفشل فورًا عند أي انحراف، ويحرس أيضًا تكافؤ الترتيب بين
 * الطبقتين حتى لا تختلف الرئيسية عن صفحات الأقسام.
 */

describe("generated product cards mirror the catalog", () => {
  it("has the same ids, in the same order", () => {
    expect(productCards.map((c) => c.id)).toEqual(products.map((p) => p.id));
  });

  it("mirrors every display field used by cards and cart", () => {
    const byId = new Map(productCards.map((c) => [c.id, c]));
    for (const p of products) {
      const card = byId.get(p.id);
      expect(card, `missing card for ${p.id}`).toBeDefined();
      expect(card).toMatchObject({
        slug: p.slug,
        name: p.name,
        nameEn: p.nameEn,
        category: p.category,
        price: p.price,
        stock: p.stock,
        emoji: p.emoji,
      });
      if (p.image) expect(card!.image).toBe(p.image);
    }
  });

  it("precomputes the same use badge as the full-text rule", () => {
    // الشارة تُحسب من نص الوصف الكامل، وهي محفوظة في البطاقة — يجب أن تتطابق
    // تمامًا حتى لا تختلف شارة الرئيسية عن شارة صفحة القسم لنفس المنتج.
    const byId = new Map(productCards.map((c) => [c.id, c]));
    for (const p of products) {
      const expected = getUseBadge(p);
      expect({ label: byId.get(p.id)?.badgeLabel, className: byId.get(p.id)?.badgeClass }).toEqual(
        expected,
      );
    }
  });

  it("keeps the same category ordering as the full catalog", () => {
    for (const cat of ["men", "women", "devices"] as const) {
      expect(getCardsByCategory(cat).map((c) => c.id)).toEqual(
        getProductsByCategory(cat).map((p) => p.id),
      );
    }
  });

  it("keeps the same homepage featured selection", () => {
    expect(getFeaturedCards().map((c) => c.id)).toEqual(getFeaturedProducts().map((p) => p.id));
  });

  it("resolves the same products by id and slug", () => {
    expect(getCardById("m-60")?.slug).toBe("kreva-gel-for-men");
    expect(getCardBySlug("kreva-gel-for-men")?.id).toBe("m-60");
    expect(getCardById("does-not-exist")).toBeUndefined();
  });
});
