/**
 * ============================================================
 * Elysr Hero — صورة كاملة مدمجة
 * ============================================================
 */

export function Hero() {
  return (
    <section className="relative w-full overflow-hidden">
      <h1 className="sr-only">منتجات أصلية للصحة الزوجية للرجال والنساء مع شحن سري 100%</h1>

      {/* ── Hero Image — كل المحتوى مدمج هنا (نص + منتجات حقيقية + CTA) ── */}
      {/* 🚀 CLS fix: حاوية بنسبة aspect-ratio ثابتة تطابق الأبعاد الفعلية للصورة
          (1200x663 ≈ 1.81:1) حتى لا تُقصَّ الصورة أو تتجاوز حدود الحاوية على
          أي حجم شاشة، مع حجز الارتفاع قبل تحميل الصورة لمنع قفزة التخطيط (CLS). */}
      <div
        className="relative w-full overflow-hidden bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-50"
        style={{ aspectRatio: "1200 / 663" }}
      >
        <img
          src="/images/hero-banner.webp?v=27"
          srcSet="/images/hero-banner-768.webp?v=27 768w, /images/hero-banner.webp?v=27 1200w"
          sizes="100vw"
          alt="منتجات أصلية للصحة الزوجية للرجال والنساء — مع شحن سري 100% — دفع عند الاستلام — شحن سريع لجميع المحافظات"
          className="block h-full w-full object-cover"
          loading="eager"
          fetchPriority="high"
          decoding="async"
          width="1200"
          height="663"
        />
      </div>
    </section>
  );
}
