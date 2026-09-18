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
 *   ├─ Legacy URL (vercel.json redirects) → 301/302 (Vercel parity)
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
import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
// (2026-09-16, P2 #12/#13) CSP و Report-To من مصدر واحد —
// vercel.json نسخة منه والـ parity check (verify-security-headers.mjs)
// بتضمن إن الاتنين ما يتفرقوش.
import { CSP_POLICY, buildReportToHeader } from "../config/security-headers.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DIST = resolve(ROOT, "dist");
const PORT = parseInt(process.env.PORT || "8080", 10);
// (مجموعتا NOINDEX_PRODUCT_PATHS / NOINDEX_IMAGE_NAMES اتشالوا 2026-09-14:
// كانوا فاضيين من يوم ما اتحذفت آخر الأدوية المحظورة 2026-09-07 — كود ميت.)

// ── Vercel parity redirects ──
// On Vercel these live in vercel.json edge config; the self-hosted Express
// server reproduces the same table so legacy URLs (old product IDs, deleted
// pharma, old URL schemes) keep their SEO value with 301s instead of 404s.
// Only internal destinations (starting with "/") are honored.
/** @param {string} source */
function compileRedirectSource(source) {
  const names = [];
  let out = "";
  let i = 0;
  while (i < source.length) {
    if (source[i] === ":" && /[A-Za-z_]/.test(source[i + 1] ?? "")) {
      let j = i + 1;
      while (j < source.length && /[A-Za-z0-9_]/.test(source[j])) j++;
      names.push(source.slice(i + 1, j));
      out += "([^/]+)";
      i = j;
    } else {
      out += /[.+?^${}()|[\]\\]/.test(source[i]) ? `\\${source[i]}` : source[i];
      i++;
    }
  }
  return { re: new RegExp(`^${out}$`), names };
}

/** @param {string} destination @param {string[]} names @param {RegExpMatchArray} match */
function applyRedirectDestination(destination, names, match) {
  return destination.replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, (whole, name) => {
    const idx = names.indexOf(name) + 1;
    return idx > 0 && match[idx] ? match[idx] : whole;
  });
}

/** @type {Map<string, { destination: string, status: number }>} */
const redirectExact = new Map();
/** @type {Array<{ re: RegExp, names: string[], destination: string, status: number }>} */
const redirectPatterns = [];
try {
  const vercelConfig = JSON.parse(readFileSync(resolve(ROOT, "vercel.json"), "utf-8"));
  for (const rule of vercelConfig.redirects ?? []) {
    if (!rule?.source || !rule?.destination || !rule.destination.startsWith("/")) continue;
    const status = rule.permanent === false ? 302 : 301;
    const { re, names } = compileRedirectSource(rule.source);
    if (names.length === 0)
      redirectExact.set(rule.source, { destination: rule.destination, status });
    else redirectPatterns.push({ re, names, destination: rule.destination, status });
  }
} catch (err) {
  console.warn(
    "[ssr] vercel.json unreadable — legacy redirects disabled:",
    err instanceof Error ? err.message : String(err),
  );
}

// ── Pattern matching for route-to-file mapping ──
/** @param {string} url */
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

/** @param {import("express").Response} res @param {string} policy */
function setCache(res, policy) {
  res.setHeader("Cache-Control", policy);
  res.setHeader("CDN-Cache-Control", policy);
}

// ── Real 404 response for routes that were not generated at build time ──
/** @param {import("express").Response} res */
function notFoundResponse(res) {
  const notFoundPath = resolve(DIST, "404.html");
  res.status(404);
  res.setHeader("Cache-Control", "no-store");
  if (existsSync(notFoundPath)) return res.type("html").sendFile(notFoundPath);
  return res.type("text").send("404 — Page not found");
}

// ── Express app ──
const app = express();
// Do not advertise the framework in every response header.
app.disable("x-powered-by");

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

// Keep malformed/oversized API bodies machine-readable and avoid Express's
// default HTML error page. The serverless handlers perform their own stricter
// validation after parsing.
/** @type {import("express").ErrorRequestHandler} */
const handleBodyParserError = (err, req, res, next) => {
  if (
    req.path.startsWith("/api/") &&
    (err?.type === "entity.too.large" || err instanceof SyntaxError)
  ) {
    return res.status(err?.type === "entity.too.large" ? 413 : 400).json({
      error: err?.type === "entity.too.large" ? "Payload too large" : "Invalid JSON payload",
    });
  }
  return next(err);
};
app.use(handleBodyParserError);

// Trust proxy
// (2026-09-15) التووبولوجيا المفترضة: عميل → proxy موثوق واحد → Express
// (nginx/Caddy على VPS، أو Vercel edge بنفسه). لو اتغير الشكل (Cloudflare +
// LB + Nginx ...) لازم يتضبط الرقم ده يطابق عدد الـ proxies الموثوقة —
// وإلا الـ rate limiting بيبني على XFF ممكن يتزوير.
app.set("trust proxy", 1);

