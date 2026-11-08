/**
 * ============================================================
 * Internal Linking Engine — Smart Cross-Linking
 * ============================================================
 * Maps products → articles, articles → products, and provides
 * related content suggestions for maximum internal link equity.
 */

import type { Product } from "@/data/product-types";

// ─── Product → Article Mapping ───
// Based on product name/slug keywords → relevant article slugs
const ARTICLE_RULES: { test: RegExp; articles: string[] }[] = [
  {
    test: /(delay|تأخير|spray|بخاخ|procomil|dooz|reman|stallion|emla|lidocaine|60.minutes)/i,
    articles: ["delay-sprays-safe-use", "premature-ejaculation", "side-effects-management"],
  },
  {
    test: /(sildenafil|tadalafil|dapoxetine|viagra|cialis|levitra|vegal|fox|hard.on|cobra|porsche|love.extra)/i,
    articles: ["erectile-dysfunction", "drug-interactions-sexual-products"],
  },
  {
    test: /(honey|عسل|royal|ملكي|vitamax|hilti|golden.horse|black.horse|top.sellers|honeymoon)/i,
    articles: ["royal-honey-benefits", "nutrition-libido"],
  },
  {
    test: /(capsul|كبسول|hammer|boost|ginseng|powerfully|night.hunter|big.penis)/i,
    articles: ["ginseng-complete-guide", "zinc-sexual-health"],
  },
  {
    test: /(gel|جل|cream|كريم|titan|treand|merson|sotara|turbo|manuka|royal.cream|max.man|mr.big|leech)/i,
    articles: ["safe-supplements", "side-effects-management"],
  },
  {
    test: /(chocolate|شوكولا|dmas|ginseng.48|ferrari.choc|checoo)/i,
    articles: ["nutrition-libido", "aphrodisiacs-real"],
  },
  {
    test: /(coffee|قهوة|red.bull|energy|طاقة)/i,
    articles: ["exercise-sexual-performance", "omega3-circulation-performance"],
  },
  {
    test: /(pump|مضخة|ved|vacuum|digital|manual|konsa|sawft)/i,
    articles: ["vacuum-pump-complete-guide", "prostate-health-sexual-function"],
  },
  {
    test: /(extend|إطالة|traction|proextender)/i,
    articles: ["exercise-sexual-performance", "myths-vs-facts-sexual-health"],
  },
  {
    test: /(big.bro|breast|صدر|filler|تكبير)/i,
    articles: ["max-filler-breast-guide", "vaginal-health-basics"],
  },
  {
    test: /(gum|علكة|علك|sexlove|golden.gum|spanish.fly)/i,
    articles: ["womens-libido-boosters", "buying-first-product-guide"],
  },
  {
    test: /(drop|قطر|نقط|lady.era|connubial|black.widow|lipo|beauty.love|lovezone)/i,
    articles: ["womens-libido-boosters", "estrogen-progesterone-women-guide"],
  },
  {
    test: /(overtime|power.36|night.hunter|stallion|black.stallion|majestic)/i,
    articles: ["testosterone-and-age", "myths-vs-facts-sexual-health"],
  },
  {
    test: /(كبسول|capsul|مكمل|supplement|عشبي|herbal|طبيعي|natural)/i,
    articles: ["safe-supplements", "myths-vs-facts-sexual-health"],
  },
  {
    test: /(عسل|honey|شوكولا|chocolate|قهوة|coffee|طاقة|energy)/i,
    articles: ["foods-to-avoid", "sleep-and-sex"],
  },
  {
    test: /(حبوب|tablet|قرص|pill|كبسول|capsul)/i,
    articles: ["when-to-see-doctor", "sexual-health-basics"],
  },
  {
    test: /(نسائي|نساء|women|سيدات|أنثو|مهبل|vaginal)/i,
    articles: ["contraception-options", "post-partum-recovery"],
  },
  {
    test: /(رجال|men|ذكو|رجولة)/i,
    articles: ["aging-and-intimacy", "communication-couples"],
  },
  {
    test: /(جهاز|device|مضخ|pump|شد|extend)/i,
    articles: ["body-image-confidence", "kegel-exercises"],
  },
  {
    test: /(جل|gel|كريم|cream|موضعي|topical)/i,
    articles: ["std-prevention", "masturbation-myths"],
  },
  {
    test: /(قطر|drop|نقط|بخاخ|spray)/i,
    articles: ["hormonal-changes", "women-orgasm"],
  },
  {
    test: /(علكة|gum|شوكولا|chocolate|حلوى)/i,
    articles: ["stress-and-libido", "first-night-anxiety-guide"],
  },
  {
    test: /(تأخير|delay|تحكم|control|توقيت)/i,
    articles: ["relationship-routine-revive", "exercise-sexual-performance"],
  },
  {
    test: /best|أفضل|top|مميز|popular|مبيع|بست/i,
    articles: ["best-selling-products-guide", "buying-first-product-guide", "safe-supplements"],
  },
  {
    test: /(خصوبة|حمل|fertility|pregnant|إنجاب)/i,
    articles: ["fertility-supplements-guide", "pre-marriage-health-guide"],
  },
  {
    test: /(رمضان|صيام|ramadan|fasting)/i,
    articles: ["sexual-health-during-ramadan", "natural-honey-dates-benefits"],
  },
  {
    test: /(فحص|تحليل|checkup|test)/i,
    articles: ["men-health-checkups", "chronic-diseases-intimacy"],
  },
  {
    test: /(تنظيف|عناية|صيانة|hygiene|clean|maintenance)/i,
    articles: ["device-maintenance-hygiene", "vacuum-pump-complete-guide"],
  },
  {
    test: /(زواج|عرس|wedding|مقبل)/i,
    articles: ["pre-marriage-health-guide", "first-night-anxiety-guide"],
  },
  {
    test: /(خمسين|50|خامس)/i,
    articles: ["intimacy-after-fifty", "aging-and-intimacy"],
  },
];

