import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect } from "react";
import { Clock, ArrowRight } from "lucide-react";
import { articleSchema, clearJsonLd, injectJsonLd } from "@/lib/seo";

export const Route = createFileRoute("/education_/$slug")({
  loader: async ({ params }) => {
    const { articles, getArticleBySlug } = await import("@/data/articles");
    const article = getArticleBySlug(params.slug);
    if (!article) throw notFound();
    const related = articles.filter((a) => a.slug !== article.slug).slice(0, 3);
    return { article, related };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.article.title} — اليسر ميديكال` },
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

function ArticlePage() {
  const { article, related } = Route.useLoaderData();

  useEffect(() => {
    injectJsonLd("article", articleSchema(article));
    return () => clearJsonLd("article");
  }, [article]);

  return (
    <article className="container mx-auto px-4 py-12 max-w-3xl">
      <Link to="/education" className="inline-flex items-center gap-1 text-sm text-primary mb-6">
        <ArrowRight className="h-4 w-4" /> كل المقالات
      </Link>
      <span className="inline-block rounded-full bg-accent px-4 py-1 text-xs font-bold text-primary mb-3">
        {article.category}
      </span>
      <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-4">{article.title}</h1>
      <div className="flex items-center gap-3 text-sm text-muted-foreground mb-8">
        <span className="flex items-center gap-1">
          <Clock className="h-4 w-4" /> {article.readMin} دقائق
        </span>
      </div>

      {article.image ? (
        <div className="aspect-video bg-gradient-soft rounded-3xl overflow-hidden mb-8">
          <img
            src={article.image}
            alt={article.title}
            loading="eager"
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div className="aspect-video bg-gradient-soft rounded-3xl flex items-center justify-center text-9xl mb-8">
          {article.emoji}
        </div>
      )}

      <div className="prose prose-lg max-w-none text-foreground">
        <p className="text-xl leading-relaxed text-muted-foreground mb-6">{article.excerpt}</p>
        <div className="leading-loose whitespace-pre-line text-base md:text-lg">
          {article.content}
        </div>
      </div>
      <div className="mt-12 rounded-2xl bg-gradient-soft border p-6 text-center">
        <p className="text-sm text-muted-foreground">
          ⚠️ هذا المحتوى توعوي عام ولا يُعدّ بديلاً عن استشارة الطبيب المختص.
        </p>
      </div>

      <section className="mt-16">
        <h2 className="text-2xl font-bold mb-6">مقالات ذات صلة</h2>
        <div className="grid gap-5 md:grid-cols-3">
          {related.map((a) => (
            <Link
              key={a.slug}
              to="/education/$slug"
              params={{ slug: a.slug }}
              className="group rounded-2xl border bg-card p-5 hover:shadow-card transition-smooth overflow-hidden flex flex-col"
            >
              {a.image ? (
                <div className="h-32 -mx-5 -mt-5 mb-4 overflow-hidden border-b">
                  <img
                    src={a.image}
                    alt={a.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-smooth"
                  />
                </div>
              ) : (
                <div className="text-4xl mb-3">{a.emoji}</div>
              )}
              <h3 className="font-bold leading-snug group-hover:text-primary transition-smooth">
                {a.title}
              </h3>
            </Link>
          ))}
        </div>
      </section>
    </article>
  );
}
