/**
 * ============================================================
 * GA4 Server-Side Fallback — page_view الاحتياطي من الخادم
 * ============================================================
 *
 * لماذا يوجد؟
 * سكربت gtag.js عندنا مؤجَّل لحد تحميل الصفحة (حمايةً للـ LCP)، ولو الزائر
 * قفل قبل ما يوصل، أو مانع تتبّع حجب googletagmanager.com، بتضيع الزيارة
 * من GA4 نهائيًا. هذا الـ endpoint بيستقبل beacon خفيف من نفس النطاق
 * (first-party) ويرسله لـ GA4 Measurement Protocol من الخادم.
 *
 * منع الازدواج: العميل لا يرسل الـ beacon إلا لو gtag.js فشل فعليًا في
 * التحميل (محجوب/سقط)، وإلا page_view العادي من الـ SPA هو اللي بيتبعت.
 * الهوية موحّدة: نفس client_id (كوكي elysr_ga_cid) بيُمرَّر لـ gtag config
 * لما يشتغل، فلا تتولد «زيارة مكرّرة» بهوية مختلفة.
 *
 * التفعيل: يحتاج GA_API_SECRET في بيئة النشر (GA4 → Admin → Data Streams
 * → Measurement Protocol API secrets). من غيره الـ endpoint بيرد 204
 * كـ no-op آمن ولا بيأثر على أي حاجة.
 * ============================================================
 */

import { getClientIp } from "./lib/request-ip.js";
import { createEndpointRateLimiter } from "./lib/endpoint-rate-limiter.js";

const checkRateLimit = createEndpointRateLimiter({ windowMs: 60_000, max: 30 });

const ALLOWED_ORIGINS = new Set(["https://elysrmedical.store", "https://www.elysrmedical.store"]);

const MEASUREMENT_ID = process.env.GA_MEASUREMENT_ID || "G-V3X7Q3D0RR";
const SITE_ORIGIN = "https://elysrmedical.store";

/** GA4 client_id format: "<random>.<first-visit-seconds>" */
const CLIENT_ID_PATTERN = /^\d{1,20}\.\d{1,20}$/;
/** Keep only an internal path — never forward query strings (possible PII). */
/** @param {unknown} value @returns {string | null} */
function cleanPagePath(value) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return null;
  const path = value.split(/[?#]/)[0];
  return path.length > 0 && path.length <= 300 ? path : null;
}

/**
 * Build the Measurement Protocol payload, or null for invalid input.
 * Exported for unit tests.
 */
/** @param {unknown} body */
export function buildMeasurementPayload(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const {
    client_id: clientId,
    session_id: sessionId,
    page_path: pagePathRaw,
    page_title: pageTitleRaw,
  } = /** @type {Record<string, unknown>} */ (body);
  if (typeof clientId !== "string" || !CLIENT_ID_PATTERN.test(clientId)) return null;

  const pagePath = cleanPagePath(pagePathRaw);
  if (!pagePath) return null;

  /** @type {Record<string, string | number>} */
  const params = {
    page_location: `${SITE_ORIGIN}${pagePath}`,
    page_title:
      typeof pageTitleRaw === "string"
        ? pageTitleRaw.replace(/\s+/g, " ").trim().slice(0, 200)
        : "",
    engagement_time_msec: 1,
    // Marks the event so fallback volume can be audited in GA4 explorations.
    measurement_source: "server_fallback",
  };
  if (typeof sessionId === "string" && /^\d{1,20}$/.test(sessionId)) {
    params.session_id = Number(sessionId);
  }

  return { client_id: clientId, events: [{ name: "page_view", params }] };
}

/**
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export default async function handler(req, res) {
  const origin = req.headers.origin;
  if (origin && !ALLOWED_ORIGINS.has(origin)) return res.status(403).end();
  res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).end();

  if (!checkRateLimit(getClientIp(req))) return res.status(429).end();

  try {
    const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? null);
    if (Buffer.byteLength(rawBody, "utf8") > 4096) return res.status(400).end();
    const body = typeof req.body === "string" ? JSON.parse(rawBody) : req.body;

    const payload = buildMeasurementPayload(body);
    if (!payload) return res.status(400).end();

    const apiSecret = (process.env.GA_API_SECRET || "").trim(); // Not configured yet: accept-and-drop so the client beacon stays a
    // harmless no-op until the owner adds the secret in the host env.
    if (!apiSecret) return res.status(204).end();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    try {
      await fetch(
        `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(MEASUREMENT_ID)}&api_secret=${encodeURIComponent(apiSecret)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        },
      );
    } finally {
      clearTimeout(timeout);
    }
    return res.status(204).end();
  } catch {
    // Measurement must never surface errors to the visitor's page.
    return res.status(204).end();
  }
}