const MEN_ARTICLES = ["testosterone-and-age", "exercise-sexual-performance"];

/**
 * Get relevant article slugs for a product (2 articles)
 */
export function getArticlesForProduct(product: Product): string[] {
  // Keep educational context stable when product copy changes; not an efficacy claim.
  if (product.id === "m-60") return ["premature-ejaculation", "delay-sprays-safe-use"];
  // Category precedes broad words such as energy, capsule, spray or ginseng.
  if (product.category === "women") {
    if (product.id === "w-20") return ["max-filler-breast-guide", "body-image-confidence"];
    if (["w-14", "w-16"].includes(product.id))
      return ["vaginal-health-basics", "women-products-complete-guide"];
    return ["women-products-complete-guide", "womens-libido-boosters"];
  }
  if (product.category === "devices") {
    if (product.id === "d-04") return ["body-image-confidence", "myths-vs-facts-sexual-health"];
    if (product.id === "d-06")
      return ["device-maintenance-hygiene", "myths-vs-facts-sexual-health"];
    return ["vacuum-pump-complete-guide", "device-maintenance-hygiene"];
  }
  const text = `${product.name} ${product.nameEn} ${product.slug}`;
  const matched = new Set<string>();

  for (const rule of ARTICLE_RULES) {
    if (rule.test.test(text)) {
      for (const slug of rule.articles) {
        matched.add(slug);
      }
    }
  }

  // Add category-based fallbacks
  const fallbacks = MEN_ARTICLES;

  for (const slug of fallbacks) {
    matched.add(slug);
  }

  return [...matched].slice(0, 2);
}

// ─── Article → Product Mapping ───
// Explicit topical matches, not medical endorsements. Health-only articles have no sales fallback.
const ARTICLE_PRODUCTS: Record<string, string[]> = {
  "premature-ejaculation": ["m-31", "m-55", "m-30", "m-60"],
  "delay-sprays-safe-use": ["m-55", "m-41", "m-44"],
  "why-delay-product-did-not-work-7-mistakes": ["m-55", "m-30", "m-60"],
  "royal-honey-benefits": ["m-18", "m-11", "m-12", "m-20"],
  "womens-libido-boosters": ["w-25", "w-10", "w-15"],
  "women-products-complete-guide": ["w-25", "w-10", "w-15", "w-05", "w-17"],
  "max-filler-breast-guide": ["w-20"],
  "vacuum-pump-complete-guide": ["d-03", "d-05", "d-07", "d-08", "d-01", "d-02"],
  "device-maintenance-hygiene": ["d-03", "d-05", "d-07", "d-08", "d-06"],
  "ginseng-complete-guide": ["m-04", "m-02"],
  "red-korean-ginseng-energy-endurance-benefits": ["m-04", "m-02"],
  "peruvian-maca-root-benefits-for-vitality-and-energy": ["m-02"],
  "peruvian-maca-root-energy-vitality-men-women": ["m-02"],
  "hammer-of-thor-benefits-and-harms": ["m-01"],
  "hard-on-sildenafil-dapoxetine-guide": ["m-34"],
};

