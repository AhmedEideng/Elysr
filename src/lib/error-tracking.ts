/**
 * ============================================================
 * Error Tracking — lightweight, Sentry-compatible interface
 * ============================================================
 * Captures uncaught errors and forwards them to a configured
 * sink. Defaults to console-only in dev; in production, set
 * VITE_ERROR_SINK_URL to a Sentry-compatible HTTPS endpoint.
 *
 * Features:
 *   • Correlation ID per session (groups errors by user session)
 *   • Breadcrumbs (last N user actions before crash)
 *   • Browser context (screen size, connection type, memory)
 *   • Automatic global error/unhandledrejection listeners
 *
 * Why not use Sentry SDK? Bundle size — this ships at < 2KB.
 * ============================================================
 */

interface ErrorContext {
  feature?: string;
  route?: string;
  userId?: string;
  [key: string]: unknown;
}

interface Breadcrumb {
  type: "click" | "navigation" | "fetch" | "error" | "custom";
  message: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

const SINK_URL = import.meta.env.VITE_ERROR_SINK_URL;
const IS_PROD = import.meta.env.PROD;
const APP_VERSION = "1.1.0";
const MAX_BREADCRUMBS = 20;

// ── Correlation ID: stable per page-session ──
let correlationId: string | null = null;

function getCorrelationId(): string {
  if (correlationId) return correlationId;

  if (typeof window !== "undefined") {
    try {
      // Reuse or create a session-scoped ID
      let sid = sessionStorage.getItem("elysr_cid");
      if (!sid) {
        sid =
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID().slice(0, 8)
            : Math.random().toString(36).slice(2, 10);
        sessionStorage.setItem("elysr_cid", sid);
      }
      correlationId = sid;
      return sid;
    } catch {
      // sessionStorage unavailable — use memory-only
    }
  }

  if (!correlationId) {
    correlationId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID().slice(0, 8)
        : Math.random().toString(36).slice(2, 10);
  }
  return correlationId;
}

// ── Breadcrumbs ──
const breadcrumbs: Breadcrumb[] = [];

/**
 * Record a breadcrumb — a user action that happened before an error.
 * Helps debug: "user clicked checkout, then the error happened."
 */
export function addBreadcrumb(
  type: Breadcrumb["type"],
  message: string,
  data?: Record<string, unknown>,
) {
  breadcrumbs.push({
    type,
    message,
    timestamp: new Date().toISOString(),
    data,
  });
  if (breadcrumbs.length > MAX_BREADCRUMBS) {
    breadcrumbs.shift();
  }
}

function getBreadcrumbsSnapshot(): Breadcrumb[] {
  return [...breadcrumbs];
}

// ── Browser context ──
function getBrowserContext(): Record<string, unknown> {
  if (typeof window === "undefined") return {};
  const nav = window.navigator;

  return {
    userAgent: nav.userAgent,
    language: nav.language,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    connectionType:
      (nav as unknown as { connection?: { effectiveType?: string } }).connection?.effectiveType ||
      "unknown",
    deviceMemory: (nav as unknown as { deviceMemory?: number }).deviceMemory || "unknown",
    online: nav.onLine,
    timestamp: new Date().toISOString(),
  };
}

// ── Send ──
async function send(event: Record<string, unknown>) {
  if (!SINK_URL) {
    if (!IS_PROD) {
      console.warn("[error-tracking]", event);
    }
    return;
  }
  try {
    await fetch(SINK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
      keepalive: true,
    });
  } catch {
    // Never let error tracking crash the app
  }
}

function sanitiseError(err: unknown): {
  name: string;
  message: string;
  stack?: string;
} {
  if (err instanceof Error) {
    return { name: err.name, message: err.message, stack: err.stack };
  }
  return { name: "UnknownError", message: String(err) };
}

/**
 * Manually report an error. Safe to call anywhere.
 */
export function reportError(error: unknown, context: ErrorContext = {}) {
  const err = sanitiseError(error);

  void send({
    type: "error",
    timestamp: new Date().toISOString(),
    appVersion: APP_VERSION,
    correlationId: getCorrelationId(),
    route: context.route ?? (typeof window !== "undefined" ? window.location.pathname : null),
    breadcrumbs: getBreadcrumbsSnapshot(),
    browser: getBrowserContext(),
    ...context,
    error: err,
  });
}

// ── Auto-install navigation breadcrumbs ──
function installBreadcrumbListeners() {
  if (typeof window === "undefined") return;

  // Navigation
  const pushState = history.pushState.bind(history);
  const replaceState = history.replaceState.bind(history);

  history.pushState = (...args) => {
    addBreadcrumb("navigation", `pushState → ${String(args[2] || args[0])}`);
    return pushState(...args);
  };
  history.replaceState = (...args) => {
    addBreadcrumb("navigation", `replaceState → ${String(args[2] || args[0])}`);
    return replaceState(...args);
  };

  // Clicks (only capture interactive element clicks)
  document.addEventListener(
    "click",
    (e) => {
      const target = e.target as HTMLElement;
      const tag = target.tagName?.toLowerCase() || "unknown";
      const text = (target.textContent || "").slice(0, 50);
      if (tag === "a" || tag === "button") {
        addBreadcrumb("click", `${tag}: ${text}`, {
          href: tag === "a" ? (target as HTMLAnchorElement).href : undefined,
        });
      }
    },
    { passive: true },
  );
}

/**
 * Install global listeners for `error` and `unhandledrejection`.
 * Call once at app bootstrap (in __root.tsx).
 */
export function installErrorTracking() {
  if (typeof window === "undefined") return;
  if (
    (
      window as unknown as {
        __elysrErrorTrackingInstalled?: boolean;
      }
    ).__elysrErrorTrackingInstalled
  )
    return;
  (window as unknown as { __elysrErrorTrackingInstalled?: boolean }).__elysrErrorTrackingInstalled =
    true;

  installBreadcrumbListeners();

  window.addEventListener("error", (event) => {
    reportError(event.error ?? event.message, {
      feature: "global",
      source: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    reportError(event.reason, { feature: "promise" });
  });
}
