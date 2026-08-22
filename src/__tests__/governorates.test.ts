/**
 * ============================================================
 * Unit Tests — نظام الشحن والمحافظات
 * ============================================================
 */

import { describe, it, expect, vi } from "vitest";
import {
  getShippingCost,
  getShippingLabel,
  qualifiesForFreeShipping,
  EGYPT_GOVERNORATES,
  GOVERNORATE_SHIPPING,
  submitToGoogleSheets,
} from "@/lib/governorates";

describe("GOVERNORATE_SHIPPING data", () => {
  it("يحتوي على 27 محافظة", () => {
    expect(GOVERNORATE_SHIPPING.length).toBe(27);
  });

  it("كل محافظة لها اسم وشحن ومنطقة", () => {
    for (const gov of GOVERNORATE_SHIPPING) {
      expect(gov.name.length).toBeGreaterThan(0);
      expect(gov.shipping).toBeGreaterThan(0);
      expect(gov.region.length).toBeGreaterThan(0);
    }
  });

  it("لا أسماء مكررة", () => {
    const names = GOVERNORATE_SHIPPING.map((g) => g.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("EGYPT_GOVERNORATES يتطابق مع GOVERNORATE_SHIPPING", () => {
    expect(EGYPT_GOVERNORATES.length).toBe(GOVERNORATE_SHIPPING.length);
  });
});

describe("getShippingCost", () => {
  it("القاهرة = 50 ج.م", () => {
    expect(getShippingCost("القاهرة")).toBe(50);
  });

  it("الجيزة = 50 ج.م", () => {
    expect(getShippingCost("الجيزة")).toBe(50);
  });

  it("الإسكندرية = 70 ج.م", () => {
    expect(getShippingCost("الإسكندرية")).toBe(70);
  });

  it("أسيوط = 100 ج.م", () => {
    expect(getShippingCost("أسيوط")).toBe(100);
  });

  it("شمال سيناء = 120 ج.م", () => {
    expect(getShippingCost("شمال سيناء")).toBe(120);
  });

  it("محافظة غير معروفة → 70 ج.م (default)", () => {
    expect(getShippingCost("كوكب المريخ")).toBe(70);
  });

  it("شحن مجاني فوق 2000 ج.م", () => {
    expect(getShippingCost("القاهرة", 2000)).toBe(0);
    expect(getShippingCost("أسوان", 3000)).toBe(0);
  });

  it("لا شحن مجاني تحت 2000", () => {
    expect(getShippingCost("القاهرة", 1999)).toBe(50);
  });
});

describe("getShippingLabel", () => {
  it("القاهرة → القاهرة والجيزة", () => {
    expect(getShippingLabel("القاهرة")).toBe("القاهرة والجيزة");
  });

  it("الإسكندرية → وجه بحري", () => {
    expect(getShippingLabel("الإسكندرية")).toBe("وجه بحري");
  });

  it("أسيوط → وجه قبلي", () => {
    expect(getShippingLabel("أسيوط")).toBe("وجه قبلي");
  });

  it("شمال سيناء → سيناء", () => {
    expect(getShippingLabel("شمال سيناء")).toBe("سيناء");
  });
});

describe("qualifiesForFreeShipping", () => {
  it("true عند 2000+", () => {
    expect(qualifiesForFreeShipping(2000)).toBe(true);
    expect(qualifiesForFreeShipping(5000)).toBe(true);
  });

  it("false تحت 2000", () => {
    expect(qualifiesForFreeShipping(1999)).toBe(false);
    expect(qualifiesForFreeShipping(0)).toBe(false);
  });
});

describe("order privacy", () => {
  it("never stores a failed order payload in localStorage", async () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network unavailable")));

    const result = await submitToGoogleSheets({
      customerName: "Private Name",
      customerPhone: "01012345678",
      address: "Private Address",
    });

    expect(result.success).toBe(false);
    expect(setItem).not.toHaveBeenCalled();
    setItem.mockRestore();
    consoleError.mockRestore();
    vi.unstubAllGlobals();
  });
});
