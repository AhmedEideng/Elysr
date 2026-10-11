import { createFileRoute } from "@tanstack/react-router";
import { EnCategoryPage } from "@/components/EnCategoryPage";
import { enCategories } from "@/data/en-pages";

const PAGE = enCategories[0];

export const Route = createFileRoute("/en/products/men")({
  loader: async () => {
    const { getPublicProductsByCategory } = await import("@/data/products");
    return { items: getPublicProductsByCategory("men") };
  },
  head: () => ({
    meta: [
      { title: PAGE.title },
      { name: "description", content: PAGE.description },
      { name: "robots", content: "index, follow" },
    ],
  }),
  component: () => {
    const { items } = Route.useLoaderData();
    return <EnCategoryPage page={PAGE} items={items} />;
  },
});
