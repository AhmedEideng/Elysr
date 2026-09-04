/**
 * ============================================================
 * Submit Review API — مراجعة حقيقية من عملاء الموقع
 * ============================================================
 * POST /api/submit-review
 *   { productId, rating (1-5), reviewerName? , reviewerPhone?, reviewText }
 *
 * التدفق:
 *   1) التحقق الصارم (CORS + Origin + Rate Limit + payload).
 *   2) اسم المنتج يُجلب من الـ catalog المعتمد (products-db.json) —
 *      لا نثق أبداً باسم المنتج القادم من العميل.
 *   3) التحويل إلى Google Apps Script (action=review) → شيت "المراجعات"
 *      بحالة "قيد المراجعة" — لا تظهر على الموقع إلا بعد اعتماد المالك.
 * ============================================================
 */

import { createRateLimiter } from "./lib/rate-limiter.js";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PRODUCTS_DB_PATH = join(__dirname, "lib", "products-db.json");

// مخزن ذاكرة مؤقتة لتسريع الأداء وتجنب القراءة المتكررة من القرص الصلب
let cachedProductsDb = null;

function getProductsDb() {
  if (cachedProductsDb) return cachedProductsDb;
  try {
    cachedProductsDb = JSON.parse(readFileSync(PRODUCTS_DB_PATH, "utf-8"));
    return cachedProductsDb;
  } catch (err) {
    console.error("Failed to load products-db.json:", err);
    return [];
  }
}

const ALLOWED_ORIGINS = new Set(
  [
    "https://elysrmedical.store",
    "https://www.elysrmedical.store",
    process.env.SITE_URL,
    process.env.VERCEL_URL && process.env.VERCEL_ENV !== "production"
      ? `https://${process.env.VERCEL_URL}`
      : undefined,
    process.env.NODE_ENV !== "production" ? "http://localhost:8080" : undefined,
  ].filter(Boolean),
);

const MAX_BODY_SIZE_BYTES = 8_000;
export const GOOGLE_SHEETS_TIMEOUT_MS = 10_000;

// حدود الحقول — مطابقة تماماً للحدود في Google Apps Script
const REVIEW = {
  MAX_TEXT: 600,
  MIN_TEXT: 10,
  MAX_NAME: 60,
  MAX_PHONE: 16,
};

// معدل الإرسال: 3 مراجعات/دقيقة لكل IP (الحدود الثانية عند Apps Script)
const rateLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 3,
  prefix: "submit-review",
});

function getClientIp(req) {
  // 🛡️ IP موثوق: Vercel بيبعت x-vercel-ip (IP العميل الحقيقي من الـ edge —
  // مش قابل للتزوير من الـ client). في self-hosted: آخر قيمة في
  // X-Forwarded-For (اللي ضافها الـ proxy الموثوق — الأولى قابلة للتزوير).
  const vercelIp = req.headers["x-vercel-ip"];
  if (typeof vercelIp === "string" && vercelIp.trim()) return vercelIp.trim();
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string") {
    const parts = forwardedFor.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }
  return req.socket?.remoteAddress || "unknown";
}

