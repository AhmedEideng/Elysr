import { ProductCard } from "@/components/ProductCard";
import { getFeaturedProducts } from "@/data/products";
import { useEffect, useMemo } from "react";
import { trackViewItemList } from "@/lib/analytics";

export function FeaturedProducts() {
  // البيانات محلية ثابتة — نحسبها مرة واحدة عبر useMemo.
  // لا حاجة لـ lazy loading أو effects هنا، فالحساب فوري ورخيص.
  const featured = useMemo(() => getFeaturedProducts(), []);

  useEffect(() => {
    if (featured.length > 0) {
      trackViewItemList(
        "featured_home",
        featured.map((p) => ({ id: p.id, name: p.name, price: p.price, qty: 1 })),
      );
    }
  }, [featured]);

  return (
    <section id="featured-products" className="scroll-mt-20 bg-gradient-soft py-5 md:py-6">
      <div className="container mx-auto px-4">
        <div className="text-center mb-6">
          <span className="inline-block rounded-full bg-sky-50 px-4 py-1.5 text-xs font-bold text-primary mb-3 border border-sky-100">
            ✨ اخترنا لك
          </span>
          <p className="text-muted-foreground mt-2 max-w-xl mx-auto text-sm md:text-base leading-relaxed">
            باقة مختارة بعناية من أفضل المنتجات والمكملات لدعم صحتك وحيويتك الزوجية بأمان وثقة
          </p>
        </div>
        <div className="grid gap-5 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} listName="featured_home" />
          ))}
        </div>
      </div>
    </section>
  );
}
