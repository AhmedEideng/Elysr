/**
 * ============================================================
 * Unified Rate Limiter — Redis + In-Memory Fallback
 * ============================================================
 *
 * Production: uses Redis (via UPSTASH_REDIS_URL or REDIS_URL).
 * Development / fallback: uses in-memory Map with auto-cleanup.
 *
 * Benefits over the previous in-memory-only approach:
 *   • Survives serverless cold starts (Redis state is persistent)
 *   • Shared across all Vercel function instances
 *   • Predictable behaviour under load
 *   • Atomic operations prevent race conditions
 *
 * Usage:
 *   import { createRateLimiter } from "./lib/rate-limiter.js";
 *   const limiter = createRateLimiter({ windowMs: 60_000, max: 30, prefix: "submit-order" });
 *   if (!await limiter.check(clientIp)) return res.status(429).json(…);
 * ============================================================
 */

import { createHash } from "node:crypto";

// ── Redis client (lazy, only created when Redis is configured) ──
let redisPromise = null;

function getRedis() {
  const url = process.env.UPSTASH_REDIS_URL || process.env.REDIS_URL;
  if (!url) return null;
  if (!redisPromise) {
    // Dynamic import — ioredis is only loaded when needed
    redisPromise = import("ioredis")
      .then(
        ({ Redis }) =>
          new Redis(url, {
            maxRetriesPerRequest: 1,
            lazyConnect: true,
            connectTimeout: 3000,
            enableOfflineQueue: false,
          }),
      )
      .then(async (redis) => {
        try {
          await redis.ping();
          console.log("[rate-limiter] ✅ Redis connected");
          return redis;
        } catch {
          console.warn("[rate-limiter] ⚠️ Redis ping failed — using in-memory fallback");
          return null;
        }
      })
      .catch(() => {
        console.warn("[rate-limiter] ⚠️ ioredis unavailable — using in-memory fallback");
        return null;
      });
  }
  return redisPromise;
}

// ── In-memory store (fallback) ──
const memoryStore = new Map();
const MEMORY_CLEANUP_INTERVAL_MS = 5 * 60_000;
let lastMemoryCleanup = Date.now();

function cleanupMemory() {
  const now = Date.now();
  if (now - lastMemoryCleanup < MEMORY_CLEANUP_INTERVAL_MS) return;
  lastMemoryCleanup = now;
  const maxAge = 5 * 60_000;
  for (const [key, entry] of memoryStore) {
    if (now - entry.start > maxAge) memoryStore.delete(key);
  }
}

// ── Key hashing (consistent prefix for Redis + safe keys) ──
function hashKey(prefix, identifier) {
  const hash = createHash("sha256").update(String(identifier)).digest("hex").slice(0, 12);
  return `ratelimit:${prefix}:${hash}`;
}

/**
 * Create a rate limiter instance.
 *
 * @param {object} opts
 * @param {number} opts.windowMs - Time window in milliseconds
 * @param {number} opts.max      - Max requests in the window
 * @param {string} opts.prefix   - Key prefix (e.g. "submit-order")
 * @returns {{ check: (key: string) => Promise<boolean> }}
 */
export function createRateLimiter({ windowMs, max, prefix }) {
  const windowSec = Math.ceil(windowMs / 1000);

  return {
    async check(key) {
      if (!key) return false;

      // ── Try Redis first ──
      const redis = await getRedis();
      if (redis) {
        try {
          const redisKey = hashKey(prefix, key);
          // Lua script: atomic INCR + EXPIRE
          const script = `
            local current = redis.call("INCR", KEYS[1])
            if current == 1 then
              redis.call("EXPIRE", KEYS[1], ARGV[1])
            end
            return current
          `;
          const count = await redis.eval(script, 1, redisKey, windowSec);
          return count <= max;
        } catch (err) {
          console.warn(
            `[rate-limiter] Redis error (${prefix}), falling back to memory:`,
            err.message,
          );
          // Fall through to in-memory
        }
      }

      // ── In-memory fallback ──
      cleanupMemory();
      const now = Date.now();
      const entry = memoryStore.get(key);
      if (!entry || now - entry.start > windowMs) {
        memoryStore.set(key, { start: now, count: 1 });
        return true;
      }
      entry.count += 1;
      return entry.count <= max;
    },
  };
}

/**
 * Pre-initialize Redis (call at server boot).
 * Returns the Redis client or null.
 */
export async function initRedis() {
  return getRedis();
}
