import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowRight, ShieldCheck, Truck, AlertCircle } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { ProductCard } from "@/components/ProductCard";
import { CategoryFAQ } from "@/components/CategoryFAQ";
import type { SeoLandingPage } from "@/data/landing-pages";
import {
  breadcrumbSchema,
  clearJsonLd,
  clearPrerenderJsonLd,
  faqSchema,
  injectJsonLd,
  itemListSchema,
} from "@/lib/seo";

export const Route = createFileRoute("/products/guides/$slug")({
  loader: async ({ params }) => {
    // 🚀 تحميل صفحة اللاندينج كملف JSON فردي (مولّد وقت البناء) بدلاً من استيراد
    // كامل ملف landing-pages.ts (465 kB) — يقطع أي أثر لصفحات اللاندينج على الـ bundle
    // ويجعل كل صفحة guide خفيفة وسريعة التحويل.
    let page: SeoLandingPage | undefined;
    try {
      const res = await fetch(`/landing-pages/${params.slug}.json`);
      if (!res.ok) throw new Error("Landing page not found");
      page = (await res.json()) as SeoLandingPage;
    } catch {
      // إعادة استخدام نفس السلوك: إن لم توجد الصفحة نرمي notFound
    }
    if (!page) throw notFound();

    const { getProductById } = await import("@/data/products");
    type Product = NonNullable<ReturnType<typeof getProductById>>;
    const selectedProducts = page.productIds
      .map((id) => getProductById(id))
      .filter((product): product is Product => Boolean(product));

    // Linked articles
    const { getArticlesForLandingPage } = await import("@/lib/internal-links");
    const articleSlugs = getArticlesForLandingPage(page.slug, page.title);
    let linkedArticles: { slug: string; title: string; emoji: string; readMin: number }[] = [];
    try {
      const { articles: allArticles } = await import("@/data/articles");
      linkedArticles = allArticles
        .filter((a) => articleSlugs.includes(a.slug))
        .map((a) => ({ slug: a.slug, title: a.title, emoji: a.emoji, readMin: a.readMin }));
    } catch {
      // No articles — silent fallback (existing behaviour)
    }

    return { page, selectedProducts, linkedArticles };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData?.page.metaTitle },
      { name: "description", content: loaderData?.page.metaDescription },
    ],
  }),
  component: SeoLandingPageComponent,
  notFoundComponent: () => (
    <div className="container mx-auto px-4 py-20 text-center">
      <h1 className="text-3xl font-bold">الدليل غير موجود</h1>
      <Link to="/" className="mt-4 inline-block text-primary">
        العودة للرئيسية
      </Link>
    </div>
  ),
});

function SeoLandingPageComponent() {
  const { page, selectedProducts, linkedArticles } = Route.useLoaderData();

  useEffect(() => {
    clearPrerenderJsonLd();
    injectJsonLd(
      "breadcrumb",
      breadcrumbSchema([
        { name: "الرئيسية", url: "/" },
        { name: "المنتجات", url: "/products/men" },
        { name: page.title, url: `/products/guides/${page.slug}` },
      ]),
    );
    injectJsonLd("faq", faqSchema(page.faqs));
    injectJsonLd(
      "itemlist",
      itemListSchema(
        selectedProducts.map((product) => ({
          name: product.name,
          slug: product.slug,
          image: product.image,
          price: product.price,
        })),
        page.title,
      ),
    );

    return () => {
      clearJsonLd("breadcrumb");
      clearJsonLd("faq");
      clearJsonLd("itemlist");
    };
  }, [page, selectedProducts]);

  return (
    <div className="container mx-auto px-4 py-10 md:py-12">
      <Link to="/" className="mb-5 inline-flex items-center gap-1 text-sm font-bold text-primary">
        <ArrowRight className="h-4 w-4" /> الرئيسية
      </Link>

      <PageHero eyebrow={page.eyebrow} title={page.title} description={page.heroDescription}>
        <div className="flex flex-wrap justify-center gap-2">
          {page.relatedKeywords.slice(0, 4).map((keyword) => (
            <span
              key={keyword}
              className="rounded-full border border-primary/10 bg-white/75 px-3 py-1 text-xs font-bold text-primary shadow-sm"
            >
              {keyword}
            </span>
          ))}
        </div>
      </PageHero>

      <article className="mx-auto max-w-5xl">
        <section className="rounded-[2rem] border border-primary/10 bg-card p-5 leading-8 shadow-card md:p-8">
          <p className="text-base text-muted-foreground md:text-lg">{page.intro}</p>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <TrustBox icon={<ShieldCheck className="h-5 w-5" />} title="اختيار واعٍ" />
            <TrustBox icon={<Truck className="h-5 w-5" />} title="شحن سري داخل مصر" />
            <TrustBox icon={<AlertCircle className="h-5 w-5" />} title="تنبيه طبي واضح" />
          </div>
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-3">
          {page.sections.map((section) => (
            <div key={section.heading} className="rounded-3xl border bg-card p-5 shadow-sm">
              <h2 className="mb-3 text-xl font-black">{section.heading}</h2>
              <p className="text-sm leading-8 text-muted-foreground">{section.body}</p>
            </div>
          ))}
        </section>

        <section className="mt-10 rounded-[2rem] border border-primary/10 bg-gradient-soft p-5 md:p-7">
          <h2 className="text-2xl font-black">ابدأ من الأقسام الحالية</h2>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            هذه الصفحة لا تضيف قسماً جديداً في الشركة؛ هي دليل يساعدك على الوصول للقسم المناسب حسب
            كلمة البحث والاحتياج.
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {page.links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-2xl border bg-card p-4 transition-smooth hover:-translate-y-1 hover:shadow-card"
              >
                <h3 className="font-black text-primary">{link.label}</h3>
                <p className="mt-2 text-xs leading-6 text-muted-foreground">{link.description}</p>
              </a>
            ))}
          </div>
        </section>
      </article>

      {selectedProducts.length > 0 && (
        <section className="mt-12">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-black md:text-3xl">منتجات مختارة مرتبطة بالبحث</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              اختيارات من الأقسام الحالية مرتبطة بموضوع: {page.primaryKeyword}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
            {selectedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* مقالات مرتبطة */}
      {linkedArticles && linkedArticles.length > 0 && (
        <section className="mt-10 rounded-[2rem] border border-primary/10 bg-gradient-soft p-5 md:p-7">
          <h2 className="text-xl font-bold mb-4">📚 مقالات تعليمية ذات صلة</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {linkedArticles.map((a) => (
              <Link
                key={a.slug}
                to="/education/$slug"
                params={{ slug: a.slug }}
                className="flex items-center gap-3 rounded-xl border bg-card p-4 hover:border-primary/30 transition-all group"
              >
                <span className="text-2xl">{a.emoji}</span>
                <div>
                  <h3 className="font-bold text-sm group-hover:text-primary transition-colors">
                    {a.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{a.readMin} دقائق قراءة</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <CategoryFAQ
        title={`أسئلة شائعة عن ${page.primaryKeyword}`}
        description="إجابات مختصرة لتقليل الحيرة قبل اختيار المنتج المناسب من الأقسام الحالية."
        items={page.faqs}
      />
    </div>
  );
}

function TrustBox({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border bg-background p-4 text-sm font-bold">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent text-primary">
        {icon}
      </span>
      {title}
    </div>
  );
}
