import { createFileRoute, Link } from "@tanstack/react-router";
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
  // في هذا الإصدار من TanStack Router تغيير search فقط (نفس المسار) لا
  // يعيد تشغيل الـ loader تلقائياً (match.cause يبقى "stay") — لذلك نضطره
  // صراحةً. الـ loader فلتر محلي بلا شبكة فلا يوجد تكلفة.
  shouldReload: () => true,
  // بحث URL-driven (مطابق لـ SearchAction في JSON-LD الرئيسي):
  // /products/men?q={search_term_string}
  // النوع مُعلَن صراحةً (q اختياري) حتى لا يُطلَب من كل Link في الموقع
  // تمرير search صريح.
  validateSearch: (search: Record<string, unknown>): { q?: string } => ({
    q: typeof search.q === "string" && search.q.trim() ? search.q.trim() : undefined,
  }),
  // ملاحظة: في هذا الإصدار من TanStack Router لا يوجد search في LoaderFnContext
  // والبحث يُقرأ من location.search (نوعه {} — نحقق من النوع وقت التشغيل؛
  // validateSearch أعلاه يضمن أن القيمة نص منسّق أو غائب).
  loader: async ({ location }) => {
    const { getPublicProductsByCategory, matchesProductQuery } = await import(
      "@/data/products"
    );
    const all = getPublicProductsByCategory("men");
    const qRaw = (location.search as Record<string, unknown>).q;
    const q = typeof qRaw === "string" ? qRaw : "";
    // فلترة موحدة تشمل المرادفات المصرية (نقط/قطرات)
    const items = q ? all.filter((p) => matchesProductQuery(p, q)) : all;
    return { items, query: typeof qRaw === "string" ? qRaw : "", total: all.length };
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
  const { items, query, total } = Route.useLoaderData();

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

      {query ? (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
          <p className="text-sm font-bold">
            نتائج البحث عن: «{query}» — {items.length} من {total} منتج
          </p>
          <Link to="/products/men" className="text-sm font-bold text-primary hover:underline">
            مسح البحث
          </Link>
        </div>
      ) : null}

      {query && items.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-lg font-bold">لا توجد منتجات مطابقة لبحثك «{query}»</p>
          <p className="mt-2 text-sm text-muted-foreground">جرّب كلمة أخرى أو تصفح كل المنتجات</p>
          <Link
            to="/products/men"
            className="mt-6 inline-flex rounded-full bg-gradient-brand px-6 py-3 text-sm font-bold text-primary-foreground"
          >
            تصفح كل منتجات الرجال
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}

      <CategoryFAQ
        title="أسئلة شائعة عن منتجات الصحة الزوجية للرجال"
        description="إجابات لأهم الأسئلة قبل اختيار منتجات السعادة الزوجية والصحة الجنسية للرجال."
        items={MEN_CATEGORY_FAQS}
      />
    </div>
  );
}
