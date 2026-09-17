/**
 * ============================================================
 * Topic Authority — نموذج الموضوعات (2026-09-17, Phase B)
 * ============================================================
 * 7 مواضيع، كل موضوع ليه Pillar موجود أصلاً (أقوى صفحة في الموضوع)
 * + صفحات داعمة (مقالات/أدلة/منتجات) مربوطة في الاتجاهين:
 *
 *   Pillar ←→ Supporting (مقالات + أدلة + منتجات)
 *   Satellite → "ارجع للدليل الشامل" (روابط واضحة لـ anchor وصفي)
 *
 * الملف ده **خفيف مقصود** (slugs/IDs بس — مفيش استيراد لبيانات
 * المحتوى) لأنه بيدخل في كل الـ bundles. عناوين المقالات/الأدلة
 * بتتجيب من الملفات المولّدة الخفيفة (articles-meta /
 * landing-pages-meta) والمنتجات من products.ts.
 *
 * الإضافة صفحة لموضوع = سطر واحد هنا + data-integrity بتتأكد
 * إن كل slug/ID موجود فعلًا (مفيش drift صامت).
 * ============================================================
 */

export interface Topic {
  id: string;
  /** اسم الموضوع بالعربي (بيظهر في الواجهة) */
  name: string;
  /** وصف قصير للكارت */
  description: string;
  emoji: string;
  /** الـ pillar: نوعه + slug (route/params typed — شغال مع TanStack Router) */
  pillarKind: "article" | "guide";
  pillarSlug: string;
  /** عنوان الـ pillar (anchor وصفي للروابط) */
  pillarTitle: string;
  /** مقالات الموضوع (شامل الـ pillar لو مقال) */
  articleSlugs: string[];
  /** أدلة الموضوع (شامل الـ pillar لو دليل) */
  guideSlugs: string[];
  /** منتجات الموضوع الرئيسية */
  productIds: string[];
}

/** المسار الكامل للـ pillar (مقارنات المسارات + الروابط غير typed) */
export function pillarPath(topic: Topic): string {
  return topic.pillarKind === "article"
    ? `/education/${topic.pillarSlug}`
    : `/products/guides/${topic.pillarSlug}`;
}

