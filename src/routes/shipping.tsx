import { createFileRoute } from "@tanstack/react-router";
import { PageHero } from "@/components/PageHero";
import { FREE_SHIPPING_THRESHOLD, GOVERNORATE_SHIPPING } from "@/lib/governorates";
import { formatPrice } from "@/data/product-types";

export const Route = createFileRoute("/shipping")({
  head: () => ({
    meta: [
      { title: "الشحن والتوصيل — اليسر ميديكال" },
      {
        name: "description",
        content:
          "تعرف على مدة الشحن ورسوم التوصيل وسياسة التغليف السري لطلبات اليسر ميديكال داخل مصر.",
      },
    ],
  }),
  component: ShippingPage,
});

function ShippingPage() {
  const shippingRates = GOVERNORATE_SHIPPING.map((entry) => entry.shipping);
  const minShipping = Math.min(...shippingRates);
  const maxShipping = Math.max(...shippingRates);

  return (
    <div className="container mx-auto px-4 py-10 md:py-12 max-w-4xl">
      <PageHero
        eyebrow="الشحن والتوصيل"
        title="نوصّل طلبك بسرعة وسرية"
        description="خدمة شحن موثوقة إلى جميع محافظات مصر، مع تغليف محايد يضمن الخصوصية وتجربة شراء أكثر راحة واطمئناناً."
      />

      <div className="prose prose-lg max-w-3xl mx-auto text-foreground">
        <h2 className="text-2xl font-bold mt-8 mb-3">مدة التوصيل</h2>
        <p>القاهرة والجيزة: 24-48 ساعة. باقي المحافظات: 2-4 أيام عمل.</p>
        <h2 className="text-2xl font-bold mt-8 mb-3">رسوم الشحن</h2>
        <p>
          تختلف حسب المحافظة (من {formatPrice(minShipping)} إلى {formatPrice(maxShipping)}). الشحن
          مجاني للطلبات من {formatPrice(FREE_SHIPPING_THRESHOLD)} فأكثر.
        </p>
        <h2 className="text-2xl font-bold mt-8 mb-3">السرية</h2>
        <p>جميع الطلبات تُغلَّف في عبوات محايدة لا تكشف هوية المنتج.</p>
      </div>
    </div>
  );
}
