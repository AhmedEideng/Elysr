/**
 * Lightweight in-process fixed-window rate limiter.
 *
 * No external service is required. It provides a fast first layer on each server
 * instance; Google Apps Script also applies a second per-phone limit before writing
 * an order, while strict payload/price/stock validation limits abusive submissions.
 */

import { createHash } from "node:crypto";

const memoryStore = new Map();
const MEMORY_CLEANUP_INTERVAL_MS = 5 * 60_000;
let lastMemoryCleanup = Date.now();

function cleanupMemory(now, maxAge) {
  if (now - lastMemoryCleanup < MEMORY_CLEANUP_INTERVAL_MS) return;
  lastMemoryCleanup = now;
  for (const [key, entry] of memoryStore) {
    if (now - entry.start > maxAge) memoryStore.delete(key);
  }
}

function hashKey(prefix, identifier) {
  const hash = createHash("sha256").update(String(identifier)).digest("hex").slice(0, 16);
  return `${prefix}:${hash}`;
}

/**
 * @param {{ windowMs: number, max: number, prefix: string }} opts
 * @returns {{ check: (identifier: string) => Promise<boolean> }}
 */
export function createRateLimiter({ windowMs, max, prefix }) {
  return {
    async check(identifier) {
      if (!identifier) return false;
      const now = Date.now();
      cleanupMemory(now, Math.max(windowMs, 5 * 60_000));
      const key = hashKey(prefix, identifier);
      const entry = memoryStore.get(key);

      if (!entry || now - entry.start >= windowMs) {
        memoryStore.set(key, { start: now, count: 1 });
        return true;
      }

      entry.count += 1;
      return entry.count <= max;
    },
  };
}
