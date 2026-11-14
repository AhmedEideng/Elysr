import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { canonicalHost, canonicalHostRedirect } from "../../server/canonical-host.js";

/**
 * 🛡️ حارس انحدار (2026-11-14) — www → النطاق الأساسي
 *
 * العيب الأصلي: لا يوجد أي تحويل من `www.elysrmedical.store` إلى النطاق
 * الأساسي (0 من 175 قاعدة), فالموقع يُخدَم كاملًا على النطاقين، والـ canonical
 * وحده يحمل عبء منع التكرار. التحويل 301 هو الإشارة القياسية الأقوى.
 *
 * القاعدة موجودة الآن في مكانين ويجب أن يبقيا متطابقين:
 *   • vercel.json — قاعدة `has: host` (تُختبر هنا).
 *   • server/canonical-host.js — للنشر الذاتي (Express).
 */

const ROOT = resolve(__dirname, "../..");

describe("www → apex redirect (self-hosted helper)", () => {
  it("derives the canonical host from SITE_URL with a production fallback", () => {
    expect(canonicalHost(undefined)).toBe("elysrmedical.store");
    expect(canonicalHost("https://elysrmedical.store")).toBe("elysrmedical.store");
    expect(canonicalHost("https://shop.example.com:8443/")).toBe("shop.example.com:8443");
    expect(canonicalHost("not a url")).toBe("elysrmedical.store");
  });

  it("redirects www to the apex, preserving path and query", () => {
    expect(
      canonicalHostRedirect({
        hostHeader: "www.elysrmedical.store",
        siteUrl: "https://elysrmedical.store",
        protocol: "https",
        originalUrl: "/products/men?page=2",
      }),
    ).toBe("https://elysrmedical.store/products/men?page=2");
  });

  it("does nothing for the apex host", () => {
    expect(
      canonicalHostRedirect({
        hostHeader: "elysrmedical.store",
        siteUrl: "https://elysrmedical.store",
        protocol: "https",
        originalUrl: "/",
      }),
    ).toBeNull();
  });

  it("does not hijack unrelated hosts that merely start with www.", () => {
    expect(
      canonicalHostRedirect({
        hostHeader: "www.somebody-else.com",
        siteUrl: "https://elysrmedical.store",
        protocol: "https",
        originalUrl: "/",
      }),
    ).toBeNull();
  });

  it("honours a custom SITE_URL (staging/self-hosted domain)", () => {
    expect(
      canonicalHostRedirect({
        hostHeader: "www.staging.example.com",
        siteUrl: "https://staging.example.com",
        protocol: "https",
        originalUrl: "/cart",
      }),
    ).toBe("https://staging.example.com/cart");
  });
});

describe("www → apex redirect (vercel.json parity)", () => {
  interface Redirect {
    source: string;
    destination: string;
    permanent?: boolean;
    has?: Array<{ type: string; value: string }>;
  }
  const vercel = JSON.parse(readFileSync(resolve(ROOT, "vercel.json"), "utf-8")) as {
    redirects: Redirect[];
  };

  it("declares a host-scoped permanent redirect to the apex domain", () => {
    const rule = vercel.redirects.find((r) =>
      r.has?.some((h) => h.type === "host" && h.value === "www.elysrmedical.store"),
    );
    expect(rule, "missing www → apex redirect in vercel.json").toBeDefined();
    expect(rule!.destination).toBe("https://elysrmedical.store/$1");
    expect(rule!.permanent).toBe(true);
  });

  it("evaluates the host-scoped rule before path rules", () => {
    // Vercel يقيّم القواعد من الأعلى للأسفل؛ قاعدة www يجب أن تكون أولًا
    // وإلا حُوّل المستخدم إلى مسار على www قبل التقاط المضيف.
    expect(Boolean(vercel.redirects[0].has?.length)).toBe(true);
  });
});
