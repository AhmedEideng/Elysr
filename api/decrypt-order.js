/**
 * Decrypt Order PII - for secure order-view page
 * POST /api/decrypt-order
 * Body: { blob }
 * Returns: { data } or 400 if invalid/expired
 */

import { createRateLimiter } from "./lib/rate-limiter.js";
import { decrypt } from "./lib/encryption.js";

const ALLOWED_ORIGINS = new Set([
  "https://elysrmedical.store",
  "https://www.elysrmedical.store",
  "http://localhost:8080",
]);

const rateLimiter = createRateLimiter({ windowMs: 60_000, max: 30, prefix: "decrypt-order" });

function getClientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string") return fwd.split(",")[0].trim();
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
    return res.status(429).json({ error: "Rate limit" });
  }

  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: "Invalid JSON" });
  }

  const blob = String(body?.blob || "").trim();
  if (!blob || blob.length < 20 || blob.length > 10000) {
    return res.status(400).json({ error: "Invalid blob" });
  }

  const data = decrypt(blob);
  if (!data) {
    return res.status(400).json({ error: "Invalid or expired link" });
  }

  return res.status(200).json({ data });
}
