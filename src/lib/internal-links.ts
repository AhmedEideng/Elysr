/**
 * ============================================================
 * Internal Linking Engine — Smart Cross-Linking
 * ============================================================
 * Maps products → articles, articles → products, and provides
 * related content suggestions for maximum internal link equity.
 */

import type { Product } from "@/data/product-types";
import { articles } from "@/data/articles";

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

const WOMEN_ARTICLES = [
  "womens-libido-boosters",
  "menopause-intimacy-guide",
  "vaginal-health-basics",
];
const MEN_ARTICLES = ["testosterone-and-age", "exercise-sexual-performance"];
const DEVICE_ARTICLES = ["vacuum-pump-complete-guide", "prostate-health-sexual-function"];

/**
 * Get relevant article slugs for a product (2 articles)
 */
export function getArticlesForProduct(product: Product): string[] {
  const text = `${product.name} ${product.nameEn} ${product.slug} ${product.description}`;
  const matched = new Set<string>();

  for (const rule of ARTICLE_RULES) {
    if (rule.test.test(text)) {
      for (const slug of rule.articles) {
        matched.add(slug);
      }
    }
  }

  // Add category-based fallbacks
  const fallbacks =
    product.category === "women"
      ? WOMEN_ARTICLES
      : product.category === "devices"
        ? DEVICE_ARTICLES
        : MEN_ARTICLES;

  for (const slug of fallbacks) {
    matched.add(slug);
  }

  return [...matched].slice(0, 2);
}

