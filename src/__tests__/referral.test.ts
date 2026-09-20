import { beforeEach, describe, expect, it } from "vitest";
import { getReferrerCode, saveReferrerCode } from "@/lib/referral";

describe("referral localStorage validation", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("accepts a valid referral code saved through the public API", () => {
    saveReferrerCode("EL-AB12CD");
    expect(getReferrerCode()).toBe("EL-AB12CD");
  });

  it("fails closed for malformed user-controlled storage data", () => {
    localStorage.setItem(
      "elysr_referral",
      JSON.stringify({ code: "https://evil.example", timestamp: Date.now() }),
    );
    expect(getReferrerCode()).toBeNull();
    expect(localStorage.getItem("elysr_referral")).toBeNull();
  });

  it("fails closed for future timestamps and expired codes", () => {
    localStorage.setItem(
      "elysr_referral",
      JSON.stringify({ code: "EL-AB12CD", timestamp: Date.now() + 60_000 }),
    );
    expect(getReferrerCode()).toBeNull();

    localStorage.setItem(
      "elysr_referral",
      JSON.stringify({ code: "EL-AB12CD", timestamp: Date.now() - 31 * 86_400_000 }),
    );
    expect(getReferrerCode()).toBeNull();
    expect(localStorage.getItem("elysr_referral")).toBeNull();
  });
});
