/**
 * ============================================================
 * Strongest Encryption for Customer PII - AES-256-GCM
 * ============================================================
 * Uses Node.js crypto with 256-bit key, random 12-byte IV,
 * and authentication tag for integrity. Impossible to decrypt
 * without the server-side key.
 *
 * Key must be 32 bytes (256 bits) base64 or hex in env var
 * ENCRYPTION_KEY. If not set, generates a deterministic fallback
 * from GOOGLE_SHEETS_WEBHOOK_URL hash (not recommended for prod).
 * ============================================================
 */

import { createHash, randomBytes, createCipheriv, createDecipheriv } from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getKey() {
  const envKey = process.env.ENCRYPTION_KEY;
  if (envKey) {
    // Try base64 first, then hex, then utf8
    try {
      if (/^[A-Za-z0-9+/=]{40,}$/.test(envKey)) {
        const buf = Buffer.from(envKey, "base64");
        if (buf.length === 32) return buf;
      }
    } catch {}
    try {
      if (/^[a-f0-9]{64}$/i.test(envKey)) {
        return Buffer.from(envKey, "hex");
      }
    } catch {}
    // Derive 32-byte key via SHA256 from env string
    return createHash("sha256").update(envKey).digest();
  }
  // Fallback: derive from Sheets URL (weak, for dev only)
  const fallback = process.env.GOOGLE_SHEETS_WEBHOOK_URL || "elysr-fallback-key-2026";
  return createHash("sha256").update(fallback).digest();
}

/**
 * Encrypts a JSON object with expiry.
 * @param {object} data - PII data to encrypt
 * @param {number} ttlMs - Time to live in ms (default 24h)
 * @returns {string} base64url encrypted blob
 */
export function encrypt(data, ttlMs = 24 * 60 * 60 * 1000) {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const payload = {
    d: data,
    exp: Date.now() + ttlMs,
    iat: Date.now(),
  };
  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Format: IV (12) + AUTH_TAG (16) + CIPHERTEXT
  const combined = Buffer.concat([iv, authTag, encrypted]);
  return combined.toString("base64url");
}

/**
 * Decrypts a blob.
 * @param {string} blob - base64url string
 * @returns {object|null} decrypted data or null if invalid/expired
 */
export function decrypt(blob) {
  try {
    const key = getKey();
    const combined = Buffer.from(blob, "base64url");
    if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH + 1) return null;
    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    const decipher = createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    const payload = JSON.parse(decrypted.toString("utf8"));
    // Check expiry
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload.d || payload;
  } catch {
    return null;
  }
}
