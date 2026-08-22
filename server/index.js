/**
 * ============================================================
 * Elysr Medical — SSR/SSG Production Server
 * ============================================================
 *
 * Architecture:
 *   1. SSG (Static Site Generation) — serves pre-rendered HTML
 *      from dist/ with single-digit-millisecond TTFB.
 *   2. Real 404 handling — unknown routes return public/404.html with HTTP 404.
 *   3. API Proxy — forwards /api/* to the Vercel serverless functions
 *      (or handles inline for self-hosted deployments).
 *
 *   Request flow:
 *   ┌─ /api/*               → API handler (inline)
 *   ├─ Static asset (.js,.css,.webp) → express.static (long cache)
 *   ├─ Prerendered HTML exists → serve static .html (SSG ⚡)
 *   └─ Otherwise            → serve 404.html with HTTP 404
 *
 * Deployment:
 *   • Vercel: not used (Vercel uses api/ + dist/ directly)
 *   • Railway / Fly.io / VPS: `npm start` or `node server/index.js`
 *   • Docker: `CMD ["node", "server/index.js"]`
 * ============================================================
 */

import express from "express";
import compression from "compression";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DIST = resolve(ROOT, "dist");
const PORT = parseInt(process.env.PORT || "8080", 10);
const NOINDEX_PRODUCT_PATHS = new Set([
  "/products/hard-on-sildenafil-130mg-dapoxetine-60mg",
  "/products/vegal-extra-sildenafil-130mg-cobra",
  "/products/cialis-tadalafil-20mg-30-tablets",
  "/products/power-36-power-control-for-36-hours",
  "/products/procomil-fort-tablet",
  "/products/viagra-pfizer-100mg",
  "/products/levitra-100mg",
  "/products/viagra-20-tablets",
]);
const NOINDEX_IMAGE_NAMES = new Set([
  "hard-on-sildenafil-130mg-dapoxetine-60mg.webp",
  "vegal-extra-sildenafil-130mg-cobra.webp",
  "cialis-tadalafil-20mg-30-tablets.webp",
  "power-36-power-control-for-36-hours.webp",
  "procomil-fort-tablet.webp",
  "viagra-pfizer-100mg.webp",
  "levitra-100mg.webp",
  "viagra-for-women-20-tablets.webp",
]);

// ── Pattern matching for route-to-file mapping ──
function fileForUrl(url) {
  let path = url.split("?")[0].split("#")[0];
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  if (path === "") path = "/";

  if (path === "/") return resolve(DIST, "index.html");

  const segments = path.split("/").filter(Boolean);
  if (segments.some((s) => s === ".." || s.startsWith("."))) return null;

  const candidate = resolve(DIST, ...segments) + ".html";
  if (existsSync(candidate)) return candidate;

  const dirCandidate = resolve(DIST, ...segments, "index.html");
  if (existsSync(dirCandidate)) return dirCandidate;

  return null;
}

// ── Cache control helpers ──
const STATIC_MAX_AGE = "public, max-age=31536000, immutable";
const HTML_MAX_AGE = "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400";

function setCache(res, policy) {
  res.setHeader("Cache-Control", policy);
  res.setHeader("CDN-Cache-Control", policy);
}

// ── Real 404 response for routes that were not generated at build time ──
function notFoundResponse(res) {
  const notFoundPath = resolve(DIST, "404.html");
  res.status(404);
  res.setHeader("Cache-Control", "no-store");
  if (existsSync(notFoundPath)) return res.type("html").sendFile(notFoundPath);
  return res.type("text").send("404 — Page not found");
}

// ── Express app ──
const app = express();

// Gzip/brotli
app.use(compression());

// JSON parser for checkout plus both legacy and Reporting API CSP report media types.
// The endpoint applies its own stricter 4 KB validation after parsing.
app.use(
  express.json({
    limit: "64kb",
    type: ["application/json", "application/csp-report", "application/reports+json"],
  }),
);

