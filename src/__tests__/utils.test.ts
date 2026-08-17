/**
 * ============================================================
 * Unit Tests — Utility Functions
 * ============================================================
 */

import { describe, it, expect } from "vitest";
import {
  isValidEgyptianPhone,
  normalizeEgyptianPhone,
  generateOrderId,
  sanitizeInput,
} from "@/lib/utils";

describe("isValidEgyptianPhone", () => {
  // أرقام صحيحة
  it("يقبل أرقام فودافون (010)", () => {
    expect(isValidEgyptianPhone("01012345678")).toBe(true);
  });

  it("يقبل أرقام أورانج (012)", () => {
    expect(isValidEgyptianPhone("01212345678")).toBe(true);
  });

  it("يقبل أرقام اتصالات (011)", () => {
    expect(isValidEgyptianPhone("01112345678")).toBe(true);
  });

  it("يقبل أرقام وي (015)", () => {
    expect(isValidEgyptianPhone("01512345678")).toBe(true);
  });

  it("يقبل أرقام مع مسافات", () => {
    expect(isValidEgyptianPhone("010 1234 5678")).toBe(true);
  });

  it("يقبل أرقام مع شرطات", () => {
    expect(isValidEgyptianPhone("010-1234-5678")).toBe(true);
  });

  // أرقام خاطئة
  it("يرفض أرقام أقل من 11 رقم", () => {
    expect(isValidEgyptianPhone("0101234567")).toBe(false);
  });

  it("يرفض أرقام أكثر من 11 رقم", () => {
    expect(isValidEgyptianPhone("010123456789")).toBe(false);
  });

  it("يرفض أرقام لا تبدأ بـ 01", () => {
    expect(isValidEgyptianPhone("02012345678")).toBe(false);
  });

  it("يرفض أرقام بـ prefix خاطئ (013, 014, 016-019)", () => {
    expect(isValidEgyptianPhone("01312345678")).toBe(false);
    expect(isValidEgyptianPhone("01412345678")).toBe(false);
    expect(isValidEgyptianPhone("01612345678")).toBe(false);
  });

  it("يرفض نص فارغ", () => {
    expect(isValidEgyptianPhone("")).toBe(false);
  });

  it("يرفض نص بدون أرقام", () => {
    expect(isValidEgyptianPhone("hello")).toBe(false);
    expect(isValidEgyptianPhone("")).toBe(false);
    expect(isValidEgyptianPhone("abc")).toBe(false);
  });

  it("يقبل أرقام مع حروف حولها (يتجاهل الحروف)", () => {
    // الدالة تزيل غير الأرقام أولاً — وهذا مقصود لتسهيل الإدخال
    expect(isValidEgyptianPhone("abc01012345678")).toBe(true);
    expect(isValidEgyptianPhone("هاتف: 01012345678")).toBe(true);
  });

  // أرقام دولية
  it("يقبل صيغة دولية بـ +20", () => {
    expect(isValidEgyptianPhone("+201012345678")).toBe(true);
  });

  it("يقبل صيغة دولية بدون +", () => {
    expect(isValidEgyptianPhone("201012345678")).toBe(true);
  });

  it("يقبل صيغة دولية بـ 0020", () => {
    expect(isValidEgyptianPhone("00201012345678")).toBe(true);
  });
});

describe("normalizeEgyptianPhone", () => {
  it("يحوّل الصيغة الدولية للمحلية", () => {
    expect(normalizeEgyptianPhone("+201012345678")).toBe("01012345678");
    expect(normalizeEgyptianPhone("201012345678")).toBe("01012345678");
    expect(normalizeEgyptianPhone("00201012345678")).toBe("01012345678");
  });

  it("يترك الصيغة المحلية كما هي", () => {
    expect(normalizeEgyptianPhone("01012345678")).toBe("01012345678");
  });

  it("يزيل المسافات والشرطات", () => {
    expect(normalizeEgyptianPhone("010-1234-5678")).toBe("01012345678");
  });
});

describe("generateOrderId", () => {
  it("يبدأ بـ #EL-", () => {
    const id = generateOrderId();
    expect(id).toMatch(/^#EL-/);
  });

  it("فريد كل مرة", () => {
    const ids = new Set(Array.from({ length: 50 }, () => generateOrderId()));
    expect(ids.size).toBe(50);
  });

  it("لا يحتوي على رموز خطرة", () => {
    const id = generateOrderId();
    expect(id).not.toMatch(/[<>"'&\\]/);
  });
});

describe("sanitizeInput", () => {
  it("يزيل HTML tags", () => {
    expect(sanitizeInput("<script>alert('xss')</script>")).toBe("scriptalert(xss)/script");
  });

  it("يزيل علامات الاقتباس", () => {
    expect(sanitizeInput('hello "world"')).toBe("hello world");
    expect(sanitizeInput("it's")).toBe("its");
  });

  it("يزيل &", () => {
    expect(sanitizeInput("A & B")).toBe("A  B");
  });

  it("يزيل backslash", () => {
    expect(sanitizeInput("path\\to\\file")).toBe("pathtofile");
  });

  it("يقطع عند الحد الأقصى", () => {
    const long = "a".repeat(500);
    expect(sanitizeInput(long, 100).length).toBeLessThanOrEqual(100);
  });

  it("يزيل المسافات الزائدة", () => {
    expect(sanitizeInput("  hello  ")).toBe("hello");
  });

  it("يقلل الأسطر الفارغة", () => {
    expect(sanitizeInput("a\n\n\n\n\nb")).toBe("a\n\nb");
  });

  it("يزيل javascript: URIs", () => {
    expect(sanitizeInput("javascript:alert(1)")).not.toContain("javascript:");
  });

  it("يزيل data: URIs", () => {
    expect(sanitizeInput("data:text/html,<h1>XSS</h1>")).not.toContain("data:");
  });

  it("يزيل event handlers", () => {
    expect(sanitizeInput("onerror=alert(1)")).not.toContain("onerror=");
    expect(sanitizeInput("onclick=steal()")).not.toContain("onclick=");
  });

  it("يزيل template literals", () => {
    expect(sanitizeInput("`${attack}`")).not.toContain("`");
  });
});
