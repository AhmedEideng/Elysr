import { afterEach, describe, expect, it, vi } from "vitest";
import { getClientIp, isTrustingProxy } from "../../api/lib/request-ip.js";

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

/**
 * 🛡️ حارس انحدار (2026-11-14) — النشر الذاتي خلف reverse proxy
 *
 * العيب الأصلي: على Docker/VPS أمام nginx/Caddy كان `socket.remoteAddress` هو
 * عنوان البروكسي لكل الزوار، فتصبح حدود الطلبات والمراجعات **دلوًا عالميًا
 * واحدًا** (30 طلبًا/دقيقة للموقع كله ثم 429 للجميع).
 */
describe("self-hosted reverse proxy (TRUST_PROXY_HOPS)", () => {
  const makeReq = (xff: string | undefined, socket = "10.0.0.5", ip?: string) =>
    ({
      headers: xff ? { "x-forwarded-for": xff } : {},
      socket: { remoteAddress: socket },
      ...(ip ? { ip } : {}),
    }) as never;

  it("keeps ignoring forwarding headers when the operator did not opt in", () => {
    vi.stubEnv("VERCEL", "0");
    vi.stubEnv("TRUST_PROXY_HOPS", "");
    expect(getClientIp(makeReq("203.0.113.9"))).toBe("10.0.0.5"); // عنوان البروكسي (السلوك الآمن)
    expect(isTrustingProxy()).toBe(false);
  });

  it("uses the address appended by the single trusted proxy", () => {
    vi.stubEnv("VERCEL", "0");
    vi.stubEnv("TRUST_PROXY_HOPS", "1");
    expect(isTrustingProxy()).toBe(true);
    // عميل → nginx: القائمة تحمل عنوان العميل فقط
    expect(getClientIp(makeReq("203.0.113.9"))).toBe("203.0.113.9");
    // عميل يحاول التزوير: قيمته على اليسار، والقيمة التي أضافها nginx على اليمين
    expect(getClientIp(makeReq("1.2.3.4, 203.0.113.9"))).toBe("203.0.113.9");
  });

  it("walks past every trusted hop (CDN + proxy)", () => {
    vi.stubEnv("VERCEL", "0");
    vi.stubEnv("TRUST_PROXY_HOPS", "2");
    expect(getClientIp(makeReq("1.2.3.4, 203.0.113.9, 10.0.0.5"))).toBe("203.0.113.9");
  });

  it("normalises IPv4-mapped IPv6 and bracketed values", () => {
    vi.stubEnv("VERCEL", "0");
    vi.stubEnv("TRUST_PROXY_HOPS", "1");
    expect(getClientIp(makeReq("::ffff:203.0.113.9"))).toBe("203.0.113.9");
    expect(getClientIp(makeReq(undefined, "::ffff:198.51.100.4"))).toBe("198.51.100.4");
  });

  it("falls back to req.ip when the proxy forwards the address without XFF", () => {
    vi.stubEnv("VERCEL", "0");
    vi.stubEnv("TRUST_PROXY_HOPS", "1");
    expect(getClientIp(makeReq(undefined, "10.0.0.5", "203.0.113.9"))).toBe("203.0.113.9");
  });
});