export const TOPICS: Topic[] = [
  {
    id: "premature-ejaculation",
    name: "سرعة القذف وتأخير التوقيت",
    description: "الأسباب، طرق التحكم الآمنة، ومقارنة خيارات التأخير",
    emoji: "⏱️",
    pillarKind: "guide" as const,
    pillarSlug: "complete-guide-premature-ejaculation-delay",
    pillarTitle: "دليل تأخير القذف الشامل: الأسباب، الخيارات، والاستخدام الآمن",
    articleSlugs: [
      "premature-ejaculation",
      "physiological-methods-for-stamina-and-timing-without-numbing",
      "delay-sprays-safe-use",
      "kegel-exercises",
      "pelvic-floor-men-advanced",
    ],
    guideSlugs: [
      "complete-guide-premature-ejaculation-delay",
      "best-delay-products-egypt",
      "premature-ejaculation-products",
      "delay-products-safe-use",
      "delay-spray-vs-cream",
      "natural-delay-products",
      "long-lasting-performance-guide",
      "lidocaine-delay-products",
      "dapoxetine-vs-delay-spray",
      "erection-delay-combo-products",
      "men-delay-products",
      "delay-products-side-effects",
      "delay-products-for-sensitive-skin",
      "timing-control-for-men",
      "best-delay-products-beginners",
    ],
    productIds: [
      "m-05",
      "m-06",
      "m-07",
      "m-17",
      "m-28",
      "m-29",
      "m-30",
      "m-35",
      "m-41",
      "m-44",
      "m-50",
      "m-55",
      "m-60",
    ],
  },
  {
    id: "erectile-dysfunction",
    name: "ضعف الانتصاب ودعم الأداء",
    description: "متى طبيعي ومتى مشكلة، الخيارات الآمنة، ومتى تزور الطبيب",
    emoji: "💪",
    pillarKind: "article" as const,
    pillarSlug: "erectile-dysfunction",
    pillarTitle: "ضعف الانتصاب: الأسباب والحلول",
    articleSlugs: [
      "erectile-dysfunction",
      "testosterone-and-age",
      "prostate-health-sexual-function",
      "men-health-checkups",
    ],
    guideSlugs: [
      "erectile-dysfunction-products-egypt",
      "best-erection-support-products",
      "weak-erection-young-men",
      "sildenafil-dapoxetine-combo",
      "daily-vs-on-demand-ed-products",
      "erection-products-side-effects",
      "nitrates-and-ed-products",
      "heart-pressure-warning-erection-products",
      "vacuum-pump-after-prostate-surgery",
    ],
    productIds: [
      "m-01",
      "m-02",
      "m-03",
      "m-04",
      "m-25",
      "m-26",
      "m-27",
      "m-31",
      "m-32",
      "m-33",
      "m-39",
      "m-46",
      "m-48",
      "m-49",
      "m-59",
    ],
  },
  {
    id: "womens-health",
    name: "صحة المرأة الجنسية",
    description: "الرغبة، الراحة، الهرمونات، ومنتجات آمنة محددة الغرض",
    emoji: "🌸",
    pillarKind: "article" as const,
    pillarSlug: "women-orgasm",
    pillarTitle: "صحة المرأة الجنسية: حقائق علمية",
    articleSlugs: [
      "women-orgasm",
      "womens-libido-boosters",
      "vaginal-health-basics",
      "menopause-intimacy-guide",
      "post-partum-recovery",
      "contraception-options",
      "estrogen-progesterone-women-guide",
      "max-filler-breast-guide",
      "omega-3-omega-6-benefits-skin-cell-elasticity",
    ],
    guideSlugs: [
      "women-intimacy-products",
      "women-libido-products-egypt",
      "women-honey-products",
      "spanish-fly-women-guide",
      "lady-era-guide",
      "female-viagra-guide",
      "low-libido-women-causes",
      "vaginal-dryness-comfort-products",
      "postpartum-intimacy-products",
      "menopause-libido-products",
      "women-topical-products-safety",
      "max-filler-guide",
      "breast-filler-products-safety",
      "women-confidence-products",
      "breast-enlargement-cup-guide",
      "women-intimacy-guide-beginners",
    ],
    productIds: [
      "w-01",
      "w-02",
      "w-03",
      "w-04",
      "w-05",
      "w-06",
      "w-07",
      "w-08",
      "w-09",
      "w-10",
      "w-11",
      "w-12",
      "w-13",
      "w-14",
      "w-15",
      "w-16",
      "w-18",
      "w-19",
      "w-20",
      "w-21",
      "w-22",
      "w-23",
    ],
  },
  {
    id: "supplements",
    name: "المكملات والعسل والتغذية",
    description: "ما هو مثبت علميًا، كيف تختار الأصلي، والجرعات الآمنة",
    emoji: "",
    pillarKind: "article" as const,
    pillarSlug: "safe-supplements",
    pillarTitle: "كيف تختار مكمل غذائي آمن؟",
    articleSlugs: [
      "safe-supplements",
      "red-korean-ginseng-energy-endurance-benefits",
      "peruvian-maca-root-benefits-for-vitality-and-energy",
      "peruvian-maca-root-energy-vitality-men-women",
      "ginseng-complete-guide",
      "zinc-sexual-health",
      "omega3-circulation-performance",
      "nutrition-libido",
      "foods-to-avoid",
      "aphrodisiacs-real",
      "natural-honey-dates-benefits",
      "fertility-supplements-guide",
      "best-selling-products-guide",
    ],
    guideSlugs: [
      "ginseng-for-men-guide",
      "maca-root-men-benefits",
      "testosterone-support-supplements",
      "energy-performance-supplements-men",
      "supplements-for-stress-libido",
      "natural-libido-support-men",
      "herbal-aphrodisiacs-men",
      "chocolate-performance-products",
      "royal-honey-products",
      "royal-honey-for-men-egypt",
      "honey-vs-capsules-men",
      "best-energy-honey-for-men",
      "original-vs-fake-honey-products",
      "nutrition-for-marital-health",
    ],
    productIds: [
      "m-09",
      "m-11",
      "m-12",
      "m-13",
      "m-14",
      "m-15",
      "m-16",
      "m-18",
      "m-19",
      "m-20",
      "m-21",
      "m-22",
      "m-24",
      "m-40",
      "m-42",
      "m-52",
      "m-53",
      "m-54",
      "m-56",
      "m-61",
    ],
  },
  {
    id: "devices",
    name: "أجهزة الصحة الزوجية",
    description: "مضخات التفريغ وأجهزة الشد: الاستخدام الآمن والمقارنات",
    emoji: "🔬",
    pillarKind: "guide" as const,
    pillarSlug: "intimacy-devices",
    pillarTitle: "أجهزة الصحة الزوجية والأدوات الطبية المساعدة",
    articleSlugs: ["vacuum-pump-complete-guide", "device-maintenance-hygiene"],
    guideSlugs: [
      "intimacy-devices",
      "vacuum-pump-men-guide",
      "manual-vs-electric-vacuum-pump",
      "vacuum-pump-side-effects",
      "penis-extender-guide",
      "traction-device-safety",
      "medical-devices-for-marital-health",
    ],
    productIds: ["d-01", "d-02", "d-03", "d-04", "d-05", "d-06", "d-07"],
  },
  {
    id: "couples",
    name: "الصحة الزوجية والعلاقات",
    description: "التواصل، الرغبة المشتركة، واختيار يناسب الاتنين",
    emoji: "💞",
    pillarKind: "guide" as const,
    pillarSlug: "best-products-for-married-couples",
    pillarTitle: "أفضل المنتجات للمتزوجين — دليل اختيار شامل",
    articleSlugs: [
      "communication-couples",
      "relationship-routine-revive",
      "pre-marriage-health-guide",
      "hormonal-changes",
      "body-image-confidence",
      "first-night-anxiety-guide",
      "aging-and-intimacy",
      "intimacy-after-fifty",
      "stress-and-libido",
    ],
    guideSlugs: [
      "best-products-for-married-couples",
      "marital-health-products",
      "marital-happiness-products",
      "sexual-health-products",
      "newlyweds-wedding-night-products",
      "age-over-40-marital-products",
      "products-over-40-men",
      "libido-and-communication-couples",
      "stress-low-libido-guide",
      "body-confidence-marital-products",
      "when-products-are-not-enough",
      "marital-products-comparison-guide",
      "topical-comfort-products",
      "buying-guide-marital-products",
    ],
    productIds: ["m-23"],
  },
  {
    id: "basics",
    name: "أساسيات الصحة الجنسية والسلامة",
    description: "الوقاية، التداخلات الدوائية، والعلامات اللي تستدعي طبيبًا",
    emoji: "🩺",
    pillarKind: "article" as const,
    pillarSlug: "sexual-health-basics",
    pillarTitle: "أساسيات الصحة الجنسية: ما يجب أن يعرفه كل شخص",
    articleSlugs: [
      "sexual-health-basics",
      "myths-vs-facts-sexual-health",
      "sleep-and-sex",
      "std-prevention",
      "masturbation-myths",
      "drug-interactions-sexual-products",
      "side-effects-management",
      "chronic-diseases-intimacy",
      "medications-affecting-libido",
      "when-to-see-doctor",
      "buying-first-product-guide",
      "exercise-sexual-performance",
      "sexual-health-during-ramadan",
      // (2026-09-17, Phase C) Linkable assets: صفحات مرجعية قابلة
      // للاستشهاد (محرك الـ backlinks الطبيعية)
      "sexual-health-glossary",
      "product-safety-checklist",
    ],
    guideSlugs: [
      "doctor-consultation-before-products",
      "safe-use-guide-all-products",
      "medication-interactions-marital-products",
      "blood-pressure-and-performance-products",
      "diabetes-and-marital-health-products",
      "alcohol-and-performance-products",
      "sleep-libido-products",
      "performance-anxiety-men",
      "pelvic-floor-exercises-products",
      "topical-vs-oral-products",
      "original-vs-fake-products-guide",
    ],
    productIds: [],
  },
];

