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

const PAGE_TITLE = "منتجات الصحة الزوجية للنساء";

const WOMEN_CATEGORY_FAQS: CategoryFAQItem[] = [
  {
    question: "ما هي منتجات الصحة الزوجية للنساء؟",
    answer:
      "هي منتجات مختارة لدعم الراحة، الحيوية، الترطيب، الثقة وتحسين التجربة الزوجية للمرأة. تختلف طريقة الاختيار حسب الاحتياج ونوع المنتج، ويُفضل قراءة المكونات والتعليمات واستشارة الطبيب عند وجود حمل أو رضاعة أو أمراض مزمنة.",
  },
  {
    question: "كيف أختار بين القطرات، العسل، الجل أو المنتجات الموضعية؟",
    answer:
      "القطرات والعسل تناسب غالباً دعم الحيوية والمزاج والطاقة، بينما الجل والمنتجات الموضعية تُستخدم لاحتياجات مثل الترطيب أو الراحة الموضعية حسب تعليمات المنتج. لا تستخدمي أكثر من منتج في نفس الوقت دون فهم المكونات أو استشارة مختص.",
  },
  {
    question: "هل منتجات السعادة الزوجية للنساء مناسبة لكل السيدات؟",
    answer:
      "ليست كل المنتجات مناسبة للجميع. يجب تجنب أي منتج يحتوي على مكونات قد تسبب حساسية لكِ، واستشارة الطبيب في حالات الحمل والرضاعة، اضطرابات الهرمونات، الأمراض المزمنة أو استخدام أدوية منتظمة.",
  },
  {
    question: "هل الشحن سري لمنتجات الصحة الزوجية للنساء؟",
    answer:
      "نعم، يتم تجهيز الطلبات بتغليف محايد وسري، ولا يتم ذكر طبيعة المنتج على العبوة الخارجية حفاظاً على الخصوصية في جميع محافظات مصر.",
  },
  {
    question: "هل يمكن الدفع عند الاستلام؟",
    answer:
      "نعم، يمكنك إتمام الطلب عبر واتساب أو الطلب المباشر، مع إمكانية الدفع عند الاستلام حسب المحافظة وتفاصيل الشحن المتاحة وقت تأكيد الطلب.",
  },
];

export const Route = createFileRoute("/products/women")({
  loader: async () => {
    const { getProductsByCategory } = await import("@/data/products");
    return { items: getProductsByCategory("women") };
  },
  head: () => ({
    meta: [
      { title: `${PAGE_TITLE} في مصر | اليسر ميديكال` },
      {
        name: "description",
        content:
          "تسوق منتجات الصحة الزوجية للنساء الأصلية في مصر: قطرات، عسل، جل ومنتجات مختارة للراحة والحيوية مع شحن سري ودفع عند الاستلام.",
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
        items.map((p) => ({ name: p.name, slug: p.slug, image: p.image, price: p.price })),
        PAGE_TITLE,
      ),
    );
    injectJsonLd(
      "breadcrumb",
      breadcrumbSchema([
        { name: "الرئيسية", url: "/" },
        { name: PAGE_TITLE, url: "/products/women" },
      ]),
    );
    injectJsonLd("faq", faqSchema(WOMEN_CATEGORY_FAQS));
    return () => {
      clearJsonLd("itemlist");
      clearJsonLd("breadcrumb");
      clearJsonLd("faq");
    };
  }, [items]);

  return (
    <div className="container mx-auto px-4 py-10 md:py-12">
      <PageHero
        eyebrow="صحة المرأة"
        title={PAGE_TITLE}
        description="منتجات مختارة بعناية لدعم الراحة، الترطيب، الحيوية والثقة في العلاقة الزوجية للمرأة مع التزام كامل بالخصوصية وسرية التوصيل."
      />

      <div className="grid gap-5 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {items.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>

      <CategoryFAQ
        title="أسئلة شائعة عن منتجات الصحة الزوجية للنساء"
        description="إجابات لأهم الأسئلة قبل اختيار منتجات السعادة الزوجية والصحة الجنسية للنساء."
        items={WOMEN_CATEGORY_FAQS}
      />
    </div>
  );
}
