import { afterEach, describe, expect, it, vi } from "vitest";
import {
  GA_CURRENCY,
  trackAddToCart,
  trackBeginCheckout,
  trackCtaClick,
  trackOutboundClick,
  trackPageView,
  trackPurchase,
  trackRemoveFromCart,
  trackScrollMilestone,
  trackShareClick,
  trackSiteSearch,
  trackViewItem,
  trackWebVital,
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

describe("trackPageView — stable page_title (anti auto-translate)", () => {
  it("prefers the intended route title over a translated document.title", () => {
    w.dataLayer = [];
    // Simulate the browser having auto-translated the page into Russian
    const original = document.title;
    document.title = "Профессиональный цифровой вакуумный насос для мужчин";
    try {
      trackPageView(
        "/products/digital-vacuum-pump",
        "مضخة تفريغ رقمية احترافية للرجال (Digital Vacuum Pump)",
      );
    } finally {
      document.title = original;
    }
    const entry = lastDataLayerEntry() as Record<string, unknown>;
    expect(entry.event).toBe("page_view");
    // The Arabic route title is what GA records — NOT the translated DOM title
    expect(entry.page_title).toBe("مضخة تفريغ رقمية احترافية للرجال (Digital Vacuum Pump)");
    expect(String(entry.page_title)).not.toContain("Профессиональный");
    expect(entry.page_path).toBe("/products/digital-vacuum-pump");
  });

  it("falls back to document.title when no intended title is provided", () => {
    w.dataLayer = [];
    const original = document.title;
    document.title = "Title From DOM";
    try {
      trackPageView("/some-path");
    } finally {
      document.title = original;
    }
    const entry = lastDataLayerEntry() as Record<string, unknown>;
    expect(entry.page_title).toBe("Title From DOM");
  });

  it("ignores blank intended titles and uses the DOM title", () => {
    w.dataLayer = [];
    const original = document.title;
    document.title = "DOM Fallback Title";
    try {
      trackPageView("/some-path", "   ");
    } finally {
      document.title = original;
    }
    const entry = lastDataLayerEntry() as Record<string, unknown>;
    expect(entry.page_title).toBe("DOM Fallback Title");
  });
});

describe("trackPageView — referrer + search + topic (audit 2026-09-18)", () => {
  it("includes page_referrer in every page_view", () => {
    w.dataLayer = [];
    trackPageView("/x", "T", { referrer: "https://google.com/" });
    const e = lastDataLayerEntry() as Record<string, unknown>;
    expect(e.page_referrer).toBe("https://google.com/");
  });

  it("includes page_search when search string is non-empty", () => {
    w.dataLayer = [];
    trackPageView("/search", "T", { search: "عسل ملكي" });
    const e = lastDataLayerEntry() as Record<string, unknown>;
    expect(e.page_search).toBe("عسل ملكي");
  });

  it("omits page_search when search string is empty", () => {
    w.dataLayer = [];
    trackPageView("/x", "T", { search: "" });
    const e = lastDataLayerEntry() as Record<string, unknown>;
    expect(e.page_search).toBeUndefined();
  });

  it("tags the page with its topic when provided", () => {
    w.dataLayer = [];
    trackPageView("/education/erectile-dysfunction", "T", { topic: "ضعف الانتصاب ودعم الأداء" });
    const e = lastDataLayerEntry() as Record<string, unknown>;
    expect(e.page_topic).toBe("ضعف الانتصاب ودعم الأداء");
  });
});

describe("trackScrollMilestone — anti-clash with Enhanced Measurement", () => {
  it("emits scroll_milestone (NOT scroll — that would clash with GA4 built-in)", () => {
    w.dataLayer = [];
    trackScrollMilestone(50, "Page Title");
    const e = lastDataLayerEntry() as Record<string, unknown>;
    expect(e.event).toBe("scroll_milestone");
    expect(e.percent_scrolled).toBe(50);
    expect(e.page_title).toBe("Page Title");
    expect(e.page_path).toBeDefined();
  });

  it("falls back to document.title when pageTitle is missing", () => {
    w.dataLayer = [];
    const original = document.title;
    document.title = "Scroll Test";
    try {
      trackScrollMilestone(90);
    } finally {
      document.title = original;
    }
    const e = lastDataLayerEntry() as Record<string, unknown>;
    expect(e.page_title).toBe("Scroll Test");
  });
});

describe("share_click, outbound_click, search, cta_click, web_vital", () => {
  it("trackShareClick captures kind + path", () => {
    w.dataLayer = [];
    trackShareClick("article", "/education/erectile-dysfunction");
    const e = lastDataLayerEntry() as Record<string, unknown>;
    expect(e.event).toBe("share_click");
    expect(e.share_kind).toBe("article");
    expect(e.share_from).toBe("/education/erectile-dysfunction");
  });

  it("trackOutboundClick captures url + label", () => {
    w.dataLayer = [];
    trackOutboundClick("https://wa.me/201098088206", "whatsapp");
    const e = lastDataLayerEntry() as Record<string, unknown>;
    expect(e.event).toBe("outbound_click");
    expect(e.outbound_url).toBe("https://wa.me/201098088206");
    expect(e.outbound_label).toBe("whatsapp");
  });

  it("trackSiteSearch captures term + count", () => {
    w.dataLayer = [];
    trackSiteSearch("كريم تأخير", 5);
    const e = lastDataLayerEntry() as Record<string, unknown>;
    expect(e.event).toBe("search");
    expect(e.search_term).toBe("كريم تأخير");
    expect(e.results_count).toBe(5);
  });

  it("trackCtaClick captures name + location + extra", () => {
    w.dataLayer = [];
    trackCtaClick("add_to_cart", "/products/m-01", { product_id: "m-01" });
    const e = lastDataLayerEntry() as Record<string, unknown>;
    expect(e.event).toBe("cta_click");
    expect(e.cta_name).toBe("add_to_cart");
    expect(e.cta_location).toBe("/products/m-01");
    expect(e.product_id).toBe("m-01");
  });

  it("trackWebVital captures metric + rating", () => {
    w.dataLayer = [];
    trackWebVital("LCP", 1234.5678, "good");
    const e = lastDataLayerEntry() as Record<string, unknown>;
    expect(e.event).toBe("web_vital");
    expect(e.metric_name).toBe("LCP");
    expect(e.metric_value).toBe(1234.568); // rounded to 3 decimals
    expect(e.metric_rating).toBe("good");
  });
});
