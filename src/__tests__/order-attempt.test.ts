import { beforeEach, describe, expect, it, vi } from "vitest";
import { webcrypto } from "node:crypto";

const order = {
  customerName: "اختبار",
  customerPhone: "01012345678",
  address: "عنوان",
  items: [{ id: "m-18", qty: 1, price: 180 }],
  total: 250,
};
beforeEach(() => {
  vi.resetModules();
  sessionStorage.clear();
  vi.stubGlobal("crypto", webcrypto);
});
describe("pending checkout identity", () => {
  it("reuses the ID for unchanged retries including concurrent calls", async () => {
    const { getOrderAttempt } = await import("@/lib/order-attempt");
    const ids = await Promise.all([
      getOrderAttempt(order),
      getOrderAttempt(order),
      getOrderAttempt(order),
    ]);
    expect(new Set(ids).size).toBe(1);
  });
  it("survives module reload without storing personal details", async () => {
    const a = await import("@/lib/order-attempt");
    const id = await a.getOrderAttempt(order);
    const stored = sessionStorage.getItem("elysr_pending_orders_v1")!;
    expect(stored).not.toContain(order.customerName);
    expect(stored).not.toContain(order.customerPhone);
    expect(stored).not.toContain(order.address);
    vi.resetModules();
    const b = await import("@/lib/order-attempt");
    expect(await b.getOrderAttempt(order)).toBe(id);
  });
  it("changes identity for a changed order and retires only a confirmed attempt", async () => {
    const { getOrderAttempt, completeOrderAttempt } = await import("@/lib/order-attempt");
    const id = await getOrderAttempt(order);
    const changed = await getOrderAttempt({ ...order, total: 300 });
    expect(changed).not.toBe(id);
    expect(await getOrderAttempt(order)).toBe(id);
    completeOrderAttempt(id);
    expect(await getOrderAttempt(order)).not.toBe(id);
    expect(await getOrderAttempt({ ...order, total: 300 })).toBe(changed);
  });
  it("handles invalid storage and storage failures", async () => {
    sessionStorage.setItem("elysr_pending_orders_v1", "null");
    const { getOrderAttempt } = await import("@/lib/order-attempt");
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("disabled");
    });
    const id = await getOrderAttempt(order);
    expect(await getOrderAttempt(order)).toBe(id);
    spy.mockRestore();
  });
});

it("retains an unresolved ID when switching checkout channel", async () => {
  const { getOrderAttempt } = await import("@/lib/order-attempt");
  const id = await getOrderAttempt({ ...order, paymentMethod: "طلب مباشر" });
  expect(await getOrderAttempt({ ...order, paymentMethod: "واتساب" })).toBe(id);
});

it("does not persist personal data when crypto fails", async () => {
  vi.stubGlobal("crypto", {
    randomUUID: webcrypto.randomUUID.bind(webcrypto),
    subtle: {
      digest: async () => {
        throw new Error("restricted");
      },
    },
  });
  const { getOrderAttempt } = await import("@/lib/order-attempt");
  const id = await getOrderAttempt(order);
  expect(await getOrderAttempt(order)).toBe(id);
  expect(sessionStorage.getItem("elysr_pending_orders_v1")).toBeNull();
});
