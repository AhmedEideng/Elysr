import { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { ProductCard } from "@/components/ProductCard";
import { getProductsByCategory, getFeaturedProducts } from "@/data/products";
import { ArrowLeft } from "lucide-react";

export function ProductsTabs() {
  const [activeTab, setActiveTab] = useState<"men" | "women" | "devices">("men");

  const products = useMemo(() => {
    // 1. جلب المنتجات المعروضة في قسم "الأكثر طلباً" العلوي لمنع تكرارها
    const featured = getFeaturedProducts();
    const displayedIds = new Set(featured.map((p) => p.id));

    // 2. محاكاة واستبعاد المنتجات الـ 12 المعروضة بداخل قسم "أبرز فئات العناية والاهتمام" (ShopByConcern) لمنع تكرارها أيضاً
    const concernCandidates = {
      delay: ["m-14", "m-19", "m-48", "m-05", "m-35"], // استُبعدت المخدّرات الموضعية (m-44/m-30/m-55) لتوافق إعلانات جوجل
      strength: ["m-11", "m-02", "m-01", "m-04", "m-03", "m-49"],
      devices: ["d-01", "d-02", "d-03", "d-04", "d-05"],
      women: ["w-02", "w-15", "w-05", "w-01", "w-04", "w-16", "w-07"], // استُبعدت Spanish Fly (w-11/w-03)
    };

    const delayIds = concernCandidates.delay.filter((id) => !displayedIds.has(id)).slice(0, 3);
    const strengthIds = concernCandidates.strength
      .filter((id) => !displayedIds.has(id))
      .slice(0, 3);
    const devicesIds = concernCandidates.devices.filter((id) => !displayedIds.has(id)).slice(0, 3);
    const womenIds = concernCandidates.women.filter((id) => !displayedIds.has(id)).slice(0, 3);

    // دمج كافة معرفات المنتجات المعروضة مسبقاً بالصفحة في الأقسام العلوية
    const allHomepageIds = new Set([
      ...displayedIds,
      ...delayIds,
      ...strengthIds,
      ...devicesIds,
      ...womenIds,
    ]);

    // جلب المنتجات للفئة المحددة وتصفيتها كلياً من أي ظهور سابق بالصفحة، مع عرض أفضل المنتجات مبيعاً المتبقية
    return getProductsByCategory(activeTab)
      .filter((p) => !allHomepageIds.has(p.id))
      .slice(0, 4);
  }, [activeTab]);

  return (
    <section className="py-8 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-black md:text-4xl">تسوق حسب الفئة</h2>
          <p className="mt-2 text-muted-foreground">
            اكتشف منتجاتنا الأصلية مع ضمان الفاعلية والأمان
          </p>
        </div>

        {/* Tabs Header */}
        <div className="flex justify-center gap-2 mb-8">
          <button
            onClick={() => setActiveTab("men")}
            className={`px-6 py-2.5 rounded-full font-bold transition-all ${
              activeTab === "men"
                ? "bg-primary text-white shadow-lg scale-105"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            🧔 للرجال
          </button>
          <button
            onClick={() => setActiveTab("women")}
            className={`px-6 py-2.5 rounded-full font-bold transition-all ${
              activeTab === "women"
                ? "bg-rose-500 text-white shadow-lg scale-105"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            👩 للنساء
          </button>
          <button
            onClick={() => setActiveTab("devices")}
            className={`px-6 py-2.5 rounded-full font-bold transition-all ${
              activeTab === "devices"
                ? "bg-emerald-500 text-white shadow-lg scale-105"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            ⚡ أجهزة
          </button>
        </div>

        {/* Products Grid */}
        <div className="grid gap-5 grid-cols-2 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>

        {/* View All Button */}
        <div className="mt-10 text-center">
          <Link
            to={`/products/${activeTab}`}
            className={`inline-flex items-center gap-2 rounded-full px-8 py-3.5 font-black text-white transition-all hover:scale-105 hover:shadow-lg ${
              activeTab === "men"
                ? "bg-primary hover:bg-primary/90"
                : activeTab === "women"
                  ? "bg-rose-500 hover:bg-rose-600"
                  : "bg-emerald-500 hover:bg-emerald-600"
            }`}
          >
            عرض كل المنتجات
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
