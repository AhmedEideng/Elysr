import { useEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";

export function BackToTop() {
  const [isVisible, setIsVisible] = useState(false);
  // 🔧 استخدام IntersectionObserver بدلاً من scroll listener لأداء أفضل
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) {
      // Fallback: إنشاء sentinel element
      const el = document.createElement("div");
      el.style.cssText = "position:absolute;top:300px;left:0;width:0;height:0;pointer-events:none;";
      document.body.prepend(el);
      sentinelRef.current = el;
    }

    const target = sentinelRef.current!;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(!entry.isIntersecting);
      },
      { threshold: 0, rootMargin: "0px" },
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
      target.remove();
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <button
      onClick={scrollToTop}
      aria-label="العودة للأعلى"
      className={`fixed bottom-24 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-elegant transition-all duration-300 hover:scale-110 hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-16 opacity-0 pointer-events-none"
      }`}
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}
