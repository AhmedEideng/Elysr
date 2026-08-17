/**
 * ============================================================
 * Elysr Medical — SSR/SSG Production Server
 * ============================================================
 *
 * Architecture:
 *   1. SSG (Static Site Generation) — serves pre-rendered HTML
 *      from dist/ with single-digit-millisecond TTFB.
 *   2. SPA Fallback — serves index.html shell for dynamic client-side
 *      rendering (CSR) on routes that aren't pre-rendered.
 *   3. API Proxy — forwards /api/* to the Vercel serverless functions
 *      (or handles inline for self-hosted deployments).
 *
 *   Request flow:
 *   ┌─ /api/*               → API handler (inline)
 *   ├─ Static asset (.js,.css,.webp) → express.static (long cache)
 *   ├─ Prerendered HTML exists → serve static .html (SSG ⚡)
 *   └─ Otherwise            → serve index.html shell (SPA Fallback ⚡)
 *
 * Deployment:
 *   • Vercel: not used (Vercel uses api/ + dist/ directly)
 *   • Railway / Fly.io / VPS: `npm start` or `node server/index.js`
 *   • Docker: `CMD ["node", "server/index.js"]`
 * ============================================================
 */

import express from "express";
import compression from "compression";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { initRedis } from "../api/lib/rate-limiter.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DIST = resolve(ROOT, "dist");
const PORT = parseInt(process.env.PORT || "8080", 10);

// ── Cached template ──
let template = null;
function loadTemplate() {
  if (!template) {
    const indexPath = resolve(DIST, "index.html");
    if (!existsSync(indexPath)) {
      return null;
    }
    template = readFileSync(indexPath, "utf-8");
  }
  return template;
}

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
const SSR_MAX_AGE = "public, max-age=300, s-maxage=600, stale-while-revalidate=3600";

function setCache(res, policy) {
  res.setHeader("Cache-Control", policy);
  res.setHeader("CDN-Cache-Control", policy);
}

// ── SSR fallback (serves the SPA shell for routes without prerendered HTML) ──
function spaFallback(res) {
  const tpl = loadTemplate();
  if (!tpl) return res.status(503).send("Server not ready — run npm run build first");
  setCache(res, SSR_MAX_AGE);
  res.type("html").send(tpl);
}

// ── Express app ──
const app = express();

// Gzip/brotli
app.use(compression());

// 🚀 JSON body parser — ضروري جداً لاستقبال الطلبات!
app.use(express.json({ limit: "64kb" }));

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

// ── Main route handler: SSG first, then SPA fallback ──
// ملاحظة: Express 5 (path-to-regexp v8) أزال دعم الباراميتر "*" العاري،
// لذا نستخدم RegExp يطابق كل المسارات بدلاً من app.get("*") الذي كان ينهار.
app.get(/.*/, (req, res) => {
  if (req.path.startsWith("/api/")) return;

  const prerendered = fileForUrl(req.path);
  if (prerendered && existsSync(prerendered)) {
    setCache(res, HTML_MAX_AGE);
    return res.type("html").sendFile(prerendered);
  }

  // SPA fallback for dynamic routes
  spaFallback(res);
});

// ── Boot ──
async function boot() {
  try {
    await initRedis();
  } catch {
    // Will retry on first request
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    const ssgReady = existsSync(resolve(DIST, "index.html"));
    const redisReady = !!(process.env.UPSTASH_REDIS_URL || process.env.REDIS_URL);

    console.log(`\n🚀 Elysr Medical SSR/SSG server ready`);
    console.log(`   Mode:   ${process.env.NODE_ENV || "development"}`);
    console.log(`   Port:   ${PORT}`);
    console.log(`   URL:    http://0.0.0.0:${PORT}`);
    console.log(`   SSG:    ${ssgReady ? "✅ ready" : "⚠️  run 'npm run build:ssr' first"}`);
    console.log(`   Redis:  ${redisReady ? "✅ configured" : "⚠️  using in-memory fallback"}`);
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

boot().catch((err) => {
  console.error("[ssr] Boot failed:", err);
  process.exit(1);
});
