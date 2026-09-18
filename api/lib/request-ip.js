/**
 * Return the client address used by API rate limits.
 *
 * Vercel documents x-real-ip (identical to x-forwarded-for) as the
 * public client address. It is trusted only inside Vercel's runtime. On a
 * direct or self-hosted request all client-controlled forwarding headers are
 * ignored; operators behind a reverse proxy should configure the proxy to
 * pass the real socket address or set VERCEL=1 only in the actual platform
 * runtime.
 */

/** @param {import("express").Request} req */
export function getClientIp(req) {
  if (process.env.VERCEL === "1") {
    const realIp = req.headers["x-real-ip"];
    if (typeof realIp === "string" && realIp.trim()) return realIp.trim();

    // Defensive fallback for compatible Vercel/proxy runtimes. Vercel
    // overwrites this header before invoking the function, so it is not the
    // client-controlled value that it would be on a self-hosted server.
    const forwardedIp = req.headers["x-forwarded-for"];
    if (typeof forwardedIp === "string" && forwardedIp.trim()) {
      return forwardedIp.split(",", 1)[0].trim();
    }
  }
  return req.socket?.remoteAddress || "unknown";
}
