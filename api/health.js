/**
 * Minimal deployment health endpoint.
 *
 * Vercel exposes files under api/ as serverless functions. The public /health
 * path rewrites here from vercel.json, while the Express self-hosted server
 * keeps its native /health route for Docker and VPS deployments.
 */
/**
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export default function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Health checks must never be cached or expose deployment internals.
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({ status: "ok" });
}
