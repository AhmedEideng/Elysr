import { createFileRoute } from "@tanstack/react-router";
import { ProductCard } from "@/components/ProductCard";

export const Route = createFileRoute("/products/devices")({
  loader: async () => {
    const { getProductsByCategory } = await import("@/data/products");
    return { items: getProductsByCategory("devices") };
  },
  head: () => ({
    meta: [
      { title: "أجهزة وأدوات طبية — اليسر ميديكال" },
      {
        name: "description",
        content:
          "أجهزة وأدوات طبية احترافية: قياس الضغط والسكر، أجهزة استنشاق، موازين، إسعافات أولية وأكثر بأسعار الاستيراد.",
      },
    ],
  }),
  component: DevicesPage,
});

function DevicesPage() {
  const { items } = Route.useLoaderData();
  return (
    <div className="container mx-auto px-4 py-12">
      <header className="mb-10 text-center">
        <span className="inline-block rounded-full bg-accent px-4 py-1 text-xs font-bold text-primary mb-3">
          أجهزة طبية معتمدة
        </span>
        <h1 className="text-4xl font-bold md:text-5xl">أجهزة وأدوات طبية</h1>
        <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
          أجهزة قياس، أدوات علاج، وحقائب إسعاف منزلية مختارة بعناية بأعلى معايير الجودة العالمية.
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
