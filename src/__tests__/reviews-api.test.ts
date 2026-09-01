import { beforeEach, describe, expect, it, vi } from "vitest";
import handler, { fetchApprovedReviews } from "../../api/reviews.js";

function mockResponse() {
  const response = {
    statusCode: 200,
    body: undefined as unknown,
    headers: {} as Record<string, string>,
    setHeader: vi.fn((key: string, value: string) => {
      response.headers[key] = value;
    }),
    status: vi.fn((code: number) => {
      response.statusCode = code;
      return response;
    }),
    json: vi.fn((body: unknown) => {
      response.body = body;
      return response;
    }),
    end: vi.fn(() => response),
  };
  return response;
}

function mockGetRequest(product?: string, ip = "203.0.113.120") {
  return {
    method: "GET",
    headers: {
      origin: "https://elysrmedical.store",
      "x-forwarded-for": ip,
    },
    query: product !== undefined ? { product } : {},
    socket: { remoteAddress: ip },
  };
}

const sampleApproved = {
  name: "محمد",
  rating: 5,
  date: "1/8/2026",
  text: "تجربة ممتازة والتغليف سري تماماً وصلني خلال يومين.",
  verified: true,
};

describe("reviews read handler", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("rejects a missing product parameter with 400", async () => {
    const res = mockResponse();
    await handler(mockGetRequest() as never, res as never);
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: "Missing product parameter" });
  });

  it("rejects non-GET methods with 405", async () => {
    const res = mockResponse();
    await handler({ ...mockGetRequest("m-01"), method: "POST" } as never, res as never);
    expect(res.statusCode).toBe(405);
  });

  it("returns an empty list (feature off) when the token/webhook is not configured", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const res = mockResponse();
    // منتج مختلف عن بقية الاختبارات — الكاش في مستوى الوحدة مشتركة بين الاختبارات
    await handler(mockGetRequest("m-feature-off", "203.0.113.121") as never, res as never);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ reviews: [], count: 0 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns normalized approved reviews and drops malformed ones", async () => {
    vi.stubEnv("GOOGLE_SHEETS_WEBHOOK_URL", "https://script.google.com/test");
    vi.stubEnv("GOOGLE_SHEETS_REVIEWS_TOKEN", "test-token");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        reviews: [
          sampleApproved,
          { ...sampleApproved, rating: 9 }, // rating خارج النطاق
          { ...sampleApproved, text: "قصير" }, // نص أقصر من الحد
          "malformed",
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = mockResponse();
    await handler(mockGetRequest("m-01", "203.0.113.122") as never, res as never);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ reviews: [sampleApproved], count: 1 });

    expect(fetchMock).toHaveBeenCalledOnce();
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain("action=reviews");
    expect(url).toContain("product=m-01");
    // توقيع HMAC قصير العمر — السر نفسه لا يظهر في الـ URL
    expect(url).not.toContain("token=");
    expect(url).toContain("ts=");
    expect(url).toContain("nonce=");
    expect(url).toMatch(/sig=[0-9a-f]{64}/);
  });

  it("unknown product id: no Sheets call, no cache pollution, empty list", async () => {
    vi.stubEnv("GOOGLE_SHEETS_WEBHOOK_URL", "https://script.google.com/test");
    vi.stubEnv("GOOGLE_SHEETS_REVIEWS_TOKEN", "test-token");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, reviews: [sampleApproved] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = mockResponse();
    await handler(mockGetRequest("zz-not-a-real-product", "203.0.113.126") as never, res as never);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ reviews: [], count: 0 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fails soft: a webhook error returns 200 with an empty list", async () => {
    vi.stubEnv("GOOGLE_SHEETS_WEBHOOK_URL", "https://script.google.com/test");
    vi.stubEnv("GOOGLE_SHEETS_REVIEWS_TOKEN", "test-token");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    const res = mockResponse();
    await handler(mockGetRequest("m-02", "203.0.113.123") as never, res as never);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ reviews: [], count: 0 });
  });

  it("fails soft: a network error returns 200 with an empty list", async () => {
    vi.stubEnv("GOOGLE_SHEETS_WEBHOOK_URL", "https://script.google.com/test");
    vi.stubEnv("GOOGLE_SHEETS_REVIEWS_TOKEN", "test-token");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const res = mockResponse();
    await handler(mockGetRequest("m-03", "203.0.113.124") as never, res as never);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ reviews: [], count: 0 });
  });

  it("caches within the TTL — the second call does not re-fetch", async () => {
    vi.stubEnv("GOOGLE_SHEETS_WEBHOOK_URL", "https://script.google.com/test");
    vi.stubEnv("GOOGLE_SHEETS_REVIEWS_TOKEN", "test-token");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, reviews: [sampleApproved] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const first = await fetchApprovedReviews("cache-product-1");
    const second = await fetchApprovedReviews("cache-product-1");
    expect(first).toEqual([sampleApproved]);
    expect(second).toEqual([sampleApproved]);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("rate limits repeated reads (10/minute per IP)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ reviews: [] }) });
    vi.stubGlobal("fetch", fetchMock);
    const statuses: number[] = [];
    for (let i = 0; i < 11; i++) {
      const res = mockResponse();
      await handler(mockGetRequest("m-01", "203.0.113.125") as never, res as never);
      statuses.push(res.statusCode);
    }
    expect(statuses).toEqual([200, 200, 200, 200, 200, 200, 200, 200, 200, 200, 429]);
  });
});
