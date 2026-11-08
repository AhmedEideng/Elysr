import { trackWebVital } from "@/lib/analytics";

// Vitals belong to the browser document, not each SPA route or React remount.
let started = false;
export function startWebVitals() {
  if (started || typeof window === "undefined") return;
  started = true;
  void import("web-vitals")
    .then(({ onCLS, onINP, onLCP }) => {
      const report = (metric: {
        name: "CLS" | "INP" | "LCP";
        value: number;
        rating: string;
        id: string;
      }) => {
        trackWebVital(metric.name, metric.value, metric.rating, metric.id);
      };
      onCLS(report);
      onINP(report);
      onLCP(report);
    })
    .catch(() => {
      started = false;
    });
}
