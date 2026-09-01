/**
 * ============================================================
 * Customer Data Deletion API - GDPR Right to be Forgotten
 * ============================================================
 * Allows customers to request deletion of their data by phone.
 * Validates phone, rate limits, logs the request (hashed phone only),
 * then performs the ACTUAL deletion through the Apps Script webhook
 * (action=delete, token-protected): orders + review rows for the phone.
 * ============================================================
 */

import { createRateLimiter } from "./lib/rate-limiter.js";

const ALLOWED_ORIGINS = new Set([
  "https://elysrmedical.store",
  "https://www.elysrmedical.store",
  "http://localhost:8080",
]);

const rateLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 5,
  prefix: "delete-data",
});

function getClientIp(req) {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string") return forwardedFor.split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
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

  const clientIp = getClientIp(req);
  if (!(await rateLimiter.check(clientIp))) {
    return res.status(429).json({ error: "Too many requests" });
  }

  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: "Invalid JSON" });
  }

  const phone = String(body?.phone || "").trim();
  const isLocalEgypt = /^01[0125][0-9]{8}$/.test(phone);
  const isInternational = /^\+[1-9][0-9]{6,14}$/.test(phone);
  if (!isLocalEgypt && !isInternational) {
    return res.status(400).json({ error: "Invalid phone" });
  }

  // Log deletion request (hashed phone for privacy)
  const { createHash } = await import("node:crypto");
  const hashedPhone = createHash("sha256").update(phone).digest("hex").slice(0, 16);
  console.warn(`[data-deletion-request] phone hash ${hashedPhone} IP ${clientIp}`, {
    type: "data-deletion-request",
    timestamp: new Date().toISOString(),
    phoneHash: hashedPhone,
  });

  // 🧹 الحذف الفعلي عبر الـ webhook (action=delete) — محمي بالتوكن نفسه
  // المستخدم لقراءة المراجعات. لا نعيد "success" وهمي: النتيجة حقيقية.
  const SHEET_URL = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  const TOKEN = process.env.GOOGLE_SHEETS_REVIEWS_TOKEN;
  if (!SHEET_URL || !TOKEN) {
    // fail-closed: الإعداد ناقص → لا نَعِد بنجاح لم يحدث
    console.error("Delete endpoint not configured (webhook url / token missing).");
    return res.status(503).json({
      error:
        "خدمة الحذف الآلي غير متاحة حالياً. تواصل معنا عبر واتساب وسننفي طلب الحذف يدوياً.",
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(SHEET_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        data: JSON.stringify({ action: "delete", phone, token: TOKEN }),
      }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`webhook HTTP ${response.status}`);
    const result = await response.json();
    if (!result?.success) throw new Error(result?.error || "webhook rejected the delete");
    return res.status(200).json({
      success: true,
      message: "تم حذف بياناتك المرتبطة برقم الهاتف (الطلبات والمراجعات).",
      deleted: result.deleted ?? { orders: 0, reviews: 0 },
      phoneHash: hashedPhone,
    });
  } catch (err) {
    // لا نكذب للعميل: فشل الحذف يُبلَّغ بوضوح مع قناة بديلة
    console.error("Delete request failed:", err);
    return res.status(502).json({
      error:
        "تعذر تنفيذ الحذف آلياً الآن. حاول مرة أخرى، أو تواصل عبر واتساب وسننفي الطلب يدوياً.",
    });
  } finally {
    clearTimeout(timeout);
  }
}
