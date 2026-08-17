import { useEffect, useState } from "react";

/**
 * ============================================================
 * Accessibility utilities
 * ============================================================
 * - <SkipToContent /> — keyboard-only link that jumps to <main>
 *   on the first Tab. Critical for WCAG 2.4.1 (Bypass Blocks).
 * - useFocusTrap() — traps focus inside a modal/dialog.
 * ============================================================
 */

/**
 * Skip-to-content link. Renders only when focused via keyboard
 * (hidden until first Tab press) so it doesn't pollute the
 * visual layout.
 */
export function SkipToContent({ targetId = "main-content" }: { targetId?: string }) {
  return (
    <a
      href={`#${targetId}`}
      className="
        sr-only focus:not-sr-only
        focus:fixed focus:top-4 focus:left-1/2 focus:-translate-x-1/2 focus:z-[100]
        focus:rounded-full focus:bg-primary focus:px-6 focus:py-3
        focus:text-primary-foreground focus:shadow-xl focus:outline-none
        focus:ring-4 focus:ring-primary/30
      "
    >
      تخطّى إلى المحتوى الرئيسي
    </a>
  );
}

/**
 * Focus trap hook — keeps Tab cycling inside a modal.
 * Returns ref + activation function.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useFocusTrap<T extends HTMLElement>(isActive: boolean) {
  const [ref, setRef] = useState<T | null>(null);

  useEffect(() => {
    if (!isActive || !ref) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusableSelector =
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusable = Array.from(ref.querySelectorAll<HTMLElement>(focusableSelector)).filter(
      (el) => !el.hasAttribute("inert"),
    );

    if (focusable.length > 0) focusable[0].focus();

    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };

    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      previouslyFocused?.focus();
    };
  }, [isActive, ref]);

  return setRef;
}
