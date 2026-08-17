import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, MessageCircle, Home, ShoppingBag } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { waLink } from "@/lib/whatsapp";
import { secureLoad } from "@/lib/local-secure-store";

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
  const [lastWhatsAppUrl] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem("elysr_last_whatsapp_url");
    } catch {
      return null;
    }
  });

  // 🔄 معالج المزامنة التلقائية والنسخ الاحتياطي للطلبات المتعثرة (Background Sync Retry)
  useEffect(() => {
    async function retryFailedOrders() {
      try {
        const key = "elysr_fallback";
        const raw = localStorage.getItem(key);
        if (!raw) return;

        // 🔒 قراءة مشفّرة (كانت تُخزَّن كنص صريح سابقاً) — مع دعم قراءة أي
        // بيانات قديمة غير مشفّرة للتدرّج الأمني.
        const orders: Array<Record<string, unknown>> =
          secureLoad<Array<Record<string, unknown>>>(raw) ??
          (raw.startsWith("elysr_enc_v1:")
            ? []
            : (JSON.parse(raw) as Array<Record<string, unknown>>));
        if (orders.length === 0) return;

        console.log(`🔄 Found ${orders.length} failed orders in local backup. Retrying sync...`);
        const remainingOrders: Array<Record<string, unknown>> = [];

        for (const order of orders) {
          try {
            const response = await fetch("/api/submit-order", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(order),
            });

            if (response.ok) {
              const result = await response.json();
              if (result?.success) {
                console.log(`   ✅ Successfully retried and synced order ${order.orderId}!`);
                continue; // تم بنجاح، لا نضيفه للمتبقي ليُحذف من الذاكرة
              }
            }
            // إذا فشل مجدداً، نحتفظ به في القائمة لإعادة المحاولة لاحقاً
            remainingOrders.push(order);
          } catch (err) {
            console.warn(`   ⚠️ Failed to sync order ${order.orderId}:`, err);
            remainingOrders.push(order);
          }
        }

        if (remainingOrders.length > 0) {
          localStorage.setItem(key, JSON.stringify(remainingOrders));
        } else {
          localStorage.removeItem(key);
        }
      } catch (err) {
        console.error("Failed to run background order sync:", err);
      }
    }

    // تشغيل عملية المزامنة الاحتياطية بعد ثانيتين من تحميل الصفحة لتجنب حظر التحولات البصرية
    const timer = setTimeout(retryFailedOrders, 2000);
    return () => clearTimeout(timer);
  }, []);

  // تفريغ السلة تلقائياً عند الوصول لهذه الصفحة (بعد تحويل العميل لواتساب)
  useEffect(() => {
    if (items.length > 0) clear();
    // التمرير لأعلى الصفحة
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [clear, items.length]);

  return (
    <div className="container mx-auto px-4 py-12 md:py-16 max-w-2xl">
      <div className="text-center space-y-6">
        {/* أيقونة النجاح */}
        <div className="inline-flex h-24 w-24 items-center justify-center rounded-full bg-green-100 text-green-600 mx-auto animate-in zoom-in-50 duration-500">
          <CheckCircle2 className="h-14 w-14" strokeWidth={2.5} />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold">شكراً لك على ثقتك! 🎉</h1>
          <p className="text-lg text-muted-foreground">شكراً لك، سنتابع طلبك في أقرب وقت.</p>
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
              href={lastWhatsAppUrl ?? waLink("مرحباً، أرغب في تأكيد طلبي")}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-5 py-2.5 text-sm font-bold text-white shadow-md hover:scale-[1.02] transition-smooth"
            >
              <MessageCircle className="h-4 w-4" /> فتح الواتساب مرة أخرى
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
