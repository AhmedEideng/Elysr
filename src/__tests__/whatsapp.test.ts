import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";
import { buildOrderMessage, formatOrderDate, WHATSAPP_NUMBER } from "@/lib/whatsapp";

describe("buildOrderMessage phone handling", () => {
  it("keeps the full maximum-length E.164 phone number", () => {
    const phone = "+123456789012345"; // plus sign + 15 digits
    const message = buildOrderMessage(
      [{ id: "m-60", slug: "kreva-gel-for-men", name: "كريفا", qty: 1, price: 300 }],
      { name: "International Customer", phone, governorate: "القاهرة" },
      "EL-PHONE-TEST",
      50,
    );

    expect(message).toContain(`الهاتف: ${phone}`);
    expect(message).not.toContain(`الهاتف: ${phone.slice(0, -1)}\n`);
  });
});

describe("order message date (date only — owner decision)", () => {
  it("formats a fixed date in Egyptian format (Cairo TZ, latin digits, no time)", () => {
    // 2026-09-07T14:45:00Z = الاثنين 7 سبتمبر 2026 بتوقيت القاهرة
    const out = formatOrderDate(new Date("2026-09-07T14:45:00Z"));
    expect(out).toContain("الاثنين"); // يوم الأسبوع بالعربي
    expect(out).toContain("07/09/2026"); // التاريخ بأرقام لاتينية
    expect(out).not.toContain(":"); // مفيش ساعة/دقايق
  });

  it("includes a date line in the order message (right after the order id)", () => {
    const message = buildOrderMessage(
      [{ id: "m-60", slug: "kreva-gel-for-men", name: "كريفا", qty: 1, price: 300 }],
      { name: "عميل", phone: "01000000000", governorate: "القاهرة" },
      "EL-DATE-TEST",
      50,
    );
    const line = message.split("\n").find((l) => l.startsWith("التاريخ: "));
    expect(line).toBeTruthy();
    expect(line).toMatch(/^التاريخ: .{10,}$/);
    const lines = message.split("\n");
    expect(lines[lines.indexOf("رقم الطلب: EL-DATE-TEST") + 1]).toBe(line);
  });
});

describe("promo label in the order message — only when a discount actually applies", () => {
  const customer = { name: "عميل", phone: "01000000000", governorate: "القاهرة" };

  it("hides the label for a small order with no discount", () => {
    const message = buildOrderMessage(
      [{ id: "m-60", slug: "kreva-gel-for-men", name: "كريفا", qty: 1, price: 300 }],
      customer,
      "EL-NO-DISCOUNT",
      50,
    );
    expect(message).not.toContain("💎 مبادرة الرعاية الماسية");
  });

  it("shows the label for an order that earns a tier discount (>= 1000)", () => {
    // 1200 ج.م → شريحة 1000 (10%) → خصم 120
    const message = buildOrderMessage(
      [{ id: "m-60", slug: "kreva-gel-for-men", name: "كريفا", qty: 2, price: 600 }],
      customer,
      "EL-TIER-DISCOUNT",
      0,
      true,
    );
    expect(message).toContain("💎 مبادرة الرعاية الماسية");
    expect(message).toMatch(/خصم 10%: -120 ج\.م/);
  });

  it("shows the label for a bundle-discount order even under the tier threshold", () => {
    const message = buildOrderMessage(
      [
        { id: "m-60", slug: "kreva-gel-for-men", name: "كريفا", qty: 1, price: 300 },
        { id: "m-01", slug: "hammer-of-thor", name: "هامر", qty: 1, price: 300 },
      ],
      customer,
      "EL-BUNDLE-DISCOUNT",
      50,
      false,
      120,
    );
    expect(message).toContain("💎 مبادرة الرعاية الماسية");
    expect(message).toContain("خصم الباقة (20%): -120 ج.م");
    expect(message).not.toContain("خصم 10%");
  });
});

describe("whatsapp number single-source drift guard", () => {
  // الملفات الثابتة (shell/security) لا تستورد من lib/whatsapp — هذا الحارس
  // يضمن أن أي تغيير للرقم في المصدر يُحدِّثها أو يفشل الـ CI بدل الانجراف الصامت.
  it("static files reference only the canonical WhatsApp number", () => {
    const root = process.cwd();
    const files = ["index.html", "public/security.txt", "public/.well-known/security.txt"];
    for (const f of files) {
      const content = readFileSync(resolve(root, f), "utf-8");
      const waNumbers = [...content.matchAll(/wa\.me\/(\d+)/g)].map((m) => m[1]);
      for (const n of waNumbers) {
        expect(n, `${f} يحتوي رقم واتساب مختلف عن المصدر الوحيد`).toBe(WHATSAPP_NUMBER);
      }
      // صيغة telephone في الـ schema داخل index.html: +20 متبوعاً بنفس الرقم
      const tels = [...content.matchAll(/"telephone": "\+?(\d+)"/g)].map((m) => m[1]);
      for (const t of tels) {
        expect(t.replace(/^20/, "").length > 0).toBe(true);
        expect(
          t === WHATSAPP_NUMBER || t === "20" + WHATSAPP_NUMBER,
          `${f} telephone schema خارج المصدر`,
        ).toBe(true);
      }
    }
  });

  it("no component hardcodes a wa.me URL anymore", () => {
    const root = process.cwd();
    for (const f of ["src/components/sections/WhyUs.tsx", "src/routes/medical-review-board.tsx"]) {
      const content = readFileSync(resolve(root, f), "utf-8");
      expect(content, `${f} ما زال يحتوي رابط wa.me حرفي`).not.toMatch(/wa\.me\/\d/);
    }
  });
});