// Security headers (unified and synchronized with vercel.json for perfect security parity) - 2026 hardened
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  );
  // HSTS: production بس — على self-hosted dev (http://localhost) هيسيب
  // المتصفح يرفض الاتصال بعد كده (HSTS ما بينساش). (2026-09-15)
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }
  res.setHeader("X-DNS-Prefetch-Control", "on");
  res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Origin-Agent-Cluster", "?1");
  res.setHeader("X-XSS-Protection", "0");
  // (2026-09-16, P2 #12 — مراجعة 2) أولويات endpoint التقارير:
  //   1. CSP_REPORT_ENDPOINT (صريح)  2. SITE_URL (الإنتاج)
  //   3. origin الطلب — dev fallback بس (localhost من غير إعداد)
  // الإنتاج مش بيعتمد على Host header: SITE_URL مضبوطة أصلاً
  // (CORS/feeds) فالتقارير هتمشي للنطاق الرسمي حتى لو حد ضارب
  // على الـ VPS مباشرة بـ Host تاني.
  const reportOrigin =
    process.env.NODE_ENV === "production" &&
    !process.env.CSP_REPORT_ENDPOINT &&
    !process.env.SITE_URL
      ? "https://elysrmedical.store"
      : `${req.protocol}://${req.get("host") || "localhost"}`;
  res.setHeader("Report-To", buildReportToHeader(reportOrigin));
  res.setHeader("NEL", '{"report_to":"csp","max_age":10886400}');
  // API routes should not be indexed
  if (req.path.startsWith("/api/")) {
    res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
    res.setHeader("Cache-Control", "no-store");
  }

  // (2026-09-16, P2 #13) CSP من مصدر واحد: config/security-headers.mjs.
  // النسخة القديمة كانت مصفوفة مكررة هنا وفي vercel.json (خطر drift) —
  // دلوقتي vercel.json نسخة ومن الـ parity check نفسه.
  res.setHeader("Content-Security-Policy", CSP_POLICY);

  next();
});

// ── Legacy URL redirects (Vercel parity) ──
app.use((req, res, next) => {
  if (req.method !== "GET" && req.method !== "HEAD") return next();

  // Vercel parity (trailingSlash: false): الصيغة القانونية بلا شلطة —
  // /education/ → 301 /education (Vercel يفعلها بـ 308، و301 هنا هو القياسي).
  // بدون هذا كانت express.static تسبق المعالج الرئيسي وتحوّل /education
  // (ملف .html + مجلد بنفس الاسم) إلى 301 بالشكل المعكوس — تناقض فهرسة.
  if (req.path.length > 1 && req.path.endsWith("/")) {
    return res.redirect(301, req.path.slice(0, -1));
  }

  const exact = redirectExact.get(req.path);
  if (exact) return res.redirect(exact.status, exact.destination);
  for (const rule of redirectPatterns) {
    const match = rule.re.exec(req.path);
    if (match) {
      return res.redirect(
        rule.status,
        applyRedirectDestination(rule.destination, rule.names, match),
      );
    }
  }
  next();
});

// ── Static assets (dist/) with long-term caching ──
// redirect: false — لا نريد تحويل express.static لمجلدات dist (مثل
// /education حيث الملف والمجلد بنفس الاسم) إلى 301/؛ المعالج الرئيسي
// يقدم dist/education.html مباشرة، وتطبيع الشلطة أعلاه يتبع سلوك Vercel.
app.use(
  express.static(DIST, {
    maxAge: "365d",
    immutable: true,
    redirect: false,
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
// (2026-09-16) req مش مستخدمة — _-prefix (اكتشاف من الـ typecheck)
app.get("/health", (_req, res) => {
  // 🔒 نبقي الاستجابة بأدنى قدر من المعلومات التشغيلية (لا mode/ssgReady/uptime)
  // حتى لا تكشف بنية النشر لأي شخص يستطلع الخادم.
  res.json({ status: "ok" });
});

// ── API handlers (self-hosted mode) ──
/** @param {string} path @param {string} modPath */
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
mountApi("/api/submit-review", "../api/submit-review.js");
mountApi("/api/reviews", "../api/reviews.js");
mountApi("/api/csp-report", "../api/csp-report.js");
mountApi("/api/errors", "../api/errors.js");
app.use("/api", (_req, res) => res.status(404).json({ error: "API route not found" }));

// ── Vercel platform stubs (self-hosted) ──
// على Vercel يخدم `/insights/script.js` و`/speed-insights/script.js` منصة
// Vercel نفسها (Web Analytics + Speed Insights). في النشر الذاتي لا توجد
// المنصة، فيُخدَّم سكريبت فارغ سليم بدلاً من 404 + خطأ MIME في الـ console.
// (2026-09-16) req مش مستخدمة — _-prefix للـ noUnusedParameters
app.get(/^\/_vercel\/(insights|speed-insights)\/script\.js$/, (_req, res) => {
  res.setHeader("Content-Type", "application/javascript; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.send("// no-op: Vercel Analytics is a platform feature (unavailable self-hosted)\n");
});

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
