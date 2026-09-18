/**
 * ============================================================
 * 📊 Global GA4 auto-trackers (2026-09-18 v2) — تثبيت تلقائي
 * ============================================================
 * بيركب مرة واحدة من الـ root component — بيتتبع:
 *
 *  • outbound clicks (wa.me, facebook, twitter, x.com, etc.)
 *  • share clicks (الـ wa.me/?text= links — لقياس الـ viral loop)
 *  • Web Vitals (LCP, CLS, INP) — كـ web_vital event
 *
 * التصميم: passive listeners + delegation من document → مفيش
 * memory leak لما الـ routes تتغير. الـ web-vitals بيتسجل مرة
 * واحدة عند الـ mount الأول مع cleanup صحيح.
 *
 * v2 changes:
 *  - search tracking اتنقل لـ /search route نفسه (results_count دقيق)
 *  - Web Vitals: listener واحد لـ visibilitychange يبعت LCP+CLS+INP
 *  - إزالة items prop (كان دايمًا 0)
 * ============================================================
 */
import { useEffect } from "react";
import { trackOutboundClick, trackShareClick, trackWebVital } from "@/lib/analytics";

const SHARE_PATTERNS = [/wa\.me\/?\?text=/, /\/share/];
// قائمة الـ hosts اللي بنحسبها outbound (whatsapp/facebook/medical sources/etc).
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

export function GlobalTrackers() {
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

    // ── 2) Web Vitals — PerformanceObserver with single visibility handler ──
    let lcpValue = 0;
    let clsValue = 0;
    let worstINP = 0;
    let lcpObserver: PerformanceObserver | null = null;
    let clsObserver: PerformanceObserver | null = null;
    let inpObserver: PerformanceObserver | null = null;
    let lcpSent = false;
    let clsSent = false;

    const sendVitalsOnHidden = () => {
      if (document.visibilityState !== "hidden") return;
      if (!lcpSent && lcpValue > 0) {
        lcpSent = true;
        trackWebVital(
          "LCP",
          lcpValue,
          lcpValue < 2500 ? "good" : lcpValue < 4000 ? "needs-improvement" : "poor",
        );
        lcpObserver?.disconnect();
      }
      if (!clsSent) {
        clsSent = true;
        trackWebVital(
          "CLS",
          clsValue,
          clsValue < 0.1 ? "good" : clsValue < 0.25 ? "needs-improvement" : "poor",
        );
        clsObserver?.disconnect();
      }
      if (worstINP > 0) {
        trackWebVital(
          "INP",
          worstINP,
          worstINP < 200 ? "good" : worstINP < 500 ? "needs-improvement" : "poor",
        );
        // INP قد يتحدث بعد hidden مرة أخيرة — نسيبه مفتوح لحد unload
      }
    };

    try {
      lcpObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const e = entry as PerformanceEntry & {
            renderTime?: number;
            loadTime?: number;
          };
          const v = e.renderTime ?? e.loadTime ?? e.startTime;
          if (v > lcpValue) lcpValue = v;
        }
      });
      lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
    } catch {
      /* LCP not supported */
    }

    try {
      clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const e = entry as PerformanceEntry & {
            value?: number;
            hadRecentInput?: boolean;
          };
          if (!e.hadRecentInput) clsValue += e.value ?? 0;
        }
      });
      clsObserver.observe({ type: "layout-shift", buffered: true });
    } catch {
      /* CLS not supported */
    }

    try {
      inpObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const e = entry as PerformanceEntry & { duration?: number };
          const d = e.duration ?? 0;
          if (d > worstINP) {
            worstINP = d;
            // نرسل INP مباشرة عند التفاعل (مع throttling ضمني من worst check)
            // + سيُرسل مرة أخيرة عند hidden
            trackWebVital(
              "INP",
              worstINP,
              worstINP < 200 ? "good" : worstINP < 500 ? "needs-improvement" : "poor",
            );
          }
        }
      });
      try {
        inpObserver.observe({
          type: "event",
          buffered: true,
          durationThreshold: 16,
        } as PerformanceObserverInit);
      } catch {
        /* event timing not supported */
      }
    } catch {
      /* ignore */
    }

    document.addEventListener("visibilitychange", sendVitalsOnHidden);

    // Fallback: لو المستخدم فضل في الصفحة 10 ثواني بدون hidden، ابعت LCP/CLS
    const fallbackTimer = window.setTimeout(() => {
      if (!lcpSent && lcpValue > 0) {
        lcpSent = true;
        trackWebVital(
          "LCP",
          lcpValue,
          lcpValue < 2500 ? "good" : lcpValue < 4000 ? "needs-improvement" : "poor",
        );
      }
      if (!clsSent) {
        clsSent = true;
        trackWebVital(
          "CLS",
          clsValue,
          clsValue < 0.1 ? "good" : clsValue < 0.25 ? "needs-improvement" : "poor",
        );
      }
    }, 10000);

    return () => {
      document.removeEventListener("click", onClick, { capture: true });
      document.removeEventListener("visibilitychange", sendVitalsOnHidden);
      window.clearTimeout(fallbackTimer);
      lcpObserver?.disconnect();
      clsObserver?.disconnect();
      inpObserver?.disconnect();
    };
  }, []);

  return null;
}
