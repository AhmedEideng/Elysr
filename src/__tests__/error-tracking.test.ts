/**
 * ============================================================
 * Error tracking — breadcrumb PII stripping (2026-09-16, P2 #10/#11)
 * ============================================================
 * Before the fix, breadcrumbs carried the FULL anchor href
 * (target.href) — including query strings. A link like
 * /checkout?phone=01012345678 would land verbatim in error logs.
 * These tests pin the rule: breadcrumbs never contain ?query
 * or #hash, and non-web schemes (tel:/mailto:) collapse to the
 * scheme name because the payload IS the PII.
 * ============================================================
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { toBreadcrumbHref, installErrorTracking, reportError } from "@/lib/error-tracking";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("toBreadcrumbHref — PII-safe URL", () => {
  it("same-origin: keeps only pathname (no query/hash)", () => {
    const here = window.location.origin;
    expect(toBreadcrumbHref(`${here}/products/x?phone=01012345678#reviews`)).toBe("/products/x");
    expect(toBreadcrumbHref(`${here}/search?q=royal+honey&ref=user-9`)).toBe("/search");
  });

  it("cross-origin: keeps protocol+host+path, strips query/hash", () => {
    expect(toBreadcrumbHref("https://bank.example.com/pay?ref=user-9#step2")).toBe(
      "https://bank.example.com/pay",
    );
  });

  it.each([
    ["tel:+201012345678", "tel"],
    ["tel:01012345678", "tel"],
    ["mailto:owner@example.com?subject=order-123", "mailto"],
    ["javascript:void(0)", "javascript"],
  ])("%s → %s (payload is PII — scheme name only)", (url, expected) => {
    expect(toBreadcrumbHref(url)).toBe(expected);
  });

  it("malformed input: never throws, strips from first ?/#", () => {
    expect(toBreadcrumbHref("http://[invalid?phone=01012345678")).toBe("http://[invalid");
    expect(typeof toBreadcrumbHref("")).toBe("string");
  });
});

describe("breadcrumb capture end-to-end — no PII reaches the error sink", () => {
  type BreadcrumbLike = {
    type: string;
    message?: string;
    data?: { href?: string };
  };
  type SinkPayload = { breadcrumbs: BreadcrumbLike[] };

  function captureSink(): { sent: SinkPayload[]; fetchSpy: ReturnType<typeof vi.fn> } {
    const sent: SinkPayload[] = [];
    const fetchSpy = vi.fn(async (_url: string, init?: RequestInit) => {
      sent.push(JSON.parse(String(init?.body)) as SinkPayload);
      return {} as Response;
    });
    vi.stubGlobal("fetch", fetchSpy);
    return { sent, fetchSpy };
  }

  it("click on <a href='...?phone=...'> stores sanitized href only", async () => {
    const { sent, fetchSpy } = captureSink();
    installErrorTracking();

    const anchor = document.createElement("a");
    anchor.href = "/checkout?phone=01012345678&name=Ayman";
    anchor.textContent = "checkout";
    document.body.appendChild(anchor);

    anchor.click();
    reportError(new Error("boom"), { feature: "test" });
    await new Promise((r) => setTimeout(r, 0));

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const click = sent[0].breadcrumbs.find((b) => b.type === "click");
    expect(click).toBeTruthy();
    expect(click!.data?.href).toBe("/checkout");
    // الرقم مطلقًا ما يوصل للـ sink
    expect(JSON.stringify(sent[0])).not.toContain("01012345678");
  });

  it("navigation breadcrumb message strips query from the URL", async () => {
    const { sent } = captureSink();
    installErrorTracking();

    // نفس الاستدعاء اللي الـ router بيعمله (url كـ string بالـ query)
    history.pushState({ test: true }, "", "/search?q=phone:01012345678");
    reportError(new Error("boom-2"), { feature: "test" });
    await new Promise((r) => setTimeout(r, 0));

    const nav = sent[0].breadcrumbs.find((b) => b.type === "navigation");
    expect(nav).toBeTruthy();
    expect(nav!.message).toBe("pushState → /search");
    expect(JSON.stringify(sent[0])).not.toContain("01012345678");
  });
});
