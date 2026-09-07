import { describe, expect, it } from "vitest";
import { buildOrderMessage, formatOrderDateTime } from "@/lib/whatsapp";

describe("buildOrderMessage phone handling", () => {
  it("keeps the full maximum-length E.164 phone number", () => {
    const phone = "+123456789012345"; // plus sign + 15 digits
    const message = buildOrderMessage(
      [{ id: "m-60", slug: "kreva-gel", name: "كريفا", qty: 1, price: 300 }],
      { name: "International Customer", phone, governorate: "القاهرة" },
      "EL-PHONE-TEST",
      50,
    );

    expect(message).toContain(`الهاتف: ${phone}`);
    expect(message).not.toContain(`الهاتف: ${phone.slice(0, -1)}\n`);
  });
});

describe("order message date/time", () => {
  it("formats a fixed date in Egyptian format (Cairo TZ, latin digits)", () => {
    // 2026-09-07T14:45:00Z = الاثنين 17:45 بتوقيت القاهرة
    // (مش exact string عشان الـ ICU بيفضل علامات RTL خفية — assertions على الخصائص)
    const out = formatOrderDateTime(new Date("2026-09-07T14:45:00Z"));
    expect(out).toContain("الاثنين"); // يوم الأسبوع بالعربي
    expect(out).toContain("07/09/2026"); // التاريخ بأرقام لاتينية
    expect(out).toContain("5:45"); // الساعة (17:45 → 5:45 م)
    expect(out).toContain("م"); // مساء
  });

  it("includes a date/time line in the order message", () => {
    const message = buildOrderMessage(
      [{ id: "m-60", slug: "kreva-gel", name: "كريفا", qty: 1, price: 300 }],
      { name: "عميل", phone: "01000000000", governorate: "القاهرة" },
      "EL-DATE-TEST",
      50,
    );
    const line = message.split("\n").find((l) => l.startsWith("التاريخ والوقت: "));
    expect(line).toBeTruthy();
    expect(line).toMatch(/^التاريخ والوقت: .{10,}$/);
    // بعد رقم الطلب مباشرة
    const lines = message.split("\n");
    expect(lines[lines.indexOf("رقم الطلب: EL-DATE-TEST") + 1]).toBe(line);
  });
});
