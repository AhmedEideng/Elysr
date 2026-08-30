import { useEffect, useMemo, useState } from "react";
import { CheckCircle, Clock, Loader2, Send, Star } from "lucide-react";

interface LiveReview {
  name: string;
  rating: number;
  date: string;
  text: string;
  verified: boolean;
}

const MAX_TEXT = 600;
const MIN_TEXT = 10;

/**
 * المراجعات الحقيقية من العملاء (المعتمدة فقط) —
 * قسم مستقل عن التقييمات المعروضة أعلاه:
 * - يُجلب من /api/reviews (Apps Script ← شيت "المراجعات" المعتمدة).
 * - بدون مراجعات معتمدة → لا يظهر قسم العرض (لا نعرض أي محتوى بلا مصدر).
 * - النموذج متاح دائماً: المراجعة الجديدة تُسجل "قيد المراجعة"
 *   ولا تظهر إلا بعد اعتماد المالك — لا مراجعات وهمية.
 */
export function CustomerReviews({ productId }: { productId: string }) {
  const [reviews, setReviews] = useState<LiveReview[] | null>(null);
  const [rating, setRating] = useState(0);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // جلب المراجعات المعتمدة (بحد زمني + إلغاء عند مغادرة الصفحة)
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    fetch(`/api/reviews?product=${encodeURIComponent(productId)}`, {
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : { reviews: [] }))
      .then((data: { reviews?: LiveReview[] }) => {
        setReviews(Array.isArray(data.reviews) ? data.reviews : []);
      })
      .catch(() => {
        // فشل الشبكة لا يكسر الصفحة — القسم يظهر فقط إذا وجدت مراجعات
        setReviews([]);
      })
      .finally(() => clearTimeout(timeout));
    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [productId]);

  const average = useMemo(() => {
    if (!reviews || reviews.length === 0) return 0;
    return Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10;
  }, [reviews]);

  const textLength = text.trim().length;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || submitted) return;
    if (rating < 1 || textLength < MIN_TEXT || textLength > MAX_TEXT) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/submit-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          rating,
          reviewerName: name.trim() || undefined,
          reviewerPhone: phone.trim() || undefined,
          reviewText: text.trim(),
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSubmitted(true);
    } catch {
      setError("حدث خطأ أثناء إرسال مراجعتك. حاول مرة أخرى من فضلك.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mt-8 mb-8 rounded-[2rem] border border-border/50 bg-card p-6 md:p-8 shadow-sm">
      <h2 className="text-2xl md:text-3xl font-bold">تجارب حقيقية من عملائنا</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        مراجعات حقيقية بعد اعتمادها — بدون أي تقييمات وهمية. مشاركة تجربتك تساعد عملاءنا
        على اتخاذ القرار بثقة.
      </p>

      {/* ── المراجعات المعتمدة (تظهر فقط إن وُجدت فعلاً) ── */}
      {reviews !== null && reviews.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 px-4 py-3">
            <div className="flex items-center gap-1.5 text-amber-500">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-5 w-5 ${i < Math.round(average) ? "fill-current" : "opacity-30"}`}
                />
              ))}
            </div>
            <span className="text-lg font-black">{average}</span>
            <span className="text-xs font-bold text-emerald-800">
              بناءً على {reviews.length} مراجعة حقيقية معتمدة
            </span>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {reviews.map((review, i) => (
              <div
                key={`${review.date}-${i}`}
                className="rounded-2xl border border-primary/5 bg-background p-5 shadow-sm transition-smooth hover:shadow-md"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 font-bold text-foreground">
                      <span>{review.name}</span>
                      {review.verified && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700">
                          <CheckCircle className="h-3 w-3 text-emerald-600" />
                          مشتري مؤكد
                        </span>
                      )}
                    </div>
                    {review.date ? (
                      <div className="text-[11px] text-muted-foreground mt-1.5">
                        {review.date}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex text-amber-500">
                    {[...Array(review.rating)].map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-current" />
                    ))}
                  </div>
                </div>
                <p className="text-sm font-medium leading-relaxed text-foreground/90">
                  “{review.text}”
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── نموذج المشاركة ── */}
      <div className="mt-6 rounded-2xl border border-border/60 bg-background p-5 md:p-6">
        {submitted ? (
          <div className="flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-4">
            <Clock className="h-5 w-5 text-emerald-600 shrink-0" />
            <p className="text-sm font-bold text-emerald-800">
              شكراً لك! وصلت مراجعتك وهي الآن قيد المراجعة — ستظهر للعملاء فور اعتمادها.
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h3 className="font-bold">شارك تجربتك مع هذا المنتج</h3>
              {/* نجوم التقييم */}
              <div className="flex items-center gap-1" role="radiogroup" aria-label="التقييم">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={rating === value}
                    aria-label={`${value} من 5 نجوم`}
                    onClick={() => setRating(value)}
                    className="p-0.5 transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-7 w-7 transition-colors ${
                        value <= rating ? "fill-amber-500 text-amber-500" : "text-border"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                placeholder="اسمك (اختياري)"
                className="w-full rounded-xl border bg-card px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
              />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={16}
                dir="ltr"
                placeholder="01xxxxxxxxx"
                className="w-full rounded-xl border bg-card px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition text-right"
              />
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              رقم هاتفك (اختياري) يُستخدم فقط للتحقق من أنك مشترٍ فعلي — لا يُنشر أبداً.
            </p>

            <div className="relative mt-3">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={4}
                maxLength={MAX_TEXT}
                required
                placeholder="اكتب تجربتك الصادقة مع المنتج (10 حروف على الأقل)…"
                className="w-full rounded-xl border bg-card px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition resize-none"
              />
              <span className="absolute bottom-3 left-3 text-[10px] font-bold text-muted-foreground">
                {textLength}/{MAX_TEXT}
              </span>
            </div>

            {error && (
              <p className="mt-3 rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-xs font-bold text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || rating < 1 || textLength < MIN_TEXT || textLength > MAX_TEXT}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-brand px-6 py-3 text-sm font-bold text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جاري الإرسال…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  إرسال مراجعتي
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
