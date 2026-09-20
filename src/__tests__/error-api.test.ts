import { describe, expect, it, vi } from "vitest";
import handler from "../../api/errors.js";

function responseMock() {
  const res = {
    statusCode: 200,
    setHeader: vi.fn(),
    status: vi.fn((code: number) => {
      res.statusCode = code;
      return res;
    }),
    end: vi.fn(() => res),
    json: vi.fn(() => res),
  };
  return res;
}

describe("error report API origin gate", () => {
  it("rejects an explicitly untrusted Origin", async () => {
    const res = responseMock();
    await handler(
      {
        method: "POST",
        headers: {
          origin: "https://evil.example",
          "x-forwarded-for": "203.0.113.241",
        },
        body: { error: { message: "test" } },
      } as never,
      res as never,
    );
    expect(res.statusCode).toBe(403);
    expect(res.end).toHaveBeenCalled();
  });
});