export function getProductsForArticle(articleSlug: string): string[] {
  return [...(ARTICLE_PRODUCTS[articleSlug] ?? [])];
}

/**
 * Get related article slugs for an article (3 articles)
 */
export function getRelatedArticles(
  currentSlug: string,
  currentCategory: string,
  allArticles: { slug: string; category: string }[],
): string[] {
  // Priority: same category first, then related categories
  const RELATED_CATS: Record<string, string[]> = {
    "صحة الرجل": ["صحة الرجال", "تمارين", "هرمونات", "أساسيات", "وقاية"],
    "صحة الرجال": ["صحة الرجل", "تمارين", "أساسيات", "وقاية"],
    "صحة المرأة": ["هرمونات", "نفسية", "أساسيات", "علاقات", "وقاية"],
    تغذية: ["تغذية ومكملات", "أساسيات", "هرمونات", "صحة الرجل"],
    "تغذية ومكملات": ["تغذية", "صحة الرجل", "أساسيات", "هرمونات"],
    أساسيات: ["صحة الرجل", "صحة المرأة", "وقاية", "تغذية", "نفسية"],
    نفسية: ["علاقات", "صحة الرجل", "صحة المرأة", "أساسيات"],
    علاقات: ["نفسية", "صحة المرأة", "أساسيات", "هرمونات"],
    هرمونات: ["صحة الرجل", "صحة المرأة", "عمر", "تغذية ومكملات"],
    تمارين: ["صحة الرجل", "صحة الرجال", "أساسيات", "صحة المرأة"],
    عمر: ["هرمونات", "صحة الرجل", "صحة المرأة", "أساسيات"],
    وقاية: ["أساسيات", "صحة المرأة", "صحة الرجل", "نفسية"],
    أجهزة: ["صحة الرجل", "تمارين", "أساسيات", "وقاية"],
  };

  const relatedCats = RELATED_CATS[currentCategory] ?? [];
  const result: string[] = [];

  // Same category first
  for (const a of allArticles) {
    if (a.slug !== currentSlug && a.category === currentCategory && result.length < 1) {
      result.push(a.slug);
    }
  }

  // Related categories
  for (const cat of relatedCats) {
    for (const a of allArticles) {
      if (a.slug !== currentSlug && a.category === cat && !result.includes(a.slug)) {
        result.push(a.slug);
        if (result.length >= 3) return result;
      }
    }
  }

  // Fill remaining
  for (const a of allArticles) {
    if (a.slug !== currentSlug && !result.includes(a.slug)) {
      result.push(a.slug);
      if (result.length >= 3) return result;
    }
  }

  return result.slice(0, 3);
}