// Trust proxy
app.set("trust proxy", 1);

// Security headers (unified and synchronized with vercel.json for perfect security parity)
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  res.setHeader("X-DNS-Prefetch-Control", "on");
  res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  if (NOINDEX_PRODUCT_PATHS.has(req.path.replace(/\/$/, ""))) {
    res.setHeader("X-Robots-Tag", "noindex, follow, noarchive, nosnippet, noimageindex");
  } else if (
    req.path.startsWith("/images/") &&
    NOINDEX_IMAGE_NAMES.has(req.path.split("/").pop())
  ) {
    res.setHeader("X-Robots-Tag", "noindex, noimageindex");
  }

  // Enterprise-grade strict Content Security Policy matching vercel.json exactly
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' https://www.googletagmanager.com https://www.google-analytics.com",
      "script-src-attr 'none'",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https://script.google.com https://script.googleusercontent.com https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://*.googletagmanager.com https://*.g.doubleclick.net https://*.google.com",
      "worker-src 'self'",
      "frame-ancestors 'self'",
      "form-action 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "manifest-src 'self'",
      "media-src 'self'",
      "upgrade-insecure-requests",
      "report-uri /api/csp-report",
    ].join("; "),
  );

  next();
});

// ── Static assets (dist/) with long-term caching ──
app.use(
  express.static(DIST, {
    maxAge: "365d",
    immutable: true,
    setHeaders(res, filePath) {
      if (filePath.endsWith(".html")) {
        res.setHeader("Cache-Control", HTML_MAX_AGE);
      } else {
        res.setHeader("Cache-Control", STATIC_MAX_AGE);
      }
    },
  }),
);

// ── Health check ──
app.get("/health", (req, res) => {
  // 🔒 نبقي الاستجابة بأدنى قدر من المعلومات التشغيلية (لا mode/ssgReady/uptime)
  // حتى لا تكشف بنية النشر لأي شخص يستطلع الخادم.
  res.json({ status: "ok" });
});

// ── API handlers (self-hosted mode) ──
const mountApi = (path, modPath) => {
  app.use(path, async (req, res) => {
    try {
      const { default: handler } = await import(modPath);
      await handler(req, res);
    } catch (err) {
      console.error(`[ssr] API error (${path}):`, err);
      res.status(500).json({ error: "Internal server error" });
    }
  });
};

mountApi("/api/submit-order", "../api/submit-order.js");
mountApi("/api/csp-report", "../api/csp-report.js");
app.use("/api", (_req, res) => res.status(404).json({ error: "API route not found" }));

// ── Main route handler: SSG first, then SPA fallback ──
// ملاحظة: Express 5 (path-to-regexp v8) أزال دعم الباراميتر "*" العاري،
// لذا نستخدم RegExp يطابق كل المسارات بدلاً من app.get("*") الذي كان ينهار.
app.get(/.*/, (req, res) => {
  const prerendered = fileForUrl(req.path);
  if (prerendered && existsSync(prerendered)) {
    setCache(res, HTML_MAX_AGE);
    return res.type("html").sendFile(prerendered);
  }

  // Every valid production route is prerendered; unknown paths must be a real 404.
  return notFoundResponse(res);
});

// ── Boot ──
function boot() {
  const server = app.listen(PORT, "0.0.0.0", () => {
    const ssgReady = existsSync(resolve(DIST, "index.html"));

    console.log(`\n🚀 Elysr Medical SSR/SSG server ready`);
    console.log(`   Mode:   ${process.env.NODE_ENV || "development"}`);
    console.log(`   Port:   ${PORT}`);
    console.log(`   URL:    http://0.0.0.0:${PORT}`);
    console.log(`   SSG:    ${ssgReady ? "✅ ready" : "⚠️  run 'npm run build:ssr' first"}`);
    console.log("   Rate limit: in-process + Google Apps Script per-phone limit");
    console.log("");
  });

  const shutdown = () => {
    console.log("\n[ssr] Shutting down...");
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

boot();
