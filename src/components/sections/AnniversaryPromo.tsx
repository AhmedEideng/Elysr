import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Sparkles, Clock, ArrowLeft, ChevronLeft } from "lucide-react";
import { PROMO_TITLE, PROMO_TAGLINE, PROMO_TIERS, getTimeLeft, isPromoActive } from "@/lib/promo";
import type { TimeLeft } from "@/lib/promo";

/**
 * 💎 شريط "مبادرة الرعاية الماسية" — شريط متميز ومحفز أسفل الـ Hero
 *
 * التصميم: شريط أفقي مضغوط (compact horizontal bar)
 * - الارتفاع: ~56-72px (يتجاوب مع الموبايل)
 * - الخلفية: gradient طبي وقور وعميق slate-blue→teal→navy
 * - المحتوى: شارة + عنوان + الشرائح + العداد + CTA
 * - mobile: يتحول لـ stacked layout
 *
 * يستخدم React state بدلاً من refs لتجنب مشاكل
 * SSR + hydration cycle مع DOM manipulation.
 */
export function AnniversaryPromo() {
  // 🐛 Fix: useState بـ lazy initializer ثم setInterval
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(() =>
    isPromoActive() ? getTimeLeft() : null,
  );

  useEffect(() => {
    if (!isPromoActive()) return;

    const intervalId = window.setInterval(() => {
      const next = getTimeLeft();
      setTimeLeft(next);
      if (next.ended) {
        window.clearInterval(intervalId);
      }
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  // إذا انتهى العرض أو غير نشط، لا نعرض شيئاً
  if (!timeLeft || timeLeft.ended) return null;

  // Helper: تنسيق الرقم بصفرين
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <section
      id="diamond-care-offer"
      aria-label={PROMO_TITLE}
      className="relative isolate w-full overflow-hidden min-h-[58px] md:min-h-[64px]"
      style={{
        backgroundImage: "linear-gradient(135deg, #0f172a 0%, #134e5e 50%, #1c2e4a 100%)",
        backgroundColor: "#0f172a",
      }}
    >
      {/* ✨ shine effect overlay */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 animate-promo-shine"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.25) 50%, transparent 100%)",
          transform: "skewX(-12deg)",
        }}
      />

      {/* 🌟 sparkle dots */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      />

      {/* ── Mobile layout (stacked) ── */}
      <div className="md:hidden px-3 py-2.5">
        <div className="flex items-center gap-2 text-white">
          {/* Left: icon + title */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider opacity-90">
                {PROMO_TAGLINE}
              </div>
              <div className="text-sm font-black leading-tight">💎 {PROMO_TITLE}</div>
            </div>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Right: tier badge + CTA */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-full bg-white/20 px-2 py-1 text-[10px] font-black backdrop-blur-sm">
              <span>👑</span>
              <span>25%</span>
            </div>
            <Link
              to="/products/men"
              className="inline-flex items-center justify-center gap-1 rounded-full bg-white px-3 py-2 text-[11px] font-black text-teal-900 shadow-md transition-transform active:scale-95"
            >
              تسوّق
              <ChevronLeft className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Mobile countdown (tiny row) — values come from React state */}
        <div className="mt-1.5 flex items-center justify-center gap-1.5 text-[10px] font-bold text-white">
          <Clock className="h-3 w-3" />
          <span>ينتهي:</span>
          <div className="flex items-center gap-0.5" dir="ltr">
            <span className="tabular-nums">{pad(timeLeft.days)}</span>:
            <span className="tabular-nums">{pad(timeLeft.hours)}</span>:
            <span className="tabular-nums">{pad(timeLeft.minutes)}</span>:
            <span className="tabular-nums">{pad(timeLeft.seconds)}</span>
          </div>
        </div>
      </div>

      {/* ── Desktop layout (compact horizontal) ── 	*/}
      <div className="hidden md:flex items-center gap-3 px-4 py-3">
        {/* Left: icon + title + subtitle */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/25 backdrop-blur-sm shadow-inner">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div className="text-white">
            <div className="text-[10px] font-black uppercase tracking-wider opacity-90">
              {PROMO_TAGLINE}
            </div>
            <div className="text-sm font-black leading-tight">💎 {PROMO_TITLE}</div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-8 w-px shrink-0 bg-white/30" />

        {/* Middle: tier pills (15% / 20% / 25%) */}
        <div className="flex items-center gap-1.5">
          {[...PROMO_TIERS].reverse().map((tier) => (
            <div
              key={tier.threshold}
              className="flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-black text-white backdrop-blur-sm"
            >
              <span>{tier.icon}</span>
              <span>{tier.label}</span>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="h-8 w-px shrink-0 bg-white/30" />

        {/* Middle-right: countdown — values come from React state */}
        <div className="flex items-center gap-1.5 text-white">
          <Clock className="h-3.5 w-3.5 opacity-90" />
          <div className="flex items-center gap-0.5 text-xs font-black tabular-nums" dir="ltr">
            <div className="flex flex-col items-center">
              <span>{pad(timeLeft.days)}</span>
              <span className="text-[8px] opacity-75">يوم</span>
            </div>
            <span className="mx-0.5 opacity-50">:</span>
            <div className="flex flex-col items-center">
              <span>{pad(timeLeft.hours)}</span>
              <span className="text-[8px] opacity-75">ساعة</span>
            </div>
            <span className="mx-0.5 opacity-50">:</span>
            <div className="flex flex-col items-center">
              <span>{pad(timeLeft.minutes)}</span>
              <span className="text-[8px] opacity-75">د</span>
            </div>
            <span className="mx-0.5 opacity-50">:</span>
            <div className="flex flex-col items-center">
              <span>{pad(timeLeft.seconds)}</span>
              <span className="text-[8px] opacity-75">ث</span>
            </div>
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right: CTA button */}
        <Link
          to="/products/men"
          className="group inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-black text-teal-900 shadow-lg transition-all hover:scale-[1.03] active:scale-95"
        >
          تسوّق العرض
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
        </Link>
      </div>
    </section>
  );
}
