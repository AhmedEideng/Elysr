import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { waLink } from "@/lib/whatsapp";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "تواصل معنا — اليسر ميديكال" },
      {
        name: "description",
        content:
          "تواصل مع فريق اليسر ميديكال عبر واتساب للاستفسار عن المنتجات والطلبات والشحن، برد سريع وسرية تامة وخدمة عملاء تفهم حساسية الموضوع.",
      },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <div className="container mx-auto px-4 py-10 md:py-12 max-w-4xl">
      <PageHero
        eyebrow="خدمة العملاء"
        title="تواصل معنا"
        description="التواصل متاح عبر واتساب فقط لضمان سرعة الرد، الخصوصية، والمتابعة المباشرة مع فريق اليسر ميديكال."
      />

      <div className="mt-8 flex justify-center">
        <a
          href={waLink("مرحباً، أرغب في التواصل مع اليسر ميديكال")}
          target="_blank"
          rel="noreferrer"
          className="group flex w-full max-w-md flex-col items-center rounded-[2rem] border bg-card p-8 text-center shadow-card transition-smooth hover:-translate-y-1 hover:shadow-elegant"
        >
          <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-[#25D366] text-white transition-smooth group-hover:scale-110">
            <MessageCircle className="h-8 w-8" />
          </span>
          <span className="mt-4 text-xl font-bold">تواصل عبر واتساب</span>
          <span className="mt-2 text-sm text-muted-foreground">اضغط هنا لفتح المحادثة مباشرة</span>
        </a>
      </div>

      <div className="prose prose-lg max-w-3xl mx-auto mt-12 text-foreground">
        <h2 className="text-2xl font-bold mt-8 mb-3">فريق خدمة العملاء جاهز لمساعدتك في</h2>
        <ul>
          <li>الاستفسار عن أي منتج ووصفه وطريقة استخدامه المعروضة في صفحته.</li>
          <li>متابعة طلبك قبل التأكيد أو بعده حتى الاستلام.</li>
          <li>معرفة رسوم الشحن ومدة التوصيل لمحافظتك.</li>
          <li>ترتيب الاستبدال أو الاسترجاع وفق السياسة المعلنة.</li>
          <li>أي مشكلة تواجهك أثناء تصفح الموقع أو إتمام الطلب.</li>
        </ul>
        <h2 className="text-2xl font-bold mt-8 mb-3">كيف تحصل على رد أسرع؟</h2>
        <p>
          جهّز رقم طلبك إن كان لديك طلب قائم، واذكر محافظتك لنوافيك برسوم الشحن ومدة التوصيل
          الدقيقة، واكتب استفسارك في رسالة واحدة واضحة لنتمكن من مساعدتك مباشرة. وإذا كان استفسارك
          عن منتج محدد فاذكر اسمه كما يظهر في المتجر لنصل إليه مباشرة.
        </p>
        <h2 className="text-2xl font-bold mt-8 mb-3">أين تجد إجابات سريعة؟</h2>
        <p>
          قبل المراسلة قد تجد إجابتك مباشرة في صفحاتنا: <Link to="/shipping">سياسة الشحن</Link> توضح
          المواعيد والرسوم، <Link to="/returns">سياسة الاسترجاع</Link> تشرح الخطوات والشروط،{" "}
          <Link to="/terms">الشروط والأحكام</Link> تغطي الاستخدام والدفع، ومكتبة{" "}
          <Link to="/education">التوعية</Link> تضم مقالات وأدلة مفصلة عن الصحة الزوجية.
        </p>
        <h2 className="text-2xl font-bold mt-8 mb-3">ماذا تتوقع بعد إرسال طلبك؟</h2>
        <p>
          بعد إرسال طلبك عبر واتساب يقوم فريقنا بمراجعته والتواصل معك لتأكيد البيانات والعنوان، ثم
          يخرج الطلب للشحن، ويمكنك متابعة أي استفسار لاحق في نفس المحادثة حتى الاستلام. وإذا احتجت
          تعديل العنوان قبل خروج الطلب للشحن فأخبرنا فوراً في نفس المحادثة.
        </p>
        <h2 className="text-2xl font-bold mt-8 mb-3">خصوصيتك أولاً</h2>
        <p>
          التواصل عبر واتساب فقط يضمن سرعة الرد وسرية المحادثة والمتابعة المباشرة. تُعامَل بيانات
          طلبك بسرية تامة، والوصول إليها مقتصر على من يحتاجها لأداء عمله فقط. لا نطلب منك أي بيانات
          حساسة عبر المحادثة، وكل ما نحتاجه لتنفيذ طلبك هو الاسم ورقم الهاتف والعنوان — والتفاصيل في{" "}
          <Link to="/privacy">سياسة الخصوصية</Link>.
        </p>
      </div>
    </div>
  );
}
