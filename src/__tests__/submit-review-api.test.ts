import { beforeEach, describe, expect, it, vi } from "vitest";
import handler, {
  GOOGLE_SHEETS_TIMEOUT_MS,
  validateReviewPayload,
} from "../../api/submit-review.js";
import products from "../../api/lib/products-db.json";

const product = products[0];

/** payload مراجعة صالح — كل اختبار يستخدم IP مختلف (rate limiter مشترك داخل العملية) */
function validPayload(ip = "203.0.113.100") {
  return {
    ip,
    body: {
      productId: product.id,
      rating: 5,
      reviewerName: "عميل اختبار",
      reviewerPhone: "01012345678",
      reviewText: "منتج ممتاز والتغليف كان سرياً تماماً، وصلني خلال يومين.",
    },
  };
}

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

function mockRequest({
  ip = "203.0.113.100",
  body,
  method = "POST",
}: {
  ip?: string;
  body?: unknown;
  method?: string;
}) {
  return {
    method,
    headers: {
      origin: "https://elysrmedical.store",
      "x-forwarded-for": ip,
      "content-type": "application/json",
    },
    body,
    socket: { remoteAddress: ip },
  };
}

describe("submit-review payload validation", () => {
  it.each([null, [], "text", 42])("rejects null, arrays and JSON primitives: %p", (payload) => {
    expect(validateReviewPayload(payload as never)).toBe("Invalid payload");
  });

  it("rejects unknown products (not in the official catalog)", () => {
    expect(validateReviewPayload({ productId: "nope-123", rating: 5, reviewText: "نص طويل كفاية للاختبار" })).toBe(
      "Product not found in official catalog",
    );
  });

  it.each([0, 6, 2.5, "5"])(
    "rejects invalid rating: %p",
    (rating) => {
      const { body } = validPayload();
      expect(validateReviewPayload({ ...body, rating: rating as never })).toBe("Invalid rating");
    },
  );

  it("rejects review text that is too short or too long", () => {
    const { body } = validPayload();
    expect(validateReviewPayload({ ...body, reviewText: "قصير" })).toBe("Review too short");
    expect(validateReviewPayload({ ...body, reviewText: "ت".repeat(601) })).toBe("Review too long");
    expect(validateReviewPayload({ ...body, reviewText: 42 })).toBe("Invalid reviewText");
  });

  it("rejects an overlong reviewer name", () => {
    const { body } = validPayload();
    expect(validateReviewPayload({ ...body, reviewerName: "خ".repeat(61) })).toBe("Name too long");
  });

  it("rejects invalid phone numbers but accepts Egyptian local and E.164", () => {
    const { body } = validPayload();
    expect(validateReviewPayload({ ...body, reviewerPhone: "12345" })).toBe("Invalid reviewerPhone");
    expect(validateReviewPayload({ ...body, reviewerPhone: "01012345678" })).toBeUndefined();
    expect(validateReviewPayload({ ...body, reviewerPhone: "+201012345678" })).toBeUndefined();
    // الهاتف والاسم اختياريان
    expect(validateReviewPayload({ ...body, reviewerPhone: undefined, reviewerName: undefined })).toBeUndefined();
  });

  it("accepts a fully valid review", () => {
    const { body } = validPayload();
    expect(validateReviewPayload(body)).toBeUndefined();
  });
});

describe("submit-review handler", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("rejects a disallowed origin with 403", async () => {
    const res = mockResponse();
    const { body } = validPayload();
    await handler(
      {
        ...mockRequest({ body }),
        headers: { ...mockRequest({ body }).headers, origin: "https://evil.example" },
      } as never,
      res as never,
    );
    expect(res.statusCode).toBe(403);
  });

  it("rejects non-POST methods with 405", async () => {
    const res = mockResponse();
    await handler(mockRequest({ method: "GET" }) as never, res as never);
    expect(res.statusCode).toBe(405);
  });

  it("forwards the review with the SERVER-SIDE product name (never the client's)", async () => {
    vi.stubEnv("GOOGLE_SHEETS_WEBHOOK_URL", "https://script.google.com/test");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, status: "قيد المراجعة", internalSecret: "hidden" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { body } = validPayload("203.0.113.101");
    const res = mockResponse();
    await handler(mockRequest({ ip: "203.0.113.101", body }) as never, res as never);

    expect(res.statusCode).toBe(200);
    // الاستجابة الآمنة فقط — بدون حقول داخلية من الشيت
    expect(res.body).toEqual({ success: true, status: "pending" });

    expect(fetchMock).toHaveBeenCalledOnce();
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toBe("https://script.google.com/test");
    const sent = new URLSearchParams(String(fetchMock.mock.calls[0][1].body)).get("data");
    const parsed = JSON.parse(sent!);
    expect(parsed.action).toBe("review");
    expect(parsed.productId).toBe(product.id);
    // الاسم من الـ catalog المعتمد — حتى لو العميل زوّد اسماً مزيفاً
    expect(parsed.productName).toBe(product.name);
    expect(parsed.rating).toBe(5);
    expect(parsed.reviewText).toBe(body.reviewText);
    // IP مخزّن كـ hash فقط
    expect(parsed.clientIp).toMatch(/^[0-9a-f]{16}$/);
    expect(String(fetchMock.mock.calls[0][1].body)).not.toContain("203.0.113.101");
  });

  it("converts a logical Sheets rejection into HTTP 502", async () => {
    vi.stubEnv("GOOGLE_SHEETS_WEBHOOK_URL", "https://script.google.com/test");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: false, error: "Review too short" }),
      }),
    );
    const { body } = validPayload("203.0.113.102");
    const res = mockResponse();
    await handler(mockRequest({ ip: "203.0.113.102", body }) as never, res as never);
    expect(res.statusCode).toBe(502);
    expect(res.body).toEqual({ error: "Review too short" });
  });

  it("aborts a hanging Sheets request after 10 seconds and returns 504", async () => {
    vi.useFakeTimers();
    vi.stubEnv("GOOGLE_SHEETS_WEBHOOK_URL", "https://script.google.com/test");
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: string, options?: RequestInit) =>
          new Promise((_resolve, reject) => {
            options?.signal?.addEventListener("abort", () =>
              reject(new DOMException("Aborted", "AbortError")),
            );
          }),
      ),
    );
    const { body } = validPayload("203.0.113.103");
    const res = mockResponse();
    const pending = handler(mockRequest({ ip: "203.0.113.103", body }) as never, res as never);
    await vi.advanceTimersByTimeAsync(GOOGLE_SHEETS_TIMEOUT_MS);
    await pending;
    expect(res.statusCode).toBe(504);
    vi.useRealTimers();
  });

  it("rate limits to 3 submissions per minute per IP", async () => {
    vi.stubEnv("GOOGLE_SHEETS_WEBHOOK_URL", "https://script.google.com/test");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) }),
    );
    const { body } = validPayload();
    const statuses: number[] = [];
    for (let i = 0; i < 4; i++) {
      const res = mockResponse();
      await handler(mockRequest({ ip: "203.0.113.104", body }) as never, res as never);
      statuses.push(res.statusCode);
    }
    expect(statuses).toEqual([200, 200, 200, 429]);
  });
});
