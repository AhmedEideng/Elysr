import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { products } from "@/data/products";
import { getProductFAQs } from "@/data/product-faqs";
const byId = (id: string) => products.find((p) => p.id === id)!;
describe("phrase-only catalog corrections", () => {
  it("preserves every non-copy catalog field, including names, prices, badges and bundles", () => {
    expect(products).toHaveLength(91);
    // Owner-approved follow-up: Power 36 and Big Penis are each 250 EGP.
    for (const id of ["m-38", "m-46"]) {
      expect(byId(id).price).toBe(250);
      expect(getProductFAQs(byId(id)).some((faq) => faq.answer.includes("250 جنيه"))).toBe(true);
    }
    const copyFields = new Set(["description", "benefits", "ingredients", "usage"]);
    const fields = products.map((p) =>
      Object.fromEntries(
        Object.entries(p)
          .filter(([k]) => !copyFields.has(k))
          .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
      ),
    );
    // (2026-11-15 · تدقيق المنتجات) البصمة اتغيّرت **مرة واحدة عن قصد**:
    // اسم واحد فقط تغيّر — m-06 «جل TREAND للرجال» → «جل تريند للتأخير للرجال
    // (TREAND Delay Gel)» — لأن عنوان الصفحة كان 16 حرفًا (بلا كلمة مفتاحية
    // في SERP). لا سعر/شارة/تصنيف/bundle تغيّر في هذه الجولة.
    // (Round 8 · 2026-11-15) تغيّر واحد إضافي في **حقل غير نصي**: d-08 كان
    // stock=1 وخارج سياسة «المتوفر دائمًا» → 5000. كل الأسماء/الأسعار/الشارات
    // وbundle كما هي، وهذا مؤكد بالبصمة الثانية أسفل الاختبار.
    // (m-27 · 2026-11-15) تغيير مقصود بطلب المالك: «أكياس إكس ستيل» → «عسل
    // إكس ستيل» (اسم + ألقاب بحث)، فالبصمة اتغيّرت في حقلين غير نصيين فقط.
    // (m-60 كريفا · 2026-11-15) تغيير مقصود إضافي: أُضيفت ألقاب بحث لكريفا
    // (كريڨا/كريڨه/جل كريفا/جل تأخير/Kreva Gel) لتوحيده مع باقي الكتالوج.
    // (m-36 + m-47 · 2026-11-15) استرجاع بطلب المالكة: عاد Vegal Extra وLevitra
    // بأسعارهما التاريخية (200/250) وبأسمائهما وروابطهما كما كانت — إضافة
    // عنصرين للقائمة، بلا أي تغيير في أسعار/أسماء/شارات/bundles الباقين.
    // (m-42 · 2026-11-15) بطلب المالكة: «أكياس ريد بول العشبية» → «عسل ريد بول
    // العشبي» (اسم + ألقاب بحث). السعر 400 والـslug والصور كما هي.
    // (m-42 تحديث ثانٍ · 2026-11-15) أُضيف حجم العبوة المؤكد من المالكة إلى
    // الاسم: «— 12 كيس × 16 جم» + ألقاب بحث للحجم. السعر/الـslug/الصورة ثابتة.
    expect(createHash("sha256").update(JSON.stringify(fields)).digest("hex")).toBe(
      "fe3b2c7f93a6683597ffb396979a02cff3c3d4f83e1f11fac51ba7cfcd21652e",
    );
  });
  it("corrects discrete ingredient and language errors without removing the original descriptions", () => {
    // (2026-11-15 · §24) جولة «العبارات المبهمة» شالت «الصيغة الذهبية المطورة»،
    // والفحص بقى على المضمون: المكونات نفسها باقية في الوصف.
    expect(byId("m-32").description).toContain("حمض الهيالورونيك");
    expect(byId("m-32").description).not.toContain("0 أعراض");
    expect(byId("m-60").description).toContain("هو تركيبة جل كريمي متخصصة ثنائية المفعول");
    // (2026-11-15 · §24) نفس الجولة: الوصف بقى «كريم تجميلي موضعي» بدل «البديل
    // التجميلي» — الفحص على كونه موضعيًا بلا تدخل جراحي.
    expect(byId("w-20").description).toContain("كريم تجميلي موضعي");
    expect(byId("w-20").description).toContain("دون أي تدخل جراحي");
    expect(byId("w-20").description).not.toContain("5-7.5%");
    expect(byId("w-14").description).not.toContain("البابايا");
    for (const id of ["w-06", "w-10", "w-11", "w-13"]) expect(byId(id).usage).toContain("امضغي");
    expect(byId("w-22").description).not.toContain("الـ الـ");
  });
  it("retains contraindications and consent while avoiding a dose for an unspecified strength", () => {
    expect(byId("w-17").usage).not.toContain("نصف قرص");
    expect(byId("w-17").usage).toContain("معرفة تركيز القرص");
    expect(getProductFAQs(byId("w-17"))[1].answer).not.toContain("نصف قرص");
    for (const id of ["m-34", "m-38", "m-64", "w-17"])
      expect(byId(id).usage).toMatch(/النترات|النيترات/);
    for (const id of ["w-25", "w-26"]) expect(byId(id).usage).toMatch(/موافقة/);
    // (2026-11-15 · §25) بطلب المالكة: جُملة «ألم الصدر / انتصاب أكثر من 4 ساعات»
    // اتشالت من كل المنتجات والأسئلة — الحارس انعكس ليمنع رجوعها.
    expect(byId("m-64").usage).not.toContain("4 ساعات");
    expect(byId("w-22").usage).toContain("نصف قرص");
    expect(byId("m-63").usage).toContain("بعد الوجبة الرئيسية");
  });
  it("keeps confirmed copy and removes contradictory usage-count estimates", () => {
    expect(byId("w-26").description).toContain("غيّري الروتين بطريقتك");
    expect(byId("m-01").description).toContain("الحل الشامل الثلاثي الأبعاد");
    expect(byId("w-03").usage).not.toContain("3-5 استخدامات");
    expect(JSON.stringify(getProductFAQs(byId("w-03")))).not.toContain("3-5 استخدامات");
    expect(byId("m-42").usage).not.toContain("1-2 كيس");
    expect(byId("m-42").usage).toContain("كيس واحد");
  });
});
