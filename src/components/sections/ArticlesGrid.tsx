import { Link } from "@tanstack/react-router";
import { BookOpen, Clock } from "lucide-react";
import { ARTICLE_COUNT, featuredArticleCards } from "@/data/articles-cards.generated";

// 🚀 البطاقات مولّدة وقت البناء من نفس المصدر (src/data/articles.ts) في
// module صغير بلا حقل content — عشان الـ chunk الكامل data-articles (~78KB)
// ما يدخلش المسار الحرج للـ homepage (نافذة الـ LCP). الترتيب = الترتيب
// الفعّال (نية شراء أعلى أولاً) ومحدد في scripts/generate-sitemap.mjs.
// CLS: استيراد ثابت فتظهر الكروت مع أول render ولا قفزة تخطيط.
const featured = featuredArticleCards;

export function ArticlesGrid() {
  return (
    <section className="py-8 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <span className="inline-block rounded-full bg-accent px-4 py-1 text-xs font-bold text-primary mb-3">
            🩺 توعية صحية موثوقة
          </span>
          <h2 className="text-3xl md:text-4xl font-black">مكتبة التوعية والصحة الزوجية</h2>
          <p className="text-muted-foreground mt-2 max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
            مقالات ونصوص توعوية مبسطة من خبرائنا تساعدك على فهم احتياجاتك لتعزيز جودة حياتك الزوجية
            بأمان
          </p>
        </div>

        {/* شبكة متجاوبة تعرض 4 مقالات في صف واحد على الشاشات الكبيرة */}
        {/* 🚀 كل كارت بارتفاع ثابت h-[420px] يمنع تغيّر ارتفاع الأعمدة */}
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 items-stretch">
          {featured.map((article) => (
            <Link
              key={article.slug}
              to="/education/$slug"
              params={{ slug: article.slug }}
              className="group flex h-[420px] flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
            >
              {article.image && (
                <div className="relative h-44 w-full shrink-0 overflow-hidden bg-muted">
                  <img
                    src={article.image}
                    alt={article.title}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute top-3 right-3 rounded-full bg-white/90 px-3 py-1 text-[10px] font-bold text-primary backdrop-blur-sm">
                    {article.category}
                  </div>
                </div>
              )}

              <div className="flex flex-1 flex-col p-4.5">
                <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{article.readMin} دقائق قراءة</span>
                  <span className="text-base leading-none">{article.emoji}</span>
                </div>

                <h3 className="mb-1.5 line-clamp-2 text-base font-bold leading-snug text-foreground group-hover:text-primary transition-colors">
                  {article.title}
                </h3>

                <p className="line-clamp-3 flex-1 text-xs leading-relaxed text-muted-foreground">
                  {article.excerpt}
                </p>

                <div className="mt-3.5 flex items-center gap-1.5 text-xs font-bold text-primary">
                  اقرأ المقال الآن
                  <BookOpen className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            to="/education"
            className="inline-flex items-center gap-2 rounded-full border border-primary px-8 py-3 text-sm font-bold text-primary transition hover:bg-primary hover:text-primary-foreground"
          >
            عرض كل المقالات التوعوية ({ARTICLE_COUNT} مقالة)
            <BookOpen className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
