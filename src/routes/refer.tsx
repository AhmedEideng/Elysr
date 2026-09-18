import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Share2, Gift, Users, Copy, Check } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { toast } from "sonner";
import { getOwnReferralCode, buildReferralLink, buildReferralShareText } from "@/lib/referral";
import { waShareUrl } from "@/lib/share";
import { trackCtaClick, trackViewPromotion } from "@/lib/analytics";

export const Route = createFileRoute("/refer")({
  head: () => ({
    meta: [
      { title: "برنامج المشاركة — شارك رابط اليسر | اليسر ميديكال" },
      {
        name: "description",
        content:
          "شارك رابط اليسر مع أصدقائك؛ يُسجّل كود الإحالة مع الطلب لمتابعة مصدره. نظام مشاركة بسيط مع شحن سري لكل مصر.",
      },
    ],
  }),
  component: ReferPage,
});

function ReferPage() {
  const [code] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return getOwnReferralCode();
  });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    trackViewPromotion("referral_program", "referral_page");
  }, []);

  const link = code ? buildReferralLink(code) : "";
  const shareText = code ? buildReferralShareText(code) : "";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("تم نسخ رابط الإحالة!");
      trackCtaClick("copy_referral_link", "/refer", { referral_code: code });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("فشل النسخ، انسخ الرابط يدوياً");
    }
  };

  return (
    <div className="container mx-auto px-4 py-10 md:py-12">
      <PageHero
        eyebrow="برنامج الإحالة"
        title="شارك اليسر مع أصدقائك — ورابطك يتسجل في الطلب 🎁"
        description="لكل زائر كود مشاركة فريد. شاركه عبر واتساب؛ وعند الطلب يُسجَّل الكود في بيانات الطلب لمتابعة مصدر الإحالة، دون بيانات شخصية في الكود."
      />

      <div className="mx-auto mt-8 max-w-3xl space-y-6">
        {/* الكود والرابط */}
        <div className="rounded-[2rem] border border-primary/10 bg-card p-6 shadow-card md:p-8">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-black">
            <Gift className="h-5 w-5 text-primary" /> كود الإحالة الخاص بك
          </h2>

          {code ? (
            <>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex-1 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 px-5 py-4 text-center">
                  <div className="text-xs font-bold text-muted-foreground">كودك</div>
                  <div className="mt-1 text-3xl font-black tracking-widest text-primary">
                    {code}
                  </div>
                </div>
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-brand px-6 py-3 text-sm font-black text-primary-foreground shadow-elegant transition-smooth hover:scale-[1.02]"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "تم النسخ!" : "نسخ الرابط"}
                </button>
              </div>

              <div className="mt-4 rounded-2xl bg-muted/50 p-4">
                <div className="text-xs font-bold text-muted-foreground">رابط الإحالة:</div>
                <div className="mt-1 break-all text-sm font-mono">{link}</div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <a
                  href={waShareUrl(shareText)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() =>
                    trackCtaClick("share_referral_whatsapp", "/refer", { referral_code: code })
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 py-3.5 text-sm font-black text-white shadow-lg transition-smooth hover:bg-[#1ebd57]"
                >
                  <Share2 className="h-5 w-5" />
                  مشاركة واتساب
                </a>
                <Link
                  to="/products/men"
                  onClick={() => trackCtaClick("browse_products_from_refer", "/refer")}
                  className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-primary px-6 py-3.5 text-sm font-black text-primary transition-smooth hover:bg-primary hover:text-white"
                >
                  تصفح المنتجات
                </Link>
              </div>
            </>
          ) : (
            <div className="text-center text-sm text-muted-foreground">
              جاري تجهيز كود الإحالة...
            </div>
          )}
        </div>

        {/* كيف يعمل */}
        <div className="rounded-[2rem] border border-primary/10 bg-gradient-soft p-6 md:p-8">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-black">
            <Users className="h-5 w-5 text-primary" /> كيف يعمل؟
          </h2>
          <ol className="space-y-3">
            {[
              "انسخ رابط الإحالة الخاص بك أعلاه",
              "شاركه مع صديق عبر واتساب (رسالة جاهزة)",
              "صديقك يفتح الرابط — الكود يتحفظ تلقائياً لمدة 30 يوم",
              "عندما يطلب، يُسجّل كودك في الطلب لمتابعة الإحالة؛ وأي مكافأة تُراجع وفق سياسة المتجر",
            ].map((step, i) => (
              <li key={i} className="flex gap-3 rounded-2xl border bg-card p-4 text-sm leading-6">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-black text-white">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-center text-xs leading-6 text-amber-900">
          🔒 كود الإحالة لا يحتوي أي بيانات شخصية — مجرد رمز عشوائي. نحرص على خصوصية الطلبات ونستخدم
          تغليفاً سرياً ومحايداً.
        </div>
      </div>
    </div>
  );
}
