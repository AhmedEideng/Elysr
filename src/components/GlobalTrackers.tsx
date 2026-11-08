/** Outbound/share delegation plus official document-level Core Web Vitals.
 * No custom CLS sums, per-event INP approximations or early ten-second finalization.
 * The vital observer module registers once across StrictMode and SPA remounts.
 */
import { useEffect } from "react";
import { startWebVitals } from "@/lib/web-vitals";
import { trackOutboundClick, trackShareClick, trackWhatsAppClick } from "@/lib/analytics";

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
          const label = pickOutboundLabel(u.host);
          if (label === "whatsapp") trackWhatsAppClick(u.href, "outbound_link");
          else trackOutboundClick(u.href, label);
        }
      } catch {
        /* invalid href — ignore */
      }
    };
    document.addEventListener("click", onClick, { capture: true });

    startWebVitals();
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);
  return null;
}
