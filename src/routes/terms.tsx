import { createFileRoute } from "@tanstack/react-router";
import { PageHero } from "@/components/PageHero";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "الشروط والأحكام — اليسر ميديكال" },
      {
        name: "description",
        content:
          "الشروط والأحكام الخاصة باستخدام موقع اليسر ميديكال وطلب المنتجات وإتمام الشراء عبر واتساب.",
      },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-10 md:py-12 max-w-4xl">
      <PageHero
        eyebrow="الشروط والأحكام"
        title="استخدام واضح وآمن للموقع"
        description="هذه الشروط تنظم استخدامك لموقع اليسر ميديكال وطلب المنتجات وإتمام الشراء، بما يضمن تجربة موثوقة وواضحة للطرفين."
      />

      <div className="prose prose-lg max-w-3xl mx-auto text-foreground">
        <p className="text-muted-foreground leading-loose">
          باستخدامك لموقع اليسر ميديكال فإنك توافق على الشروط التالية:
        </p>
        <h2 className="text-2xl font-bold mt-8 mb-3">المنتجات</h2>
        <p>جميع منتجاتنا أصلية ومستوردة. المعلومات المقدمة توعوية ولا تُغني عن استشارة الطبيب.</p>
        <h2 className="text-2xl font-bold mt-8 mb-3">الطلبات والدفع</h2>
        <p>يتم تأكيد الطلبات عبر واتساب. الدفع متاح عند الاستلام أو إلكترونياً.</p>
        <h2 className="text-2xl font-bold mt-8 mb-3">المسؤولية</h2>
        <p>
          الالتزام بطريقة الاستخدام الموصى بها مسؤولية المستخدم. استشر طبيبك في حال وجود حالة صحية.
        </p>
      </div>
    </div>
  );
}
