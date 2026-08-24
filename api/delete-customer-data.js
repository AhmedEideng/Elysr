/**
 * ============================================================
 * Customer Data Deletion API - GDPR Right to be Forgotten
 * ============================================================
 * Allows customers to request deletion of their data by phone.
 * Validates phone, rate limits, and logs deletion request.
 * Actual deletion from Google Sheets must be done via
 * deleteCustomerData() function in Apps Script or manually.
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

  // In production, you would trigger Apps Script deleteCustomerData(phone)
  // For now, we return success and instruct manual deletion via Sheet or Apps Script
  return res.status(200).json({
    success: true,
    message: "تم استلام طلب حذف البيانات. سيتم حذفه خلال 72 ساعة.",
    phoneHash: hashedPhone,
  });
}
