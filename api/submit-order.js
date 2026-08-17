import { createRateLimiter, initRedis } from "./lib/rate-limiter.js";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PRODUCTS_DB_PATH = join(__dirname, "lib", "products-db.json");
const CONFIG_DB_PATH = join(__dirname, "lib", "config-db.json");

// مخازن ذاكرة مؤقتة (In-memory Caching) لتسريع أداء السيرفر السحابي وتجنب القراءة المتكررة من القرص الصلب
let cachedProductsDb = null;
let cachedConfigDb = null;

// جلب كتالوج المنتجات المعتمد المولد تلقائياً وقت البناء للتحقق الخلفي (Server-side Price Lookup)
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

// جلب إعدادات الشحن والعروض الترويجية المشتركة (Single Source of Truth) لمنع أي تضارب بين الفرونت والباك
function getConfigDb() {
  if (cachedConfigDb) return cachedConfigDb;
  try {
    cachedConfigDb = JSON.parse(readFileSync(CONFIG_DB_PATH, "utf-8"));
    return cachedConfigDb;
  } catch (err) {
    console.error("Failed to load config-db.json, using safe fallbacks:", err);
    return {
      GOVERNORATE_SHIPPING: [],
      FREE_SHIPPING_THRESHOLD: 2000,
      PROMO_END_ISO: "2026-07-19T20:59:59Z",
      PROMO_TIERS: [],
    };
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

const MAX_BODY_SIZE_BYTES = 64_000;

// 🚀 Redis-backed rate limiter with automatic in-memory fallback
const rateLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 30,
  prefix: "submit-order",
});

function getClientIp(req) {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string") return forwardedFor.split(",")[0].trim();
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
  return req.body || {};
}

function isNonEmptyString(value, maxLength) {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
}

function getShippingCost(governorate, subtotal = 0) {
  const config = getConfigDb();
  if (subtotal >= config.FREE_SHIPPING_THRESHOLD) return 0; // شحن مجاني عند تخطي الحد الأدنى
  const normalized = governorate.trim().replace(/\s+/g, " ");
  const found = config.GOVERNORATE_SHIPPING.find((g) => g.name === normalized);
  return found ? found.shipping : 70; // 70 ج.م كافتراضي
}

function isPromoActive() {
  // مبادرة الرعاية الماسية دائماً نشطة ومتجددة تلقائياً كل 3 أيام!
  return true;
}

function calcDiscount(subtotal) {
  if (!isPromoActive()) return 0;
  const config = getConfigDb();
  // البحث عن فئة الخصم المطابقة من المصفوفة المرتبة من الأعلى للأدنى
  const foundTier = config.PROMO_TIERS.find((tier) => subtotal >= tier.threshold);
  if (!foundTier) return 0;
  return Math.round(subtotal * foundTier.discount);
}

// 🔒 دالة التحقق الأمني والرياضي الصارم من سلامة الأسعار ومحتويات الطلب
function validateOrderPayload(payload) {
  if (!isNonEmptyString(payload.orderId, 60)) return "Invalid orderId";
  if (!isNonEmptyString(payload.customerName, 120)) return "Invalid customerName";

  const phoneStr = String(payload.customerPhone || "").trim();
  const isLocalEgypt = /^01[0125][0-9]{8}$/.test(phoneStr);
  const isInternational = /^\+[1-9][0-9]{6,14}$/.test(phoneStr);
  if (!isLocalEgypt && !isInternational) {
    return "Invalid customerPhone";
  }

  if (!isNonEmptyString(payload.governorate, 80)) return "Invalid governorate";
  if (!Array.isArray(payload.items) || payload.items.length === 0 || payload.items.length > 50)
    return "Invalid items";

  const productsDb = getProductsDb();
  let calculatedSubtotal = 0;

  for (const item of payload.items) {
    if (!item || !isNonEmptyString(item.id, 30) || !isNonEmptyString(item.name, 180))
      return "Invalid item structure";
    if (!Number.isFinite(Number(item.qty)) || Number(item.qty) < 1 || Number(item.qty) > 999)
      return "Invalid item quantity";

    // 🔒 البحث عن المنتج بالكتالوج الرسمي المعتمد في السيرفر للتحقق من سعره الحقيقي
    const officialProduct = productsDb.find((p) => p.id === item.id);
    if (!officialProduct) {
      return `Product with ID ${item.id} not found in official catalog`;
    }

    // تفعيل مبدأ "مصدر الحقيقة الموحد" واستبدال الاسم المرسل من العميل بالاسم الرسمي المعتمد في الكتالوج لمنع ثغرات الحقن
    item.name = officialProduct.name;

    // منع تلاعب العميل بقيمة سعر المنتج الفردي
    if (Number(item.price) !== officialProduct.price) {
      return `Price mismatch for product: ${item.name}. Submitted: ${item.price}, Official: ${officialProduct.price}`;
    }

    calculatedSubtotal += officialProduct.price * Number(item.qty);
  }

  // 🔒 التحقق الصارم من صحة الحقول المالية الإجمالية
  if (Number(payload.subtotalBeforeDiscount) !== calculatedSubtotal) {
    return "Subtotal before discount mismatch";
  }

  const calculatedDiscount = calcDiscount(calculatedSubtotal);
  if (Number(payload.discount) !== calculatedDiscount) {
    return "Discount mismatch";
  }

  const calculatedSubtotalAfterDiscount = calculatedSubtotal - calculatedDiscount;
  if (Number(payload.subtotal) !== calculatedSubtotalAfterDiscount) {
    return "Subtotal after discount mismatch";
  }

  const calculatedShipping = getShippingCost(payload.governorate, calculatedSubtotal);
  if (Number(payload.shipping) !== calculatedShipping) {
    return "Shipping cost mismatch";
  }

  const calculatedTotal = calculatedSubtotalAfterDiscount + calculatedShipping;
  if (Number(payload.total) !== calculatedTotal) {
    return "Grand total mismatch";
  }

  return undefined;
}

