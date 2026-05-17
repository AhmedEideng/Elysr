import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { waLink } from "@/lib/whatsapp";

const NUDGE_DISMISSED_KEY = "elysr_wa_nudge_dismissed_v1";

// Helpers آمنة للتعامل مع sessionStorage (قد لا يكون متاحاً في Safari الخاص أو لو ممتلئ)
const safeGetSession = (key: string): string | null => {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeSetSession = (key: string, value: string): void => {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // تجاهل بأمان
  }
};

export function FloatingActions() {
  const [showNudge, setShowNudge] = useState(false);

  useEffect(() => {
    if (safeGetSession(NUDGE_DISMISSED_KEY)) return;
    const t = setTimeout(() => setShowNudge(true), 5000);
    return () => clearTimeout(t);
  }, []);

  const dismiss = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowNudge(false);
    safeSetSession(NUDGE_DISMISSED_KEY, "1");
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">
      {showNudge && (
        <div className="relative max-w-[260px] rounded-2xl bg-white border border-border shadow-2xl p-3 pr-3 pl-9 animate-in slide-in-from-bottom-4 duration-300">
          <button
            onClick={dismiss}
            className="absolute top-2 left-2 inline-flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:bg-accent"
            aria-label="إغلاق"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <p className="text-xs font-bold text-foreground leading-relaxed">
            👋 محتاج مساعدة؟ كلّمنا على واتساب
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">ردّ سريع خلال دقائق</p>
          <span className="absolute -bottom-1.5 right-6 h-3 w-3 rotate-45 bg-white border-r border-b border-border" />
        </div>
      )}

      <a
        href={waLink("مرحباً، أرغب في الاستفسار عن منتجات اليسر ميديكال")}
        target="_blank"
        rel="noreferrer"
        className="relative inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-2xl transition-smooth hover:scale-110"
        aria-label="تواصل معنا عبر واتساب"
        onClick={() => {
          setShowNudge(false);
          safeSetSession(NUDGE_DISMISSED_KEY, "1");
        }}
      >
        <span className="absolute inset-0 rounded-full bg-[#25D366] opacity-50 animate-ping" />
        <svg viewBox="0 0 24 24" className="relative h-7 w-7 fill-current" aria-hidden="true">
          <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.978-1.607zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z" />
        </svg>
      </a>
    </div>
  );
}
