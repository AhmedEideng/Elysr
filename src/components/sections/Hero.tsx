/**
 * ============================================================
 * Elysr Hero — صورة كاملة مدمجة (ظاهرة بالكامل للمستخدم)
 * ============================================================
 * الصورة تبقى ظاهرة تماماً للمستخدم (كل المحتوى المرئي داخل الصورة).
 * الـ h1 موجود (sr-only) لإعطاء المحرك نصاً عناوينياً، والنص الغني
 * الكامل للـ SEO موجود في bodyContent الخاص بالـ prerender.
 */
import { assetUrl } from "@/lib/cache";

export function Hero() {
  return (
    <section className="relative w-full overflow-hidden">
      <h1 className="sr-only">اليسر — منتجات الصحة الزوجية الأصلية في مصر | شحن سري</h1>

      {/* ── Hero Image — كل المحتوى المدمج ظاهر بالكامل ── */}
      {/* 🚀 CLS fix: حاوية بنسبة aspect-ratio ثابتة تطابق الأبعاد الفعلية للصورة
          (1200x663 ≈ 1.81:1) حتى لا تُقصَّ الصورة أو تتجاوز حدود الحاوية على
          أي حجم شاشة، مع حجز الارتفاع قبل تحميل الصورة لمنع قفزة التخطيط (CLS). */}
      <div
        className="relative w-full overflow-hidden bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-50"
        style={{ aspectRatio: "1200 / 663" }}
      >
        <img
          src={assetUrl("/images/hero-banner.webp")}
          srcSet={`${assetUrl("/images/hero-banner-480.webp")} 480w, ${assetUrl("/images/hero-banner-768.webp")} 768w, ${assetUrl("/images/hero-banner.webp")} 1200w`}
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
