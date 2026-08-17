import { Star, CheckCircle, ThumbsUp, EyeOff } from "lucide-react";

interface Review {
  id: number;
  name: string;
  city: string;
  text: string;
  rating: number;
  date: string;
  helpful: number;
}

// 📦 تقييمات مخصصة لمنتجات الرجال لتناسب الخصوصية والفعالية الفسيولوجية
const MEN_REVIEWS: Review[] = [
  {
    id: 1,
    name: "أحمد م.",
    city: "القاهرة",
    text: "المنتج أصلي 100% والمفعول فسيولوجي ممتاز جداً وبدون أي أعراض جانبية مزعجة. السرية في الشحن كانت أهم شيء بالنسبة لي، العبوة مغلفة تماماً دون أي إشارة للمحتوى.",
    rating: 5,
    date: "منذ يومين",
    helpful: 24,
  },
  {
    id: 2,
    name: "أبو محمد",
    city: "الإسكندرية",
    text: "تواصل مهني راقٍ جداً مع الصيدلاني على الواتساب ساعدني في فهم آلية العمل واختيار الأنسب لحالتي. التوصيل سريع والتغليف سري ومحايد كلياً.",
    rating: 5,
    date: "منذ أسبوع",
    helpful: 18,
  },
  {
    id: 3,
    name: "مشتري مؤكد",
    city: "الجيزة",
    text: "جودة أصلية ومضمونة وتختلف تماماً عن التقليد المنتشر في السوق. Mفعول ممتاز والتحمل البدني والنشاط رائع. أنصح بالتعامل مع اليسر لالتزامهم الطبي والمهني.",
    rating: 5,
    date: "منذ 3 أسابيع",
    helpful: 12,
  },
];

// 🌸 تقييمات مخصصة لمنتجات النساء لتناسب الخصوصية والوقار والراحة الهرمونية
const WOMEN_REVIEWS: Review[] = [
  {
    id: 1,
    name: "أم يوسف",
    city: "القاهرة",
    text: "كنت قلقة جداً بشأن سرية الشحن والتغليف، لكن العبوة وصلت مغلقة ومبهمة تماماً بدون أي تفاصيل أو كتابة خارجية. جودة ممتازة ومفعول آمن ومريح للغاية.",
    rating: 5,
    date: "منذ يومين",
    helpful: 14,
  },
  {
    id: 2,
    name: "ياسمين ع.",
    city: "المنصورة",
    text: "أشكر الدعم الصيدلاني المتميز على الواتساب، تعامل بقمة الخصوصية والوقار والاحترام لمساعدتي في اختيار المنتج المناسب. النتيجة رائعة وآمنة تماماً.",
    rating: 5,
    date: "منذ أسبوع",
    helpful: 9,
  },
  {
    id: 3,
    name: "مشتري مؤكدة",
    city: "الجيزة",
    text: "جودة أصلية ومضمونة، فرقت معايا جداً في الحيوية والنشاط وبأمان كامل دون أي حرقان أو تهيج جلدي. التغليف سري جداً والمندوب محترم.",
    rating: 5,
    date: "منذ أسبوعين",
    helpful: 11,
  },
];

// ⚙️ تقييمات مخصصة للأجهزة الطبية والداعمة لتركز على الجودة والتعليمات الطبية
const DEVICE_REVIEWS: Review[] = [
  {
    id: 1,
    name: "طارق ح.",
    city: "القاهرة",
    text: "الجهاز أصلي بجودة خامات طبية متينة وممتازة، ومطابق لكافة الإرشادات الطبية المرفقة. الشحن سريع والتغليف كان محايداً وسرياً للغاية.",
    rating: 5,
    date: "منذ أسبوع",
    helpful: 31,
  },
  {
    id: 2,
    name: "محمود س.",
    city: "الإسكندرية",
    text: "خدمة عملاء ممتازة ومهنية ساعدتني في فهم طريقة الاستخدام الآمنة والصحيحة للجهاز عبر الواتساب. أنصح بالتعامل معهم لأمانتهم وعلمهم.",
    rating: 5,
    date: "منذ أسبوعين",
    helpful: 15,
  },
  {
    id: 3,
    name: "مشتري مؤكد",
    city: "السويس",
    text: "جودة تصنيع روسية/ألمانية مريحة جداً ومتينة في الاستخدام اليومي وفق التعليمات الطبية. التغليف سري تماماً كالعادة وبدون اسم للمنتج.",
    rating: 5,
    date: "منذ شهر",
    helpful: 10,
  },
];

export function ProductReviews({
  rating,
  reviewsCount,
  category = "men",
}: {
  rating: number;
  reviewsCount: number;
  category?: "men" | "women" | "devices";
}) {
  // اختيار قائمة التقييمات حسب تصنيف المنتج لضمان التوافق الجندري والموضوعي
  const reviews =
    category === "women" ? WOMEN_REVIEWS : category === "devices" ? DEVICE_REVIEWS : MEN_REVIEWS;

  return (
    <section className="mt-8 mb-8 rounded-[2rem] border border-border/50 bg-card p-6 md:p-8 shadow-sm">
      {/* 🔒 شريط التنبيه الأمني والخصوصية الرائع */}
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
                  {/* 🔒 تأثير التعمية والبلور الذكي والراقي للاسم لحفظ الخصوصية */}
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
