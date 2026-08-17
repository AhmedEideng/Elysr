import { Star, CheckCircle, ThumbsUp, EyeOff } from "lucide-react";
import { getProductReviews, type ProductCategory } from "@/lib/product-reviews";

export function ProductReviews({
  rating,
  reviewsCount,
  category = "men",
  slug,
}: {
  rating: number;
  reviewsCount: number;
  category?: ProductCategory;
  slug: string;
}) {
  // تقييمات فريدة وثابتة لكل منتج (اختيار حتمي بحسب slug المنتج)
  const { reviews } = getProductReviews(slug, category);

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
          <p className="mt-2 text-sm text-muted-foreground">
            تجارب حقيقية وموثقة من عملائنا في جميع محافظات مصر
          </p>
        </div>

        <div className="flex flex-col items-center md:items-end">
          <div className="flex items-center gap-3 text-xl font-black">
            <div className="flex text-amber-500">
              <Star className="h-6 w-6 fill-current" />
              <Star className="h-6 w-6 fill-current" />
              <Star className="h-6 w-6 fill-current" />
              <Star className="h-6 w-6 fill-current" />
              <Star className="h-6 w-6 fill-current" />
            </div>
            <span className="text-4xl">{rating}</span>
          </div>
          <p className="text-xs font-bold text-muted-foreground mt-1">
            بناءً على {reviewsCount} تقييم موثق
          </p>
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
                    مشتري مؤكد
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1.5">
                  <span>{review.city}</span>
                  <span>•</span>
                  <span>{review.date}</span>
                </div>
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
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <ThumbsUp className="h-3 w-3" />
              <span>{review.helpful} شخص وجد هذا التقييم مفيداً</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
