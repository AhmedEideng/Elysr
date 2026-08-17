import { useScrollTracking } from "@/hooks/use-scroll-tracking";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  Clock,
  ArrowRight,
  UserCheck,
  ShieldCheck,
  CalendarDays,
  ExternalLink,
} from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { articleSchema, clearJsonLd, clearPrerenderJsonLd, injectJsonLd } from "@/lib/seo";
import { editorialTrustSignals, type Article } from "@/data/articles";
import { ArticleContentWithAds } from "@/components/sections/ArticleContentWithAds";
import { ProductCard } from "@/components/ProductCard";

export const Route = createFileRoute("/education_/$slug")({
  loader: async ({ params }) => {
    const { articles, getArticleBySlug } = await import("@/data/articles");
    const article = getArticleBySlug(params.slug);
    if (!article) throw notFound();
    // Smart related articles
    const { getRelatedArticles, getProductsForArticle } = await import("@/lib/internal-links");
    const relatedSlugs = getRelatedArticles(article.slug, article.category, articles);
    const related = relatedSlugs
      .map((s) => articles.find((a) => a.slug === s))
      .filter((a): a is NonNullable<typeof a> => Boolean(a));

    // Linked products
    const { getProductById } = await import("@/data/products");
    const productIds = getProductsForArticle(article.slug);
    type Product = NonNullable<ReturnType<typeof getProductById>>;
    const linkedProducts = productIds
      .map((id) => getProductById(id))
      .filter((p): p is Product => Boolean(p))
      .slice(0, 6);

    return { article, related, linkedProducts };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData?.article.title },
      { name: "description", content: loaderData?.article.excerpt },
    ],
  }),
  component: ArticlePage,
  notFoundComponent: () => (
    <div className="container mx-auto px-4 py-20 text-center">
      <h1 className="text-3xl font-bold">المقال غير موجود</h1>
      <Link to="/education" className="mt-4 inline-block text-primary">
        العودة للمقالات
      </Link>
    </div>
  ),
});

function TrustCard({
  icon,
  title,
  name,
  description,
}: {
  icon: ReactNode;
  title: string;
  name: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-3">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-accent text-primary">
          {icon}
        </span>
        <div>
          <div className="text-xs font-bold text-primary">{title}</div>
          <div className="font-black">{name}</div>
        </div>
      </div>
      <p className="text-sm leading-7 text-muted-foreground">{description}</p>
    </div>
  );
}

function RelatedCard({ a }: { a: Article }) {
  const [isError, setIsError] = useState(false);
  return (
    <Link
      key={a.slug}
      to="/education/$slug"
      params={{ slug: a.slug }}
      className="group rounded-2xl border bg-card p-5 hover:shadow-card transition-smooth overflow-hidden flex flex-col"
    >
      {a.image && !isError ? (
        <div className="h-32 -mx-5 -mt-5 mb-4 overflow-hidden border-b">
          <img
            src={a.image}
            alt={a.title}
            width={800}
            height={450}
            loading="lazy"
            onError={() => setIsError(true)}
            className="w-full h-full object-cover group transition-smooth"
          />
        </div>
      ) : (
        <div className="text-4xl mb-3">{a.emoji}</div>
      )}
      <h3 className="font-bold leading-snug group-hover:text-primary transition-smooth">
        {a.title}
      </h3>
    </Link>
  );
}

