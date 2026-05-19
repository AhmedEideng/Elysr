import { Outlet, createRootRoute, useRouter, useRouterState, Link } from "@tanstack/react-router";
import { useEffect } from "react";

// دالة تتبع الزيارات لـ Google Analytics
const pageview = (url: string) => {
  if (
    typeof window !== "undefined" &&
    (window as unknown as { gtag: (...args: unknown[]) => void }).gtag
  ) {
    (window as unknown as { gtag: (...args: unknown[]) => void }).gtag("config", "G-V3X7Q3D0RR", {
      page_path: url,
    });
  }
};
import { Toaster } from "sonner";

import { CartProvider } from "@/contexts/cart";
import { Layout } from "@/components/layout/Layout";
import { applySeo } from "@/lib/seo";

function NotFoundComponent() {
  useEffect(() => {
    applySeo({
      title: "404 — الصفحة غير موجودة | اليسر ميديكال",
      noindex: true,
    });
  }, []);
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-7xl font-bold text-gradient">404</h1>
        <p className="mt-4 text-muted-foreground">الصفحة غير موجودة</p>
        <Link
          to="/"
          className="mt-6 inline-flex rounded-full bg-gradient-brand px-6 py-3 text-sm font-bold text-primary-foreground"
        >
          العودة للرئيسية
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold">حدث خطأ غير متوقع</h1>
        <p className="mt-2 text-sm text-muted-foreground">يمكنك تحديث الصفحة أو العودة للرئيسية.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="rounded-full bg-gradient-brand px-6 py-3 text-sm font-bold text-primary-foreground"
          >
            إعادة المحاولة
          </button>
          <a
            href="/"
            className="rounded-full border-2 border-primary px-6 py-3 text-sm font-bold text-primary"
          >
            الرئيسية
          </a>
        </div>
      </div>
    </div>
  );
}

/**
 * مزامنة SEO عند كل تغيير مسار:
 * يقرأ `head()` المعرّف على Route ويُحدّث title/description + canonical/og.
 */
function RouteHeadSync() {
  const router = useRouter();
  const matches = useRouterState({ select: (s) => s.matches });

  useEffect(() => {
    let title: string | undefined;
    let description: string | undefined;

    for (let i = matches.length - 1; i >= 0; i--) {
      const match = matches[i];
      const routeId = match.routeId;
      const route = router.routesById[routeId];
      const headFn = (
        route?.options as {
          head?: (ctx: {
            loaderData?: unknown;
            params?: Record<string, unknown>;
            search?: Record<string, unknown>;
          }) => { meta?: Array<Record<string, unknown>> };
        }
      )?.head;
      if (typeof headFn !== "function") continue;
      try {
        const result = headFn({
          loaderData: match.loaderData,
          params: match.params,
          search: match.search,
        });
        const metas = result?.meta ?? [];
        for (const m of metas) {
          if (!title && typeof m?.title === "string") title = m.title as string;
          if (!description && m?.name === "description" && typeof m?.content === "string") {
            description = m.content as string;
          }
        }
        if (title) break;
      } catch {
        /* ignore */
      }
    }

    applySeo({ title, description });
    // إرسال التتبع عند كل تغيير للصفحة
    pageview(window.location.pathname);
  }, [matches, router]);

  return null;
}

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootComponent() {
  return (
    <CartProvider>
      <RouteHeadSync />
      <Layout>
        <Outlet />
      </Layout>
      <Toaster position="top-center" richColors closeButton />
    </CartProvider>
  );
}
