import { Link } from "@tanstack/react-router";
import { BookOpen, ArrowLeft, Stethoscope } from "lucide-react";

// نصائح طبية يومية متغيرة (تتغير تلقائياً كل يوم بناءً على التاريخ)
const dailyTips = [
  {
    headline: "الغذاء هو وقود حياتك الزوجية، فاجعل اختياراتك ذكية.",
    text: "هل تعلم أن المحار والمكسرات والبطيخ ليست مجرد أطعمة، بل هي محفزات طبيعية غنية بالزنك والسيترولين التي تحسن الدورة الدموية بشكل مباشر؟",
    slug: "nutrition-libido",
    emoji: "🥑",
  },
  {
    headline: "النوم الجيد أساس الأداء الجنسي القوي.",
    text: "قلة النوم تقلل من مستويات التستوستيرون وتزيد من التوتر. احرص على 7-8 ساعات نوم منتظمة كل ليلة لتحسين الرغبة والانتصاب بشكل ملحوظ.",
    slug: "sleep-and-sex",
    emoji: "😴",
  },
  {
    headline: "التوتر يقتل الرغبة... تعلم كيف تتخلص منه.",
    text: "الضغط النفسي يرفع الكورتيزول ويقلل الرغبة الجنسية. جرب تمارين التنفس العميق أو المشي اليومي لمدة 20 دقيقة، ستشعر بالفرق سريعاً.",
    slug: "stress-and-libido",
    emoji: "🧘",
  },
  {
    headline: "التواصل الصريح مع الشريك يصنع الفرق.",
    text: "أكثر من 60% من المشاكل الجنسية تبدأ من عدم الحديث. خصص وقتاً كل أسبوع للحديث بصراحة عن احتياجاتكما دون لوم أو انتقاد.",
    slug: "communication-couples",
    emoji: "💬",
  },
  {
    headline: "تمارين كيغل ليست للنساء فقط!",
    text: "تمارين تقوية عضلات قاع الحوض تحسن التحكم في الانتصاب والقذف للرجال، وتزيد من شدة النشوة للنساء. مارسها يومياً في أي مكان.",
    slug: "kegel-exercises",
    emoji: "🏋️",
  },
  {
    headline: "الترطيب الجيد يحسن الدورة الدموية والأداء.",
    text: "الجفاف يؤثر سلباً على تدفق الدم والطاقة. اشرب ما لا يقل عن 2-3 لتر ماء يومياً، خاصة قبل العلاقة الحميمة.",
    slug: "nutrition-libido",
    emoji: "💧",
  },
  {
    headline: "اللمس والاحتضان يومياً يقويان علاقتكما.",
    text: "المداعبة والاحتضان والقبلات اليومية تفرز هرمونات السعادة والترابط، وتزيد من الرغبة والتقارب بين الزوجين. اجعلها جزءاً من روتينكما اليومي.",
    slug: "communication-couples",
    emoji: "🤗",
  },
  {
    headline: "اختيار المنتج المناسب يبدأ بفهم احتياجك",
    text: "قبل شراء أي منتج للصحة الزوجية، حدّد هدفك بوضوح: دعم الطاقة، التحكم في التوقيت، الراحة أو الترطيب. اقرأ المكونات والتحذيرات بعناية، وابدأ بأقل جرعة، ولا تتردد في الاستعانة بمختص عند وجود حالة صحية أو أدوية مزمنة.",
    slug: "best-selling-products-guide",
    emoji: "🏆",
  },
];

export function DailyAdvice() {
  // ✅ محتوى ثابت: نعرض نصاً واحداً محدداً لجميع الزوار وجميع الزيارات.
  // إزالة التغيير اليومي التلقائي — كان يجعل الصفحة الرئيسية تظهر بنص
  // مختلف في كل زحف لجوجل (محتوى غير مستقر)، ما يربك الفهرسة. الآن المحتوى
  // ثابت ومطابق لما يفهرسه جوجل.
  const tip = dailyTips[0];

  return (
    <section className="py-6 md:py-8">
      <div className="container mx-auto px-4">
        <div
          className="relative overflow-hidden rounded-[2.5rem] p-8 shadow-elegant md:p-12 text-white"
          style={{
            backgroundImage: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 50%, #0369a1 100%)",
            backgroundColor: "#0284c7",
          }}
        >
          {/* ✨ تأثير اللمعان المتحرك */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 animate-promo-shine"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)",
              transform: "skewX(-12deg)",
            }}
          />

          {/* 🌟 النقاط اللامعة كخلفية */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />

          {/* خلفية جمالية — subtle blurred glows باللون السماوي */}
          <div className="absolute top-0 left-0 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-400/20 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-64 w-64 translate-x-1/2 translate-y-1/2 rounded-full bg-cyan-600/30 blur-3xl" />

          <div className="relative z-10 grid gap-10 md:grid-cols-2 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-md px-4 py-1.5 text-xs font-bold uppercase tracking-wider">
                <Stethoscope className="h-4 w-4" /> نصيحة طبية اليوم
              </div>
              <h2 className="text-3xl font-black leading-tight md:text-4xl">{tip.headline}</h2>
              <p className="text-lg font-medium opacity-90 leading-relaxed">{tip.text}</p>
              <div className="flex flex-wrap gap-4 pt-2">
                <Link
                  to="/education/$slug"
                  params={{ slug: tip.slug }}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 font-black text-sky-700 shadow-lg transition-smooth hover:scale-105"
                >
                  <BookOpen className="h-5 w-5" /> اقرأ المقال كاملاً
                </Link>
                <Link
                  to="/products/men"
                  className="inline-flex items-center gap-2 rounded-full border-2 border-white/80 bg-white/15 px-6 py-3.5 font-black text-white backdrop-blur-sm transition-smooth hover:bg-white/25"
                >
                  تسوّق الأكثر مبيعاً <ArrowLeft className="h-5 w-5" />
                </Link>
              </div>
            </div>

            <div className="hidden justify-center md:flex">
              <div className="relative flex h-64 w-64 animate-float items-center justify-center rounded-full border border-white/20 bg-white/10">
                <span className="text-9xl">{tip.emoji}</span>
                <div className="absolute -top-4 -right-4 flex h-16 w-16 rotate-12 items-center justify-center rounded-2xl bg-white shadow-lg text-primary">
                  <Heart className="h-8 w-8 fill-primary" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Heart({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  );
}