function ArticlePage() {
  const { article, related, linkedProducts } = Route.useLoaderData();
  const [isMainImageError, setIsMainImageError] = useState(false);

  // Track if user reads 50% or 90% of the article (High intent reader!)
  useScrollTracking(`Article_${article.slug}`);

  useEffect(() => {
    clearPrerenderJsonLd();
    injectJsonLd("article", articleSchema(article));
    return () => clearJsonLd("article");
  }, [article]);

  return (
    <article className="container mx-auto px-4 py-10 md:py-12 max-w-4xl">
      <Link to="/education" className="inline-flex items-center gap-1 text-sm text-primary mb-5">
        <ArrowRight className="h-4 w-4" /> كل المقالات
      </Link>

      <PageHero eyebrow={article.category} title={article.title} description={article.excerpt}>
        <div className="flex flex-wrap justify-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-bold text-muted-foreground shadow-sm border border-primary/10">
            <Clock className="h-4 w-4 text-primary" /> {article.readMin} دقائق قراءة
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-bold text-muted-foreground shadow-sm border border-primary/10">
            <CalendarDays className="h-4 w-4 text-primary" /> آخر تحديث: {article.updatedAt}
          </div>
        </div>
      </PageHero>

      <section className="mb-8 grid gap-3 md:grid-cols-2">
        <TrustCard
          icon={<UserCheck className="h-5 w-5" />}
          title={article.author.role}
          name={article.author.name}
          description={article.author.credentials}
        />
        <TrustCard
          icon={<ShieldCheck className="h-5 w-5" />}
          title={article.reviewer.role}
          name={article.reviewer.name}
          description={article.reviewer.credentials}
        />
      </section>

      {article.image && !isMainImageError ? (
        <div className="aspect-video bg-gradient-soft rounded-3xl overflow-hidden mb-8 border shadow-card">
          <img
            src={article.image}
            alt={article.title}
            width={800}
            height={450}
            loading="eager"
            onError={() => setIsMainImageError(true)}
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div className="aspect-video bg-gradient-soft rounded-3xl flex items-center justify-center text-9xl mb-8 border shadow-card">
          {article.emoji}
        </div>
      )}

      {/* 🚀 محرك حقن المنتجات داخل محتوى المقال */}
      <ArticleContentWithAds content={article.content} linkedProducts={linkedProducts} />

      <section className="mt-12 rounded-3xl border bg-card p-6 shadow-card">
        <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold">
          <ShieldCheck className="h-6 w-6 text-primary" /> منهجية الثقة والمراجعة
        </h2>
        <ul className="grid gap-3 md:grid-cols-2">
          {editorialTrustSignals.map((signal) => (
            <li
              key={signal}
              className="rounded-2xl border bg-background p-4 text-sm leading-7 text-muted-foreground"
            >
              {signal}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8 rounded-3xl border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-2xl font-bold">المصادر الطبية المستخدمة</h2>
        <p className="mb-4 text-sm leading-7 text-muted-foreground">
          نستخدم مصادر طبية وتعليمية موثوقة لدعم المحتوى العام، مع مراعاة أن التشخيص والعلاج يحتاجان
          إلى طبيب مختص.
        </p>
        <ul className="space-y-3">
          {article.sources.map((source) => (
            <li key={source.url} className="rounded-2xl border bg-background p-4">
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-start gap-2 text-sm font-bold text-primary hover:underline"
              >
                <ExternalLink className="mt-1 h-4 w-4 shrink-0" />
                <span>{source.title}</span>
              </a>
              <div className="mt-1 text-xs text-muted-foreground">{source.publisher}</div>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-8 rounded-2xl bg-gradient-soft border p-6 text-center">
        <p className="text-sm text-muted-foreground">
          ⚠️ هذا المحتوى توعوي عام ولا يُعدّ بديلاً عن استشارة الطبيب المختص.
        </p>
      </div>

      {/* منتجات مرتبطة */}
      {linkedProducts && linkedProducts.length > 0 && (
        <section className="mt-12 rounded-[2rem] border border-primary/10 bg-gradient-soft p-5 md:p-7">
          <h2 className="text-xl font-bold mb-4">🛒 منتجات ذات صلة</h2>
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
            {linkedProducts.map((p) => (
              <Link
                key={p.id}
                to="/products/$slug"
                params={{ slug: p.slug }}
                className="flex flex-col items-center gap-2 rounded-xl border bg-card p-3 hover:border-primary/30 transition-all group text-center"
              >
                {p.image && (
                  <img
                    src={p.image}
                    alt=""
                    className="w-16 h-16 object-cover rounded-lg"
                    loading="lazy"
                  />
                )}
                <div>
                  <h3 className="font-bold text-xs leading-tight group-hover:text-primary transition-colors line-clamp-2">
                    {p.name}
                  </h3>
                  <p className="text-xs text-primary font-bold mt-1">{p.price} ج.م</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* منتجات مقترحة في نهاية المقال */}
      {linkedProducts && linkedProducts.length > 0 && (
        <section className="mt-16 rounded-[2rem] border border-primary/10 bg-gradient-soft p-5 md:p-8">
          <h2 className="text-2xl font-bold mb-2">🛍️ منتجات تساعد في حل المشكلة</h2>
          <p className="text-muted-foreground mb-6">
            مجموعة مختارة من أفضل المنتجات ذات الصلة بموضوع المقال لتعزيز صحتك وراحتك.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {linkedProducts.slice(0, 4).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      <section className="mt-16">
        <h2 className="text-2xl font-bold mb-6">مقالات ذات صلة</h2>
        <div className="grid gap-5 md:grid-cols-3">
          {related.map((a) => (
            <RelatedCard key={a.slug} a={a} />
          ))}
        </div>
      </section>
    </article>
  );
}
