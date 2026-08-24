/**
 * Encrypt Order PII for secure WhatsApp link
 * POST /api/encrypt-order
 * Body: { orderId, customerName, customerPhone, governorate, address, notes, items, total }
 * Returns: { encrypted }
 */

import { createRateLimiter } from "./lib/rate-limiter.js";
import { encrypt } from "./lib/encryption.js";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PRODUCTS_DB_PATH = join(__dirname, "lib", "products-db.json");
const CONFIG_DB_PATH = join(__dirname, "lib", "config-db.json");

let cachedProductsDb = null;
let cachedConfigDb = null;

function getProductsDb() {
  if (cachedProductsDb) return cachedProductsDb;
  try {
    cachedProductsDb = JSON.parse(readFileSync(PRODUCTS_DB_PATH, "utf-8"));
    return cachedProductsDb;
  } catch {
    return [];
  }
}

function getConfigDb() {
  if (cachedConfigDb) return cachedConfigDb;
  try {
    cachedConfigDb = JSON.parse(readFileSync(CONFIG_DB_PATH, "utf-8"));
    return cachedConfigDb;
  } catch {
    return { GOVERNORATE_SHIPPING: [], FREE_SHIPPING_THRESHOLD: 2000, PROMO_TIERS: [] };
  }
}

const ALLOWED_ORIGINS = new Set(
  ["https://elysrmedical.store", "https://www.elysrmedical.store", "http://localhost:8080"].filter(
    Boolean,
  ),
);

const rateLimiter = createRateLimiter({ windowMs: 60_000, max: 20, prefix: "encrypt-order" });

function getClientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string") return fwd.split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
}

function isNonEmptyString(v, max) {
  return typeof v === "string" && v.trim().length > 0 && v.length <= max;
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

  let payload;
  try {
    payload = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: "Invalid JSON" });
  }

  // Validate minimal required fields
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  if (!isNonEmptyString(payload.orderId, 60))
    return res.status(400).json({ error: "Invalid orderId" });

  // Encrypt full PII - only server can decrypt
  const dataToEncrypt = {
    orderId: payload.orderId,
    customerName: payload.customerName,
    customerPhone: payload.customerPhone,
    governorate: payload.governorate,
    address: payload.address,
    notes: payload.notes,
    items: payload.items,
    total: payload.total,
    timestamp: new Date().toISOString(),
  };

  const encrypted = encrypt(dataToEncrypt, 24 * 60 * 60 * 1000); // 24h expiry

  return res.status(200).json({ encrypted, orderId: payload.orderId });
}
