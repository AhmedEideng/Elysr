import { createFileRoute } from "@tanstack/react-router";

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
  component: () => (
    <div className="container mx-auto px-4 py-16 max-w-3xl prose prose-lg">
      <h1 className="text-4xl font-bold mb-6">الشحن والتوصيل</h1>
      <p className="text-muted-foreground leading-loose">
        نوصل طلبك بسرية وسرعة لجميع أنحاء جمهورية مصر العربية.
      </p>
      <h2 className="text-2xl font-bold mt-8 mb-3">مدة التوصيل</h2>
      <p>القاهرة والجيزة: 24-48 ساعة. باقي المحافظات: 2-4 أيام عمل.</p>
      <h2 className="text-2xl font-bold mt-8 mb-3">رسوم الشحن</h2>
      <p>تختلف حسب المحافظة. شحن مجاني للطلبات فوق 1500 ج.م.</p>
      <h2 className="text-2xl font-bold mt-8 mb-3">السرية</h2>
      <p>جميع الطلبات تُغلَّف في عبوات محايدة لا تكشف هوية المنتج.</p>
    </div>
  ),
});
