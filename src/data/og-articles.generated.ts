/**
 * (2026-10-11) مُولَّد آلياً — لا يُعدَّل يدوياً.
 * صور مشاركة بنسبة 2:1 ‏(1200×630) لمقالات التوعية: لوحة علامة تحمل الشعار
 * إلى جانب صورة المقال (hero) مقصوصة مربعاً. الملفات نفسها في
 * public/images/og-articles/<slug>.webp (توليد ImageMagick، ~38KB للصورة).
 *
 * هذا الملف مصدر واحد يعتمد عليه الـ prerender وroot المقال معاً حتى تتطابق
 * النسختان (الثابتة وبعد الـ hydration) على og:image/twitter:image تماماً.
 * مقال جديد بلا صورة 2:1 هنا = يعود الجميع لصورة المقال الأصلية بلا كسر.
 */
export const ogArticleSlugs: string[] = [
  "aging-and-intimacy",
  "aphrodisiacs-real",
  "best-selling-products-guide",
  "body-image-confidence",
  "buying-first-product-guide",
  "chronic-diseases-intimacy",
  "communication-couples",
  "contraception-options",
  "delay-sprays-safe-use",
  "device-maintenance-hygiene",
  "drug-interactions-sexual-products",
  "erectile-dysfunction",
  "estrogen-progesterone-women-guide",
  "exercise-sexual-performance",
  "fertility-supplements-guide",
  "first-night-anxiety-guide",
  "foods-to-avoid",
  "ginseng-complete-guide",
  "hormonal-changes",
  "intimacy-after-fifty",
  "kegel-exercises",
  "masturbation-myths",
  "max-filler-breast-guide",
  "medications-affecting-libido",
  "men-health-checkups",
  "menopause-intimacy-guide",
  "myths-vs-facts-sexual-health",
  "natural-honey-dates-benefits",
  "nutrition-libido",
  "omega-3-omega-6-benefits-skin-cell-elasticity",
  "omega3-circulation-performance",
  "pelvic-floor-men-advanced",
  "peruvian-maca-root-benefits-for-vitality-and-energy",
  "peruvian-maca-root-energy-vitality-men-women",
  "physiological-methods-for-stamina-and-timing-without-numbing",
  "post-partum-recovery",
  "pre-marriage-health-guide",
  "premature-ejaculation",
  "product-safety-checklist",
  "prostate-health-sexual-function",
  "red-korean-ginseng-energy-endurance-benefits",
  "relationship-routine-revive",
  "royal-honey-benefits",
  "safe-supplements",
  "sexual-health-basics",
  "sexual-health-during-ramadan",
  "sexual-health-glossary",
  "side-effects-management",
  "sleep-and-sex",
  "std-prevention",
  "stress-and-libido",
  "testosterone-and-age",
  "vacuum-pump-complete-guide",
  "vaginal-health-basics",
  "when-to-see-doctor",
  "women-orgasm",
  "womens-libido-boosters",
  "zinc-sexual-health",
];

/** مسار صورة المشاركة 2:1 للمقال إن وُجدت، وإلا null (يرجع الجميع لصورة المقال). */
export function ogArticleImage(slug: string): string | null {
  return ogArticleSlugs.includes(slug) ? `/images/og-articles/${slug}.webp` : null;
}
