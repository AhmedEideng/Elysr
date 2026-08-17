/**
 * ============================================================
 * Service Worker Registration — opt-in PWA
 * ============================================================
 * Registers /sw.js only after the user has shown engagement
 * (second page view or 30s on page) to avoid blocking the
 * initial paint with a service-worker install on first visit.
 * ============================================================
 */

const ENGAGEMENT_THRESHOLD_PAGEVIEWS = 1;
const ENGAGEMENT_THRESHOLD_TIME_MS = 30_000;

let registered = false;
let pageViews = 0;
let timer: ReturnType<typeof setTimeout> | null = null;

export function trackPageViewForSW() {
  if (typeof window === "undefined") return;
  if (registered) return;

  pageViews++;
  if (pageViews === ENGAGEMENT_THRESHOLD_PAGEVIEWS) {
    timer = setTimeout(maybeRegister, ENGAGEMENT_THRESHOLD_TIME_MS);
  } else if (pageViews > ENGAGEMENT_THRESHOLD_PAGEVIEWS) {
    maybeRegister();
  }
}

function maybeRegister() {
  if (registered) return;
  if (!("serviceWorker" in navigator)) return;
  if (import.meta.env.DEV) return;

  registered = true;
  if (timer) clearTimeout(timer);

  // 🛡️ Permanent Unregistration & Cache Purge fallback
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const reg of registrations) {
      reg.unregister();
    }
  });

  if ("caches" in window) {
    caches.keys().then((keys) => {
      for (const key of keys) {
        caches.delete(key);
      }
    });
  }
}