// ─── Article → Product Mapping ───
const PRODUCT_RULES: { articleSlug: string; productIds: string[] }[] = [
  {
    articleSlug: "erectile-dysfunction",
    productIds: ["m-01", "m-02", "m-04", "m-45", "d-01", "d-02"],
  },
  {
    articleSlug: "premature-ejaculation",
    productIds: ["m-17", "m-30", "m-41", "m-44", "m-05", "m-06"],
  },
  { articleSlug: "delay-sprays-safe-use", productIds: ["m-41", "m-44", "m-55", "m-30", "m-05"] },
  {
    articleSlug: "royal-honey-benefits",
    productIds: ["m-52", "m-12", "m-20", "m-13", "m-22"],
  },
  { articleSlug: "safe-supplements", productIds: ["m-01", "m-02", "m-03", "m-04", "m-09"] },
  { articleSlug: "nutrition-libido", productIds: ["m-01", "m-02", "m-04", "m-52", "w-05", "w-07"] },
  {
    articleSlug: "womens-libido-boosters",
    productIds: ["w-02", "w-15", "w-07", "w-05", "w-03", "w-04"],
  },
  { articleSlug: "women-orgasm", productIds: ["w-02", "w-15", "w-14", "w-16", "w-05", "w-07"] },
  { articleSlug: "kegel-exercises", productIds: ["m-17", "m-41", "d-01", "d-02", "w-16"] },
  { articleSlug: "sleep-and-sex", productIds: ["m-01", "m-02", "m-04", "w-05", "m-52", "m-42"] },
  {
    articleSlug: "stress-and-libido",
    productIds: ["m-01", "m-02", "m-04", "w-05", "w-02", "m-52"],
  },
  {
    articleSlug: "sexual-health-basics",
    productIds: ["m-01", "m-09", "w-02", "w-05", "d-01", "m-52"],
  },
  { articleSlug: "aphrodisiacs-real", productIds: ["m-01", "m-02", "m-04", "m-52", "w-07"] },
  { articleSlug: "hormonal-changes", productIds: ["m-01", "m-04", "w-05", "w-02", "w-14", "w-16"] },
  {
    articleSlug: "when-to-see-doctor",
    productIds: ["m-01", "d-01", "w-02", "m-45", "m-30", "w-14"],
  },
  {
    articleSlug: "max-filler-breast-guide",
    productIds: ["w-20", "d-04", "w-14", "w-16", "w-05", "w-07"],
  },
  {
    articleSlug: "body-image-confidence",
    productIds: ["w-20", "d-04", "d-06", "w-14", "m-48", "m-01"],
  },
  {
    articleSlug: "communication-couples",
    productIds: ["m-01", "w-05", "w-02", "m-52", "w-14", "w-15"],
  },
  {
    articleSlug: "contraception-options",
    productIds: ["w-05", "w-02", "w-14", "w-16", "w-15", "w-07"],
  },
  { articleSlug: "post-partum-recovery", productIds: ["w-14", "w-16", "w-05", "w-02", "w-15"] },
  {
    articleSlug: "masturbation-myths",
    productIds: ["m-01", "m-02", "m-09", "w-02", "m-52", "m-04"],
  },
  { articleSlug: "foods-to-avoid", productIds: ["m-01", "m-02", "m-04", "m-52", "w-05", "w-07"] },
  { articleSlug: "std-prevention", productIds: ["w-14", "w-16", "m-01", "w-05", "m-09", "m-52"] },
  {
    articleSlug: "aging-and-intimacy",
    productIds: ["m-01", "m-04", "w-05", "w-14", "d-01", "m-52"],
  },
  {
    articleSlug: "prostate-health-sexual-function",
    productIds: ["m-01", "m-04", "d-01", "d-02", "m-09", "m-52"],
  },
  {
    articleSlug: "testosterone-and-age",
    productIds: ["m-02", "m-04", "m-01", "m-52", "m-09", "m-20"],
  },
  {
    articleSlug: "vacuum-pump-complete-guide",
    productIds: ["d-01", "d-02", "d-03", "d-05", "d-07", "m-01"],
  },
  {
    articleSlug: "drug-interactions-sexual-products",
    productIds: ["m-05", "m-30", "m-41", "m-06", "m-09", "d-01"],
  },
  {
    articleSlug: "side-effects-management",
    productIds: ["m-06", "m-09", "m-30", "m-41", "m-01", "w-14"],
  },
  {
    articleSlug: "zinc-sexual-health",
    productIds: ["m-01", "m-04", "m-02", "m-52", "m-09", "w-05"],
  },
  {
    articleSlug: "omega3-circulation-performance",
    productIds: ["m-02", "m-01", "m-04", "d-01", "m-52", "m-09"],
  },
  {
    articleSlug: "ginseng-complete-guide",
    productIds: ["m-04", "m-02", "m-01", "m-52", "m-03", "m-09"],
  },
  {
    articleSlug: "menopause-intimacy-guide",
    productIds: ["w-14", "w-16", "w-02", "w-05", "w-07", "w-15"],
  },
  { articleSlug: "vaginal-health-basics", productIds: ["w-14", "w-16", "w-05", "w-02", "w-07"] },
  {
    articleSlug: "first-night-anxiety-guide",
    productIds: ["m-01", "m-52", "w-14", "w-07", "m-09", "w-05"],
  },
  {
    articleSlug: "relationship-routine-revive",
    productIds: ["w-04", "w-06", "m-48", "m-01", "w-05", "m-52"],
  },
  {
    articleSlug: "buying-first-product-guide",
    productIds: ["m-01", "m-52", "w-07", "w-14", "m-09", "d-01"],
  },
  {
    articleSlug: "myths-vs-facts-sexual-health",
    productIds: ["m-01", "m-52", "w-02", "w-07", "m-09", "d-01"],
  },
  {
    articleSlug: "estrogen-progesterone-women-guide",
    productIds: ["w-14", "w-16", "w-02", "w-05", "w-07", "w-15"],
  },
  {
    articleSlug: "exercise-sexual-performance",
    productIds: ["m-02", "m-04", "m-01", "d-01", "m-52", "w-16"],
  },
  {
    articleSlug: "best-selling-products-guide",
    productIds: ["m-01", "m-02", "m-04", "m-52", "m-26", "w-02", "w-07"],
  },
  {
    articleSlug: "chronic-diseases-intimacy",
    productIds: ["m-01", "m-04", "d-01", "w-14", "m-09", "m-52"],
  },
  {
    articleSlug: "fertility-supplements-guide",
    productIds: ["m-02", "m-52", "m-04", "m-01", "w-14", "w-05"],
  },
  {
    articleSlug: "pre-marriage-health-guide",
    productIds: ["m-01", "m-52", "w-14", "w-16", "w-07", "m-09"],
  },
  {
    articleSlug: "medications-affecting-libido",
    productIds: ["m-01", "m-04", "d-01", "m-02", "w-14", "m-09"],
  },
  {
    articleSlug: "men-health-checkups",
    productIds: ["m-04", "m-01", "d-01", "m-02", "m-52", "m-09"],
  },
  {
    articleSlug: "intimacy-after-fifty",
    productIds: ["w-14", "m-04", "d-01", "m-52", "w-16", "m-01"],
  },
  {
    articleSlug: "natural-honey-dates-benefits",
    productIds: ["m-52", "m-11", "m-20", "w-07", "w-05"],
  },
  {
    articleSlug: "sexual-health-during-ramadan",
    productIds: ["m-52", "m-04", "w-14", "m-01", "m-11", "w-07"],
  },
  {
    articleSlug: "pelvic-floor-men-advanced",
    productIds: ["m-41", "m-17", "d-01", "m-02", "m-30", "m-44"],
  },
  {
    articleSlug: "device-maintenance-hygiene",
    productIds: ["d-01", "d-02", "d-03", "d-05", "d-06", "d-07"],
  },
];

