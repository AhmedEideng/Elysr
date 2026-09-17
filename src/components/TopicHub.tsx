/**
 * ============================================================
 * TopicHub — شبكة الموضوعات (2026-09-17, Phase B)
 * ============================================================
 * يوصل كل صفحة بموضوعها داخل "Topic Cluster":
 *   • الصفحة الـ pillar  ← قسم "موضوع كامل": كل المحتوى الداعم
 *     (مقالات + أدلة + منتجات) بروابط ووصفية (descriptive anchors).
 *   • صفحة داعمة (satellite) ← "ارجع للدليل الشامل" (روابط صاعدة).
 *   • كل الصفحات ← كروت "مواضيع مرتبطة" (تنقل أفقي بين العناقيد).
 *
 * نفس الروابط بتتحط في الـ HTML الثابت (prerender) عشان الزاحف
 * يشوفها من غير JS — هنا هي نسخة الـ UX.
 * ============================================================
 */
import { Link } from "@tanstack/react-router";
import { type Topic, topicsForPage } from "@/data/topics";
import { articlesMeta } from "@/data/articles-meta.generated";
import { landingPagesMeta } from "@/data/landing-pages-meta.generated";
import { products } from "@/data/products";

const ARTICLE_TITLES = new Map(articlesMeta.map((a) => [a.slug, a.title]));
const GUIDE_TITLES = new Map(landingPagesMeta.map((g) => [g.slug, g.title]));
const PRODUCT_BY_ID = new Map(products.map((p) => [p.id, p]));

/** Link typed لأي pillar (article أو guide) */
function PillarLink({
  topic,
  className,
  children,
}: {
  topic: Topic;
  className?: string;
  children: React.ReactNode;
}) {
  if (topic.pillarKind === "article") {
    return (
      <Link to="/education/$slug" params={{ slug: topic.pillarSlug }} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <Link to="/products/guides/$slug" params={{ slug: topic.pillarSlug }} className={className}>
      {children}
    </Link>
  );
}

/**
 * @param topic        موضوع الصفحة الحالية (أو undefined)
 * @param isPillar     هل الصفحة الحالية هي الـ pillar للموضوع؟
 * @param selfArticleSlug  slug المقال الحالي (للاستبعاد من روابطه)
 * @param selfGuideSlug    slug الدليل الحالي
 * @param selfProductId    id المنتج الحالي
 * @param showRelatedTopics  إظهار قسم "مواضيع مرتبطة" (الافتراضي: أيوه)
 */
export function TopicHub({
  topic,
  isPillar,
  selfArticleSlug,
  selfGuideSlug,
  selfProductId,
  showRelatedTopics = true,
}: {
  topic?: Topic;
  isPillar: boolean;
  selfArticleSlug?: string;
  selfGuideSlug?: string;
  selfProductId?: string;
  showRelatedTopics?: boolean;
}) {
  if (!topic) return null;

  const satellites = topic; // articleSlugs/guideSlugs/productIds على الموضوع نفسه
  const relatedTopics = showRelatedTopics
    ? topicsForPage(topic, 4)
        .filter((t) => t !== topic)
        .slice(0, 3)
    : [];

  // ── روابط المحتوى الداعم (لصفحة الـ pillar) — النوع الصريح للـ
  //    route/params (نفس النمط المعتمد في الكودbase عشان typed routes) ──
  const articleLinks = satellites.articleSlugs
    .filter((s) => s !== selfArticleSlug)
    .map((slug) => ({
      slug,
      label: ARTICLE_TITLES.get(slug) || slug,
    }));
  const guideLinks = satellites.guideSlugs
    .filter((s) => s !== selfGuideSlug)
    .map((slug) => ({
      slug,
      label: GUIDE_TITLES.get(slug) || slug,
    }));
  const productLinks = satellites.productIds
    .filter((id) => id !== selfProductId)
    .map((id) => PRODUCT_BY_ID.get(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .map((p) => ({
      slug: p.slug,
      label: p.name,
    }));

  return (
    <div className="mt-10 space-y-8">
      {/* Satellite → Pillar: الرجوع للدليل الشامل */}
      {!isPillar && (
        <PillarLink
          topic={topic}
          className="flex items-center justify-center gap-2 rounded-2xl border border-primary/20 bg-primary/5 px-5 py-4 text-sm font-black text-primary transition-all hover:bg-primary hover:text-white"
        >
          <span aria-hidden>←</span>
          ارجع للدليل الشامل: {topic.pillarTitle}
        </PillarLink>
      )}

      {/* Pillar → Satellites: موضوع كامل */}
      {isPillar && (
        <section
          aria-label={`موضوع ${topic.name} كامل`}
          className="rounded-[2rem] border border-primary/10 bg-card p-5 shadow-card md:p-7"
        >
          <h2 className="mb-5 flex items-center gap-2 text-xl font-black md:text-2xl">
            <span aria-hidden>{topic.emoji}</span>
            موضوع {topic.name} كامل
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {articleLinks.length > 0 && (
              <div>
                <h3 className="mb-3 text-sm font-black text-primary">مقالات موثقة</h3>
                <ul className="space-y-2">
                  {articleLinks.map((l) => (
                    <li key={l.slug}>
                      <Link
                        to="/education/$slug"
                        params={{ slug: l.slug }}
                        className="text-sm leading-6 text-muted-foreground transition-colors hover:text-primary"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {guideLinks.length > 0 && (
              <div>
                <h3 className="mb-3 text-sm font-black text-primary">أدلة عملية</h3>
                <ul className="space-y-2">
                  {guideLinks.map((l) => (
                    <li key={l.slug}>
                      <Link
                        to="/products/guides/$slug"
                        params={{ slug: l.slug }}
                        className="text-sm leading-6 text-muted-foreground transition-colors hover:text-primary"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {productLinks.length > 0 && (
              <div>
                <h3 className="mb-3 text-sm font-black text-primary">منتجات مختارة</h3>
                <ul className="space-y-2">
                  {productLinks.slice(0, 8).map((l) => (
                    <li key={l.slug}>
                      <Link
                        to="/products/$slug"
                        params={{ slug: l.slug }}
                        className="text-sm leading-6 text-muted-foreground transition-colors hover:text-primary"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Related topics: تنقل أفقي بين العناقيد */}
      {relatedTopics.length > 0 && (
        <section aria-label="مواضيع مرتبطة" className="mt-2">
          <h2 className="mb-4 text-xl font-black md:text-2xl">مواضيع مرتبطة</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {relatedTopics.map((t) => (
              <PillarLink
                key={t.id}
                topic={t}
                className="group rounded-3xl border border-primary/10 bg-card p-5 shadow-sm transition-all hover:border-primary/40 hover:shadow-card"
              >
                <div className="mb-2 text-2xl" aria-hidden>
                  {t.emoji}
                </div>
                <h3 className="font-black leading-6 text-foreground transition-colors group-hover:text-primary">
                  {t.pillarTitle}
                </h3>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{t.description}</p>
              </PillarLink>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
