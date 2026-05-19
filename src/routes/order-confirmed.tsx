import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { CheckCircle2, Phone, Home, ShoppingBag } from "lucide-react";

export const Route = createFileRoute("/order-confirmed")({
  head: () => ({
    meta: [
      { title: "تم استلام طلبك — اليسر ميديكال" },
      { name: "description", content: "تم استلام طلبك بنجاح. سنتواصل معك قريباً لتأكيد التفاصيل." },
      { name: "robots", content: "noindex,follow" },
    ],
  }),
  component: OrderConfirmedPage,
});

function OrderConfirmedPage() {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <div className="container mx-auto px-4 overflow-x-hidden py-12 md:py-16 max-w-2xl">
      <div className="text-center space-y-6">
        <div className="inline-flex h-24 w-24 items-center justify-center rounded-full bg-gradient-brand text-primary-foreground mx-auto animate-in zoom-in-50 duration-500">
          <CheckCircle2 className="h-14 w-14" strokeWidth={2.5} />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold">تم استلام طلبك بنجاح! 🎉</h1>
          <p className="text-lg text-muted-foreground">
            رقم الطلب محفوظ وسنتواصل معك قريباً لتأكيد التفاصيل.
          </p>
        </div>

        <div className="rounded-3xl border-2 border-primary/20 bg-card p-6 md:p-8 text-right space-y-4">
          <h2 className="text-xl font-bold text-center mb-4">📋 ماذا سيحدث الآن؟</h2>
          <ul className="space-y-3">
            {[
              { num: "1", txt: "فريق المبيعات سيراجع طلبك فوراً." },
              { num: "2", txt: "سنتواصل معك عبر الهاتف لتأكيد العنوان والمنتجات." },
              { num: "3", txt: "نُجهّز طلبك في تغليف سري ومحايد." },
              { num: "4", txt: "الشحن لجميع المحافظات مع الدفع عند الاستلام." },
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

        <div className="rounded-2xl border bg-gradient-soft p-5 space-y-3">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Phone className="h-5 w-5 text-primary" />
            <span className="text-sm">لديك استفسار؟ تواصل معنا مباشرة</span>
          </div>

        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <Link to="/" className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-brand px-5 py-3 text-sm font-bold text-primary-foreground shadow-elegant hover:scale-[1.02] transition-smooth">
            <Home className="h-4 w-4" /> الصفحة الرئيسية
          </Link>
          <Link to="/products/men" className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-primary px-5 py-3 text-sm font-bold text-primary hover:bg-accent transition-smooth">
            <ShoppingBag className="h-4 w-4" /> متابعة التسوق
          </Link>
        </div>
      </div>
    </div>
  );
}
