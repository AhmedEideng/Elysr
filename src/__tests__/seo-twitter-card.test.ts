import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * 🛡️ حارس انحدار (2026-11-14) — قياس صورة الـ OG
 *
 * العيب الأصلي: `applySeo` كان ينشئ `new Image()` على **الرابط المطلق
 * للإنتاج** (`https://elysrmedical.store/...`) لقياس نسبة الصورة. على أي
 * نطاق غير الـ apex (www / دومين مخصص / Vercel Preview / localhost) يصبح
 * الطلب cross-origin فتحجبه `img-src 'self'`، فيظهر CSP violation في
 * الكونسول على كل صفحة (Lighthouse: errors-in-console = 0،
 * best-practices = 93) بلا أي فائدة.
 *
 * المُثبَّت هنا:
 *   1) القياس يحدث بمسار **نسبي** (same-origin) دائمًا.
 *   2) النسبة تُقاس مرة واحدة لكل صورة في الجلسة (كاش) بدل تنزيلها في كل تنقّل.
 *   3) البطاقة تُختار من النسبة الفعلية (عريضة → large، مربعة → summary).
 *   4) لا قياس ولا خطأ لصور خارجية (تبقى قيمة الـ prerender كما هي).
 */

type ImageInstance = {
  src: string;
  naturalWidth: number;
  naturalHeight: number;
  onload: (() => void) | null;
  onerror?: (() => void) | null;
};

const created: ImageInstance[] = [];
let nextRatio = 1200 / 630;

class FakeImage implements ImageInstance {
  src = "";
  naturalWidth = 0;
  naturalHeight = 0;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor() {
    created.push(this as unknown as ImageInstance);
    // محاكاة تحميل غير متزامن ثم إطلاق onload.
    setTimeout(() => {
      this.naturalWidth = 1200;
      this.naturalHeight = Math.round(1200 / nextRatio);
      this.onload?.();
    }, 0);
  }
}

function twitterCard(): string | null {
  return document.head.querySelector('meta[name="twitter:card"]')?.getAttribute("content") ?? null;
}

describe("applySeo — OG image probe stays same-origin", () => {
  beforeEach(() => {
    created.length = 0;
    nextRatio = 1200 / 630;
    vi.stubGlobal("Image", FakeImage as unknown as typeof globalThis.Image);
    document.head.innerHTML = '<meta name="twitter:card" content="summary">';
    // مسح كاش الوحدة بين الاختبارات (يُعاد استيراد الوحدة عبر resetModules).
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("probes with a site-relative path (never the absolute production URL)", async () => {
    const { applySeo } = await import("@/lib/seo");
    applySeo({ title: "اختبار", image: "/og-default.webp" });

    expect(created).toHaveLength(1);
    const src = created[0].src;
    expect(src).toBe("/og-default.webp");
    expect(src.startsWith("http")).toBe(false);
    expect(src).not.toContain("elysrmedical.store");
  });

  it("sets the card from the measured ratio and caches it for the session", async () => {
    const { applySeo } = await import("@/lib/seo");

    // صورة عريضة (1.9:1) → large
    nextRatio = 1200 / 630;
    applySeo({ title: "أ", image: "/og-default.webp" });
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(twitterCard()).toBe("summary_large_image");
    expect(created).toHaveLength(1);

    // نفس الصورة في تنقّل آخر: لا تنزيل جديد، والنتيجة تُطبَّق فورًا.
    document.head.innerHTML = '<meta name="twitter:card" content="summary">';
    applySeo({ title: "ب", image: "/og-default.webp" });
    expect(created).toHaveLength(1);
    expect(twitterCard()).toBe("summary_large_image");
  });

  it("downgrades to summary for a square image", async () => {
    const { applySeo } = await import("@/lib/seo");
    nextRatio = 1;
    applySeo({ title: "ج", image: "/images/product.webp" });
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(twitterCard()).toBe("summary");
  });

  it("does not probe external images (leaves prerendered card untouched)", async () => {
    const { applySeo } = await import("@/lib/seo");
    applySeo({ title: "د", image: "https://cdn.example.com/x.webp" });
    expect(created).toHaveLength(0);
    expect(twitterCard()).toBe("summary");
  });
});
