import { Link } from "@tanstack/react-router";
import { Zap, Clock, Activity, Heart } from "lucide-react";
import { getProductById, getFeaturedProducts } from "@/data/products";

// قوائم المعرفات المرشحة الأكثر طلباً ومبيعاً بكل فئة (مرتبة تنازلياً حسب الأكثر مبيعاً)
// تم تفعيل آلية فلترة ديناميكية تستبعد فوراً أي منتج معروض بالفعل بقسم الأكثر طلباً العلوي
const concernCandidates = {
  delay: ["m-44", "m-30", "m-14", "m-19", "m-55", "m-48"],
  strength: ["m-11", "m-02", "m-01", "m-04", "m-34", "m-37"],
  devices: ["d-01", "d-02", "d-03", "d-04", "d-05"],
  women: ["w-02", "w-15", "w-05", "w-11", "w-01", "w-03", "w-04"],
};

export function ShopByConcern() {
  // جلب معرفات منتجات مختارات الرئيسية الحالية لمنع التكرار
  const featured = getFeaturedProducts();
  const featuredIds = new Set(featured.map((p) => p.id));

  // بناء وحساب الفئات الأربعة ديناميكياً بدون تكرار
  const resolvedConcerns = [
    {
      label: "علاجات التأخير",
      icon: Clock,
      color: "bg-blue-500",
      desc: "أفضل حلول التأخير والتحكم في سرعة القذف مع خيارات موضعية قوية ومجربة",
      link: "/products/men",
      products: concernCandidates.delay
        .filter((id) => !featuredIds.has(id))
        .slice(0, 3)
        .map(getProductById)
        .filter((p): p is NonNullable<typeof p> => Boolean(p)),
    },
    {
      label: "القوة والأداء",
      icon: Zap,
      color: "bg-amber-500",
      desc: "أفضل المكملات الطبيعية لدعم القوة والأداء والتحمل — تركيبات عشبية آمنة وفعالة",
      link: "/products/men",
      products: concernCandidates.strength
        .filter((id) => !featuredIds.has(id))
        .slice(0, 3)
        .map(getProductById)
        .filter((p): p is NonNullable<typeof p> => Boolean(p)),
    },
    {
      label: "أجهزة طبية",
      icon: Activity,
      color: "bg-emerald-500",
      desc: "أفضل أجهزة الأداء والدعم غير الدوائي، مع أولوية لأجهزة الـ VED الأكثر احترافية",
      link: "/products/devices",
      products: concernCandidates.devices
        .filter((id) => !featuredIds.has(id))
        .slice(0, 3)
        .map(getProductById)
        .filter((p): p is NonNullable<typeof p> => Boolean(p)),
    },
    {
      label: "الرغبة والإثارة للنساء",
      icon: Heart,
      color: "bg-rose-500",
      desc: "أفضل المنتجات المخصصة لدعم الرغبة والإثارة والراحة للنساء مع خيارات موثوقة وعالية الطلب",
      link: "/products/women",
      products: concernCandidates.women
        .filter((id) => !featuredIds.has(id))
        .slice(0, 3)
        .map(getProductById)
        .filter((p): p is NonNullable<typeof p> => Boolean(p)),
    },
  ];

  return (
    <section className="py-8 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-black">أبرز فئات العناية والاهتمام</h2>
          <p className="text-muted-foreground mt-2 max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
            اختر الفئة التي تود التركيز عليها لتكتشف الحلول والمكملات المخصصة لدعم حيويتك الزوجية
            بأمان
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {resolvedConcerns.map((concern) => (
            <div
              key={concern.label}
              className="group rounded-2xl border bg-white p-6 shadow-sm transition-all hover:shadow-md"
            >
              {/* Header */}
              <div className="flex items-start gap-4 mb-5">
                <div
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${concern.color} text-white shadow-md transition-transform group-hover:scale-105`}
                >
                  <concern.icon className="h-7 w-7" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-1">{concern.label}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{concern.desc}</p>
                </div>
              </div>

              {/* Relevant Products */}
              <div className="mb-5">
                <div className="text-xs font-semibold text-muted-foreground mb-3 px-1">
                  أفضل المنتجات لهذا الاهتمام:
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {concern.products.map((prod) => (
                    <Link
                      key={prod.slug}
                      to="/products/$slug"
                      params={{ slug: prod.slug }}
                      className="block rounded-xl border overflow-hidden hover:border-primary/50 transition-all group/prod"
                      aria-label={`عرض تفاصيل ${prod.name}`}
                    >
                      <div className="relative h-20 bg-muted overflow-hidden">
                        <img
                          src={
                            prod.image
                              ? prod.image.split("?")[0].replace(/^\/images\//, "/images/thumbs/") +
                                "?v=elysr_v28"
                              : ""
                          }
                          srcSet={
                            prod.image
                              ? `${prod.image.split("?")[0].replace(/^\/images\//, "/images/thumbs-180/") + "?v=elysr_v28"} 360w, ${prod.image.split("?")[0].replace(/^\/images\//, "/images/thumbs/") + "?v=elysr_v28"} 480w, ${prod.image.split("?")[0] + "?v=elysr_v28"} 800w`
                              : ""
                          }
                          sizes="(max-width: 640px) 180px, 240px"
                          alt=""
                          aria-hidden="true"
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover transition-transform group-hover/prod:scale-110"
                          width={480}
                          height={480}
                        />
                      </div>
                      <div className="p-2">
                        <p className="text-[11px] font-medium leading-tight line-clamp-2 text-foreground">
                          {prod.name}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Action */}
              <Link
                to={concern.link}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition hover:bg-primary/90"
              >
                تصفح كل منتجات {concern.label}
                <span className="text-lg leading-none">→</span>
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link to="/products/men" className="text-sm font-medium text-primary hover:underline">
            أو تصفح جميع المنتجات →
          </Link>
        </div>
      </div>
    </section>
  );
}
