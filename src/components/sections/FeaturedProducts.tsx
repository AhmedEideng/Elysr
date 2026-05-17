import { useEffect, useState } from "react";
import { ProductCard } from "@/components/ProductCard";
import type { Product } from "@/data/product-types";

export function FeaturedProducts() {
  const [featured, setFeatured] = useState<Product[]>([]);

  useEffect(() => {
    let cancelled = false;
    import("@/data/products").then(({ getFeaturedProducts }) => {
      if (!cancelled) setFeatured(getFeaturedProducts());
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="bg-gradient-soft py-8 md:py-10">
      <div className="container mx-auto px-4">
        <div className="text-center mb-6">
          <span className="inline-block rounded-full bg-accent px-4 py-1 text-xs font-bold text-primary mb-3">
            ⭐ الأكثر مبيعاً
          </span>
          <h2 className="text-3xl md:text-4xl font-bold">منتجاتنا المميزة</h2>
          <p className="text-muted-foreground mt-2">منتجات اختارها آلاف العملاء</p>
        </div>
        {featured.length === 0 ? (
          <div className="grid gap-5 grid-cols-2 md:grid-cols-3 lg:grid-cols-4" aria-hidden="true">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-72 animate-pulse rounded-2xl border bg-card/70" />
            ))}
          </div>
        ) : (
          <div className="grid gap-5 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