function getRequestOrigin(req) {
  const origin = req.headers.origin;
  if (typeof origin === "string" && origin) return origin;
  const referer = req.headers.referer;
  if (typeof referer === "string" && referer) {
    try {
      return new URL(referer).origin;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function isAllowedOrigin(req) {
  const origin = getRequestOrigin(req);
  if (origin && ALLOWED_ORIGINS.has(origin)) return true;
  const secFetchSite = req.headers["sec-fetch-site"];
  const host = req.headers.host ? `https://${req.headers.host}` : undefined;
  return Boolean(
    !origin &&
    host &&
    ALLOWED_ORIGINS.has(host) &&
    (secFetchSite === "same-origin" || secFetchSite === "none"),
  );
}

function readPayload(req) {
  const contentLength = parseInt(req.headers["content-length"] || "0", 10);
  if (contentLength > MAX_BODY_SIZE_BYTES) throw new Error("Payload too large");
  if (typeof req.body === "string") {
    if (req.body.length > MAX_BODY_SIZE_BYTES) throw new Error("Payload too large");
    return JSON.parse(req.body || "{}");
  }
  return req.body === undefined ? {} : req.body;
}

/**
 * التحقق الصارم من payload المراجعة — تُصدَّر للاختبار.
 * @returns {string | undefined} رسالة الخطأ أو undefined إذا كان صالحاً.
 */
export function validateReviewPayload(payload) {
  if (
    payload === null ||
    typeof payload !== "object" ||
    Array.isArray(payload) ||
    Buffer.isBuffer(payload)
  ) {
    return "Invalid payload";
  }

  const productId = payload.productId;
  if (typeof productId !== "string" || productId.trim().length === 0 || productId.length > 40) {
    return "Invalid productId";
  }

  // منتج حقيقي في الكتالوج المعتمد — وإلا لا مسار للمراجعة أصلاً
  const product = getProductsDb().find((p) => p && p.id === productId.trim());
  if (!product) return "Product not found in official catalog";

  const rating = payload.rating;
  if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return "Invalid rating";
  }

  const text = payload.reviewText;
  if (typeof text !== "string") return "Invalid reviewText";
  const trimmedText = text.trim();
  if (trimmedText.length < REVIEW.MIN_TEXT) return "Review too short";
  if (trimmedText.length > REVIEW.MAX_TEXT) return "Review too long";

  let name = "";
  if (payload.reviewerName !== undefined) {
    if (typeof payload.reviewerName !== "string") return "Invalid reviewerName";
    name = payload.reviewerName.trim();
    if (name.length > REVIEW.MAX_NAME) return "Name too long";
  }

  let phone = "";
  if (payload.reviewerPhone !== undefined) {
    if (typeof payload.reviewerPhone !== "string") return "Invalid reviewerPhone";
    phone = payload.reviewerPhone.trim();
    if (phone) {
      const isLocalEgypt = /^01[0125][0-9]{8}$/.test(phone);
      const isInternational = /^\+[1-9][0-9]{6,14}$/.test(phone);
      if (!isLocalEgypt && !isInternational) return "Invalid reviewerPhone";
      if (phone.length > REVIEW.MAX_PHONE) return "Phone too long";
    }
  }

  return undefined;
}

export default async function handler(req, res) {
  const origin = req.headers.origin;
  const corsOrigin = origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://elysrmedical.store";

  res.setHeader("Access-Control-Allow-Origin", corsOrigin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  if (!isAllowedOrigin(req)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const clientIp = getClientIp(req);
  if (!(await rateLimiter.check(clientIp))) {
    return res.status(429).json({ error: "Too many requests" });
  }

  let payload;
  try {
    payload = readPayload(req);
  } catch {
    return res.status(400).json({ error: "Invalid JSON payload" });
  }

  const payloadError = validateReviewPayload(payload);
  if (payloadError) return res.status(400).json({ error: payloadError });

  const SHEET_URL = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  if (!SHEET_URL) {
    console.error("Missing GOOGLE_SHEETS_WEBHOOK_URL environment variable.");
    return res.status(500).json({ error: "Server configuration error" });
  }

  // 🔒 اسم المنتج من الـ catalog المعتمد — لا نمرر أي اسم من العميل
  const product = getProductsDb().find((p) => p && p.id === payload.productId.trim());
  const { createHash } = await import("node:crypto");
  const hashedIp =
    clientIp !== "unknown"
      ? createHash("sha256").update(clientIp).digest("hex").slice(0, 16)
      : "unknown";

  const sheetsController = new AbortController();
  const sheetsTimeout = setTimeout(() => sheetsController.abort(), GOOGLE_SHEETS_TIMEOUT_MS);

  try {
    const response = await fetch(SHEET_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        data: JSON.stringify({
          action: "review",
          productId: product.id,
          productName: product.name,
          rating: payload.rating,
          reviewerName: payload.reviewerName ? String(payload.reviewerName).trim() : "",
          reviewerPhone: payload.reviewerPhone ? String(payload.reviewerPhone).trim() : "",
          reviewText: String(payload.reviewText).trim(),
          clientIp: hashedIp,
          // 🔒 سر الكتابة (اختياري — يفعَّل بمتغير GOOGLE_SHEETS_WEBHOOK_SECRET)
          ...(process.env.GOOGLE_SHEETS_WEBHOOK_SECRET
            ? { secret: process.env.GOOGLE_SHEETS_WEBHOOK_SECRET }
            : {}),
        }),
      }),
      signal: sheetsController.signal,
    });
    if (!response.ok) {
      const text = (await response.text().catch(() => "")).slice(0, 200);
      console.error(`Google Sheets Webhook error (${response.status}):`, text);
      return res
        .status(500)
        .json({ error: "تعذر إرسال مراجعتك إلى قاعدة البيانات السحابية. يرجى المحاولة مجدداً." });
    }
    const result = await response.json();
    // Apps Script يعيد 200 للنجاح والرفض معاً — نحوّل الرفض إلى خطأ HTTP حقيقي
    if (!result?.success) {
      return res.status(502).json({
        error:
          typeof result?.error === "string"
            ? result.error.slice(0, 200)
            : "تعذر تسجيل مراجعتك في قاعدة البيانات السحابية.",
      });
    }
    return res.status(200).json({ success: true, status: "pending" });
  } catch (err) {
    if (sheetsController.signal.aborted) {
      console.error(`Google Sheets request timed out after ${GOOGLE_SHEETS_TIMEOUT_MS}ms`);
      return res.status(504).json({
        error: "انتهت مهلة الاتصال بقاعدة البيانات السحابية. يرجى المحاولة مجدداً.",
      });
    }
    console.error("Error submitting review:", err);
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    clearTimeout(sheetsTimeout);
  }
}
