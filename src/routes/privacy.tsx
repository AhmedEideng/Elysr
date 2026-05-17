import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "سياسة الخصوصية — اليسر ميديكال" },
      {
        name: "description",
        content:
          "تعرف على كيفية تعامل اليسر ميديكال مع بياناتك الشخصية وحماية خصوصية الطلبات والتواصل عبر واتساب.",
      },
    ],
  }),
  component: () => (
    <div className="container mx-auto px-4 py-16 max-w-3xl prose prose-lg">
      <h1 className="text-4xl font-bold mb-6">سياسة الخصوصية</h1>
      <p className="text-muted-foreground leading-loose">
        في اليسر ميديكال نحترم خصوصيتك ونلتزم بحماية بياناتك الشخصية.
      </p>
      <h2 className="text-2xl font-bold mt-8 mb-3">البيانات التي نجمعها</h2>
      <p>
        نجمع البيانات الضرورية لإتمام طلبك فقط: الاسم، رقم الهاتف، العنوان. لا نشارك بياناتك مع أي
        طرف ثالث.
      </p>
      <h2 className="text-2xl font-bold mt-8 mb-3">السرية التامة</h2>
      <p>جميع منتجاتنا تُشحن في تغليف محايد لا يكشف هوية المنتج، حفاظاً على خصوصيتك الكاملة.</p>
      <h2 className="text-2xl font-bold mt-8 mb-3">الاتصال</h2>
      <p>لأي استفسار حول خصوصيتك تواصل معنا عبر واتساب</p>
    </div>
  ),
});
