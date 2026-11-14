/**
 * Shared request guards for serverless handlers.
 * Endpoint-specific origin sets and body-size limits are passed by the caller.
 */

/**
 * (2026-11-14 · M5) مصدر واحد لقائمة الأصول المسموحة.
 *
 * كان كل endpoint يبني نسخته: ثلاثة منها (submit-order · submit-review ·
 * reviews) تضيف SITE_URL وVERCEL_URL وlocalhost، وثلاثة (ga-pageview ·
 * errors · csp-report) تُثبّت النطاقين فقط. النتيجة أن **أي بيئة غير
 * الإنتاج** — preview على Vercel، staging، أو تشغيل محلي — كانت تُرجِع 403
 * من نقاط القياس نفسها، فيضيع الـ fallback الذي بُني أصلًا لالتقاط الزيارات
 * المفقودة، وتضيع تقارير الأخطاء وCSP بلا أثر مطلق.
 *
 * تُقرأ المتغيرات **وقت الاستدعاء** لا وقت التحميل، حتى تعمل الاختبارات
 * والتحقق اليدوي بتغيير البيئة دون إعادة استيراد الوحدة.
 */
export const CANONICAL_ORIGINS = ["https://elysrmedical.store", "https://www.elysrmedical.store"];

/** @param {Record<string, string | undefined>} [env] */
export function allowedOrigins(env = process.env) {
  return new Set(
    [
      ...CANONICAL_ORIGINS,
      env.SITE_URL,
      // معاينات Vercel لها نطاق عشوائي لكل نشرة — مسموح بها خارج الإنتاج فقط.
      env.VERCEL_URL && env.VERCEL_ENV !== "production" ? `https://${env.VERCEL_URL}` : undefined,
      env.NODE_ENV !== "production" ? "http://localhost:8080" : undefined,
    ].filter(Boolean),
  );
}

/** @param {import("express").Request} req @returns {string | undefined} */
export function getRequestOrigin(req) {
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

/**
 * @param {import("express").Request} req
 * @param {{ has: (origin: string) => boolean }} allowedOrigins
 */
export function isAllowedOrigin(req, allowedOrigins) {
  const origin = getRequestOrigin(req);
  if (origin && allowedOrigins.has(origin)) return true;
  const secFetchSite = req.headers["sec-fetch-site"];
  const host = req.headers.host ? `https://${req.headers.host}` : undefined;
  return Boolean(
    !origin &&
    host &&
    allowedOrigins.has(host) &&
    (secFetchSite === "same-origin" || secFetchSite === "none"),
  );
}

/**
 * Parse an already-read or platform-parsed body while enforcing the same byte
 * limit in both deployment adapters (including chunked, pre-parsed requests).
 * @param {import("express").Request} req
 * @param {number} maxBodySizeBytes
 * @returns {any}
 */
export function readPayload(req, maxBodySizeBytes) {
  const contentLength = parseInt(req.headers["content-length"] || "0", 10);
  if (contentLength > maxBodySizeBytes) throw new Error("Payload too large");
  if (typeof req.body === "string") {
    if (Buffer.byteLength(req.body, "utf8") > maxBodySizeBytes)
      throw new Error("Payload too large");
    return JSON.parse(req.body || "{}");
  }
  if (req.body !== undefined) {
    // Vercel supplies an already-parsed object, so content-length is not
    // sufficient when the request used chunked transfer encoding.
    const serialized = JSON.stringify(req.body);
    if (Buffer.byteLength(serialized, "utf8") > maxBodySizeBytes)
      throw new Error("Payload too large");
  }
  return req.body === undefined ? {} : req.body;
}