// ── فهارس سريعة (build-time، ثابتة) ──
const ARTICLE_TOPIC = new Map<string, Topic>();
const GUIDE_TOPIC = new Map<string, Topic>();
const PRODUCT_TOPIC = new Map<string, Topic>();
for (const t of TOPICS) {
  for (const s of t.articleSlugs) ARTICLE_TOPIC.set(s, t);
  for (const s of t.guideSlugs) GUIDE_TOPIC.set(s, t);
  for (const id of t.productIds) PRODUCT_TOPIC.set(id, t);
}

/** الموضوع الأساسي للمقال (أو undefined لصفحات الخدمة) */
export const topicForArticle = (slug: string): Topic | undefined => ARTICLE_TOPIC.get(slug);
/** الموضوع الأساسي للدليل */
export const topicForGuide = (slug: string): Topic | undefined => GUIDE_TOPIC.get(slug);
/** الموضوع الأساسي للمنتج */
export const topicForProduct = (id: string): Topic | undefined => PRODUCT_TOPIC.get(id);

/** هل المسار ده هو الـ pillar لموضوع؟ */
export const isPillarPath = (path: string): boolean => TOPICS.some((t) => pillarPath(t) === path);

/**
 * مواضيع مرتبطة للصفحة الحالية: موضوعها الأساسي أولًا (لو موجود)،
 * ثم مواضيع تانية ثابتة الترتيب (محددة، مش random).
 * @param limit العدد الأقصى الإجمالي (الافتراضي 4)
 */
export function topicsForPage(ownTopic: Topic | undefined, limit = 4): Topic[] {
  const out: Topic[] = [];
  if (ownTopic) out.push(ownTopic);
  for (const t of TOPICS) {
    if (out.length >= limit) break;
    if (t !== ownTopic) out.push(t);
  }
  return out;
}

/** روابط المحتوى الداعم للموضوع (للـ pillar hub) */
export function topicSatellites(topic: Topic) {
  return {
    articleSlugs: topic.articleSlugs,
    guideSlugs: topic.guideSlugs,
    productIds: topic.productIds,
  };
}
