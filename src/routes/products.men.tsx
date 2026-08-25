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

const PAGE_TITLE = "منتجات الصحة الزوجية للرجال";

const MEN_CATEGORY_FAQS: CategoryFAQItem[] = [
  {
    question: "ما هي منتجات الصحة الزوجية للرجال؟",
    answer:
      "هي منتجات مختارة لدعم احتياجات الرجل داخل العلاقة الزوجية مثل الطاقة والحيوية، التحكم في التوقيت، الراحة والثقة. الاختيار المناسب يعتمد على الحالة الصحية ونوع الاحتياج، مع ضرورة استشارة الطبيب عند وجود أمراض مزمنة أو استخدام أدوية أخرى.",
  },
  {
    question: "كيف أختار بين العسل، الكبسولات، الجل أو البخاخ؟",
    answer:
      "العسل والمكملات تناسب غالباً دعم الطاقة والحيوية، بينما المنتجات الموضعية مثل الجل أو البخاخ تُستخدم حسب التعليمات لاحتياج محدد. اقرأ وصف كل منتج ومكوناته وطريقة الاستخدام، ولا تجمع أكثر من منتج قوي في نفس الوقت دون استشارة مختص.",
  },
  {
    question: "هل منتجات السعادة الزوجية للرجال آمنة؟",
    answer:
      "الأمان يعتمد على المكونات، الجرعة، مصدر المنتج وحالتك الصحية. لا تستخدم أي منتج إذا كنت تتناول أدوية القلب أو الضغط أو النترات إلا بعد استشارة الطبيب. جميع الطلبات في اليسر ميديكال تتم بسرية مع إرشادات استخدام واضحة لكل منتج.",
  },
  {
    question: "هل يوجد شحن سري لمنتجات الصحة الزوجية داخل مصر؟",
    answer:
      "نعم، يتم الشحن بتغليف محايد وسري لجميع المحافظات، مع عدم توضيح طبيعة المنتج على العبوة الخارجية حفاظاً على الخصوصية.",
  },
  {
    question: "متى يجب استشارة الطبيب قبل استخدام منتجات الصحة الزوجية؟",
    answer:
      "استشر الطبيب إذا كنت تعاني من أمراض القلب أو الضغط أو السكر أو الكبد أو الكلى، أو تستخدم أدوية مزمنة، أو لديك حساسية معروفة من أحد المكونات. المحتوى والمنتجات لا تغني عن الاستشارة الطبية المتخصصة.",
  },
];

export const Route = createFileRoute("/products/men")({
  loader: async () => {
    const { getPublicProductsByCategory } = await import("@/data/products");
    return { items: getPublicProductsByCategory("men") };
  },
  head: () => ({
    meta: [
      { title: `${PAGE_TITLE} في مصر | اليسر ميديكال` },
      {
        name: "description",
        content:
          "تسوق منتجات الصحة الزوجية للرجال الأصلية في مصر: مكملات، عسل، جل وبخاخات مختارة بعناية مع شحن سري ودفع عند الاستلام.",
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
        PAGE_TITLE,
      ),
    );
    injectJsonLd(
      "breadcrumb",
      breadcrumbSchema([
        { name: "الرئيسية", url: "/" },
        { name: PAGE_TITLE, url: "/products/men" },
      ]),
    );
    injectJsonLd("faq", faqSchema(MEN_CATEGORY_FAQS));
    return () => {
      clearJsonLd("itemlist");
      clearJsonLd("breadcrumb");
      clearJsonLd("faq");
    };
  }, [items]);

  return (
    <div className="container mx-auto px-4 py-10 md:py-12">
      <PageHero
        eyebrow="صحة الرجل"
        title={PAGE_TITLE}
        description="مكمّلات غذائية، عسل ملكي، بخاخات، كريمات وجل موضعي مختارة بعناية لدعم الصحة الزوجية للرجال مع الخصوصية والشحن السري داخل مصر."
      />

      <div className="grid gap-5 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {items.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>

      <CategoryFAQ
        title="أسئلة شائعة عن منتجات الصحة الزوجية للرجال"
        description="إجابات لأهم الأسئلة قبل اختيار منتجات السعادة الزوجية والصحة الجنسية للرجال."
        items={MEN_CATEGORY_FAQS}
      />
    </div>
  );
}
