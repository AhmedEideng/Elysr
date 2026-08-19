/**
 * ============================================================
 * Elysr Hero — صورة ظاهرة + نص HTML حقيقي
 * ============================================================
 * الصورة تبقى ظاهرة تماماً للمستخدم (الخلفية المرئية للقسم)،
 * وفوقها نص HTML حقيقي (عنوان + وصف + زر CTA) يقرؤه محرك البحث
 * مباشرة — بدلاً من نص مخفي (sr-only) فقط.
 * هذا يمنح أهم صفحة نصاً غنياً للمحركات مع الحفاظ على التصميم.
 */
import { Link } from "@tanstack/react-router";
import { assetUrl } from "@/lib/cache";

export function Hero() {
  return (
    <section className="relative w-full overflow-hidden">
      <h1 className="sr-only">
        اليسر — منتجات الصحة الزوجية الأصلية في مصر | دفع عند الاستلام
      </h1>

      {/* ── Hero Image — الصورة ظاهرة بالكامل كخلفية ── */}
      {/* 🚀 CLS fix: aspect-ratio ثابت يطابق أبعاد الصورة الفعلية
          (1200x663 ≈ 1.81:1) لمنع قفزة التخطيط. */}
      <div
        className="relative w-full overflow-hidden bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-50"
        style={{ aspectRatio: "1200 / 663" }}
      >
        <img
          src={assetUrl("/images/hero-banner.webp")}
          srcSet={`${assetUrl("/images/hero-banner-768.webp")} 768w, ${assetUrl("/images/hero-banner.webp")} 1200w`}
          sizes="100vw"
          alt="منتجات أصلية للصحة الزوجية للرجال والنساء — مع شحن سري 100% — دفع عند الاستلام — شحن سريع لجميع المحافظات"
          className="block h-full w-full object-cover"
          loading="eager"
          fetchPriority="high"
          decoding="async"
          width="1200"
          height="663"
        />

        {/* ── طبقة تدرج تجعل النص مقروءاً فوق الصورة مع بقاء الصورة ظاهرة ── */}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-l from-black/70 via-black/45 to-black/10"
          aria-hidden="true"
        />

        {/* ── نص HTML حقيقي (يقرؤه محرك البحث والمستخدم) ── */}
        <div className="absolute inset-0 flex items-center">
          <div className="container mx-auto px-4 md:px-8">
            <div className="max-w-xl text-right">
              <p className="mb-2 text-sm font-bold tracking-wide text-sky-200 md:text-base">
                ⚡ شحن سري وتغليف محايد لكل محافظات مصر
              </p>
              <h2 className="text-2xl font-black leading-tight text-white md:text-4xl lg:text-5xl">
                منتجات الصحة الزوجية الأصلية
                <br />
                للرجال والنساء
              </h2>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-sky-50/90 md:text-base">
                مكملات، عسل ملكي، جل وبخاخات وأجهزة طبية مختارة بعناية — بجودة أصلية
                مضمونة، ودفع عند الاستلام، وخصوصية تامة.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  to="/products/men"
                  className="rounded-full bg-white px-6 py-3 text-sm font-black text-sky-900 shadow-lg transition hover:scale-105"
                >
                  تسوق منتجات الرجال
                </Link>
                <Link
                  to="/products/women"
                  className="rounded-full bg-sky-600/90 px-6 py-3 text-sm font-black text-white shadow-lg transition hover:scale-105 hover:bg-sky-500"
                >
                  تسوق منتجات النساء
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
