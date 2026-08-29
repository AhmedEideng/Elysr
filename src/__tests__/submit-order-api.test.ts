import { beforeEach, describe, expect, it, vi } from "vitest";
import handler, {
  getShippingCost,
  GOOGLE_SHEETS_TIMEOUT_MS,
  validateOrderPayload,
} from "../../api/submit-order.js";
import products from "../../api/lib/products-db.json";
import bundlesDb from "../../api/lib/bundles-db.json";

const product = products[0];

function validPayload(qty = 1, governorate = "القاهرة") {
  const subtotalBeforeDiscount = product.price * qty;
  const discount =
    subtotalBeforeDiscount >= 2000
      ? Math.round(subtotalBeforeDiscount * 0.25)
      : subtotalBeforeDiscount >= 1500
        ? Math.round(subtotalBeforeDiscount * 0.2)
        : subtotalBeforeDiscount >= 1000
          ? Math.round(subtotalBeforeDiscount * 0.15)
          : 0;
  const subtotal = subtotalBeforeDiscount - discount;
  const shipping =
    subtotalBeforeDiscount >= 2000 ? 0 : getShippingCost(governorate, subtotalBeforeDiscount)!;

  return {
    orderId: "EL-TEST-0001",
    orderType: "cart",
    paymentMethod: "طلب مباشر",
    customerName: "عميل اختبار",
    customerPhone: "01012345678",
    governorate,
    address: "عنوان اختبار",
    notes: "",
    items: [
      {
        id: product.id,
        name: product.name,
        qty,
        price: product.price,
      },
    ],
    subtotalBeforeDiscount,
    discount,
    // منتج واحد فقط → لا باقة مكتملة
    bundleDiscount: 0,
    subtotal,
    shipping,
    total: subtotal + shipping,
    promoApplied: discount > 0,
  };
}

