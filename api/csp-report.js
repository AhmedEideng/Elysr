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
  cleanupMemory(); // تنظيف الذاكرة قبل كل طلب
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now - entry.start > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(key, { start: now, count: 1 });
    return true;
  }
  entry.count += 1;
  return entry.count <= RATE_LIMIT_MAX_REPORTS;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).end();

  const clientIp = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || "unknown";

  if (!checkRateLimit(clientIp)) {
    return res.status(429).end();
  }

  try {
    // 🔒 حد أقصى لحجم الـ body — يمنع استهلاك الذاكرة (DoS) وحشر سجلات ضخمة.
    const rawBody = typeof req.body === "string" ? req.body : "";
    const body =
      typeof req.body === "string" && rawBody.length > 4096
        ? (() => {
            throw new Error("payload too large");
          })()
        : req.body;

    if (!body || !body["csp-report"]) {
      return res.status(400).end();
    }

    const report = body["csp-report"];
    // 🔒 ساسنة الحقول قبل التسجيل — هذه القيم قادمة من المتصفح (قد يزوّرها مهاجم)
    // لمنع Log Injection (حقن سطور/رموز تحكم في السجلات).
    const sanitize = (s) =>
      String(s ?? "")
        .replace(/[\r\n\t\0]/g, " ")
        .slice(0, 160);
    const blockedUri = sanitize(report["blocked-uri"]);
    const directive = sanitize(report["violated-directive"]);
    const documentUri = sanitize(report["document-uri"]);
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
