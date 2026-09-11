import { afterEach, describe, expect, it, vi } from "vitest";
import {
  GA_CURRENCY,
  trackAddToCart,
  trackBeginCheckout,
  trackPurchase,
  trackRemoveFromCart,
  trackViewItem,
} from "@/lib/analytics";

type W = typeof window & { gtag?: (...args: unknown[]) => void; dataLayer?: unknown[] };
const w = window as W;

function lastDataLayerEntry() {
  const dl = w.dataLayer;
  return dl && dl.length > 0 ? dl[dl.length - 1] : undefined;
}

afterEach(() => {
  vi.unstubAllGlobals();
  delete w.gtag;
  w.dataLayer = [];
});

describe("analytics event plumbing", () => {
  it("queues events on dataLayer when gtag is not loaded yet", () => {
    w.dataLayer = [];
    trackViewItem({ id: "m-01", name: "Test", price: 100, qty: 1 });
    const entry = lastDataLayerEntry();
    expect(entry).toEqual({
      event: "view_item",
      currency: "EGP",
      items: [{ item_id: "m-01", item_name: "Test", price: 100, quantity: 1, currency: "EGP" }],
    });
  });

  it("calls gtag directly when it is available", () => {
    w.dataLayer = [];
    const gtag = vi.fn();
    w.gtag = gtag;
    trackAddToCart({ id: "m-02", name: "Test 2", price: 50, qty: 3 });
    expect(gtag).toHaveBeenCalledTimes(1);
    const [event, params] = gtag.mock.calls[0];
    expect(event).toBe("add_to_cart");
    expect(params.value).toBe(150);
    expect(params.items[0].quantity).toBe(3);
    // ما يجبش يبقى أي push على dataLayer مع gtag
    expect(w.dataLayer).toHaveLength(0);
  });

  it("purchase carries the order id and financials", () => {
    w.dataLayer = [];
    trackPurchase("EL-TEST123", [{ id: "m-01", name: "A", price: 100, qty: 2 }], 250, 50, 10);
    const entry = lastDataLayerEntry() as Record<string, unknown>;
    expect(entry.event).toBe("purchase");
    expect(entry.transaction_id).toBe("EL-TEST123");
    expect(entry.value).toBe(250);
    expect(entry.shipping).toBe(50);
    expect(entry.discount).toBe(10);
    expect(entry.currency).toBe("EGP");
  });

  it("begin_checkout carries items + value + shipping", () => {
    w.dataLayer = [];
    trackBeginCheckout(
      [
        { id: "m-01", name: "A", price: 100, qty: 1 },
        { id: "w-01", name: "B", price: 80, qty: 2 },
      ],
      300,
      70,
    );
    const entry = lastDataLayerEntry() as Record<string, unknown>;
    expect(entry.event).toBe("begin_checkout");
    expect(entry.value).toBe(300);
    expect(entry.shipping).toBe(70);
    expect(entry.items).toHaveLength(2);
  });

  it("remove_from_cart mirrors add_to_cart shape", () => {
    w.dataLayer = [];
    trackRemoveFromCart({ id: "m-03", name: "C", price: 40, qty: 1 });
    const entry = lastDataLayerEntry() as Record<string, unknown>;
    expect(entry.event).toBe("remove_from_cart");
    expect(entry.value).toBe(40);
  });

  it("never includes PII fields in any event", () => {
    w.dataLayer = [];
    trackPurchase("EL-1", [{ id: "m-01", name: "A", price: 1, qty: 1 }], 1, 0, 0);
    const entry = JSON.stringify(lastDataLayerEntry());
    for (const forbidden of ["customerName", "customerPhone", "address", 'name": "10', "phone"]) {
      expect(entry).not.toContain(forbidden);
    }
  });

  it("rounds non-integer values to whole EGP", () => {
    w.dataLayer = [];
    trackAddToCart({ id: "m-01", name: "A", price: 12.345, qty: 3 });
    const entry = lastDataLayerEntry() as Record<string, unknown>;
    expect(entry.value).toBe(37); // 12.345*3 = 37.035 → 37
  });

  it("currency is EGP everywhere", () => {
    expect(GA_CURRENCY).toBe("EGP");
  });
});
