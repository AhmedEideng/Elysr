import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHero } from "@/components/PageHero";
import { FREE_SHIPPING_THRESHOLD, GOVERNORATE_SHIPPING } from "@/lib/governorates";
import { SHIPPING_DELIVERY_TEXT } from "@/lib/site-config";
import { formatPrice } from "@/data/product-types";

export const Route = createFileRoute("/shipping")({
  head: () => ({
    meta: [
      { title: "سياسة الشحن — اليسر ميديكال" },
      {
        name: "description",
        content:
          "تعرف على خدمة الشحن السري لجميع محافظات مصر: تغليف محايد يحفظ خصوصيتك، مواعيد توصيل واضحة، الدفع عند الاستلام، وتكاليف شحن منافسة.",
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
        <p>
          {SHIPPING_DELIVERY_TEXT}. يتم تأكيد الطلبات عبر واتساب قبل الشحن، ويمكن معرفة موعد وصول
          تقريبي عند تأكيد الطلب. وتبدأ مدة التوصيل من وقت تأكيد الطلب وخروجه للشحن.
        </p>
        <h2 className="text-2xl font-bold mt-8 mb-3">رسوم الشحن</h2>
        <p>
          تختلف حسب المحافظة (من {formatPrice(minShipping)} إلى {formatPrice(maxShipping)}). الشحن
          مجاني للطلبات من {formatPrice(FREE_SHIPPING_THRESHOLD)} فأكثر. وتُوضح لك رسوم الشحن
          لمحافظتك عند تأكيد الطلب.
        </p>
        <h2 className="text-2xl font-bold mt-8 mb-3">نطاق التغطية</h2>
        <p>
          نشحن إلى جميع محافظات مصر: {GOVERNORATE_SHIPPING.map((e) => e.name).join("، ")}. وتصل
          الطلبات حتى باب العنوان الذي تحدده عبر شركات شحن موثوقة.
        </p>
        <h2 className="text-2xl font-bold mt-8 mb-3">السرية</h2>
        <p>
          جميع الطلبات تُغلَّف في عبوات محايدة لا تكشف هوية المنتج، ولا تُكتب أي تفاصيل عن المحتوى
          على العبوة الخارجية أو بوليصة الشحن. يصلك الطلب وكأنه أي شحنة تسوق عادية، ويمكنك استلامه
          بنفسك أو عبر من تنوبه.
        </p>
        <h2 className="text-2xl font-bold mt-8 mb-3">طرق الدفع</h2>
        <p>
          يمكنك الدفع نقداً عند الاستلام أو الدفع إلكترونياً، ويتم تأكيد الطلب عبر واتساب قبل الشحن
          لضمان وضوح التفاصيل. والدفع عند الاستلام متاح حسب المحافظة وتفاصيل الشحن المتاحة وقت تأكيد
          الطلب.
        </p>
        <h2 className="text-2xl font-bold mt-8 mb-3">الدعم ومتابعة الشحن</h2>
        <p>
          لأي استفسار عن شحنة أو موعد وصول راسل خدمة العملاء عبر واتساب من{" "}
          <Link to="/contact">صفحة التواصل</Link>، ويمكنك مراجعة{" "}
          <Link to="/returns">سياسة الاسترجاع</Link> إذا احتجت الاستبدال أو الإرجاع. وإذا تأخر طلبك
          عن المدة المعلنة راسلنا وسنتابعه مع شركة الشحن مباشرة.
        </p>
      </div>
    </div>
  );
}
