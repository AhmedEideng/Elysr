import { Star, CheckCircle, ThumbsUp, EyeOff } from "lucide-react";
import {
  getArchivedReviewSummary,
  getProductReviews,
  type ProductCategory,
} from "@/lib/legacy-product-reviews";

/**
 * ⭐ نجوم بمعدّل حقيقي (2026-11-14).
 * قبل ذلك كانت الصفحة ترسم 5 نجوم ذهبية ثابتة لأي تقييم — فمنتج بـ 4.6 يظهر
 * كأنه 5/5، وهو تضليل بصري + تعارض مع `aggregateRating` في الـ schema.
 * التنفيذ: طبقة رمادية (خلفية) + طبقة ذهبية مقصوصة بعرض = النسبة المئوية،
 * فلا حاجة لأيقونات نصف نجمة ولا لمكتبة إضافية.
 */
function RatingStars({ value, className = "h-6 w-6" }: { value: number; className?: string }) {
  const clamped = Math.max(0, Math.min(5, value));
  const percent = (clamped / 5) * 100;
  return (
    <div className="relative inline-flex" role="img" aria-label={`التقييم ${clamped} من 5`}>
      <div className="flex text-amber-200">
        {[0, 1, 2, 3, 4].map((i) => (
          <Star key={i} className={className} />
        ))}
      </div>
      <div
        className="absolute inset-y-0 start-0 flex overflow-hidden text-amber-500"
        style={{ width: `${percent}%` }}
        aria-hidden="true"
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <Star key={i} className={`${className} shrink-0 fill-current`} />
        ))}
      </div>
    </div>
  );
}

export function LegacyProductReviews({
  rating,
  reviewsCount,
  category = "men",
  slug,
  maxVisibleReviews = 4,
}: {
  rating: number;
  reviewsCount: number;
  category?: ProductCategory;
  slug: string;
  maxVisibleReviews?: number;
}) {
  // Product-specific archive only; never substitute reviews from another product.
  const { reviews } = getProductReviews(
    slug,
    category,
    Math.min(reviewsCount, Math.max(1, maxVisibleReviews)),
  );

  // (2026-11-14) مصدر واحد للأرقام المعروضة: ملخص الأرشيف نفسه الذي يبني
  // `aggregateRating` في الـ schema — فالواجهة والـ markup لا يتفرقان أبداً.
  const archivedSummary = getArchivedReviewSummary(slug);
  const displayRating = archivedSummary?.rating ?? rating;
  const displayCount = archivedSummary?.reviewCount ?? reviewsCount;

  if (!reviews.length) return null;

  return (
    <section className="mt-8 mb-8 rounded-[2rem] border border-border/50 bg-card p-6 md:p-8 shadow-sm">
      {/* 🔒 شريط التنبيه الأمني والخصوصية */}
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-3 rounded-2xl bg-amber-50/60 border border-amber-100 px-4 py-3 text-xs text-amber-800 font-bold">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <EyeOff className="h-4 w-4" />
        </div>
        <p className="leading-relaxed">
          🔒 <strong>حفاظاً على السرية التامة والخصوصية المطلقة لعملائنا:</strong> يتم حجب أسماء
          المشترين وتعميتها برمجياً (Blur Effect) لضمان حماية وسرية هويتكم الطبية والزوجية بنسبة
          100%.
        </p>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8 border-b pb-8">
        <div className="text-center md:text-right">
          <h2 className="text-2xl md:text-3xl font-bold">آراء وتقييمات العملاء</h2>
          <p className="mt-2 text-sm text-muted-foreground">تجارب حقيقية من عملاء سابقين</p>
        </div>

        <div className="flex flex-col items-center md:items-end">
          <div className="flex items-center gap-3 text-xl font-black">
            <RatingStars value={displayRating} />
            <span className="text-4xl">{displayRating}</span>
          </div>
          <p className="text-xs font-bold text-muted-foreground mt-1">
            بناءً على {displayCount} تقييم سابق
          </p>
          {reviews.length < displayCount ? (
            <p className="text-[11px] text-muted-foreground mt-0.5">
              (نعرض {reviews.length} من أصل {displayCount} — الأحدث أولاً)
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {reviews.map((review) => (
          <div
            key={review.id}
            className="rounded-2xl border border-primary/5 bg-background p-5 shadow-sm transition-smooth hover:shadow-md"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 font-bold text-foreground">
                  {/* 🔒 تأثير التعمية والبلور للاسم لحفظ الخصوصية */}
                  <span className="blur-[4px] select-none pointer-events-none tracking-widest text-slate-500/80 bg-slate-100/50 px-2.5 py-0.5 rounded-lg text-xs font-black">
                    {review.name}
                  </span>

                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700">
                    <CheckCircle className="h-3 w-3 text-emerald-600" />
                    رأي عميل
                  </span>
                </div>
                {review.city || review.fixedDate ? (
                  <div className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1.5">
                    {review.city ? (
                      <>
                        <span>{review.city}</span>
                        {review.fixedDate ? <span>•</span> : null}
                      </>
                    ) : null}
                    {review.fixedDate ? <span>{review.date}</span> : null}
                  </div>
                ) : null}
              </div>
              <div className="flex text-amber-500">
                {[...Array(review.rating)].map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-current" />
                ))}
              </div>
            </div>
            <p className="text-sm font-medium leading-relaxed text-foreground/90 my-3">
              "{review.text}"
            </p>
            {review.helpful > 0 ? (
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <ThumbsUp className="h-3 w-3" />
                <span>{review.helpful} شخص وجد هذا التقييم مفيداً</span>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
