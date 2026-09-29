import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { ProductCard } from "@/components/ProductCard";
import { PageHero } from "@/components/PageHero";
import { CategoryFAQ, type CategoryFAQItem } from "@/components/CategoryFAQ";
import {
  injectJsonLd,
  clearJsonLd,
  clearPrerenderJsonLd,
  itemListSchema,
  breadcrumbSchema,
  faqSchema,
} from "@/lib/seo";
import { trackViewItemList } from "@/lib/analytics";

const DEVICES_CATEGORY_FAQS: CategoryFAQItem[] = [
  {
    question: "ما الأجهزة والمستلزمات الطبية المتاحة في هذا القسم؟",
    answer:
      "يضم القسم مضخات التفريغ وأجهزة الشد وأدوات التأهيل المختارة بعناية لدعم احتياجات الصحة الزوجية، مع وصف واضح لكل منتج في صفحته.",
  },
  {
    question: "كيف أختار الجهاز المناسب لي؟",
    answer:
      "اقرأ وصف المنتج وطريقة الاستخدام والتنبيهات المذكورة في صفحته، واختر بحسب احتياجك. إذا كنت تعاني من حالة صحية مزمنة أو تتناول أدوية فاستشر طبيبك قبل الاستخدام.",
  },
  {
    question: "هل الشحن سري للأجهزة والمستلزمات الطبية؟",
    answer:
      "نعم، تُشحن جميع الطلبات بتغليف محايد تماماً لا يكشف طبيعة المنتج، ولا تُكتب أي تفاصيل عن المحتوى على العبوة الخارجية أو بوليصة الشحن.",
  },
  {
    question: "هل يمكن الدفع عند الاستلام؟",
    answer:
      "نعم، يمكنك إتمام الطلب عبر واتساب أو الطلب المباشر، مع إمكانية الدفع عند الاستلام حسب المحافظة وتفاصيل الشحن المتاحة وقت تأكيد الطلب.",
  },
  {
    question: "ما سياسة الاسترجاع للأجهزة؟",
    answer:
      "يحق لك الاستبدال أو الاسترجاع خلال 14 يوماً من تاريخ الاستلام بشرط أن يكون المنتج غير مفتوح وبحالته الأصلية، ويتم الاسترداد خلال 7 أيام عمل بعد الفحص.",
  },
];

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
        content:
          "تصفح أجهزة الصحة الزوجية والمستلزمات الطبية: مضخات التفريغ، أجهزة الشد، وأدوات التأهيل، بجودة موصوفة بوضوح مع شحن سري ودفع عند الاستلام وتغليف محايد.",
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
        items.map((p) => ({
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
    injectJsonLd("faq", faqSchema(DEVICES_CATEGORY_FAQS));
    trackViewItemList(
      "devices_category",
      items.map((p) => ({ id: p.id, name: p.name, price: p.price, qty: 1 })),
    );
    return () => {
      clearJsonLd("itemlist");
      clearJsonLd("breadcrumb");
      clearJsonLd("faq");
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
          <ProductCard key={p.id} product={p} listName="devices_category" />
        ))}
      </div>

      <CategoryFAQ
        title="أسئلة شائعة عن الأجهزة والمستلزمات الطبية"
        description="إجابات لأهم الأسئلة قبل اختيار الأجهزة والمستلزمات الطبية."
        items={DEVICES_CATEGORY_FAQS}
      />
    </div>
  );
}
