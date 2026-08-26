import {
  Outlet,
  createRootRoute,
  useRouter,
  useRouterState,
  Link,
  ScrollRestoration,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { lazy, Suspense } from "react";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
// 🚀 Lazy-load Toaster — it's only needed after a user action,
// so deferring its 33 KiB bundle frees up the critical path.
const Toaster = lazy(() => import("sonner").then((m) => ({ default: m.Toaster })));

import { CartProvider } from "@/contexts/cart";
import { Layout } from "@/components/layout/Layout";
import { applySeo } from "@/lib/seo";
import { installErrorTracking } from "@/lib/error-tracking";

// 🛡️ تفعيل تتبع الأخطاء العالمي — يلتقط أي uncaught error أو promise rejection
installErrorTracking();

// ----------------------------------------------------------------
// Google Analytics page_view tracking
// ----------------------------------------------------------------

interface TrackingWindow extends Window {
  gtag?: (...args: unknown[]) => void;
  dataLayer?: unknown[];
}

function trackPageView(url: string) {
  if (typeof window === "undefined") return;
  const w = window as TrackingWindow;

  try {
    if (typeof w.gtag === "function") {
      w.gtag("event", "page_view", {
        page_path: url,
        page_location: window.location.href,
        page_title: document.title,
      });
    } else if (Array.isArray(w.dataLayer)) {
      w.dataLayer.push({
        event: "page_view",
        page_path: url,
        page_location: window.location.href,
        page_title: document.title,
      });
    }
  } catch {
    // Ignore GA tracking errors
  }
}

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
    let image: string | undefined;
    let type: "website" | "article" | "product" | undefined;
    let noindex = false;

    for (let i = matches.length - 1; i >= 0; i--) {
      const match = matches[i];
      const routeId = match.routeId as string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const route = (router.routesById as any)[routeId];
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
          if (
            !image &&
            (m?.property === "og:image" || m?.name === "twitter:image") &&
            typeof m?.content === "string"
          ) {
            image = m.content as string;
          }
          if (
            !type &&
            m?.property === "og:type" &&
            (m?.content === "website" || m?.content === "article" || m?.content === "product")
          ) {
            type = m.content;
          }
          if (m?.name === "robots" && typeof m?.content === "string") {
            noindex = m.content.toLowerCase().includes("noindex");
          }
        }
        if (title) break;
      } catch {
        /* ignore */
      }
    }

    applySeo({ title, description, image, type, noindex });
    // Google Analytics page tracking
    trackPageView(window.location.pathname);
  }, [matches, router]);

  return null;
}

function ToastCleanupOnVisible() {
  // 🧹 الموبايل يعلّق التبويب عند الانتقال لتطبيق آخر (واتساب) فتتوقف
  // مؤقتات إغلاق التوستات — فيبقي توست "تم تجهيز رسالة واتساب" ظاهراً
  // عند العودة للموقع. الحل: أي توست باقٍ عند عودة التبويب لمصالحه
  // يعتبر قديماً ويُغلق فوراً. استيراد ديناميكي حتى يبقى sonner (33KB)
  // خارج مسار التحميل الحرج (يُحمَّل أصلاً عند أول توست).
  useEffect(() => {
    let dismiss: (() => void) | undefined;
    import("sonner").then((m) => {
      dismiss = () => m.toast.dismiss();
    });
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") dismiss?.();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);
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
      <ScrollRestoration />
      <RouteHeadSync />
      <ToastCleanupOnVisible />
      <Layout>
        <Outlet />
      </Layout>
      <Suspense fallback={null}>
        <Toaster position="top-center" richColors closeButton />
      </Suspense>
      {/* 🚀 Vercel Web Analytics & Speed Insights Integration */}
      <Analytics />
      <SpeedInsights />
    </CartProvider>
  );
}
