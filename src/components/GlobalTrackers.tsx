/**
 * ============================================================
 * 📊 Global GA4 auto-trackers (2026-09-18) — تثبيت تلقائي
 * ============================================================
 * بيركب مرة واحدة من الـ root component — بيتتبع:
 *
 *  • outbound clicks (wa.me, facebook, twitter, x.com, etc.)
 *  • share clicks (الـ wa.me/?text= links — لقياس الـ viral loop)
 *  • internal search (الـ ?q= URL — لما حد يدور في الـ SearchBar)
 *  • Web Vitals (LCP, CLS, INP) — كـ web_vital event
 *
 * التصميم: passive listeners + delegation من document → مفيش
 * memory leak لما الـ routes تتغير. الـ web-vitals بيتسجل مرة
 * واحدة عند الـ mount الأول.
 * ============================================================
 */
import { useEffect } from "react";
import {
  trackOutboundClick,
  trackShareClick,
  trackSiteSearch,
  trackWebVital,
  type TrackItem,
} from "@/lib/analytics";

const SHARE_PATTERNS = [/wa\.me\/?\?text=/, /\/share/];
// قائمة الـ hosts اللي بنحسبها outbound (whatsapp/facebook/medical sources/etc).
// الميزة: نقدر نخصص label مفيد في التقارير بدل الـ host الخام.
const OUTBOUND_LABELERS: Array<{ test: RegExp; label: string }> = [
  { test: /^wa\.me/, label: "whatsapp" },
  { test: /^facebook\.com/, label: "facebook" },
  { test: /^instagram\.com/, label: "instagram" },
  { test: /^twitter\.com|^x\.com/, label: "twitter" },
  { test: /^youtube\.com/, label: "youtube" },
  { test: /^tiktok\.com/, label: "tiktok" },
  { test: /^docs\.google\.com/, label: "google-docs" },
  { test: /mayo|cleveland|nih|ncbi|medlineplus|nhs|who/, label: "medical-source" },
];

function sameOrigin(a: URL, b: URL) {
  return a.host === b.host && a.protocol === b.protocol;
}

function pickOutboundLabel(host: string): string {
  for (const { test, label } of OUTBOUND_LABELERS) {
    if (test.test(host)) return label;
  }
  return host;
}

export function GlobalTrackers({ items }: { items?: TrackItem[] }) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // ── 1) outbound + share click delegation ──
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest("a");
      if (!a || !a.href) return;
      try {
        const u = new URL(a.href, window.location.href);
        const isShare = SHARE_PATTERNS.some((p) => p.test(a.href));
        if (isShare) {
          const refPath = window.location.pathname;
          // (heuristic) share kind من الـ URL/المرجع
          let kind: "product" | "article" | "guide" = "product";
          if (refPath.startsWith("/education/")) kind = "article";
          else if (refPath.startsWith("/products/guides/")) kind = "guide";
          trackShareClick(kind, refPath);
          return;
        }
        if (!sameOrigin(u, new URL(window.location.href))) {
          trackOutboundClick(u.href, pickOutboundLabel(u.host));
        }
      } catch {
        /* invalid href — ignore */
      }
    };
    document.addEventListener("click", onClick, { capture: true });

    // ── 2) internal search (الـ ?q= URL) — بيتنادى مرتين: أول مرة
    // بنشوف الـ query string، بعدين بنشيله من الـ URL عشان ما يبقيش
    // مرئي للزائر. بس ده اختياري — بنسيبه للـ route. ──
    const search = new URLSearchParams(window.location.search).get("q");
    if (search) {
      // results_count بيتبعت بعد load الـ route — بناديه بـ 0 أولاً
      // ثم الـ route لو عندها hook (مثلاً SearchBar) بتقدر تعمل
      // trackSiteSearch تاني بنتيجة بعد ما الـ results يجهز.
      trackSiteSearch(search, items?.length ?? 0);
    }

    // ── 3) Web Vitals — using PerformanceObserver (no extra deps) ──
    let lcpValue = 0;
    try {
      const lcp = new PerformanceObserver((list) => {
        for (const e of list.getEntries())
          lcpValue =
            (e as { renderTime?: number; loadTime?: number; startTime?: number }).renderTime ??
            (e as { loadTime?: number; startTime?: number }).loadTime ??
            lcpValue;
      });
      lcp.observe({ type: "largest-contentful-paint", buffered: true });
      // LCP final
      const sendLCP = () => {
        lcp.disconnect();
        trackWebVital(
          "LCP",
          lcpValue,
          lcpValue < 2500 ? "good" : lcpValue < 4000 ? "needs-improvement" : "poor",
        );
      };
      // report on hidden page
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") sendLCP();
      });
    } catch {
      /* PerformanceObserver غير متاح */
    }

    let clsValue = 0;
    try {
      const cls = new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          const entry = e as { value?: number; hadRecentInput?: boolean };
          if (!entry.hadRecentInput) clsValue += entry.value ?? 0;
        }
      });
      cls.observe({ type: "layout-shift", buffered: true });
      const sendCLS = () => {
        cls.disconnect();
        trackWebVital(
          "CLS",
          clsValue,
          clsValue < 0.1 ? "good" : clsValue < 0.25 ? "needs-improvement" : "poor",
        );
      };
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") sendCLS();
      });
    } catch {
      /* PerformanceObserver غير متاح */
    }

    // INP (Interaction to Next Paint) — experimental
    try {
      const inp = new PerformanceObserver((list) => {
        let worst = 0;
        for (const e of list.getEntries()) {
          const entry = e as { duration?: number };
          if ((entry.duration ?? 0) > worst) worst = entry.duration ?? 0;
        }
        if (worst > 0) {
          trackWebVital(
            "INP",
            worst,
            worst < 200 ? "good" : worst < 500 ? "needs-improvement" : "poor",
          );
        }
      });
      try {
        inp.observe({
          type: "event",
          buffered: true,
          durationThreshold: 16,
        } as PerformanceObserverInit);
      } catch {
        /* some browsers لا يدعم event timing */
      }
    } catch {
      /* ignore */
    }

    return () => {
      document.removeEventListener("click", onClick, { capture: true });
    };
  }, [items]);

  return null;
}
