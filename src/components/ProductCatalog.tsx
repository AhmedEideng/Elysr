import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { Product } from "@/data/product-types";
import { ProductCard } from "@/components/ProductCard";
import { trackViewItemList } from "@/lib/analytics";
import { injectJsonLd, itemListSchema } from "@/lib/seo";

export function ProductCatalog({
  items,
  category,
  listName,
}: {
  items: Product[];
  category: "men" | "women" | "devices";
  listName: string;
}) {
  useEffect(() => {
    injectJsonLd("itemlist", itemListSchema(items, "منتجات القسم"));
    trackViewItemList(
      listName,
      items.map((p) => ({ id: p.id, name: p.name, price: p.price, qty: 1 })),
    );
  }, [items, listName]);

  const guides =
    category === "men"
      ? [
          ["men-products-prices-egypt", "كل الأسعار"],
          ["delay-products-comparison", "مقارنة منتجات التأخير"],
        ]
      : category === "women"
        ? [
            ["women-products-prices-egypt", "كل الأسعار"],
            ["women-intimacy-guide-beginners", "دليل الاختيار"],
          ]
        : [
            ["manual-vs-electric-vacuum-pump", "مقارنة اليدوية والكهربائية"],
            ["intimacy-devices", "دليل الأجهزة"],
          ];

  return (
    <section aria-label="منتجات القسم">
      <div className="grid gap-5 grid-cols-2 md:grid-cols-3 lg:grid-cols-4" data-catalog-results>
        {items.map((p, index) => (
          <ProductCard key={p.id} product={p} priority={index < 4} listName={listName} />
        ))}
      </div>
      <nav
        aria-label="أدلة اختيار المنتجات"
        className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground"
      >
        {guides.map(([slug, label]) => (
          <Link
            key={slug}
            to="/products/guides/$slug"
            params={{ slug }}
            className="inline-flex min-h-9 items-center gap-1 hover:text-primary hover:underline"
          >
            {label} <ArrowLeft aria-hidden="true" className="size-3" />
          </Link>
        ))}
      </nav>
    </section>
  );
}
