import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { PageHero } from "@/components/PageHero";
import { CategoryFAQ } from "@/components/CategoryFAQ";
import {
  applyHreflang,
  breadcrumbSchema,
  clearJsonLd,
  clearPrerenderJsonLd,
  faqSchema,
  injectJsonLd,
  itemListSchema,
} from "@/lib/seo";
import { alternatesFor, type EnCategoryPage as EnCategoryCopy } from "@/data/en-pages";
import type { Product } from "@/data/product-types";

/**
 * (2026-10-11) صفحة فئة إنجليزية: نفس ادعاءات النسخة العربية مترجمة أميناً
 * (en-pages.ts) + قوائم الكتالوج بـ nameEn. الروابط الداخلية تشير لصفحات
 * المنتجات العربية الحالية حتى تُنشأ صفحات المنتجات الإنجليزية.
 * الـ JSON-LD هنا مطابق حرفياً لما يحقنه الـ prerender (تكافؤ).
 */
export function EnCategoryPage({ page, items }: { page: EnCategoryCopy; items: Product[] }) {
  useEffect(() => {
    clearPrerenderJsonLd();
    injectJsonLd(
      "itemlist",
      itemListSchema(
        items.map((p) => ({
          id: p.id,
          name: p.nameEn,
          slug: p.slug,
          image: p.image,
          price: p.price,
        })),
        page.heroTitle,
      ),
    );
    injectJsonLd(
      "breadcrumb",
      breadcrumbSchema([
        { name: "Home", url: "/en" },
        { name: page.heroTitle, url: page.path },
      ]),
    );
    injectJsonLd("faq", faqSchema(page.faqs));
    applyHreflang(alternatesFor(page.path));
    return () => {
      clearJsonLd("itemlist");
      clearJsonLd("breadcrumb");
      clearJsonLd("faq");
    };
  }, [items, page]);

  return (
    <div className="container mx-auto px-4 py-10 md:py-12">
      <PageHero eyebrow={page.eyebrow} title={page.heroTitle} description={page.heroDescription} />
      <p className="mb-6 text-sm font-bold">
        <Link to={page.arPath} className="text-primary hover:underline">
          View this page in Arabic — عرض هذه الصفحة بالعربية
        </Link>
      </p>
      <h2 className="mb-4 text-2xl font-extrabold">{page.listLabel}</h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((p) => (
          <li key={p.id} className="rounded-2xl border border-primary/15 bg-white p-4 shadow-sm">
            <Link
              to="/products/$slug"
              params={{ slug: p.slug }}
              className="font-bold text-primary hover:underline"
            >
              {p.nameEn}
            </Link>
            <p className="mt-1 text-sm font-bold text-gray-600">EGP {p.price}</p>
          </li>
        ))}
      </ul>
      <div className="mt-10">
        <CategoryFAQ
          title={`Frequently asked questions about ${page.heroTitle}`}
          description="Answers to the most important questions before choosing a product."
          items={page.faqs}
        />
      </div>
    </div>
  );
}
