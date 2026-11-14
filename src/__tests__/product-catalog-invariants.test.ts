import { describe, expect, it } from "vitest";

import { seoLandingPages } from "@/data/landing-pages";
import { articles } from "@/data/articles";
import { PRODUCT_META_PROFILES } from "@/data/product-meta";
import { products, getCrossSellsForProduct, getProductsByCategory } from "@/data/products";
import { buildRelatedMap } from "@/lib/internal-links";
import { productSchema } from "@/lib/seo";
import { getArticlesForProduct, getProductsForArticle } from "@/lib/internal-links";
import { getBundleProductType } from "@/lib/product-form";
import { makeProductMetaTitle } from "@/lib/seo";

/**
 * 🛡️ حارس انحدار (2026-11-15 · Round 6) — ثوابت كتالوج المنتجات
 *
 * `scripts/product-audit.mjs` يفحص **المخرجات المبنية** (89 صفحة + فيد
 * التجّار) ويحتاج `dist/`، فلا يعمل داخل `vitest run` وحده. هذا الملف يمسك
 * نفس القواعد على **البيانات نفسها** بلا بناء — تكلفة أجزاء من الثانية،
 * وتفشل الاختبارات في نفس الثانية التي تُكتب فيها القيمة الخاطئة بدل أن
 * تنتظر البناء.
 *
 * العيوب التي وُجدت فعليًا في هذه الجولة (ومحروسَة هنا):
 *   • «جل TREAND للرجال» — عنوان 16 حرفًا: منتج حقيقي بلا كلمة مفتاحية في SERP.
 *   • خصم/مخزون/تقييم غير متسق يظهر على الصفحة بلا أي تحذير.
 *   • crossSell يشاور على معرّف غير موجود أو على نفسه → بطاقة ميتة في الصفحة.
 *   • منتج بلا طريقة استخدام (شكل فموي/موضعي) — خطر سلامة لا مجرد SEO.
 */

const CATEGORIES = ["men", "women", "devices"] as const;

