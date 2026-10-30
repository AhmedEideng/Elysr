import { afterEach, describe, expect, it, vi } from "vitest";
import handler, { buildMeasurementPayload } from "../../api/ga-pageview.js";

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

function request(body: unknown, origin?: string) {
  return {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(origin ? { origin } : {}),
    },
    socket: { remoteAddress: `198.51.100.${Math.floor(Math.random() * 200) + 10}` },
    body,
  };
}

const validBody = {
  client_id: "123456789.1700000000",
  session_id: "1700000000",
  page_path: "/products/kreva-gel-for-men?utm_source=secret-phone-01001234567",
  page_title: "جل كريفا",
};

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.GA_API_SECRET;
});

describe("GA4 server fallback payload", () => {
  it("builds a page_view payload and strips the query string (no PII leak)", () => {
    const payload = buildMeasurementPayload(validBody);
    expect(payload?.client_id).toBe("123456789.1700000000");
    const event = payload!.events[0];
    expect(event.name).toBe("page_view");
    expect(event.params.page_location).toBe(
      "https://elysrmedical.store/products/kreva-gel-for-men",
    );
    expect(JSON.stringify(payload)).not.toContain("01001234567");
    expect(event.params.measurement_source).toBe("server_fallback");
  });

  it("rejects malformed client ids and non-internal paths", () => {
    expect(buildMeasurementPayload({ ...validBody, client_id: "abc" })).toBeNull();
    expect(
      buildMeasurementPayload({ ...validBody, page_path: "https://evil.example/x" }),
    ).toBeNull();
    expect(buildMeasurementPayload(null)).toBeNull();
  });
});

describe("GA4 server fallback handler", () => {
  it("is a harmless 204 no-op when GA_API_SECRET is not configured", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const res = responseMock();
    await handler(request(validBody) as never, res as never);
    expect(res.statusCode).toBe(204);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("forwards to Measurement Protocol when the secret is configured", async () => {
    process.env.GA_API_SECRET = "test-secret";
    const fetchSpy = vi.fn(async () => ({ ok: true, status: 204 }));
    vi.stubGlobal("fetch", fetchSpy);
    const res = responseMock();
    await handler(request(validBody) as never, res as never);
    expect(res.statusCode).toBe(204);
    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, init] = fetchSpy.mock.calls[0] as unknown as [string, { body: string }];
    expect(url).toContain("measurement_id=G-V3X7Q3D0RR");
    expect(url).toContain("api_secret=test-secret");
    expect(JSON.parse(init.body).events[0].name).toBe("page_view");
  });

  it("rejects cross-origin callers and invalid payloads", async () => {
    const res = responseMock();
    await handler(request(validBody, "https://evil.example") as never, res as never);
    expect(res.statusCode).toBe(403);

    const res2 = responseMock();
    await handler(request({ client_id: "nope" }) as never, res2 as never);
    expect(res2.statusCode).toBe(400);
  });
});
