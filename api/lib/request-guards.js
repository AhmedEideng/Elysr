/**
 * Shared request guards for serverless order/review handlers.
 * Endpoint-specific origin sets and body-size limits are passed by the caller.
 */

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