describe("هوية المنتجات", () => {
  it("لا تكرار في id / slug / name / nameEn", () => {
    for (const field of ["id", "slug", "name", "nameEn"] as const) {
      const values = products.map((p) => p[field].trim().toLowerCase());
      expect(new Set(values).size, `${field} مكرر`).toBe(values.length);
    }
  });

  it("كل slug بصيغة صالحة ولا يصطدم بمسار قسم", () => {
    const reserved = new Set(["men", "women", "devices", "guides", "all"]);
    for (const product of products) {
      expect(product.slug, product.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(reserved.has(product.slug), `${product.id} يصطدم بمسار قسم`).toBe(false);
      expect([...product.slug].length, product.id).toBeLessThanOrEqual(60);
    }
  });
});

describe("السعر والمخزون والتقييم", () => {
  it("كل سعر عدد صحيح موجب", () => {
    for (const product of products) {
      expect(Number.isInteger(product.price), product.id).toBe(true);
      expect(product.price, product.id).toBeGreaterThan(0);
    }
  });

  it("المخزون غير سالب", () => {
    for (const product of products) {
      expect(Number.isInteger(product.stock), product.id).toBe(true);
      expect(product.stock, product.id).toBeGreaterThanOrEqual(0);
    }
  });

  it("التقييم داخل 1–5 ولا يوجد تقييم بلا عدد مراجعات", () => {
    for (const product of products) {
      if (product.rating === undefined) continue;
      expect(product.rating, product.id).toBeGreaterThanOrEqual(1);
      expect(product.rating, product.id).toBeLessThanOrEqual(5);
      // تقييم بلا مراجعات = aggregateRating بلا مصدر في JSON-LD
      expect(product.reviews, `${product.id} تقييم بلا مراجعات`).toBeGreaterThan(0);
    }
  });
});

describe("المحتوى والسلامة", () => {
  it("كل منتج له وصف و3 فوائد على الأقل وإيموجي بديل", () => {
    for (const product of products) {
      expect([...product.description].length, product.id).toBeGreaterThanOrEqual(80);
      expect(product.benefits.length, product.id).toBeGreaterThanOrEqual(3);
      expect(product.emoji, product.id).toBeTruthy();
    }
  });

  it("الأشكال الفموية والمكانية لها طريقة استخدام، والفموية لها مكونات", () => {
    // (2026-11-15) «drops» هنا قطرات فموية (form=oral) لا قطرات موضعية.
    const ORAL = ["tablet", "capsule", "honey", "sachet", "gum", "coffee", "drops"];
    const TOPICAL = ["gel", "cream", "spray", "wipes"];
    for (const product of products) {
      const type = getBundleProductType(product);
      if (ORAL.includes(type) || TOPICAL.includes(type)) {
        expect(product.usage, `${product.id} بلا طريقة استخدام`).toBeTruthy();
      }
      if (ORAL.includes(type)) {
        expect(product.ingredients, `${product.id} بلا مكونات`).toBeTruthy();
      }
    }
  });

  it("فوائد المنتج بلا تكرار ولا وسوم HTML", () => {
    for (const product of products) {
      expect(new Set(product.benefits).size, product.id).toBe(product.benefits.length);
      for (const benefit of product.benefits) {
        expect(benefit, product.id).not.toMatch(/[{}<>$]/);
      }
    }
  });

  it("شكل المنتج في PRODUCT_META_PROFILES يطابق تصنيفه", () => {
    for (const product of products) {
      const form = PRODUCT_META_PROFILES[product.id]?.form;
      expect(form, product.id).toBeTruthy();
      if (product.category === "devices") expect(form, product.id).toBe("device");
    }
  });
});

describe("عناوين SERP للمنتجات", () => {
  it("كل عنوان منتج ≥ 25 حرفًا ولا يتجاوز 65", () => {
    // العيب المرجعي: «جل TREAND للرجال» = 16 حرفًا → أُعيدت صياغة الاسم.
    const bad = products
      .map((p) => ({ id: p.id, title: makeProductMetaTitle(p.name, 70, p.titleLatin) }))
      .filter((entry) => [...entry.title].length < 25 || [...entry.title].length > 65);
    expect(bad).toEqual([]);
  });
});

describe("العلاقات الداخلية", () => {
  it("crossSell يشاور على منتجات موجودة فقط، بلا تكرار وبلا إشارة للذات", () => {
    const ids = new Set(products.map((p) => p.id));
    for (const product of products) {
      for (const id of product.crossSell ?? []) {
        expect(ids.has(id), `${product.id} → ${id} غير موجود`).toBe(true);
        expect(id, `${product.id} يشاور على نفسه`).not.toBe(product.id);
      }
      const list = product.crossSell ?? [];
      expect(new Set(list).size, `${product.id} تكرار في crossSell`).toBe(list.length);
    }
  });
});

describe("تغطية الأقسام", () => {
  it("كل منتج يظهر في قسم واحد بالضبط وعدد الأقسام = عدد المنتجات", () => {
    const total = CATEGORIES.reduce((sum, c) => sum + getProductsByCategory(c).length, 0);
    expect(total).toBe(products.length);
    for (const product of products) {
      const inCategories = CATEGORIES.filter((c) =>
        getProductsByCategory(c).some((p) => p.id === product.id),
      );
      expect(inCategories.length, product.id).toBe(1);
      expect(inCategories[0], product.id).toBe(product.category);
    }
  });
});

/** مراجع خفيفة تربط الكتالوج ببقية المحتوى — أُضيفت هنا حتى لا تُنسى. */
describe("ربط المنتجات بالمحتوى", () => {
  it("كل معرّف منتج تشير إليه مقالة موجود فعلًا في الكتالوج", () => {
    const ids = new Set(products.map((p) => p.id));
    for (const article of articles) {
      for (const id of getProductsForArticle(article.slug) ?? []) {
        expect(ids.has(id), `${article.slug} → ${id}`).toBe(true);
      }
    }
  });

  it("كل مقالة مرتبطة بمنتج موجودة فعلًا", () => {
    const slugs = new Set(articles.map((a) => a.slug));
    for (const product of products) {
      for (const slug of getArticlesForProduct(product) ?? []) {
        expect(slugs.has(slug), `${product.id} → ${slug}`).toBe(true);
      }
    }
  });

  it("صفحات الأدلة لا تشير إلى منتجات غير موجودة", () => {
    const slugs = new Set(products.map((p) => p.slug));
    // /products/men وأخواتها صفحات أقسام، و/products/guides/... أدلة — ليست منتجات.
    const CATEGORY_PATHS = new Set(["men", "women", "devices"]);
    for (const page of seoLandingPages) {
      for (const link of page.links ?? []) {
        if (!link.href.startsWith("/products/")) continue;
        const rest = link.href.replace("/products/", "").split(/[?#]/)[0];
        if (rest.includes("/") || CATEGORY_PATHS.has(rest)) continue;
        expect(slugs.has(rest), `${page.slug} → ${link.href}`).toBe(true);
      }
    }
  });
});

/**
 * (2026-11-15 · Round 7) شبكة «منتجات قد تعجبك».
 *
 * العيب المرجعي المقيس على dist: الاختيار كان «أول 4 منتجات أبجديًا في القسم»
 * ⇒ 52 من 89 صفحة تعرض نفس الأربعة، 89 صفحة تُنتج 22 قائمة فقط، و55 منتجًا
 * بلا أي رابط داخل. هذه الاختبارات تحرس المحرك على مستوى البيانات (بلا بناء).
 */
describe("شبكة المنتجات ذات الصلة", () => {
  const mapsByCategory = new Map(
    CATEGORIES.map((category) => {
      const list = getProductsByCategory(category);
      const excludeById = new Map(
        list.map((entry) => [entry.id, getCrossSellsForProduct(entry).map((item) => item.id)]),
      );
      return [category, { list, map: buildRelatedMap(list, { limit: 4, excludeById }) }];
    }),
  );

  it("كل منتج يحصل على 4 اقتراحات من قسمه، بلا نفسه وبلا منتجات البيع المتقاطع", () => {
    for (const { list, map } of mapsByCategory.values()) {
      for (const product of list) {
        const related = map.get(product.id) ?? [];
        expect(related.length, `${product.id} اقتراحات ناقصة`).toBe(4);
        const crossSellIds = new Set(getCrossSellsForProduct(product).map((p) => p.id));
        for (const entry of related) {
          expect(entry.id, `${product.id} يقترح نفسه`).not.toBe(product.id);
          expect(entry.category, `${product.id} يقترح من قسم آخر`).toBe(product.category);
          expect(crossSellIds.has(entry.id), `${product.id} يقترح بيعًا متقاطعًا`).toBe(false);
        }
        expect(new Set(related.map((p) => p.id)).size, product.id).toBe(related.length);
      }
    }
  });

  it("كل منتج يدخل في قائمة منتج آخر على الأقل (لا صفحة بلا روابط داخلة)", () => {
    for (const { list, map } of mapsByCategory.values()) {
      const inbound = new Map<string, number>();
      for (const related of map.values()) {
        for (const entry of related) inbound.set(entry.id, (inbound.get(entry.id) ?? 0) + 1);
      }
      const orphans = list.filter((product) => !inbound.get(product.id)).map((p) => p.id);
      expect(orphans).toEqual([]);
    }
  });

  it("القوائم متنوّعة: ≥ 80% من الصفحات لها قائمة مختلفة، ولا قائمة تتكرر أكثر من 4 مرات", () => {
    for (const { list, map } of mapsByCategory.values()) {
      const signatures = [...map.values()].map((related) =>
        related
          .map((entry) => entry.id)
          .sort()
          .join(","),
      );
      const counts = new Map<string, number>();
      for (const signature of signatures) counts.set(signature, (counts.get(signature) ?? 0) + 1);
      expect(counts.size, "قوائم مكرّرة").toBeGreaterThanOrEqual(Math.ceil(list.length * 0.8));
      expect(Math.max(...counts.values()), "تركّز القائمة نفسها").toBeLessThanOrEqual(4);
    }
  });

  it("الاختيار محدَّد (deterministic) — نفس المدخل يعطي نفس المخرج في كل بناء", () => {
    for (const { list, map } of mapsByCategory.values()) {
      const excludeById = new Map(
        list.map((entry) => [entry.id, getCrossSellsForProduct(entry).map((item) => item.id)]),
      );
      const again = buildRelatedMap(list, { limit: 4, excludeById });
      for (const product of list) {
        expect(again.get(product.id)?.map((p) => p.id)).toEqual(
          map.get(product.id)?.map((p) => p.id),
        );
      }
    }
  });

  it("الصلة فعلية: المنتج الجيلي يقترح جلًا أو منتجًا من نفس الشكل", () => {
    const gels = products.filter((product) => getBundleProductType(product) === "gel");
    const map = mapsByCategory.get("men")!.map;
    let sameShape = 0;
    let total = 0;
    for (const gel of gels) {
      for (const entry of map.get(gel.id) ?? []) {
        total++;
        if (getBundleProductType(entry) === "gel") sameShape++;
      }
    }
    // العيب القديم كان 0% (الاقتراحات كانت أبجدية بحتة).
    expect(total).toBeGreaterThan(0);
    expect(sameShape / total, "نسبة اقتراح نفس الشكل").toBeGreaterThanOrEqual(0.4);
  });
});

/**
 * (2026-11-15 · توجيه المالك) «المنتجات متوفرة دائمًا لدى» — لا مسار نفاد.
 */
describe("سياسة التوفّر الدائم", () => {
  it("لا منتج بمخزون صفر (0 تعني خطأ بيانات لا حالة بيع)", () => {
    const zero = products.filter((product) => product.stock === 0).map((product) => product.id);
    expect(zero).toEqual([]);
  });

  it("سكيما المنتج تصرّح InStock لكل منتج", () => {
    for (const product of products) {
      const schema = productSchema(product);
      expect(schema.offers?.availability, product.id).toBe("https://schema.org/InStock");
    }
  });
});

/**
 * (Round 8 · 2026-11-15) سياسة نسخ المنتجات — «بدون إحالة للطبيب/الصيدلي/
 * العبوة/المصنع/المورد». القاعدة دي اتكسرت 58 مرة قبل الجولة (تحذير «استشر
 * الطبيب» متكرر حرفيًا على أغلب الكتالوج) وبتنكسر بصمت: الصفحة تُبنى
 * والاختبارات تعدّي. الحارس هنا يمنع رجوعها مع أي منتج جديد.
 */
describe("سياسة نسخ المنتجات (Round 8)", () => {
  const BANNED =
    /(^|[^\u0621-\u064A])(الطبيب|طبيب|الصيدلي|صيدلي|النشرة|المصنع|المصنّع|المورد|الموزع|الشركة المنتجة|على العبوة|حسب العبوة)/;
  const copyOf = (product: (typeof products)[number]) =>
    [
      ["description", product.description],
      ["ingredients", product.ingredients ?? ""],
      ["usage", product.usage ?? ""],
      ["benefits", (product.benefits ?? []).join(" ")],
    ] as const;

  it("لا إحالة إلى الطبيب أو الصيدلي أو النشرة أو المصنع أو المورد", () => {
    const hits: string[] = [];
    for (const product of products)
      for (const [field, text] of copyOf(product))
        if (BANNED.test(text)) hits.push(`${product.id}.${field}`);
    expect(hits).toEqual([]);
  });

  it("لا سعر مكتوب داخل النسخ (بيبقى قديمًا بعد أي تعديل سعري)", () => {
    const hits = products.flatMap((product) =>
      copyOf(product)
        .filter(([, text]) => /جنيه|EGP/.test(text))
        .map(([field]) => `${product.id}.${field}`),
    );
    expect(hits).toEqual([]);
  });

  it("كل منتج له طريقة استخدام ومكونات/مواصفات غير فارغة", () => {
    for (const product of products) {
      expect((product.usage ?? "").trim(), product.id).not.toBe("");
      expect((product.ingredients ?? "").trim(), product.id).not.toBe("");
    }
  });

  it("لا نسخ مكررة حرفيًا بين منتجين (صفحات شبه مكررة في SERP)", () => {
    const usage = new Map<string, string[]>();
    const ingredients = new Map<string, string[]>();
    for (const product of products) {
      const u = (product.usage ?? "").trim();
      const i = (product.ingredients ?? "").trim();
      if (u) usage.set(u, [...(usage.get(u) ?? []), product.id]);
      if (i) ingredients.set(i, [...(ingredients.get(i) ?? []), product.id]);
    }
    expect([...usage.values()].filter((ids) => ids.length > 1)).toEqual([]);
    expect([...ingredients.values()].filter((ids) => ids.length > 1)).toEqual([]);
  });

  it("طريقة الاستخدام تطابق شكل المنتج", () => {
    const verbs: Record<string, RegExp> = {
      capsule: /كبسول/,
      tablet: /قرص/,
      cream: /كريم/,
      gel: /جل/,
      spray: /بخاخ|يُرش/,
      honey: /عسل|كيس/,
      gum: /علكة|امضغ/,
      drops: /قطرة|قطرات/,
      wipes: /منديل/,
      chocolate: /شوكولاتة|قطعة/,
      coffee: /قهوة|كيس/,
      sachet: /كيس|مغلف/,
      device: /جهاز|مضخة/,
    };
    const misses = products
      .filter((product) => {
        const verb = verbs[getBundleProductType(product)];
        return verb && product.usage && !verb.test(product.usage);
      })
      .map((product) => product.id);
    expect(misses).toEqual([]);
  });
});

/**
 * (Round 9 · 2026-11-15) جودة الوصف: لا ادعاءات غير قابلة للتحقق، ولا جُمل
 * مرهقة. «الأكثر مبيعًا» و«أقوى» و«أسطوري» مش بس بتضعف المصداقية — دي ادعاءات
 * مش عندنا دليل عليها، والوصف الطويل بجملة واحدة بيصعّب القراءة على الموبايل.
 */
describe("جودة أوصاف المنتجات (Round 9)", () => {
  const UNVERIFIABLE = [
    "الأكثر مبيعاً",
    "الأكثر مبيعا",
    "الأسرع مبيعاً",
    "الأكثر شهرة",
    "الأكثر تطوراً",
    "الأكثر قوة",
    "الأكثر اعتماداً",
    "الأرقى",
    "أقوى",
    "أسطوري",
    "الأسطورية",
    "مذهل",
  ];

  it("لا ادعاءات تفوّق أو شهرة غير قابلة للتحقق داخل الوصف", () => {
    const hits = products.flatMap((product) =>
      UNVERIFIABLE.filter((phrase) => product.description.includes(phrase)).map(
        (phrase) => `${product.id}: ${phrase}`,
      ),
    );
    expect(hits).toEqual([]);
  });

  it("لا جملة واحدة أطول من 42 كلمة (قراءة الموبايل)", () => {
    const long = products
      .map((product) => {
        const words = product.description
          .split(/(?<=[.!?])\s+/)
          .map((sentence) => sentence.trim().split(/\s+/).filter(Boolean).length);
        return `${product.id}:${Math.max(...words)}`;
      })
      .filter((entry) => Number(entry.split(":")[1]) >= 42);
    expect(long).toEqual([]);
  });

  it("كل وصف يذكر شكل المنتج داخل أول 120 حرفًا (مطابقة نية البحث)", () => {
    const SHAPE =
      /كبسول|كبسولات|قرص|أقراص|كريم|جل|بخاخ|عسل|معجون|علكة|لبان|قطر|منديل|مناديل|شوكولاتة|قهوة|كيس|أكياس|مغلف|جهاز|مضخة|حقيبة|كروت/;
    const misses = products
      .filter((p) => !SHAPE.test(p.description.slice(0, 120)))
      .map((p) => p.id);
    expect(misses).toEqual([]);
  });
});
