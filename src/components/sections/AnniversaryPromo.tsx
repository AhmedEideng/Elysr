import { Link } from "@tanstack/react-router";
import { Sparkles, ArrowLeft, ChevronLeft } from "lucide-react";
import { PROMO_TITLE, PROMO_TAGLINE, PROMO_TIERS, PROMO_PERMANENCE_NOTE } from "@/lib/promo";

/**
 * 💎 شريط "مبادرة الرعاية الماسية" — شريط متميز ومحفز أسفل الـ Hero
 *
 * التصميم: شريط أفقي مضغوط (compact horizontal bar)
 * - الارتفاع: ~56-72px (يتجاوب مع الموبايل)
 * - الخلفية: gradient طبي وقور وعميق slate-blue→teal→navy
 * - المحتوى: شارة + عنوان + الشرائح + ملاحظة السريان الدائم + CTA
 * - mobile: يتحول لـ stacked layout
 *
 * (R26) مكوّن ثابت بلا state ولا مؤقّت: لا عدّاد ولا hydration cycle.
 */
export function AnniversaryPromo() {
  // (2026-11-14 · R26) أُزيل العدّاد الزمني المتجدد كل 3 أيام: كان يوحي
  // بانتهاء عرض لا ينتهي فعلًا (إلحاح مصطنع) — والشرائح سارية دائمًا.
  // الشريط الآن ثابت بلا حالة ولا مؤقّت، فيُبنى على السيرفر كاملًا.
  const highestPromoLabel = PROMO_TIERS[0] ? PROMO_TIERS[0].label : "";

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
              <span>{highestPromoLabel}</span>
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

        {/* Mobile: ملاحظة السريان الدائم (بدل العدّاد) */}
        <div className="mt-1.5 flex items-center justify-center gap-1.5 text-[10px] font-bold text-white">
          <Sparkles className="h-3 w-3" aria-hidden />
          <span>{PROMO_PERMANENCE_NOTE}</span>
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

        {/* Middle: tier pills (10% / 15% / 20%) */}
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

        {/* Middle-right: ملاحظة السريان الدائم */}
        <div className="flex items-center gap-1.5 text-white">
          <Sparkles className="h-3.5 w-3.5 opacity-90" aria-hidden />
          <span className="text-[10px] font-bold opacity-90">{PROMO_PERMANENCE_NOTE}</span>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right: CTA button */}
        <Link
          to="/products/men"
          className="group inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-black text-teal-900 shadow-lg transition-all hover:scale-[1.03] active:scale-95"
        >
          تسوّق الآن
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
        </Link>
      </div>
    </section>
  );
}
