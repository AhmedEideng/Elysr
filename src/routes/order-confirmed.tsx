import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Phone, Home, ShoppingBag, Gift, Share2, Copy, Check } from "lucide-react";
import { getOwnReferralCode, buildReferralLink, buildReferralShareText } from "@/lib/referral";
import { waShareUrl } from "@/lib/share";
import { trackCtaClick } from "@/lib/analytics";
import { toast } from "sonner";

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
  const [referralCode] = useState(() => {
    if (typeof window === "undefined") return "";
    return getOwnReferralCode();
  });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const referralLink = referralCode ? buildReferralLink(referralCode) : "";
  const shareText = referralCode ? buildReferralShareText(referralCode) : "";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success("تم نسخ رابط الإحالة!");
      trackCtaClick("copy_referral_from_confirmed", "/order-confirmed", {
        referral_code: referralCode,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("فشل النسخ");
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 md:py-16 max-w-2xl">
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

        {/* Referral viral loop */}
        {referralCode && (
          <div className="rounded-[2rem] border-2 border-dashed border-primary/30 bg-gradient-soft p-6 text-right space-y-4">
            <h2 className="flex items-center justify-center gap-2 text-xl font-black">
              <Gift className="h-5 w-5 text-primary" /> شارك رابط اليسر — كودك: {referralCode}
            </h2>
            <p className="text-center text-sm leading-6 text-muted-foreground">
              انسخ رابطك وشاركه عبر واتساب؛ ويُسجّل الكود مع أي طلب لمتابعة الإحالة وفق سياسة
              المتجر.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="flex-1 rounded-2xl border bg-card px-4 py-3 text-xs font-mono break-all">
                {referralLink}
              </div>
              <button
                onClick={handleCopy}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-brand px-5 py-3 text-sm font-bold text-primary-foreground"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "تم النسخ!" : "نسخ"}
              </button>
            </div>
            <a
              href={waShareUrl(shareText)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() =>
                trackCtaClick("share_referral_from_confirmed", "/order-confirmed", {
                  referral_code: referralCode,
                })
              }
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 py-3.5 text-sm font-black text-white shadow-lg hover:bg-[#1ebd57]"
            >
              <Share2 className="h-5 w-5" /> مشاركة واتساب
            </a>
            <Link
              to="/refer"
              className="block text-center text-xs font-bold text-primary hover:underline"
              onClick={() => trackCtaClick("view_refer_page_from_confirmed", "/order-confirmed")}
            >
              اعرف المزيد عن برنامج الإحالة →
            </Link>
          </div>
        )}

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
