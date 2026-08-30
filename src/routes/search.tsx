import { createFileRoute, Link } from "@tanstack/react-router";
import { SearchX } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";

const PAGE_TITLE = "نتائج البحث";

/**
 * صفحة نتائج البحث الشاملة: /search?q={search_term_string}
 * - الهدف المُعلَن في SearchAction بـ JSON-LD الرئيسي (صفحة الرئيسية) وفي
 *   قالب البحث في الـ sitemap — أي أن نتائج بحث جوجل/Google Shopping
 *   تصل العميل هنا مباشرة.
 * - noindex (noindex,follow): صفحات نتائج البحث لا تُفهرس (محتوى مكرر
 *   عن صفحات المنتجات نفسها) لكن الروابط داخلها تُزحف.
 * - الفلتر محلي حتمي (searchAllPublicProducts) — نفس نمط ?q في
 *   صفحات الفئات، بدون شبكة، قابل للاختبار.
 */
export const Route = createFileRoute("/search")({
  // في هذا الإصدار من TanStack Router تغيير search فقط (نفس المسار) لا
  // يعيد تشغيل الـ loader تلقائياً (match.cause يبقى "stay") — لذلك نضطره
  // صراحةً. الـ loader فلتر محلي بلا شبكة فلا يوجد تكلفة.
  shouldReload: () => true,
  // q اختياري: /search بدون كلمة يعرض كل المنتجات (نقطة انطلاق).
  validateSearch: (search: Record<string, unknown>): { q?: string } => ({
    q: typeof search.q === "string" && search.q.trim() ? search.q.trim() : undefined,
  }),
  // ملاحظة: في هذا الإصدار من TanStack Router لا يوجد search في LoaderFnContext
  // والبحث يُقرأ من location.search (نوعه {} — نحقق من النوع وقت التشغيل؛
  // validateSearch أعلاه يضمن أن القيمة نص منسّق أو غائب).
  loader: async ({ location }) => {
    const { searchAllPublicProducts, products } = await import("@/data/products");
    const qRaw = (location.search as Record<string, unknown>).q;
    const q = typeof qRaw === "string" ? qRaw : "";
    const items = searchAllPublicProducts(q);
    return {
      items,
      query: typeof qRaw === "string" ? qRaw.trim() : "",
      total: products.length,
    };
  },
  head: () => ({
    meta: [
      { title: `${PAGE_TITLE} — اليسر ميديكال` },
      // noindex,follow — مثل باقي صفحات النتائج/العربة: لا فهرسة لكن الروابط تُزحف.
      { name: "robots", content: "noindex,follow" },
      {
        name: "description",
        content:
          "نتائج البحث في منتجات اليسر ميديكال — كل المنتجات رجالي ونساء وأجهزة في مكان واحد، بالاسم العربي أو الإنجليزي.",
      },
    ],
  }),
  component: SearchResultsPage,
});

function SearchResultsPage() {
  const { items, query, total } = Route.useLoaderData();

  return (
    <div className="container mx-auto px-4 py-10 md:py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
          {query ? `نتائج البحث عن: «${query}»` : "البحث في المنتجات"}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {query
            ? `${items.length} من ${total} منتج في كل الأقسام (رجالي، نساء، وأجهزة)`
            : "اكتب كلمة في صندوق البحث بالأعلى أو تصفح كل المنتجات — نبحث في الاسم العربي والإنجليزي والوصف والمكونات."}
        </p>
      </header>

      {query && items.length === 0 ? (
        <div className="py-16 text-center">
          <SearchX className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-lg font-bold">لا توجد منتجات مطابقة لبحثك «{query}»</p>
          <p className="mt-2 text-sm text-muted-foreground">
            جرّب كلمة أقصر أو اسأل فريقنا عبر واتساب — نساعدك في اختيار الأنسب بسرية تامة.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/products/men"
              className="rounded-full bg-gradient-brand px-6 py-3 text-sm font-bold text-primary-foreground"
            >
              منتجات رجالي
            </Link>
            <Link
              to="/products/women"
              className="rounded-full border bg-gradient-brand px-6 py-3 text-sm font-bold text-primary-foreground"
            >
              منتجات نساء
            </Link>
            <Link
              to="/products/devices"
              className="rounded-full border px-6 py-3 text-sm font-bold"
            >
              الأجهزة
            </Link>
          </div>
          <Link to="/" className="mt-6 inline-block text-sm font-bold text-primary hover:underline">
            العودة للرئيسية
          </Link>
        </div>
      ) : (
        <>
          {query ? (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
              <p className="text-sm font-bold">
                نتائج البحث عن: «{query}» — {items.length} من {total} منتج
              </p>
              <Link to="/search" className="text-sm font-bold text-primary hover:underline">
                مسح البحث
              </Link>
            </div>
          ) : null}
          <div className="grid gap-5 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {items.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
