import { describe, expect, it } from "vitest";

import { articles, serpTitleOf } from "@/data/articles";
import { enCategories, enHome } from "@/data/en-pages";
import { seoLandingPages } from "@/data/landing-pages";
import { SERP_TITLE_MAX, fitSerpTitle } from "@/lib/serp-title";

/**
 * 🛡️ حارس انحدار (2026-11-15 · Round 5) — طول عنوان نتائج البحث
 *
 * العيب الأصلي: تسعة عناوين (7 مقالات + دليلان) كانت بين 66 و82 حرفًا.
 * Google يعرض ~60 حرفًا (≈580px) ثم يقتطع بـ «…»، فتضيع الكلمة المفتاحية
 * الأخيرة — وهي غالبًا الجزء الذي يميّز الصفحة. الأعراض لا تظهر في أي
 * اختبار سابق لأنها ليست خطأ برمجيًا: القيمة صحيحة لكنها طويلة.
 *
 * العلاج: `Article.seoTitle` عنوان SERP اختياري مستقل عن H1 (النص المرئي
 * لم يُمس). هذا الملف يمنع عودة الطول من الباب الخلفي: أي مقالة جديدة
 * عنوانها > 62 حرفًا بلا `seoTitle` تُفشل الاختبار قبل الوصول إلى البناء.
 *
 * لماذا لا اقتطاع آلي؟ لأن الاقتطاع يقطع منتصف الكلمة ويُنتج عناوين
 * متشابهة («دليل منتجات النساء الشامل: القطرات والأقراص والعسل…») — القرار
 * تحريري، والاختبار يضمن أن أحدًا لم ينسَه.
 */

// السقف نفسه المستخدم في البناء — لا يُعاد تعريفه هنا حتى لا يتباعد الرقمان.
/** حد أدنى يمنع «عنوان» من كلمتين يفقد المعنى في SERP. */
const SERP_TITLE_MIN = 25;

describe("عناوين SERP للمقالات", () => {
  it("لا مقالة عنوانها المعروض يتجاوز 62 حرفًا", () => {
    const tooLong = articles
      .map((article) => ({ slug: article.slug, title: serpTitleOf(article) }))
      .filter((entry) => [...entry.title].length > SERP_TITLE_MAX);

    expect(tooLong).toEqual([]);
  });

  it("لا مقالة عنوانها المعروض أقصر من الحد الأدنى", () => {
    const tooShort = articles
      .map((article) => ({ slug: article.slug, title: serpTitleOf(article) }))
      .filter((entry) => [...entry.title].length < SERP_TITLE_MIN);

    expect(tooShort).toEqual([]);
  });

  it("كل مقالة يتجاوز عنوانها 62 حرفًا لها seoTitle صريح", () => {
    const missing = articles
      .filter((article) => [...article.title].length > SERP_TITLE_MAX)
      .filter((article) => !article.seoTitle)
      .map((article) => `${article.slug} (${[...article.title].length})`);

    expect(missing).toEqual([]);
  });

  it("العنوان المعروض لا يساوي عنوان H1 المقتطع — seoTitle نص مكتوب", () => {
    for (const article of articles) {
      if (!article.seoTitle) continue;
      expect(article.seoTitle, article.slug).not.toContain("…");
      expect(article.seoTitle.trim(), article.slug).toBe(article.seoTitle);
    }
  });

  it("serpTitleOf يعيد العنوان الكامل حين لا يوجد seoTitle", () => {
    expect(serpTitleOf({ title: "عنوان قصير" })).toBe("عنوان قصير");
    expect(serpTitleOf({ title: "عنوان طويل جدًا", seoTitle: "عنوان قصير" })).toBe("عنوان قصير");
  });
});

describe("عناوين SERP لصفحات الأدلة", () => {
  it("كل metaTitle بعد fitSerpTitle داخل 62 حرفًا", () => {
    // (2026-11-15) 12 صفحة كانت تتجاوز السقف بسبب لاحقة « | اليسر ميديكال»
    // وحدها؛ المحوّل يحذف اللاحقة ويترك النص التحريري كما هو.
    const tooLong = seoLandingPages
      .map((page) => ({ slug: page.slug, title: fitSerpTitle(page.metaTitle ?? page.title) }))
      .filter((entry) => [...entry.title].length > SERP_TITLE_MAX);

    expect(tooLong).toEqual([]);
  });

  it("كل metaDescription غير فارغ وداخل 155 حرفًا بعد الاقتطاع", () => {
    const bad = seoLandingPages
      .filter((page) => !page.metaDescription || page.metaDescription.trim().length === 0)
      .map((page) => page.slug);

    expect(bad).toEqual([]);
  });
});

describe("مركز /en لا يعود صفحة رقيقة", () => {
  const text = [
    enHome.h1,
    enHome.intro,
    ...enHome.steps.map((step) => `${step.title} ${step.text}`),
    ...enHome.assurances,
    ...enHome.faqs.map((faq) => `${faq.question} ${faq.answer}`),
  ].join(" ");

  it("عدد كلمات النص الثابت ≥ 150 (حد تدقيق المحتوى الرقيق)", () => {
    const words = text.split(/\s+/).filter((word) => word.length > 1);
    expect(words.length).toBeGreaterThanOrEqual(150);
  });

  it("يحتوي على أقسام «كيف يتم الطلب» والأسئلة الشائعة", () => {
    expect(enHome.steps.length).toBeGreaterThanOrEqual(3);
    expect(enHome.faqs.length).toBeGreaterThanOrEqual(3);
    expect(enHome.faqTitle.length).toBeGreaterThan(0);
  });

  it("كل صفحة فئة إنجليزية ما زالت تحتوي أسئلتها الشائعة", () => {
    for (const page of enCategories) {
      expect(page.faqs.length, page.path).toBeGreaterThanOrEqual(3);
    }
  });
});
