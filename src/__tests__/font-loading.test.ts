import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";

/**
 * (R27) حارس تحميل الخطوط — سبب CLS الحقيقي على صفحات المقالات.
 *
 * القياس على شبكة 4G بطيئة (1.6Mbps + CPU×4) أثبت أن خط Cairo كان يصل
 * بعد الرسم الأول (~4.9s). مع `font-display: swap` كان المتصفح يبدّل الخط
 * بعد الظهور فيُعاد تدفّق النص وينزاح المحتوى تحته: CLS 0.205 (سيئ).
 * مع `optional` لا يوجد تبديل متأخر (0.004). الاختبار ده يمنع الرجوع لـswap
 * بالاكتشاف الخاطئ، ويمنع حذف وجه الخط البديل بمقاييس Cairo.
 */
const indexHtml = readFileSync(resolve(process.cwd(), "index.html"), "utf-8");

describe("تحميل الخطوط وCLS", () => {
  it("لا يستخدم font-display: swap لأي وجه", () => {
    expect(indexHtml).not.toMatch(/font-display:\s*swap/);
  });

  it("كل وجوه Cairo تستخدم font-display: optional", () => {
    const faces = indexHtml.match(/@font-face\s*{[^}]*}/g) ?? [];
    const cairoFaces = faces.filter((f) => f.includes('font-family: "Cairo"'));
    expect(cairoFaces.length).toBe(2);
    for (const face of cairoFaces) expect(face).toMatch(/font-display:\s*optional/);
  });

  it("وجه الخط البديل يحاكي مقاييس Cairo (ascender 1303 / descender 571)", () => {
    expect(indexHtml).toMatch(/font-family:\s*"Cairo Fallback"/);
    expect(indexHtml).toMatch(/ascent-override:\s*130\.3%/);
    expect(indexHtml).toMatch(/descent-override:\s*57\.1%/);
    expect(indexHtml).toMatch(/line-gap-override:\s*0%/);
  });

  it("الخط مُسبَق التحميل (preload) لتقليل احتمال ظهور خط النظام", () => {
    expect(indexHtml).toMatch(/rel="preload"[^>]+href="\/fonts\/cairo\.woff2"/);
  });
});
