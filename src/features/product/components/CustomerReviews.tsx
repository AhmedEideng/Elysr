import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, Clock, Loader2, Send, ShieldCheck, Star } from "lucide-react";

interface LiveReview {
  name: string;
  rating: number;
  date: string;
  text: string;
  verified: boolean;
}

const MAX_TEXT = 600;
const MIN_TEXT = 10;

/** تسميات التقييم المعروضة بجانب النجوم (صيغة مذكر رسمية) */
const RATING_LABELS: Record<number, string> = {
  1: "ضعيف",
  2: "مقبول",
  3: "جيد",
  4: "جيد جدًا",
  5: "ممتاز",
};

function Stars({ value, size = "md" }: { value: number; size?: "sm" | "md" }) {
  const cls = size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5";
  return (
    <div className="flex items-center gap-0.5 text-amber-500">
      {[...Array(5)].map((_, i) => (
        <Star key={i} className={`${cls} ${i < value ? "fill-current" : "opacity-25"}`} />
      ))}
    </div>
  );
}

/**
 * المراجعات الحقيقية من العملاء (المعتمدة فقط) —
 * قسم مستقل عن التقييمات المعروضة أعلاه:
 * - يُجلب من /api/reviews (Apps Script ← شيت "المراجعات" المعتمدة).
 * - بدون مراجعات معتمدة → لا قائمة (لا نعرض أي محتوى بلا مصدر).
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
  const textValid = textLength >= MIN_TEXT && textLength <= MAX_TEXT;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || submitted) return;
    if (rating < 1 || !textValid) return;

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
      setError("تعذر إرسال المراجعة. يرجى المحاولة مرة أخرى.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mt-8 mb-8 rounded-[2rem] border border-border/50 bg-card p-6 md:p-8 shadow-sm">
      {/* ── ترويسة القسم ── */}
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-brand text-primary-foreground shadow-sm">
          <Star className="h-5 w-5 fill-current" />
        </span>
        <div>
          <h2 className="text-xl font-extrabold tracking-tight md:text-2xl">تجارب عملاء حقيقية</h2>
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground md:text-sm">
            مراجعات موثقة تُعرض بعد مراجعتها واعتمادها — دون أي تقييمات وهمية.
          </p>
        </div>
      </div>

      {/* ── المراجعات المعتمدة (تظهر فقط إن وُجدت فعلاً) ── */}
      {reviews !== null && reviews.length > 0 && (
        <div className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-black text-foreground">{average}</span>
              <Stars value={Math.round(average)} size="md" />
            </div>
            <span className="text-xs font-bold text-emerald-800">
              متوسط {reviews.length} مراجعة موثقة
            </span>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {reviews.map((review, i) => (
              <article
                key={`${review.date}-${i}`}
                className="rounded-2xl border border-border/60 bg-background p-5 shadow-sm transition-smooth hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-brand text-sm font-black text-primary-foreground">
                      {review.name.trim().charAt(0) || "ع"}
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-sm font-bold">
                        {review.name}
                        {review.verified && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700 ring-1 ring-emerald-200">
                            <BadgeCheck className="h-3 w-3" />
                            شراء موثق
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <Stars value={review.rating} size="sm" />
                        {review.date && (
                          <span className="text-[11px] text-muted-foreground">{review.date}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-sm font-medium leading-relaxed text-foreground/90">
                  {review.text}
                </p>
              </article>
            ))}
          </div>
        </div>
      )}

      {/* ── نموذج المشاركة ── */}
      <div className="mt-6 rounded-2xl border border-border/60 bg-background p-5 md:p-6">
        <h3 className="text-base font-extrabold">شاركنا تجربتك</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          تجربتك الصادقة تساعد عملاءنا على اتخاذ قرارهم بثقة.
        </p>

        {submitted ? (
          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
            <Clock className="h-5 w-5 shrink-0 text-emerald-600" />
            <p className="text-sm font-bold leading-6 text-emerald-800">
              شكرًا لك! تم استلام مراجعتك وهي الآن قيد المراجعة — ستظهر للعملاء فور اعتمادها.
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate>
            {/* التقييم */}
            <div className="mt-4 flex flex-col items-center gap-1.5 rounded-2xl border border-border/50 bg-card px-4 py-4">
              <div className="flex items-center gap-1.5" role="radiogroup" aria-label="التقييم">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={rating === value}
                    aria-label={`${value} من 5 نجوم`}
                    onClick={() => setRating(value)}
                    className="p-1 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-lg"
                  >
                    <Star
                      className={`h-9 w-9 transition-colors ${
                        value <= rating ? "fill-amber-500 text-amber-500" : "text-border"
                      }`}
                    />
                  </button>
                ))}
              </div>
              <p
                aria-live="polite"
                className={`text-xs font-bold ${rating > 0 ? "text-amber-600" : "text-muted-foreground"}`}
              >
                {rating > 0 ? `تقييمك: ${RATING_LABELS[rating]}` : "اختر تقييمك بالنجوم"}
              </p>
            </div>

            {/* الحقول */}
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-muted-foreground">
                  الاسم <span className="font-normal">(اختياري)</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={60}
                  placeholder="اسمك (اختياري)"
                  className="w-full rounded-xl border bg-card px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-muted-foreground">
                  رقم الهاتف <span className="font-normal">(اختياري — للتحقق من الشراء فقط)</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={16}
                  dir="ltr"
                  placeholder="01xxxxxxxxx"
                  className="w-full rounded-xl border bg-card px-4 py-2.5 text-right text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs font-bold text-muted-foreground">تجربتك مع المنتج</label>
                <span
                  className={`text-[11px] font-bold ${
                    textValid ? "text-emerald-600" : "text-muted-foreground"
                  }`}
                >
                  {textLength}/{MAX_TEXT}
                </span>
              </div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={4}
                maxLength={MAX_TEXT}
                required
                placeholder="اكتب تجربتك الصادقة مع المنتج (10 أحرف على الأقل)…"
                className="w-full resize-none rounded-xl border bg-card px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {error && (
              <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-bold text-red-700">
                {error}
              </p>
            )}

            {/* سبب تعطيل الزر — واضح ودائم */}
            {!submitting && (rating < 1 || !textValid) && (
              <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-bold text-amber-800">
                {rating < 1
                  ? "اختر تقييمك بالنجوم أولًا."
                  : textLength > MAX_TEXT
                    ? "المراجعة أطول من الحد المسموح (600 حرف)."
                    : `اكتب ${MIN_TEXT} أحرف على الأقل في المراجعة (حتى الآن: ${textLength}).`}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || rating < 1 || !textValid}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-brand px-6 py-3.5 text-sm font-bold text-primary-foreground shadow-elegant transition-smooth hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جارٍ إرسال المراجعة…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  إرسال المراجعة
                </>
              )}
            </button>

            <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
              نحافظ على خصوصيتك: رقم هاتفك لا يُنشر ويُستخدم للتحقق من الشراء فقط.
            </p>
          </form>
        )}
      </div>
    </section>
  );
}
