import { createFileRoute } from "@tanstack/react-router";
import { ProductCard } from "@/components/ProductCard";

export const Route = createFileRoute("/products/men")({
  loader: async () => {
    const { getProductsByCategory } = await import("@/data/products");
    return { items: getProductsByCategory("men") };
  },
  head: () => ({
    meta: [
      { title: "منتجات الرجال — اليسر ميديكال" },
      { name: "description", content: "منتجات صحية وجنسية مخصصة للرجال بأسعار الاستيراد." },
    ],
  }),
  component: MenPage,
});

function MenPage() {
  const { items } = Route.useLoaderData();
  return (
    <div className="container mx-auto px-4 py-12">
      <header className="mb-10 text-center">
        <span className="inline-block rounded-full bg-accent px-4 py-1 text-xs font-bold text-primary mb-3">
          صحة الرجل
        </span>
        <h1 className="text-4xl font-bold md:text-5xl">منتجات الرجال</h1>
        <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
          مكمّلات غذائية، بخاخات تأخير، كريمات، وفيتامينات مختارة بعناية لدعم الصحة والأداء الذكوري
          بأمان وفعالية.
        </p>
      </header>
      <div className="grid gap-5 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {items.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}
