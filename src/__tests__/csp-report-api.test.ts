import { describe, expect, it, vi } from "vitest";
import handler from "../../api/csp-report.js";

function responseMock() {
  const res = {
    statusCode: 200,
    setHeader: vi.fn(),
    status: vi.fn((code: number) => {
      res.statusCode = code;
      return res;
    }),
    end: vi.fn(() => res),
  };
  return res;
}

function request(body: unknown, contentType = "application/csp-report") {
  return {
    method: "POST",
    headers: {
      "content-type": contentType,
      "x-forwarded-for": `203.0.113.${Math.floor(Math.random() * 100) + 20}`,
    },
    body,
  };
}

const legacyReport = {
  "csp-report": {
    "document-uri": "https://elysrmedical.store/",
    "blocked-uri": "https://blocked.example/script.js",
    "violated-directive": "script-src",
    "script-sample": "alert(1)",
  },
};

describe("CSP report API", () => {
  it("accepts the legacy application/csp-report object", async () => {
    const res = responseMock();
    await handler(request(legacyReport) as never, res as never);
    expect(res.statusCode).toBe(200);
  });

  it("accepts the modern application/reports+json array", async () => {
    const res = responseMock();
    await handler(
      request(
        [
          {
            type: "csp-violation",
            body: {
              "document-uri": "https://elysrmedical.store/",
              "blocked-uri": "https://blocked.example/style.css",
              "violated-directive": "style-src",
            },
          },
        ],
        "application/reports+json",
      ) as never,
      res as never,
    );
    expect(res.statusCode).toBe(200);
  });

  it("parses a raw JSON string body", async () => {
    const res = responseMock();
    await handler(request(JSON.stringify(legacyReport)) as never, res as never);
    expect(res.statusCode).toBe(200);
  });

  it("rejects malformed and oversized reports", async () => {
    const malformedRes = responseMock();
    await handler(request({ invalid: true }) as never, malformedRes as never);
    expect(malformedRes.statusCode).toBe(400);

    const oversizedRes = responseMock();
    const oversized = structuredClone(legacyReport);
    oversized["csp-report"]["script-sample"] = "x".repeat(5000);
    await handler(request(oversized) as never, oversizedRes as never);
    expect(oversizedRes.statusCode).toBe(400);
  });
});
