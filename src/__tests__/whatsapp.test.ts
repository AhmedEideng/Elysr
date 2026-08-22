import { describe, expect, it } from "vitest";
import { buildOrderMessage } from "@/lib/whatsapp";

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
