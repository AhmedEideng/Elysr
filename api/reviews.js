/**
 * ============================================================
 * Reviews Read API — المراجعات الحقيقية المعتمدة فقط
 * ============================================================
 * GET /api/reviews?product=<productId>
 *
 * يقرأ من Google Apps Script (action=reviews) المراجعات المعتمدة فقط
 * للمنتج (الحد 20، الأحدث أولاً) ويعيدها كـ JSON.
 *
 * سلوك متسامح (fail-soft): أي خطأ (سر غير مُعيَّن، webhook خارج
 * الخدمة، شبكة) → 200 بقائمة فارغة — صفحة المنتج لا تنكسر أبداً
 * والقسم يظهر فقط عندما توجد مراجعات حقيقية معتمدة فعلاً.
 *
 * 🔒 الحماية: توقيع HMAC-SHA256 قصير العمر (5 دقائق) بدل توكن ثابت
 * في الـ URL — السر (GOOGLE_SHEETS_REVIEWS_TOKEN) نفسه لا يظهر في أي
 * URL أو سجل وسيط، ويحمي من إعادة تشغيل طلب محجوب.
 * الهاتف لا يُكشف (Apps Script يستبعده من المخرجات).
 * ============================================================
 */

import { createHmac, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRateLimiter } from "./lib/rate-limiter.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PRODUCTS_DB_PATH = join(__dirname, "lib", "products-db.json");

// معرفات المنتجات المعتمدة — للتحقق قبل أي اتصال بـ Sheets أو كاش
// (يمنع استخدام الـ endpoint لضخ معرِّفات عشوائية تملأ الكاش
// وتستهلك حصة Apps Script بلا فائدة)
let knownProductIds = null;
function knownProducts() {
  if (!knownProductIds) {
    try {
      const db = JSON.parse(readFileSync(PRODUCTS_DB_PATH, "utf-8"));
      knownProductIds = new Set(db.map((p) => p.id));
    } catch {
      knownProductIds = new Set();
    }
  }
  return knownProductIds;
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

const RATE_LIMIT = { windowMs: 60_000, max: 10 };
const FETCH_TIMEOUT_MS = 6_000;
const CACHE_TTL_MS = 5 * 60_000; // كاش ذاكرة لكل عملية: يحمي حصة Apps Script
const MAX_REVIEWS = 20;

// مخزن ذاكرة مؤقتة: productId → { at, reviews }
const cache = new Map();

function cleanCache(now) {
  if (cache.size > 500) cache.clear(); // سقف أمان
  for (const [key, entry] of cache) {
    if (now - entry.at > CACHE_TTL_MS) cache.delete(key);
  }
}

const rateLimiter = createRateLimiter({ ...RATE_LIMIT, prefix: "reviews-read" });

function getClientIp(req) {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string") return forwardedFor.split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
}

/** تطبيع المراجعة القادمة من Apps Script — يرفض أي شكل غير متوقع */
function normalizeReview(raw) {
  if (!raw || typeof raw !== "object") return null;
  const rating = Number(raw.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return null;
  const text = typeof raw.text === "string" ? raw.text.trim() : "";
  if (text.length < 10 || text.length > 600) return null;
  return {
    name: typeof raw.name === "string" && raw.name.trim() ? raw.name.trim().slice(0, 60) : "عميل",
    rating,
    date: typeof raw.date === "string" ? raw.date.trim().slice(0, 40) : "",
    text,
    verified: raw.verified === true,
  };
}

export async function fetchApprovedReviews(productId) {
  const now = Date.now();
  cleanCache(now);

  const cachedEntry = cache.get(productId);
  if (cachedEntry && now - cachedEntry.at < CACHE_TTL_MS) return cachedEntry.reviews;

  const SHEET_URL = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  const SECRET = process.env.GOOGLE_SHEETS_REVIEWS_TOKEN;

  // fail-closed → بدون إعداد (سر/webhook) الميزة معطلة بصمت (قائمة فارغة)
  if (!SHEET_URL || !SECRET) {
    cache.set(productId, { at: now, reviews: [] });
    return [];
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let reviews = [];
  try {
    // توقيع HMAC قصير العمر: (ts, nonce, sig) — السر نفسه لا يُرسل
    const ts = Math.floor(Date.now() / 1000);
    const nonce = randomBytes(8).toString("hex");
    const sig = createHmac("sha256", SECRET)
      .update(`reviews|${productId}|${ts}|${nonce}`)
      .digest("hex");
    const url = `${SHEET_URL}?action=reviews&product=${encodeURIComponent(
      productId,
    )}&ts=${ts}&nonce=${nonce}&sig=${sig}`;
    const response = await fetch(url, { signal: controller.signal });
    if (response.ok) {
      const data = await response.json();
      if (data && Array.isArray(data.reviews)) {
        reviews = data.reviews
          .map((r) => normalizeReview(r))
          .filter((r) => r !== null)
          .slice(0, MAX_REVIEWS);
      }
    } else {
      console.error(`Reviews webhook returned ${response.status}`);
    }
  } catch (err) {
    // fail-soft: شبكة/توكن رافض/أي خطأ → قائمة فارغة بدون كسر الصفحة
    console.error("Reviews fetch failed:", err instanceof Error ? err.message : err);
  } finally {
    clearTimeout(timeout);
  }

  cache.set(productId, { at: now, reviews });
  return reviews;
}

export default async function handler(req, res) {
  const origin = req.headers.origin;
  const corsOrigin = origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://elysrmedical.store";

  res.setHeader("Access-Control-Allow-Origin", corsOrigin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
  // كاش قصير للمتصفح/البروكسي — البيانات تتحدث بحد أقصى كل 5 دقائق
  res.setHeader("Cache-Control", "public, max-age=60");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const clientIp = getClientIp(req);
  if (!(await rateLimiter.check(clientIp))) {
    return res.status(429).json({ error: "Too many requests" });
  }

  const productId = String((req.query && req.query.product) || "")
    .trim()
    .slice(0, 40);
  if (!productId) {
    return res.status(400).json({ error: "Missing product parameter" });
  }

  // تحقق من وجود المنتج في الكتالوج المعتمد قبل أي اتصال/كاش
  // (معرّف عشوائي = قائمة فارغة فوراً، بلا استهلاك لحصة Sheets)
  if (!knownProducts().has(productId)) {
    return res.status(200).json({ reviews: [], count: 0 });
  }

  const reviews = await fetchApprovedReviews(productId);
  return res.status(200).json({ reviews, count: reviews.length });
}
