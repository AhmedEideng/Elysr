import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

/**
 * زر "العودة للأعلى" يظهر بعد التمرير 300px للأسفل.
 * يستخدم scroll listener (passive) + rAF throttling — أكثر دقة وأنظف
 * من حقن sentinel وهمي في الـ body.
 */
export function BackToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let ticking = false;
    const update = () => {
      setIsVisible(window.scrollY > 300);
      ticking = false;
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <button
      onClick={scrollToTop}
      aria-label="العودة للأعلى"
      className={`fixed bottom-20 right-5 z-40 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-elegant transition-all duration-300 hover:scale-110 hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-16 opacity-0 pointer-events-none"
      }`}
    >
      <ArrowUp className="h-4 w-4" />
    </button>
  );
}
