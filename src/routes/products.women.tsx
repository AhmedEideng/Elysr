import { createFileRoute } from "@tanstack/react-router";
import { ProductCard } from "@/components/ProductCard";

export const Route = createFileRoute("/products/women")({
  loader: async () => {
    const { getProductsByCategory } = await import("@/data/products");
    return { items: getProductsByCategory("women") };
  },
  head: () => ({
    meta: [
      { title: "منتجات النساء — الصحة والجمال | اليسر ميديكال" },
      {
        name: "description",
        content:
          "تشكيلة مختارة من منتجات الصحة النسائية، تعزيز الرغبة، والعناية الشخصية بأعلى جودة.",
      },
    ],
  }),
  component: WomenPage,
});

function WomenPage() {
  const { items } = Route.useLoaderData();
  return (
    <div className="container mx-auto px-4 py-12">
      <header className="mb-10 text-center">
        <span className="inline-block rounded-full bg-pink-100 px-4 py-1 text-xs font-bold text-pink-600 mb-3">
          صحة المرأة
        </span>
        <h1 className="text-4xl font-bold md:text-5xl">منتجات النساء</h1>
        <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
          عناية متكاملة، توازن هرموني، ومنتجات تعزيز السعادة الزوجية مصممة خصيصاً لتلبية احتياجات
          المرأة العصرية بخصوصية تامة.
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
