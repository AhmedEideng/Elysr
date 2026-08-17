import { createFileRoute } from "@tanstack/react-router";
import { PageHero } from "@/components/PageHero";

export const Route = createFileRoute("/returns")({
  head: () => ({
    meta: [
      { title: "الاستبدال والاسترجاع — اليسر ميديكال" },
      {
        name: "description",
        content:
          "سياسة الاستبدال والاسترجاع في اليسر ميديكال: المدة، شروط قبول المنتجات، وخطوات طلب الاسترجاع عبر واتساب.",
      },
    ],
  }),
  component: ReturnsPage,
});

function ReturnsPage() {
  return (
    <div className="container mx-auto px-4 py-10 md:py-12 max-w-4xl">
      <PageHero
        eyebrow="الاستبدال والاسترجاع"
        title="سياسة واضحة وعادلة"
        description="رضاك أولويتنا، لذلك نعتمد سياسة مرنة وواضحة تحافظ على حقك وتراعي طبيعة المنتجات الصحية وحساسيتها."
      />

      <div className="prose prose-lg max-w-3xl mx-auto text-foreground">
        <p className="text-muted-foreground leading-loose">
          رضاك أولويتنا. سياسة الاستبدال والاسترجاع لدينا واضحة وعادلة.
        </p>
        <h2 className="text-2xl font-bold mt-8 mb-3">مدة الاسترجاع</h2>
        <p>
          يحق لك استبدال أو استرجاع المنتج خلال 14 يوم من تاريخ الاستلام، شرط أن يكون المنتج بحالته
          الأصلية وغير مفتوح.
        </p>
        <h2 className="text-2xl font-bold mt-8 mb-3">المنتجات غير القابلة للاسترجاع</h2>
        <p>لأسباب صحية، لا يمكن استرجاع المنتجات المفتوحة أو المستخدمة.</p>
        <h2 className="text-2xl font-bold mt-8 mb-3">كيفية الاسترجاع</h2>
        <p>تواصل معنا عبر واتساب وسنتولى ترتيب عملية الاستلام والاسترداد خلال 7 أيام عمل.</p>
      </div>
    </div>
  );
}
