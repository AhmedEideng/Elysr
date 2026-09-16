/**
 * ============================================================
 * Error Tracking Endpoint (frontend crash/error reports)
 * ============================================================
 *
 * Endpoint: POST /api/errors  (Content-Type: application/json)
 *
 * (2026-09-15) السند الافتراضي لـ src/lib/error-tracking.ts:
 * endpoint على نفس الأصل → CSP `connect-src 'self'` بيسمح بيه
 * تلقائيًا (بدون ما نضيف domain خارجي لـ connect-src).
 * لو عايز sink خارجي (Sentry-compatible)، اضبط VITE_ERROR_SINK_URL
 * وايدف domainه في connect-src هنا وفي vercel.json.
 *
 * سياسة الأمان (نفس نمط csp-report.js):
 *   - POST only + rate limit per IP (30/min)
 *   - حد 32KB للـ body (stacks + breadcrumbs مش صغيرة)
 *   - sanitation لكل الحقلات النصية (control chars → مسافة) + truncation
 *     — القيم قادمة من المتصفح وقابلة للتزوير (Log Injection)
 *   - الاستجابة دايمًا 200/400 — مفيش تفاصيل داخلية في الرد
 * ============================================================
 */

import { createHash } from "node:crypto";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REPORTS = 30;
const MEMORY_CLEANUP_INTERVAL_MS = 5 * 60_000;
const MAX_BODY_BYTES = 32_000;

/** @type {Map<string, { start: number, count: number }>} */
const rateLimitMap = new Map();
let lastCleanup = Date.now();

/** @param {string} ip */
function hashIp(ip) {
  return createHash("sha256").update(String(ip)).digest("hex").slice(0, 16);
}

function cleanupMemory() {
  const now = Date.now();
  if (now - lastCleanup < MEMORY_CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, entry] of rateLimitMap) {
    if (now - entry.start > RATE_LIMIT_WINDOW_MS) rateLimitMap.delete(key);
  }
}

/** @param {string} key */
function checkRateLimit(key) {
  cleanupMemory();
  const now = Date.now();
  const hashed = hashIp(key);
  const entry = rateLimitMap.get(hashed);
  if (!entry || now - entry.start > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(hashed, { start: now, count: 1 });
    return true;
  }
  entry.count += 1;
  return entry.count <= RATE_LIMIT_MAX_REPORTS;
}

// 🔒 Sanitization ضد Log Injection + truncation لمنع حشر سجلات ضخمة.
// القيم كلها من المتصفح — حتى لو "بنية داخلية" بنعتبرها معادية.
/** @param {unknown} value @param {number} max */
function cleanStr(value, max) {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

const ALLOWED_ORIGINS = new Set(["https://elysrmedical.store", "https://www.elysrmedical.store"]);

/**
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export default async function handler(req, res) {
  const origin = req.headers.origin;
  const allowedOrigin =
    origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://elysrmedical.store";
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).end();

  // IP موثوق: x-vercel-ip (Vercel) ثم آخر قيمة XFF (self-hosted)
  // (2026-09-16) XFF نوعه string | string[] حسب الـ proxy — نتعامل مع
  // الحالتين بدل افتراض string (اكتشاف من الـ typecheck الجديد).
  const vercelIp = req.headers["x-vercel-ip"];
  const xff = req.headers["x-forwarded-for"];
  const xffString = Array.isArray(xff) ? xff.join(",") : xff;
  const clientIp =
    (typeof vercelIp === "string" && vercelIp.trim()) ||
    xffString
      ?.split(",")
      .map((p) => p.trim())
      .filter(Boolean)
      .pop() ||
    "unknown";

  if (!checkRateLimit(clientIp)) {
    return res.status(429).end();
  }

  try {
    const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? null);
    if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) throw new Error("payload too large");

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return res.status(400).end();
    }

    // شكل الـ event الفعلي من error-tracking.ts (allowlist للحقلات —
    // الباقي يتسقط): error.message/stack جوّا error، context توب-لفل،
    // وbrowser context جوّا browser.
    const errObj = body.error && typeof body.error === "object" ? body.error : {};
    const browser = body.browser && typeof body.browser === "object" ? body.browser : {};
    const report = {
      type: cleanStr(body.type, 40),
      name: cleanStr(errObj.name, 80),
      message: cleanStr(errObj.message ?? body.message, 500),
      stack: cleanStr(errObj.stack ?? body.stack, 2000),
      appVersion: cleanStr(body.appVersion, 40),
      correlationId: cleanStr(body.correlationId, 64),
      route: cleanStr(body.route, 300),
      feature: cleanStr(body.feature, 80),
      section: cleanStr(body.section, 80),
      componentStack: cleanStr(body.componentStack, 500),
      source: cleanStr(body.source, 300),
      lineno: Number.isInteger(body.lineno) ? body.lineno : undefined,
      colno: Number.isInteger(body.colno) ? body.colno : undefined,
      userAgent: cleanStr(browser.userAgent, 300),
      viewport: cleanStr(browser.viewport, 40),
      connectionType: cleanStr(browser.connectionType, 20),
      deviceMemory: cleanStr(browser.deviceMemory, 20),
      breadcrumbs: Array.isArray(body.breadcrumbs)
        ? /** @type {Array<Record<string, unknown>>} */ (body.breadcrumbs).slice(-10).map((b) => ({
            type: cleanStr(b?.type, 20),
            message: cleanStr(b?.message, 200),
            data:
              b?.data && typeof b.data === "object"
                ? Object.fromEntries(
                    Object.entries(b.data)
                      .slice(0, 4)
                      .map(([k, v]) => [cleanStr(k, 40), cleanStr(v, 200)]),
                  )
                : undefined,
            timestamp: cleanStr(b?.timestamp, 40),
          }))
        : undefined,
    };

    if (!report.message && !report.stack) {
      return res.status(400).end();
    }

    console.error("[frontend-error]", JSON.stringify(report));
    return res.status(200).json({ ok: true });
  } catch (err) {
    // (2026-09-16) catch variables are unknown under strict — narrow before use
    console.error("[errors] parse error:", err instanceof Error ? err.message : String(err));
    return res.status(400).end();
  }
}
