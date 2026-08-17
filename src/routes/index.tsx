import { createFileRoute } from "@tanstack/react-router";
import { Hero } from "@/components/sections/Hero";
import { AnniversaryPromo } from "@/components/sections/AnniversaryPromo";
import { FeaturedProducts } from "@/components/sections/FeaturedProducts";
import { WhyUs } from "@/components/sections/WhyUs";
import { ShopByConcern } from "@/components/sections/ShopByConcern";
import { DailyAdvice } from "@/components/sections/DailyAdvice";
import { ArticlesGrid } from "@/components/sections/ArticlesGrid";
import { ProductsTabs } from "@/components/sections/ProductsTabs";
import { RecentlyViewed } from "@/components/sections/RecentlyViewed";
import { SectionErrorBoundary } from "@/components/SectionErrorBoundary";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "اليسر — منتجات الصحة الزوجية الأصلية في مصر | شحن سري ودفع عند الاستلام" },
      {
        name: "description",
        content:
          "اليسر هو أكبر متجر متخصص في منتجات الصحة الزوجية الأصلية للرجال والنساء في مصر. شحن سري 100%، دفع عند الاستلام، أكثر من 87 منتج مضمون ودعم متخصص على واتساب.",
      },
      { name: "robots", content: "index, follow" },
      // Open Graph
      {
        property: "og:title",
        content: "اليسر — منتجات الصحة الزوجية الأصلية في مصر | شحن سري ودفع عند الاستلام",
      },
      {
        property: "og:description",
        content:
          "اليسر هو أكبر متجر متخصص في منتجات الصحة الزوجية الأصلية للرجال والنساء في مصر. شحن سري 100%، دفع عند الاستلام، أكثر من 87 منتج مضمون ودعم متخصص على واتساب.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <>
      {/* 1. Hero — لفت الانتباه */}
      <SectionErrorBoundary name="Hero">
        <Hero />
      </SectionErrorBoundary>

      {/* 2. مبادرة الرعاية الماسية — Urgency */}
      <SectionErrorBoundary name="AnniversaryPromo">
        <AnniversaryPromo />
      </SectionErrorBoundary>

      {/* 3. شاهدتها مؤخراً — يظهر للعملاء العائدين لسرعة الشراء */}
      <SectionErrorBoundary name="RecentlyViewed">
        <div className="bg-muted/30">
          <RecentlyViewed />
        </div>
      </SectionErrorBoundary>

      {/* 4. المنتجات المختارة — 8 منتجات فقط بدلاً من 20 لسرعة التحميل وتخفيف الخيارات */}
      <SectionErrorBoundary name="FeaturedProducts">
        <FeaturedProducts />
      </SectionErrorBoundary>

      {/* 5. تسوق حسب الاحتياج — العميل يبحث عن حل لمشكلة */}
      <SectionErrorBoundary name="ShopByConcern">
        <ShopByConcern />
      </SectionErrorBoundary>

      {/* 6. ليه اليسر — الثقة قبل الشراء */}
      <SectionErrorBoundary name="WhyUs">
        <WhyUs />
      </SectionErrorBoundary>

      {/* 7. أقسام المنتجات (تبويبات) — لتخفيف التمرير الطويل على الموبايل */}
      <SectionErrorBoundary name="ProductsTabs">
        <ProductsTabs />
      </SectionErrorBoundary>

      {/* 8. نصيحة يومية — بناء سلطة الثقة */}
      <SectionErrorBoundary name="DailyAdvice">
        <DailyAdvice />
      </SectionErrorBoundary>

      {/* 9. مقالات — SEO ووعي */}
      <SectionErrorBoundary name="ArticlesGrid">
        <ArticlesGrid />
      </SectionErrorBoundary>
    </>
  );
}
