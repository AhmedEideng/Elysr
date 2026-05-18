import { createFileRoute, Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { CheckCircle2, MessageCircle, Home, ShoppingBag } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { waLink } from "@/lib/whatsapp";

export const Route = createFileRoute("/thank-you")({
  head: () => ({
    meta: [
      { title: "شكراً لك — اليسر ميديكال" },
      {
        name: "description",
        content: "تم استلام طلبك بنجاح. سنتواصل معك خلال دقائق لتأكيد التفاصيل.",
      },
      { name: "robots", content: "noindex,follow" },
    ],
  }),
  component: ThankYouPage,
});

function ThankYouPage() {
  const { clear, items } = useCart();

  // تفريغ السلة تلقائياً عند الوصول لهذه الصفحة (بعد تحويل العميل لواتساب)
  useEffect(() => {
    if (items.length > 0) clear();
    // التمرير لأعلى الصفحة
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="container mx-auto px-4 py-12 md:py-16 max-w-2xl">
      <div className="text-center space-y-6">
        {/* أيقونة النجاح */}
        <div className="inline-flex h-24 w-24 items-center justify-center rounded-full bg-green-100 text-green-600 mx-auto animate-in zoom-in-50 duration-500">
          <CheckCircle2 className="h-14 w-14" strokeWidth={2.5} />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold">شكراً لك على ثقتك! 🎉</h1>
          <p className="text-lg text-muted-foreground">تم تحويلك لواتساب لإكمال طلبك.</p>
        </div>

        {/* صندوق الخطوات التالية */}
        <div className="rounded-3xl border-2 border-primary/20 bg-gradient-soft p-6 md:p-8 text-right space-y-4">
          <h2 className="text-xl font-bold text-center mb-4">📋 ما الذي يحدث الآن؟</h2>
          <ul className="space-y-3">
            {[
              { num: "1", txt: "سيقوم فريقنا بمراجعة طلبك خلال دقائق معدودة." },
              { num: "2", txt: "سنتواصل معك على الواتساب لتأكيد العنوان والتفاصيل." },
              { num: "3", txt: "نُرسل طلبك في تغليف سري ومحايد لجميع المحافظات." },
              { num: "4", txt: "الدفع عند الاستلام بعد فحص الطلب." },
            ].map((s) => (
              <li key={s.num} className="flex items-start gap-3">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-brand text-xs font-bold text-primary-foreground">
                  {s.num}
                </span>
                <span className="text-sm md:text-base leading-relaxed">{s.txt}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* لم تصلك رسالة؟ */}
        <div className="rounded-2xl border bg-card p-5 space-y-3">
          <p className="text-sm text-muted-foreground">لم تصل رسالة الواتساب أو واجهت مشكلة؟</p>
          <div className="flex justify-center">
            <a
              href={waLink("مرحباً، أرغب في تأكيد طلبي")}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-5 py-2.5 text-sm font-bold text-white shadow-md hover:scale-[1.02] transition-smooth"
            >
              <MessageCircle className="h-4 w-4" /> فتح الواتساب
            </a>
          </div>
        </div>

        {/* أزرار التنقل */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-brand px-5 py-3 text-sm font-bold text-primary-foreground shadow-elegant hover:scale-[1.02] transition-smooth"
          >
            <Home className="h-4 w-4" /> الصفحة الرئيسية
          </Link>
          <Link
            to="/products/men"
            className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-primary px-5 py-3 text-sm font-bold text-primary hover:bg-accent transition-smooth"
          >
            <ShoppingBag className="h-4 w-4" /> متابعة التسوق
          </Link>
        </div>


      </div>
    </div>
  );
}
