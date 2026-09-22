import { afterEach, describe, expect, it, vi } from "vitest";
import {
  GA_CURRENCY,
  trackAddToCart,
  trackAddToWishlist,
  trackBeginCheckout,
  trackCtaClick,
  trackOrderFailed,
  trackOrderSuccess,
  trackOutboundClick,
  trackPageView,
  trackPurchase,
  trackReferralApplied,
  trackRemoveFromCart,
  trackRemoveFromWishlist,
  trackScrollMilestone,
  trackSelectItem,
  trackSelectPromotion,
  trackShareClick,
  trackSiteSearch,
  trackWhatsAppClick,
  trackViewCart,
  trackViewItem,
  trackViewItemList,
  trackViewPromotion,
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
    const [command, event, params] = gtag.mock.calls[0];
    expect(command).toBe("event");
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

  it("strips query strings from analytics location and referrer", () => {
    w.dataLayer = [];
    const originalUrl = window.location.href;
    window.history.pushState({}, "", "/search?q=01012345678&utm_source=test");
    try {
      trackPageView("/search", "T", {
        referrer: "https://google.com/search?q=private-value",
      });
    } finally {
      window.history.replaceState({}, "", originalUrl);
    }
    const e = lastDataLayerEntry() as Record<string, unknown>;
    expect(e.page_location).toBe(`${window.location.origin}/search`);
    expect(e.page_referrer).toBe("https://google.com/search");
    expect(JSON.stringify(e)).not.toContain("01012345678");
  });

  it("redacts obvious PII from search analytics while keeping product terms", () => {
    w.dataLayer = [];
    trackSiteSearch("كريم تأخير", 5);
    expect((lastDataLayerEntry() as Record<string, unknown>).search_term).toBe("كريم تأخير");
    w.dataLayer = [];
    trackSiteSearch("01012345678", 0);
    expect((lastDataLayerEntry() as Record<string, unknown>).search_term).toBe("[redacted]");
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

  it("trackOutboundClick captures only the URL path, never WhatsApp order text", () => {
    w.dataLayer = [];
    trackOutboundClick(
      "https://wa.me/201098088206?text=%D8%A7%D9%84%D8%A7%D8%B3%D9%85%3A%20%D8%A3%D8%AD%D9%85%D8%AF%20%D8%A7%D9%84%D9%87%D8%A7%D8%AA%D9%81%3A01012345678",
      "whatsapp",
    );
    const e = lastDataLayerEntry() as Record<string, unknown>;
    expect(e.event).toBe("outbound_click");
    expect(e.outbound_url).toBe("https://wa.me/201098088206");
    expect(JSON.stringify(e)).not.toContain("01012345678");
    expect(e.outbound_label).toBe("whatsapp");

    w.dataLayer = [];
    trackOutboundClick("not a valid url 01012345678", "unknown");
    const invalid = lastDataLayerEntry() as Record<string, unknown>;
    expect(invalid.outbound_url).toBe("");
    expect(JSON.stringify(invalid)).not.toContain("01012345678");
  });

  it("tracks WhatsApp and order outcome events without customer data", () => {
    w.dataLayer = [];
    trackWhatsAppClick(
      "https://wa.me/201098088206?text=%D8%A7%D9%84%D8%A7%D8%B3%D9%85%3A%20%D8%A3%D8%AD%D9%85%D8%AF%20%D8%A7%D9%84%D9%87%D8%A7%D8%AA%D9%81%3A01012345678",
      "cart_checkout",
    );
    const whatsapp = lastDataLayerEntry() as Record<string, unknown>;
    expect(whatsapp.event).toBe("whatsapp_click");
    expect(whatsapp.outbound_url).toBe("https://wa.me/201098088206");
    expect(whatsapp.whatsapp_context).toBe("cart_checkout");
    expect(JSON.stringify(whatsapp)).not.toContain("01012345678");

    w.dataLayer = [];
    trackOrderSuccess("#EL-TEST123", "direct");
    expect(lastDataLayerEntry()).toMatchObject({
      event: "order_success",
      order_id: "#EL-TEST123",
      order_method: "direct",
    });

    w.dataLayer = [];
    trackOrderFailed("#EL-TEST124", "whatsapp");
    expect(lastDataLayerEntry()).toMatchObject({
      event: "order_failed",
      order_id: "#EL-TEST124",
      order_method: "whatsapp",
    });
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

describe("v3 ecommerce — view_item_list, select_item, view_cart, wishlist, promotion, referral", () => {
  it("view_item_list captures list name + items", () => {
    w.dataLayer = [];
    trackViewItemList("men_category", [{ id: "m-01", name: "A", price: 100, qty: 1 }]);
    const e = lastDataLayerEntry() as Record<string, unknown>;
    expect(e.event).toBe("view_item_list");
    expect(e.item_list_name).toBe("men_category");
    expect((e.items as unknown[]).length).toBe(1);
  });

  it("view_item_list skips empty lists (no spam)", () => {
    w.dataLayer = [];
    trackViewItemList("empty", []);
    expect(w.dataLayer).toHaveLength(0);
  });

  it("select_item captures list + item", () => {
    w.dataLayer = [];
    trackSelectItem("search_عسل", { id: "m-01", name: "A", price: 100, qty: 1 });
    const e = lastDataLayerEntry() as Record<string, unknown>;
    expect(e.event).toBe("select_item");
    expect(e.item_list_name).toBe("search_عسل");
  });

  it("view_cart captures value + items", () => {
    w.dataLayer = [];
    trackViewCart([{ id: "m-01", name: "A", price: 100, qty: 2 }], 200);
    const e = lastDataLayerEntry() as Record<string, unknown>;
    expect(e.event).toBe("view_cart");
    expect(e.value).toBe(200);
  });

  it("view_cart skips empty cart", () => {
    w.dataLayer = [];
    trackViewCart([], 0);
    expect(w.dataLayer).toHaveLength(0);
  });

  it("wishlist add/remove", () => {
    w.dataLayer = [];
    trackAddToWishlist({ id: "m-01", name: "A", price: 100, qty: 1 });
    let e = lastDataLayerEntry() as Record<string, unknown>;
    expect(e.event).toBe("add_to_wishlist");
    w.dataLayer = [];
    trackRemoveFromWishlist({ id: "m-01", name: "A", price: 100, qty: 1 });
    e = lastDataLayerEntry() as Record<string, unknown>;
    expect(e.event).toBe("remove_from_wishlist");
  });

  it("view/select promotion", () => {
    w.dataLayer = [];
    trackViewPromotion("referral_program", "referral_page");
    let e = lastDataLayerEntry() as Record<string, unknown>;
    expect(e.event).toBe("view_promotion");
    expect(e.promotion_name).toBe("referral_program");
    w.dataLayer = [];
    trackSelectPromotion("diamond_promo", "diamond_25");
    e = lastDataLayerEntry() as Record<string, unknown>;
    expect(e.event).toBe("select_promotion");
  });

  it("referral_applied captures code + source", () => {
    w.dataLayer = [];
    trackReferralApplied("EL-ABC123", "url_param");
    const e = lastDataLayerEntry() as Record<string, unknown>;
    expect(e.event).toBe("referral_applied");
    expect(e.referral_code).toBe("EL-ABC123");
    expect(e.referral_source).toBe("url_param");
  });
});
