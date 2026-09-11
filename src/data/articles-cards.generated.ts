/**
 * ⚙️ GENERATED FILE — `npm run build` (scripts/generate-sitemap.mjs).
 * ⚠️ لا يُعدَّل يدوياً — عدّل src/data/articles.ts (أو قائمة الـ slugs في
 *    السكربت) ثم أعِد البناء.
 *
 * بطاقات المقالات المعروضة في الـ homepage (ArticlesGrid): الحقول اللازمة
 * فقط (بلا content/sources) حتى لا يدخل chunk data-articles الكامل في
 * المسار الحرج.
 */
export interface ArticleCard {
  slug: string;
  title: string;
  excerpt: string;
  image?: string;
  category: string;
  readMin: number;
  emoji: string;
}

export const featuredArticleCards: ArticleCard[] = [
  {
    slug: "erectile-dysfunction",
    title: "ضعف الانتصاب: الأسباب والحلول",
    excerpt:
      "ضعف الانتصاب مشكلة شائعة لها أسباب نفسية وجسدية، والتحرك المبكر يصنع فرقاً كبيراً. نقدم شرحاً مبسطاً لآليتها وأسبابها، وطرق التعامل الطبيعي والطبي الحديثة.",
    image: "/images/article-erectile-dysfunction.webp",
    category: "صحة الرجل",
    readMin: 10,
    emoji: "💪",
  },
  {
    slug: "premature-ejaculation",
    title: "سرعة القذف: الأسباب الشائعة وطرق التحكم",
    excerpt:
      "سرعة القذف من أكثر المشكلات الجنسية شيوعاً وليست نهاية للعلاقة. نستعرض أسبابها النفسية والجسدية، وتقنيات سلوكية مثبتة للتحكم، وخيارات طبيعية وطبية آمنة",
    image: "/images/article-premature-ejaculation.webp",
    category: "صحة الرجل",
    readMin: 9,
    emoji: "⏱️",
  },
  {
    slug: "women-orgasm",
    title: "صحة المرأة الجنسية: حقائق علمية",
    excerpt:
      "فهم الاستجابة الجنسية الأنثوية مفتاح علاقة ممتعة ومرضية. نتناول معلومات عن جسد المرأة وطبيعة الاستجابة والذروة، وما الطبيعي وما المبالغ فيه، وكيف",
    image: "/images/article-stress-libido.webp",
    category: "صحة المرأة",
    readMin: 10,
    emoji: "🌸",
  },
  {
    slug: "pre-marriage-health-guide",
    title: "دليل المقبلين على الزواج: كل ما تحتاج معرفته",
    excerpt:
      "الاستعداد الجيد قبل الزواج يضع أساساً صحيحاً لحياة زوجية مستقرة وسعيدة. نجيب عن أسئلة العروسين: الفحوصات الموصى بها، والتوقعات الواقعية، وأهمية التواصل",
    image: "/images/article-pre-marriage-hero.webp",
    category: "علاقات",
    readMin: 10,
    emoji: "💒",
  },
];

/** عدد المقالات التوعوية إجمالاً (أرقام ديناميكية في الواجهة — بلا hardcode). */
export const ARTICLE_COUNT = 56;
