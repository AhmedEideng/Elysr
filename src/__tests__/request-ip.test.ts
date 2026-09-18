import { afterEach, describe, expect, it, vi } from "vitest";
import { getClientIp } from "../../api/lib/request-ip.js";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("API client IP extraction", () => {
  it("ignores spoofable forwarding headers outside the trusted platform", () => {
    vi.stubEnv("VERCEL", "0");
    const req = {
      headers: { "x-vercel-ip": "198.51.100.8", "x-forwarded-for": "198.51.100.9" },
      socket: { remoteAddress: "203.0.113.7" },
    };
    expect(getClientIp(req as never)).toBe("203.0.113.7");
  });

  it("uses Vercel's documented x-real-ip inside Vercel", () => {
    vi.stubEnv("VERCEL", "1");
    const req = {
      headers: { "x-real-ip": "198.51.100.8", "x-forwarded-for": "198.51.100.9" },
      socket: { remoteAddress: "203.0.113.7" },
    };
    expect(getClientIp(req as never)).toBe("198.51.100.8");
  });

  it("falls back to the first x-forwarded-for address on Vercel", () => {
    vi.stubEnv("VERCEL", "1");
    const req = {
      headers: { "x-forwarded-for": "198.51.100.8, 198.51.100.9" },
      socket: { remoteAddress: "203.0.113.7" },
    };
    expect(getClientIp(req as never)).toBe("198.51.100.8");
  });
});
