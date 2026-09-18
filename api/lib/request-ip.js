/**
 * Return the client address used by API rate limits.
 *
 * x-vercel-ip is trusted only inside Vercel's runtime. On a direct or
 * self-hosted request all client-controlled forwarding headers are ignored;
 * operators behind a reverse proxy should configure the proxy to pass the
 * real socket address or set VERCEL=1 only in the actual platform runtime.
 */

/** @param {import("express").Request} req */
export function getClientIp(req) {
  if (process.env.VERCEL === "1") {
    const vercelIp = req.headers["x-vercel-ip"];
    if (typeof vercelIp === "string" && vercelIp.trim()) return vercelIp.trim();
  }
  return req.socket?.remoteAddress || "unknown";
}
