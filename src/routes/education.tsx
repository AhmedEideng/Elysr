import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock } from "lucide-react";
import { useState } from "react";
import { PageHero } from "@/components/PageHero";
import type { ArticleMeta } from "@/data/articles-meta.generated";
import { ARTICLE_COUNT } from "@/data/articles-cards.generated";

export const Route = createFileRoute("/education")({
  loader: async () => {
    // meta فقط (بلا content/sources) — النصوص مش محتاجة في صفحة القائمة
    const { articlesMeta } = await import("@/data/articles-meta.generated");
    return { articles: articlesMeta };
  },
  head: () => ({
    meta: [
      { title: "التوعية الجنسية — مقالات علمية موثوقة | اليسر ميديكال" },
      {
        name: "description",
        content: `${ARTICLE_COUNT} مقالة توعوية علمية عن الصحة الجنسية والعلاقات الزوجية بإشراف مختصين`,
      },
    ],
  }),
  component: EducationIndex,
});

function ArticleCard({ a }: { a: ArticleMeta }) {
  const [isError, setIsError] = useState(false);

  return (
    <Link
      to="/education/$slug"
      params={{ slug: a.slug }}
      className="group flex flex-col rounded-2xl border bg-card overflow-hidden transition-smooth hover:-translate-y-1 hover:shadow-elegant"
    >
      {a.image && !isError ? (
        <div className="aspect-video bg-gradient-soft overflow-hidden">
          <img
            src={a.image}
            alt={a.title}
            width={640}
            height={360}
            loading="lazy"
            onError={() => setIsError(true)}
            className="h-full w-full object-cover transition-smooth duration-500"
          />
        </div>
      ) : (
        <div className="aspect-video bg-gradient-soft flex items-center justify-center text-7xl">
          {a.emoji}
        </div>
      )}
      <div className="p-5 flex flex-col flex-1">
        <span className="text-xs font-bold text-primary mb-2">{a.category}</span>
        <h3 className="text-lg font-bold leading-snug mb-2 group-hover:text-primary transition-smooth">
          {a.title}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{a.excerpt}</p>
        <div className="mt-auto flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" /> {a.readMin} دقائق قراءة
        </div>
      </div>
    </Link>
  );
}

function EducationIndex() {
  const { articles } = Route.useLoaderData();
  return (
    <div className="container mx-auto px-4 py-10 md:py-12">
      <PageHero
        eyebrow="تعليم • توعية • علم"
        title="مكتبة التوعية الجنسية"
        description="مقالات علمية موثوقة بإشراف مختصين تساعدك على فهم جسدك وعلاقاتك بشكل صحي وآمن. معرفتك هي الخطوة الأولى نحو راحة وثقة أكبر."
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {articles.map((a) => (
          <ArticleCard key={a.slug} a={a} />
        ))}
      </div>
    </div>
  );
}
