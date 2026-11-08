import { useEffect, useRef } from "react";
import { trackBeginCheckout, trackCheckoutStage, type TrackItem } from "@/lib/analytics";

/** One start per visible form session; retries are separate submit attempts. */
export function useCheckoutFunnel(
  context: "cart" | "quick_order",
  items: TrackItem[],
  total: number,
  shipping: number,
  enabled: boolean,
) {
  const opened = useRef(false);
  const started = useRef(false);
  useEffect(() => {
    if (!enabled) {
      opened.current = false;
      started.current = false;
      return;
    }
    if (!opened.current) {
      opened.current = true;
      trackCheckoutStage("open", context);
    }
  }, [enabled, context]);
  const start = () => {
    if (!enabled || started.current) return;
    started.current = true;
    trackCheckoutStage("start", context);
    trackBeginCheckout(items, total, shipping);
  };
  return {
    start,
    submit: () => {
      if (enabled) {
        start();
        trackCheckoutStage("submit", context);
      }
    },
  };
}
