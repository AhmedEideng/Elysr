import { Link } from "@tanstack/react-router";
import { BookOpen, ArrowLeft, Stethoscope } from "lucide-react";

export function DailyAdvice() {
  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-brand p-8 shadow-elegant md:p-12 text-primary-foreground">
          {/* خلفية جمالية */}
          <div className="absolute top-0 left-0 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-64 w-64 translate-x-1/2 translate-y-1/2 rounded-full bg-primary-glow/20 blur-3xl" />

          <div className="relative z-10 grid gap-10 md:grid-cols-2 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-md px-4 py-1.5 text-xs font-bold uppercase tracking-wider">
                <Stethoscope className="h-4 w-4" /> نصيحة طبية اليوم
              </div>
              <h2 className="text-3xl font-black leading-tight md:text-4xl">
                الغذاء هو وقود حياتك الزوجية، فاجعل اختياراتك ذكية.
              </h2>
              <p className="text-lg font-medium opacity-90 leading-relaxed">
                هل تعلم أن المحار والمكسرات والبطيخ ليست مجرد أطعمة، بل هي محفزات طبيعية غنية بالزنك
                والسيترولين التي تحسن الدورة الدموية بشكل مباشر؟
              </p>
              <div className="flex flex-wrap gap-4 pt-2">
                <Link
                  to="/education/$slug"
                  params={{ slug: "nutrition-libido" }}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 font-bold text-primary transition-smooth hover:scale-105 hover:bg-opacity-90"
                >
                  <BookOpen className="h-5 w-5" /> اقرأ المقال كاملاً
                </Link>
                <Link
                  to="/products/men"
                  className="inline-flex items-center gap-2 rounded-full border-2 border-white/30 bg-white/5 backdrop-blur-sm px-6 py-3.5 font-bold transition-smooth hover:bg-white/10"
                >
                  منتجات ذات صلة <ArrowLeft className="h-5 w-5" />
                </Link>
              </div>
            </div>

            <div className="hidden justify-center md:flex">
              <div className="relative flex h-64 w-64 animate-float items-center justify-center rounded-full border border-white/20 bg-white/10">
                <span className="text-9xl">🥑</span>
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