// ─── Landing Page → Article Mapping ───
const LANDING_ARTICLE_RULES: { test: RegExp; articles: string[] }[] = [
  {
    test: /delay|تأخير|spray|cream.*delay|بخاخ/i,
    articles: ["delay-sprays-safe-use", "premature-ejaculation", "side-effects-management"],
  },
  {
    test: /erectile|انتصاب|sildenafil|tadalafil|viagra|cialis|levitra/i,
    articles: [
      "erectile-dysfunction",
      "drug-interactions-sexual-products",
      "prostate-health-sexual-function",
    ],
  },
  {
    test: /honey|عسل|royal/i,
    articles: ["royal-honey-benefits", "nutrition-libido", "zinc-sexual-health"],
  },
  {
    test: /women|نسا|female|libido.*women/i,
    articles: ["womens-libido-boosters", "menopause-intimacy-guide", "vaginal-health-basics"],
  },
  {
    test: /device|جهاز|pump|مضخ|ved/i,
    articles: [
      "vacuum-pump-complete-guide",
      "prostate-health-sexual-function",
      "exercise-sexual-performance",
    ],
  },
  {
    test: /supplement|مكمل|ginseng|maca|testosterone/i,
    articles: ["ginseng-complete-guide", "zinc-sexual-health", "omega3-circulation-performance"],
  },
  {
    test: /safety|سلامة|side.effect|تداخل|medication/i,
    articles: [
      "drug-interactions-sexual-products",
      "side-effects-management",
      "myths-vs-facts-sexual-health",
    ],
  },
  {
    test: /cairo|القاهرة|alexandria|الإسكندرية|delta|صعيد|shipping|شحن|cod|دفع/i,
    articles: ["buying-first-product-guide", "safe-supplements", "myths-vs-facts-sexual-health"],
  },
  {
    test: /anxiety|قلق|stress|توتر|confidence|ثقة/i,
    articles: ["first-night-anxiety-guide", "stress-and-libido", "relationship-routine-revive"],
  },
  {
    test: /nutrition|تغذية|food/i,
    articles: ["nutrition-libido", "zinc-sexual-health", "omega3-circulation-performance"],
  },
  {
    test: /exercise|تمارين|kegel|pelvic/i,
    articles: ["exercise-sexual-performance", "kegel-exercises", "testosterone-and-age"],
  },
  {
    test: /aging|عمر|40|menopause|يأس/i,
    articles: [
      "aging-and-intimacy",
      "menopause-intimacy-guide",
      "estrogen-progesterone-women-guide",
    ],
  },
  {
    test: /postpartum|ولادة|breast|ثدي|filler/i,
    articles: ["post-partum-recovery", "vaginal-health-basics", "menopause-intimacy-guide"],
  },
  {
    test: /natural|طبيعي|herbal|عشب/i,
    articles: ["ginseng-complete-guide", "aphrodisiacs-real", "exercise-sexual-performance"],
  },
  {
    test: /first.time|أول.مرة|مبتدئ|شراء/i,
    articles: ["buying-first-product-guide", "myths-vs-facts-sexual-health", "safe-supplements"],
  },
  {
    test: /couple|زوج|علاق|روتين|communication/i,
    articles: ["relationship-routine-revive", "communication-couples", "first-night-anxiety-guide"],
  },
  {
    test: /health|صح|basics|أساس|safe|أمان/i,
    articles: ["sexual-health-basics", "when-to-see-doctor", "buying-first-product-guide"],
  },
  {
    test: /women.*orgasm|إثارة|رعشة/i,
    articles: ["women-orgasm", "hormonal-changes", "estrogen-progesterone-women-guide"],
  },
  {
    test: /sleep|نوم|rest|راحة/i,
    articles: ["sleep-and-sex", "stress-and-libido", "exercise-sexual-performance"],
  },
  {
    test: /std|عدوى|وقاية|prevention/i,
    articles: ["std-prevention", "contraception-options", "when-to-see-doctor"],
  },
  {
    test: /body|جسم|image|صورة|ثقة/i,
    articles: ["body-image-confidence", "masturbation-myths", "first-night-anxiety-guide"],
  },
  {
    test: /food|طعام|avoid|تجنب/i,
    articles: ["foods-to-avoid", "nutrition-libido", "zinc-sexual-health"],
  },
  {
    test: /filler|max.*filler|تكبير.*ثدي/i,
    articles: ["max-filler-breast-guide", "body-image-confidence", "vaginal-health-basics"],
  },
  {
    test: /top|best|مميز|trending|أكثر|الأكثر/i,
    articles: ["best-selling-products-guide", "buying-first-product-guide", "safe-supplements"],
  },
  {
    test: /fertility|خصوبة|حمل/i,
    articles: ["fertility-supplements-guide", "pre-marriage-health-guide", "zinc-sexual-health"],
  },
  {
    test: /ramadan|رمضان|صيام/i,
    articles: ["sexual-health-during-ramadan", "natural-honey-dates-benefits", "nutrition-libido"],
  },
  {
    test: /marriage|زواج|عروس/i,
    articles: ["pre-marriage-health-guide", "first-night-anxiety-guide", "communication-couples"],
  },
  {
    test: /50|خمسين|elderly|كبار/i,
    articles: ["intimacy-after-fifty", "aging-and-intimacy", "men-health-checkups"],
  },
  {
    test: /clean|تنظيف|maintenance|صيانة/i,
    articles: [
      "device-maintenance-hygiene",
      "vacuum-pump-complete-guide",
      "side-effects-management",
    ],
  },
];

/**
 * Get relevant article slugs for a landing page (3 articles)
 */
export function getArticlesForLandingPage(slug: string, title: string): string[] {
  const text = `${slug} ${title}`;
  for (const rule of LANDING_ARTICLE_RULES) {
    if (rule.test.test(text)) {
      return rule.articles.slice(0, 3);
    }
  }
  // Fallback
  return ["sexual-health-basics", "safe-supplements", "when-to-see-doctor"];
}
