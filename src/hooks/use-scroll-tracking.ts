import { useEffect, useRef } from "react";
import { trackScrollMilestone } from "@/lib/analytics";

/**
 * (2026-09-18) إبلاغ GA4 بميـلستون القراءة (50%/90%) — قارئ عالي النية.
 * يرسل event مخصص `scroll_milestone` (ليس `scroll` المتعارض مع
 * GA4's built-in Enhanced Measurement) + عنوان مستقر من الـ route
 * (مقاومة auto-translate — نفس الـ fix بتاع trackPageView).
 *
 * ⚠️ الـ scroll restore للراوتر (`window.scrollTo(0)`) بيطلق
 * `scroll` event بعد mount بدون أي تصرف من المستخدم — ده متعالج
 * من حقيقة أن الـ useEffect بيشتغل مرة واحدة بس في أول mount
 * (الـ refs مبتعمل reset لما الـ effect يتشال).
 */
export function useScrollTracking(pageTitle: string) {
  const tracked50 = useRef(false);
  const tracked90 = useRef(false);

  useEffect(() => {
    // Reset refs on page change (effect runs on each route change because
    // pageTitle prop changes — but we also reset inside the deps)
    tracked50.current = false;
    tracked90.current = false;

    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const winHeight = window.innerHeight;
          const docHeight = document.documentElement.scrollHeight;
          const scrollTop = window.scrollY;
          const trackLength = docHeight - winHeight;
          const pctScrolled = trackLength > 0 ? Math.floor((scrollTop / trackLength) * 100) : 0;

          if (pctScrolled >= 50 && !tracked50.current) {
            tracked50.current = true;
            trackScrollMilestone(50, pageTitle);
          }
          if (pctScrolled >= 90 && !tracked90.current) {
            tracked90.current = true;
            trackScrollMilestone(90, pageTitle);
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [pageTitle]);
}