export default async function handler(req, res) {
  // 🚀 Warm Redis connection early (best-effort, non-blocking)
  initRedis().catch(() => {});

  const requestOrigin = getRequestOrigin(req);
  const corsOrigin = ALLOWED_ORIGINS.has(requestOrigin)
    ? requestOrigin
    : "https://elysrmedical.store";

  res.setHeader("Access-Control-Allow-Origin", corsOrigin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!isAllowedOrigin(req)) return res.status(403).json({ error: "Forbidden origin" });

  const clientIp = getClientIp(req);
  if (!(await rateLimiter.check(clientIp))) {
    return res.status(429).json({ error: "Rate limit exceeded" });
  }

  let payload;
  try {
    payload = readPayload(req);
  } catch {
    return res.status(400).json({ error: "Invalid JSON payload" });
  }

  // 🔒 الأمان عبر CORS + Origin checking + Rate Limiting + Payload Validation
  // لم نعد نستخدم HMAC CSRF token بمفتاح مكشوف في الـ client bundle
  const payloadError = validateOrderPayload(payload);
  if (payloadError) return res.status(400).json({ error: payloadError });

  const SHEET_URL = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  if (!SHEET_URL) {
    console.error("Missing GOOGLE_SHEETS_WEBHOOK_URL environment variable.");
    return res.status(500).json({ error: "Server configuration error" });
  }

  // 🔒 قائمة بيضاء صارمة للحقول المرسلة إلى الشيت — نُمرّر الحقول المعروفة فقط.
  // يمنع تمرير مفاتيح تحكمية من العميل (مثل __proto__/constructor → Prototype Pollution)
  // أو حقول إضافية زائدة قد تُسجَّل في الشيت بلا ضرورة.
  const ALLOWED_ORDER_FIELDS = new Set([
    "orderId",
    "orderType",
    "paymentMethod",
    "customerName",
    "customerPhone",
    "governorate",
    "address",
    "notes",
    "items",
    "subtotalBeforeDiscount",
    "discount",
    "subtotal",
    "shipping",
    "total",
    "promoApplied",
  ]);
  const safePayload = {};
  for (const key of ALLOWED_ORDER_FIELDS) {
    if (payload[key] !== undefined) safePayload[key] = payload[key];
  }

  try {
    const response = await fetch(SHEET_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ data: JSON.stringify({ ...safePayload, clientIp }) }),
    });
    if (!response.ok) {
      // 🔒 لا نمرر الرد الكامل للسجل — نقتصر على أول 200 حرف لمنع تسجيل أي
      // بيانات قد يعيدها الشيت، ومنع حشر سجلات ضخمة (log flooding).
      const text = (await response.text().catch(() => "")).slice(0, 200);
      console.error(`Google Sheets Webhook error (${response.status}):`, text);
      return res
        .status(500)
        .json({ error: "تعذر إرسال الطلب إلى قاعدة البيانات السحابية. يرجى المحاولة مجدداً." });
    }
    const result = await response.json();
    // 🔒 لا نعيد كل ما يعيده الشيت للعميل — نُقيّده إلى الحقول الأساسية فقط
    // (حتى لو أضاف الشيت حقولاً إضافية لاحقاً، لا تتسرب للواجهة).
    return res.status(200).json({
      success: Boolean(result?.success),
      orderId: typeof result?.orderId === "string" ? result.orderId : undefined,
    });
  } catch (err) {
    console.error("Error submitting order:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
