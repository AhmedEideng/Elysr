import { afterEach, describe, expect, it, vi } from "vitest";
import { createEndpointRateLimiter } from "../../api/lib/endpoint-rate-limiter.js";

describe("createEndpointRateLimiter", () => {
  afterEach(() => vi.useRealTimers());

  it("enforces the configured maximum within a fixed window", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const check = createEndpointRateLimiter({ windowMs: 60_000, max: 2 });

    expect(check("203.0.113.1")).toBe(true);
    expect(check("203.0.113.1")).toBe(true);
    expect(check("203.0.113.1")).toBe(false);
  });

  it("resets the count after the window expires", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const check = createEndpointRateLimiter({ windowMs: 60_000, max: 1 });

    expect(check("203.0.113.2")).toBe(true);
    expect(check("203.0.113.2")).toBe(false);
    vi.advanceTimersByTime(60_001);
    expect(check("203.0.113.2")).toBe(true);
  });

  it("resets at the exact end of the fixed window", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const check = createEndpointRateLimiter({ windowMs: 60_000, max: 1 });

    expect(check("203.0.113.2")).toBe(true);
    vi.advanceTimersByTime(60_000);
    expect(check("203.0.113.2")).toBe(true);
  });

  it("keeps endpoint instances isolated", () => {
    const first = createEndpointRateLimiter({ windowMs: 60_000, max: 1 });
    const second = createEndpointRateLimiter({ windowMs: 60_000, max: 1 });

    expect(first("203.0.113.3")).toBe(true);
    expect(first("203.0.113.3")).toBe(false);
    expect(second("203.0.113.3")).toBe(true);
  });
});
