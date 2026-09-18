import { Share2 } from "lucide-react";
import { waShareUrl } from "@/lib/share";
import { trackCtaClick, trackShareClick } from "@/lib/analytics";

/**
 * (2026-09-16) زر مشاركة عبر واتساب — حلقة الانتشار (share loop).
 * `wa.me/?text=` (بلا رقم) بيفتح شاشة اختيار جهة الإرسال مع النص
 * جاهز — أقل مجهود ممكن للعميل عشان يشارك.
 *
 * (2026-09-18 v2) تتبع مباشر: share_click + cta_click
 * GlobalTrackers بيتتبع كمان عبر delegation كـ fallback، بس هنا
 * بنضمن التتبع حتى لو delegation فشل + بنحدد kind بدقة.
 */
export function ShareButton({
  text,
  label = "شارك",
  className = "",
  kind,
}: {
  /** النص الجاهز للمشاركة (اسم/عنوان + لينك). */
  text: string;
  label?: string;
  className?: string;
  /** نوع المحتوى (يُستنتج من المسار لو مش مُمرر) */
  kind?: "product" | "article" | "guide";
}) {
  const handleClick = () => {
    try {
      const path = typeof window !== "undefined" ? window.location.pathname : "/";
      let resolvedKind: "product" | "article" | "guide" = kind ?? "product";
      if (!kind) {
        if (path.startsWith("/education/")) resolvedKind = "article";
        else if (path.startsWith("/products/guides/")) resolvedKind = "guide";
      }
      trackShareClick(resolvedKind, path);
      trackCtaClick("share_whatsapp", path, { share_kind: resolvedKind });
    } catch {
      /* tracking failure — لا نمنع المشاركة */
    }
  };

  return (
    <a
      href={waShareUrl(text)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      onClick={handleClick}
      className={`inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-white/80 px-3 py-1.5 text-xs font-bold text-primary shadow-sm transition-all hover:border-primary hover:bg-primary hover:text-white ${className}`}
    >
      <Share2 className="h-3.5 w-3.5 shrink-0" />
      <span>{label}</span>
    </a>
  );
}
