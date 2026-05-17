import { createFileRoute } from "@tanstack/react-router";
import { Hero } from "@/components/sections/Hero";

import { FeaturedProducts } from "@/components/sections/FeaturedProducts";
import { WhyUs } from "@/components/sections/WhyUs";
import { Partners } from "@/components/sections/Partners";
import { WholesaleBanner } from "@/components/sections/WholesaleBanner";
import { ShopByConcern } from "@/components/sections/ShopByConcern";
import { DailyAdvice } from "@/components/sections/DailyAdvice";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "اليسر ميديكال — منتجات طبية وصحية بأسعار الاستيراد" },
      {
        name: "description",
        content:
          "تسوّق أكثر من 111 منتج طبي وصحي مستورد بأسعار الاستيراد المباشر. شحن سري لجميع المحافظات.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <>
      <Hero />
      <FeaturedProducts />

      {/* التعديلات الجديدة: التسوق حسب الاحتياج والنصيحة الطبية */}
      <ShopByConcern />
      <DailyAdvice />

      <WhyUs />
      <Partners />
      <WholesaleBanner />
    </>
  );
}
