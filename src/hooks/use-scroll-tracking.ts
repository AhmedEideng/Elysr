import { useEffect, useRef } from "react";

// 📊 إبلاغ GA4 بميلstone القراءة (50%/90%) — قارئ عالي النية.
// يُرسل كحدث "scroll" مخصص (مع page_title/percent) ليعمل مع أي GA4 property.
function trackScrollMilestone(pct: number) {
  if (typeof window === "undefined") return;
  const w = window as unknown as {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  };
  const payload = {
    page_title: document.title,
    page_location: window.location.href,
    percent_scrolled: pct,
  };
  try {
    if (typeof w.gtag === "function") {
      w.gtag("event", "scroll", payload);
    } else if (Array.isArray(w.dataLayer)) {
      w.dataLayer.push({ event: "scroll", ...payload });
    }
  } catch {
    // لا نسمح لتتبع التمرير بإعاقة الصفحة
  }
}

export function useScrollTracking(pageName: string) {
  const tracked50 = useRef(false);
  const tracked90 = useRef(false);

  useEffect(() => {
    // Reset refs on page change
    tracked50.current = false;
    tracked90.current = false;

    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          // Calculate scroll percentage
          const winHeight = window.innerHeight;
          const docHeight = document.documentElement.scrollHeight;
          const scrollTop = window.scrollY;
          const trackLength = docHeight - winHeight;
          const pctScrolled = trackLength > 0 ? Math.floor((scrollTop / trackLength) * 100) : 0;

          // Track 50%
          if (pctScrolled >= 50 && !tracked50.current) {
            tracked50.current = true;
            trackScrollMilestone(50);
          }

          // Track 90%
          if (pctScrolled >= 90 && !tracked90.current) {
            tracked90.current = true;
            trackScrollMilestone(90);
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
  }, [pageName]);
}
