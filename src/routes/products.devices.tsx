import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { ProductCard } from "@/components/ProductCard";
import { PageHero } from "@/components/PageHero";
import {
  injectJsonLd,
  clearJsonLd,
  clearPrerenderJsonLd,
  itemListSchema,
  breadcrumbSchema,
} from "@/lib/seo";
import { GOOGLE_SHOPPING_BLOCKED } from "@/lib/product-compliance";

export const Route = createFileRoute("/products/devices")({
  loader: async () => {
    const { getPublicProductsByCategory } = await import("@/data/products");
    return { items: getPublicProductsByCategory("devices") };
  },
  head: () => ({
    meta: [
      { title: "الأجهزة والمستلزمات الطبية — اليسر ميديكال" },
      {
        name: "description",
        content: "أجهزة طبية وأدوات صحية للجنسين بأسعار تنافسية مع ضمان الجودة.",
      },
    ],
  }),
  component: CategoryPage,
});

function CategoryPage() {
  const { items } = Route.useLoaderData();

  useEffect(() => {
    clearPrerenderJsonLd();
    injectJsonLd(
      "itemlist",
      itemListSchema(
        // نفس سلوك الـ prerender: الأدوية المحظورة (GOOGLE_SHOPPING_BLOCKED)
        // ما تتكشفش في ItemList — إغلاق مسار كشف لـ Google Shopping crawler
        // (الـ prerender كان بيستبعد والميتا client-side كان بيكشف — اتسوى موحّد).
        items
          .filter((p) => !GOOGLE_SHOPPING_BLOCKED.has(p.id))
          .map((p) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            image: p.image,
            price: p.price,
          })),
        "الأجهزة والمستلزمات الطبية",
      ),
    );
    injectJsonLd(
      "breadcrumb",
      breadcrumbSchema([
        { name: "الرئيسية", url: "/" },
        { name: "الأجهزة والمستلزمات الطبية", url: "/products/devices" },
      ]),
    );
    return () => {
      clearJsonLd("itemlist");
      clearJsonLd("breadcrumb");
    };
  }, [items]);

  return (
    <div className="container mx-auto px-4 py-10 md:py-12">
      <PageHero
        eyebrow="الأجهزة الطبية"
        title="الأجهزة والمستلزمات الطبية"
        description="أجهزة ومستلزمات طبية موثوقة مختارة بعناية، مع جودة عالية وشحن سري لكل المحافظات لتجربة أكثر أماناً واحترافية."
      />

      <div className="grid gap-5 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {items.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}