/**
 * Get product IDs relevant to an article (6 products) — Smart Dynamic Recommendation
 */
export function getProductsForArticle(articleSlug: string): string[] {
  // 1. Check if we have an explicit hardcoded rule for this article:
  const rule = PRODUCT_RULES.find((r) => r.articleSlug === articleSlug);
  if (rule) return rule.productIds.slice(0, 6);

  // 2. If no hardcoded rule, find the article dynamically in our articles database:
  const article = articles.find((a) => a.slug === articleSlug);
  if (article) {
    const category = article.category ? article.category.toLowerCase() : "";
    const titleAndContent = `${article.title} ${article.content}`.toLowerCase();

    // Determine target category based on article category first:
    let isWomen = category === "women" || category === "صحة المرأة";
    let isDevices = category === "devices" || category === "أجهزة";
    let isMen = category === "men" || category === "صحة الرجل" || category === "صحة الرجال";

    // Fallback to keyword matching only if no explicit category is matched:
    if (!isWomen && !isDevices && !isMen) {
      isWomen =
        titleAndContent.includes("نساء") ||
        titleAndContent.includes("سيدات") ||
        titleAndContent.includes("سيدة") ||
        titleAndContent.includes("أنثى") ||
        titleAndContent.includes("بشرة") ||
        titleAndContent.includes("جلد");

      isDevices =
        titleAndContent.includes("جهاز") ||
        titleAndContent.includes("مضخة") ||
        titleAndContent.includes("pump") ||
        titleAndContent.includes("شد") ||
        titleAndContent.includes("تمرين");

      isMen =
        titleAndContent.includes("رجال") ||
        titleAndContent.includes("رجل") ||
        titleAndContent.includes("انتصاب") ||
        titleAndContent.includes("صلابة") ||
        titleAndContent.includes("سرعة") ||
        titleAndContent.includes("تأخير");
    }

    // Dynamic product selection based on content keywords:
    if (isWomen) {
      if (
        titleAndContent.includes("عسل") ||
        titleAndContent.includes("شوكولاته") ||
        titleAndContent.includes("طاقة")
      ) {
        return ["w-05", "w-12", "w-08", "w-02", "w-15", "w-16"]; // Honey/chocolate/coffee first
      }
      if (
        titleAndContent.includes("قطرات") ||
        titleAndContent.includes("نقط") ||
        titleAndContent.includes("برود")
      ) {
        return ["w-02", "w-15", "w-24", "w-16", "w-05", "w-12"]; // Drops first
      }
      return ["w-02", "w-15", "w-11", "w-16", "w-05", "w-12"];
    }

    if (isDevices) {
      return ["d-01", "d-02", "d-04", "d-03", "d-05", "d-07"];
    }

    if (isMen) {
      if (
        titleAndContent.includes("عسل") ||
        titleAndContent.includes("غذاء") ||
        titleAndContent.includes("طاقة")
      ) {
        return ["m-11", "m-52", "m-12", "m-14", "m-02", "m-60"]; // Honey/Ginseng/Kreva
      }
      if (
        titleAndContent.includes("سرعة") ||
        titleAndContent.includes("تأخير") ||
        titleAndContent.includes("توقيت") ||
        titleAndContent.includes("تخدير")
      ) {
        return ["m-44", "m-60", "m-41", "m-30", "m-17"]; // Delay products (Dooz cream, Kreva gel, Procomil spray, etc.)
      }
      if (
        titleAndContent.includes("انتصاب") ||
        titleAndContent.includes("صلابة") ||
        titleAndContent.includes("ضعف")
      ) {
        return ["m-34", "m-01", "m-02", "m-60", "m-11"]; // Erection & double action
      }
      return ["m-11", "m-44", "m-60", "m-02", "m-34"];
    }
  }

  // Absolute general fallback: return popular products from each category
  return ["m-11", "m-44", "w-02", "w-15", "d-01", "m-60"];
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
