import { lazy, Suspense, type ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { SkipToContent } from "@/components/Accessibility";

// 🚀 Floating actions & back-to-top aren't visible above the fold;
// load them lazily so they don't block first paint.
const FloatingActions = lazy(() =>
  import("@/components/FloatingActions").then((m) => ({ default: m.FloatingActions })),
);
const BackToTop = lazy(() =>
  import("@/components/BackToTop").then((m) => ({ default: m.BackToTop })),
);

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col overflow-hidden">
      {/* WCAG 2.4.1 — keyboard users can bypass the header */}
      <SkipToContent />
      <Header />
      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 outline-none w-full overflow-x-hidden"
      >
        {children}
      </main>
      <Footer />
      <Suspense fallback={null}>
        <FloatingActions />
        <BackToTop />
      </Suspense>
    </div>
  );
}
