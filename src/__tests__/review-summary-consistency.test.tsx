import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { products } from "@/data/products";
import {
  getArchivedReviewSummary,
  getProductReviews,
  VISIBLE_REVIEW_COUNT,
} from "@/lib/legacy-product-reviews";
import { productSchema } from "@/lib/seo";
import { LegacyProductReviews } from "@/features/product/components/LegacyProductReviews";

/**
 * 🛡️ حارس انحدار (2026-11-14) — مصدر واحد للتقييم المعروض والمُعلَّم
 *
 * العيب الأصلي: `aggregateRating` في الـ schema كان يُبنى من حقول المنتج
 * (`product.rating` / `product.reviews`) بينما المراجعات المعروضة/المُعلَّمة
 * تأتي من الأرشيف — مصدران يمكن أن يتفرقا، وواجهة المنتج كانت ترسم **5 نجوم
 * ذهبية ثابتة** لأي تقييم (منتج 4.6 يظهر 5/5).
 *
 * هذه الاختبارات تُثبّت:
 *   1) الـ schema يطابق ملخص الأرشيف حرفيًا (rating + count).
 *   2) الواجهة تعرض نفس الأرقام التي في الـ markup.
 *   3) النجوم تُرسم بمعدّل حقيقي، مع توضيح أن المعروض جزء من الأرشيف.
 */

const ratedProducts = products.filter((p) => getArchivedReviewSummary(p.slug));

describe("review summary is a single source (schema + UI)", () => {
  it("covers the archived products it claims to", () => {
    expect(ratedProducts.length).toBeGreaterThan(0);
  });

  it("builds aggregateRating from the archive summary, not product fields", () => {
    for (const product of ratedProducts) {
      const summary = getArchivedReviewSummary(product.slug)!;
      const schema = productSchema({ ...product }) as {
        aggregateRating?: { ratingValue: number; reviewCount: number };
        review?: unknown[];
      };

      expect(schema.aggregateRating, product.slug).toBeDefined();
      expect(schema.aggregateRating!.ratingValue, product.slug).toBe(summary.rating);
      expect(schema.aggregateRating!.reviewCount, product.slug).toBe(summary.reviewCount);

      // المراجعات المُعلَّمة هي نفسها التي تُعرض (VISIBLE_REVIEW_COUNT).
      const visible = getProductReviews(product.slug, product.category, VISIBLE_REVIEW_COUNT);
      expect(schema.review?.length ?? 0, product.slug).toBe(visible.reviews.length);
    }
  });

  it("renders the archived rating and a truthful star ratio", () => {
    const product = ratedProducts[0];
    const summary = getArchivedReviewSummary(product.slug)!;
    const { container } = render(
      <LegacyProductReviews
        rating={product.rating ?? 0}
        reviewsCount={product.reviews ?? 0}
        category={product.category}
        slug={product.slug}
        maxVisibleReviews={VISIBLE_REVIEW_COUNT}
      />,
    );

    // الرقم الظاهر = ملخص الأرشيف
    expect(screen.getByText(String(summary.rating))).toBeTruthy();
    expect(screen.getByText(new RegExp(`بناءً على ${summary.reviewCount} تقييم`))).toBeTruthy();

    // النجوم بمعدّل حقيقي: العرض = النسبة المئوية للتقييم (لا 100% ثابتة).
    const stars = container.querySelector('[aria-label^="التقييم"]');
    expect(stars).toBeTruthy();
    expect(stars!.getAttribute("aria-label")).toBe(`التقييم ${summary.rating} من 5`);
    const fill = stars!.querySelector('div[aria-hidden="true"]') as HTMLElement | null;
    expect(fill?.style.width).toBe(`${(summary.rating / 5) * 100}%`);

    // شفافية: عندما يكون المعروض أقل من الأرشيف يُذكر ذلك صريحًا.
    if (summary.reviewCount > VISIBLE_REVIEW_COUNT) {
      expect(
        screen.getByText(new RegExp(`نعرض ${VISIBLE_REVIEW_COUNT} من أصل ${summary.reviewCount}`)),
      ).toBeTruthy();
    }
  });
});
