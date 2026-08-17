import { createFileRoute } from "@tanstack/react-router";
import { PageHero } from "@/components/PageHero";

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
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-10 md:py-12 max-w-4xl">
      <PageHero
        eyebrow="الخصوصية والثقة"
        title="سياسة الخصوصية"
        description="نحترم خصوصيتك ونلتزم بحماية بياناتك الشخصية وخصوصية الطلبات والتواصل في كل خطوة من تجربة الشراء."
      />

      <div className="prose prose-lg max-w-3xl mx-auto text-foreground">
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
        <h2 className="text-2xl font-bold mt-8 mb-3">تخزين البيانات على جهازك</h2>
        <p>
          نخزّن في متصفحك (localStorage) بيانات ضرورية لتحسين تجربتك فقط، مثل محتويات سلة التسوق
          وقائمة المنتجات التي شاهدتها مؤخراً والمفضلة. أي نسخة احتياطية مؤقتة للطلب تُشفَّر قبل
          تخزينها على جهازك ولا تُشارك مع أي جهة خارجية. يمكنك مسحها في أي وقت من إعدادات المتصفح.
        </p>
        <h2 className="text-2xl font-bold mt-8 mb-3">الاتصال</h2>
        <p>لأي استفسار حول خصوصيتك تواصل معنا عبر واتساب</p>
      </div>
    </div>
  );
}
