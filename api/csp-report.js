/**
 * ============================================================
 * CSP Violation Report Endpoint
 * ============================================================
 *
 * Receives CSP violation reports from browsers and logs them.
 * Endpoint: POST /api/csp-report
 * Content-Type: application/csp-report
 *
 * التحديث: تم إضافة تنظيف دوري للذاكرة (Memory Cleanup)
 * لمنع Memory Leak مع مرور الوقت.
 * ============================================================
 */

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REPORTS = 50;
const MEMORY_CLEANUP_INTERVAL_MS = 5 * 60_000; // كل 5 دقائق
const rateLimitMap = new Map();
let lastCleanup = Date.now();

// Use hashed IP like submit-order to avoid storing raw IPs in memory
import { createHash } from "node:crypto";
function hashIp(ip) {
  return createHash("sha256").update(String(ip)).digest("hex").slice(0, 16);
}

function cleanupMemory() {
  const now = Date.now();
  if (now - lastCleanup < MEMORY_CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, entry] of rateLimitMap) {
    if (now - entry.start > RATE_LIMIT_WINDOW_MS) {
      rateLimitMap.delete(key);
    }
  }
}

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

const ALLOWED_ORIGINS = new Set(["https://elysrmedical.store", "https://www.elysrmedical.store"]);

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

  const clientIp = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || "unknown";

  if (!checkRateLimit(clientIp)) {
    return res.status(429).end();
  }

  try {
    // 🔒 حد أقصى لحجم الـ body — يمنع استهلاك الذاكرة (DoS) وحشر سجلات ضخمة.
    const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? null);
    if (Buffer.byteLength(rawBody, "utf8") > 4096) throw new Error("payload too large");

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    // Support both legacy application/csp-report and the modern Reporting API
    // application/reports+json array shape.
    const report = body?.["csp-report"] ?? (Array.isArray(body) ? body[0]?.body : undefined);
    if (!report || typeof report !== "object" || Array.isArray(report)) {
      return res.status(400).end();
    }
    // 🔒 ساسنة الحقول قبل التسجيل — هذه القيم قادمة من المتصفح (قد يزوّرها مهاجم)
    // لمنع Log Injection (حقن سطور/رموز تحكم في السجلات).
    const sanitize = (s) =>
      String(s ?? "")
        .replace(/[\r\n\t\0]/g, " ")
        .slice(0, 160);
    // نُسقط query string من URIs قبل التسجيل: قد يحمل معاملات تتبع
    // أو بيانات لا حاجة لحفظها في السجلات
    const blockedUri = sanitize(report["blocked-uri"]).split("?")[0];
    const directive = sanitize(report["violated-directive"]);
    const documentUri = sanitize(report["document-uri"]).split("?")[0];
    const scriptSample = sanitize(report["script-sample"]).slice(0, 100);

    // Ignore noise (extensions injecting eval/inline)
    if (blockedUri === "eval" || blockedUri === "inline") {
      return res.status(200).end();
    }

    console.warn(`[csp-violation] ${directive} blocked ${blockedUri} on ${documentUri}`, {
      type: "csp-violation",
      timestamp: new Date().toISOString(),
      blockedUri: blockedUri || "unknown",
      directive: directive || "unknown",
      document: documentUri || "unknown",
      sample: scriptSample,
    });

    return res.status(200).end();
  } catch (err) {
    console.error("[csp-report] parse error:", err.message);
    return res.status(400).end();
  }
}