/** يكوّن طلباً حقيقياً من أول باقة مكتملة صالحة في bundles-db.json (3 أعضاء على الأقل). */
function validBundlePayload(governorate = "القاهرة") {
  const byId = new Map(products.map((p) => [p.id, p]));
  for (const memberIds of Object.values(bundlesDb)) {
    if (memberIds.length < 3) continue;
    if (!memberIds.every((id) => byId.has(id) && (byId.get(id)!.stock ?? 0) > 0)) continue;

    const items = memberIds.map((id) => {
      const p = byId.get(id)!;
      return { id, name: p.name, qty: 1, price: p.price };
    });
    const subtotalBeforeDiscount = items.reduce((s, i) => s + i.price * i.qty, 0);
    // 🔀 الخصمان متبادلا الاستبعاد: باقة مكتملة → خصم الباقة (20%) فقط
    // وخصم الشرائح موقوف لهذا الطلب
    const bundleDiscount = Math.round(subtotalBeforeDiscount * 0.2);
    const discount = 0;
    const subtotal = subtotalBeforeDiscount - discount - bundleDiscount;
    const shipping =
      subtotalBeforeDiscount >= 2000 ? 0 : getShippingCost(governorate, subtotalBeforeDiscount)!;
    return {
      orderId: "EL-TEST-BUNDLE",
      orderType: "cart",
      paymentMethod: "طلب مباشر",
      customerName: "عميل اختبار",
      customerPhone: "01012345678",
      governorate,
      address: "عنوان اختبار",
      notes: "",
      items,
      subtotalBeforeDiscount,
      discount,
      bundleDiscount,
      subtotal,
      shipping,
      total: subtotal + shipping,
      promoApplied: discount > 0,
    };
  }
  throw new Error("No valid 3-member bundle found in bundles-db.json");
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

function mockRequest(overrides: Record<string, unknown> = {}) {
  return {
    method: "POST",
    headers: {
      origin: "https://elysrmedical.store",
      "x-forwarded-for": "203.0.113.10",
      "content-type": "application/json",
    },
    body: validPayload(),
    socket: { remoteAddress: "203.0.113.10" },
    ...overrides,
  };
}

describe("submit-order payload validation", () => {
  it("accepts a valid order and normalizes governorate whitespace", () => {
    const payload = validPayload();
    payload.governorate = "  القاهرة  ";
    expect(validateOrderPayload(payload)).toBeUndefined();
    expect(payload.governorate).toBe("القاهرة");
  });

  it.each([null, [], "text", 42])("rejects null, arrays and JSON primitives: %p", (payload) => {
    expect(validateOrderPayload(payload)).toBe("Invalid payload");
  });

  it("rejects fractional quantities", () => {
    const payload = validPayload();
    payload.items[0].qty = 1.5;
    expect(validateOrderPayload(payload)).toBe("Invalid item quantity");
  });

  it("rejects quantities above official stock", () => {
    const payload = validPayload();
    payload.items[0].qty = product.stock + 1;
    expect(validateOrderPayload(payload)).toContain("Quantity exceeds stock");
  });

  it.each([
    ["orderType", "other", "Invalid orderType"],
    ["paymentMethod", "card", "Invalid paymentMethod"],
    ["address", "", "Invalid address"],
    ["notes", "x".repeat(301), "Invalid notes"],
    ["promoApplied", "yes", "Invalid promoApplied"],
  ])("rejects invalid %s", (field, value, expected) => {
    const payload = validPayload() as Record<string, unknown>;
    payload[field] = value;
    expect(validateOrderPayload(payload)).toBe(expected);
  });

  it("rejects a governorate outside the shared whitelist", () => {
    const payload = validPayload();
    payload.governorate = "محافظة غير موجودة";
    expect(validateOrderPayload(payload)).toBe("Invalid governorate");
  });

  it("rejects unknown products", () => {
    const payload = validPayload();
    payload.items[0].id = "missing-product";
    expect(validateOrderPayload(payload)).toContain("not found in official catalog");
  });

  it("rejects client-side price manipulation", () => {
    const payload = validPayload();
    payload.items[0].price -= 1;
    expect(validateOrderPayload(payload)).toContain("Price mismatch");
  });

  it("accepts canonical E.164 international phone numbers", () => {
    const payload = validPayload();
    payload.customerPhone = "+971501234567";
    expect(validateOrderPayload(payload)).toBeUndefined();
  });

  it("rejects invalid phone numbers", () => {
    const payload = validPayload();
    payload.customerPhone = "123";
    expect(validateOrderPayload(payload)).toBe("Invalid customerPhone");
  });

  it("recalculates and validates subtotal, tier discount, shipping and grand total", () => {
    const payload = validPayload(2); // 1180 EGP => 15% discount
    expect(validateOrderPayload(payload)).toBeUndefined();
    expect(payload.discount).toBe(177);

    for (const field of [
      "subtotalBeforeDiscount",
      "discount",
      "bundleDiscount",
      "subtotal",
      "shipping",
      "total",
    ] as const) {
      const tampered = structuredClone(payload);
      tampered[field] += 1;
      expect(validateOrderPayload(tampered)).toMatch(/mismatch/i);
    }
  });

  describe("bundle discount (20% real bundle, exclusive with tier discount)", () => {
    it("accepts a complete bundle with the server-recalculated 20% discount", () => {
      const payload = validBundlePayload();
      expect(payload.bundleDiscount).toBeGreaterThan(0);
      expect(validateOrderPayload(payload)).toBeUndefined();
      // الخصم = 20% بالضبط من مجموع الوحدات (قبل أي خصم شرائح)
      const unitSum = payload.items.reduce((s, i) => s + i.price, 0);
      expect(payload.bundleDiscount).toBe(Math.round(unitSum * 0.2));
      // قاعدة الاستبعاد: مع باقة مكتملة، خصم الشرائح يجب أن يكون صفراً
      expect(payload.discount).toBe(0);
    });

    it("rejects a tier discount on a complete-bundle order (only one discount applies)", () => {
      const payload = validBundlePayload();
      // العميل يحاول إضافة خصم شرائح فوق خصم الباقة → مرفوض
      payload.discount = Math.round(payload.subtotalBeforeDiscount * 0.15);
      expect(validateOrderPayload(payload)).toBe("Discount mismatch");
    });

    it("rejects an inflated bundle discount", () => {
      const payload = validBundlePayload();
      payload.bundleDiscount += 5;
      expect(validateOrderPayload(payload)).toBe("Bundle discount mismatch");
    });

    it("rejects a missing bundle discount when a bundle is complete", () => {
      const payload = validBundlePayload();
      payload.bundleDiscount = 0; // العميل يحاول إخفاء الخصم المستحق (أو عكسه: انتزاع خصم غير مستحق)
      expect(validateOrderPayload(payload)).toBe("Bundle discount mismatch");
    });

    it("rejects a bundle discount on a single-item order (no bundle possible)", () => {
      const payload = validPayload();
      payload.bundleDiscount = 10; // لا توجد باقة من منتج واحد
      expect(validateOrderPayload(payload)).toBe("Bundle discount mismatch");
    });

    it("rejects a non-numeric bundleDiscount", () => {
      const payload = validPayload();
      (payload as Record<string, unknown>).bundleDiscount = "10";
      expect(validateOrderPayload(payload)).toBe("Invalid bundleDiscount");
    });
  });

  it("uses all configured shipping bands and free shipping threshold", () => {
    expect(getShippingCost("القاهرة", 0)).toBe(50);
    expect(getShippingCost("أسيوط", 0)).toBe(100);
    expect(getShippingCost("أسوان", 0)).toBe(120);
    expect(getShippingCost("القاهرة", 2000)).toBe(0);
    expect(getShippingCost("غير موجودة", 0)).toBe(70);
  });
});

describe("submit-order HTTP handler", () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("rejects unsupported methods", async () => {
    const res = mockResponse();
    await handler(mockRequest({ method: "GET" }) as never, res as never);
    expect(res.statusCode).toBe(405);
  });

  it("rejects forbidden origins", async () => {
    const res = mockResponse();
    const req = mockRequest({
      headers: { origin: "https://attacker.example", "x-forwarded-for": "203.0.113.11" },
    });
    await handler(req as never, res as never);
    expect(res.statusCode).toBe(403);
  });

  it("returns 400 instead of throwing for a null body", async () => {
    const res = mockResponse();
    await handler(mockRequest({ body: null }) as never, res as never);
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: "Invalid payload" });
  });

  it("forwards a validated order and only exposes the safe response fields", async () => {
    vi.stubEnv("GOOGLE_SHEETS_WEBHOOK_URL", "https://script.google.com/test");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, orderId: "EL-SHEET-1", internalSecret: "hidden" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = mockResponse();
    await handler(mockRequest() as never, res as never);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ success: true, orderId: "EL-SHEET-1" });
    expect(fetchMock).toHaveBeenCalledOnce();
    const body = String(fetchMock.mock.calls[0][1].body);
    expect(body).not.toContain("internalSecret");
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

    const res = mockResponse();
    const pending = handler(
      mockRequest({
        headers: {
          origin: "https://elysrmedical.store",
          "x-forwarded-for": "203.0.113.13",
          "content-type": "application/json",
        },
      }) as never,
      res as never,
    );

    await vi.advanceTimersByTimeAsync(GOOGLE_SHEETS_TIMEOUT_MS);
    await pending;
    expect(res.statusCode).toBe(504);
    expect(res.body).toEqual({
      error: "انتهت مهلة الاتصال بقاعدة البيانات السحابية. يرجى المحاولة مجدداً.",
    });
  });

  it("converts an Apps Script logical rejection into HTTP 502", async () => {
    vi.stubEnv("GOOGLE_SHEETS_WEBHOOK_URL", "https://script.google.com/test");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: false, error: "تعذر تسجيل الطلب. يرجى المحاولة مرة أخرى." }),
      }),
    );

    const res = mockResponse();
    await handler(
      mockRequest({
        headers: {
          origin: "https://elysrmedical.store",
          "x-forwarded-for": "203.0.113.14",
          "content-type": "application/json",
        },
      }) as never,
      res as never,
    );
    expect(res.statusCode).toBe(502);
    expect(res.body).toEqual({ error: "تعذر تسجيل الطلب. يرجى المحاولة مرة أخرى." });
  });

  it("returns a controlled 500 when the Sheets webhook fails", async () => {
    vi.stubEnv("GOOGLE_SHEETS_WEBHOOK_URL", "https://script.google.com/test");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 503, text: async () => "temporary failure" }),
    );

    const res = mockResponse();
    await handler(
      mockRequest({
        headers: {
          origin: "https://elysrmedical.store",
          "x-forwarded-for": "203.0.113.12",
          "content-type": "application/json",
        },
      }) as never,
      res as never,
    );
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      error: "تعذر إرسال الطلب إلى قاعدة البيانات السحابية. يرجى المحاولة مجدداً.",
    });
  });
});
