import { useEffect, useRef } from "react";

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
          }

          // Track 90%
          if (pctScrolled >= 90 && !tracked90.current) {
            tracked90.current = true;
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
