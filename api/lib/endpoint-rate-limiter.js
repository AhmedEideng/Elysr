import { createHash } from "node:crypto";

/**
 * Create an in-process fixed-window limiter with a private store per endpoint.
 * The private store keeps endpoint limits independent while sharing the
 * identical hashing, cleanup, and bounded-memory policy.
 *
 * @param {{ windowMs: number, max: number, cleanupIntervalMs?: number, maxEntries?: number }} options
 * @returns {(identifier: string) => boolean}
 */
export function createEndpointRateLimiter({
  windowMs,
  max,
  cleanupIntervalMs = 5 * 60_000,
  maxEntries = 20_000,
}) {
  /** @type {Map<string, { start: number, count: number }>} */
  const store = new Map();
  let lastCleanup = Date.now();

  return function checkRateLimit(identifier) {
    const now = Date.now();
    if (now - lastCleanup >= cleanupIntervalMs) {
      lastCleanup = now;
      for (const [key, entry] of store) {
        if (now - entry.start >= windowMs) store.delete(key);
      }
    }

    const hashed = createHash("sha256").update(String(identifier)).digest("hex").slice(0, 16);
    if (!store.has(hashed) && store.size >= maxEntries) {
      const oldest = store.keys().next().value;
      if (oldest) store.delete(oldest);
    }

    const entry = store.get(hashed);
    if (!entry || now - entry.start >= windowMs) {
      store.set(hashed, { start: now, count: 1 });
      return true;
    }

    entry.count += 1;
    return entry.count <= max;
  };
}
