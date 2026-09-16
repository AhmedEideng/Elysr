import { Share2 } from "lucide-react";
import { waShareUrl } from "@/lib/share";

/**
 * (2026-09-16) زر مشاركة عبر واتساب — حلقة الانتشار (share loop).
 * `wa.me/?text=` (بلا رقم) بيفتح شاشة اختيار جهة الإرسال مع النص
 * جاهز — أقل مجهود ممكن للعميل عشان يشارك.
 */
export function ShareButton({
  text,
  label = "شارك",
  className = "",
}: {
  /** النص الجاهز للمشاركة (اسم/عنوان + لينك). */
  text: string;
  label?: string;
  className?: string;
}) {
  return (
    <a
      href={waShareUrl(text)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className={`inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-white/80 px-3 py-1.5 text-xs font-bold text-primary shadow-sm transition-all hover:border-primary hover:bg-primary hover:text-white ${className}`}
    >
      <Share2 className="h-3.5 w-3.5 shrink-0" />
      <span>{label}</span>
    </a>
  );
}
