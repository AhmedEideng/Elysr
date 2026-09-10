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
    slug: "best-selling-products-guide",
    title: "أقوى 10 منتجات مبيعاً في اليسر ميديكال: لماذا يفضلها عملاؤنا؟",
    excerpt:
      "نتيجة سنوات من الخبرة في اليسر ميديكال نعرض أفضل المنتجات مبيعاً في فئات الصحة الزوجية. نشرح سبب تفضيل العملاء لكل منتج، وطريقة عمله، وكيف تختار الأنسب",
    image: "/images/article-best-selling-hero.webp",
    category: "تغذية ومكملات",
    readMin: 9,
    emoji: "🏆",
  },
  {
    slug: "buying-first-product-guide",
    title: "دليل شراء أول منتج صحة زوجية: بدون حرج ومع ثقة",
    excerpt:
      "شراء أول منتج صحة زوجية قرار طبيعي يستحق تحضيراً لا خجلاً ولا تهوراً. نرشدك إلى معايير الاختيار الصحيح، وقراءة المكونات، وأهمية المصدر الموثوق والتغليف",
    image: "/images/article-buying-guide-hero.webp",
    category: "أساسيات",
    readMin: 6,
    emoji: "🛒",
  },
  {
    slug: "delay-sprays-safe-use",
    title: "دليل آمن لاستخدام بخاخات التأخير للرجال",
    excerpt:
      "بخاخات التأخير خيار شائع للتحكم بالتوقيت، لكن استخدامها الخاطئ قد يسبب تنميلاً وفقدان المتعة. نقدم دليلاً عملياً لاختيار النوع الآمن وتطبيقه صحيحاً دون",
    image: "/images/article-delay-spray-hero.webp",
    category: "صحة الرجال",
    readMin: 7,
    emoji: "🧴",
  },
  {
    slug: "royal-honey-benefits",
    title: "فوائد العسل الملكي والأعشاب للرجال",
    excerpt:
      "العسل الملكي مع الجينسنج والتونغكات علي مزيج رائج في منتجات الطاقة، فما حقيقته؟ نستعرض الفوائد المدعومة علمياً، وأسس اختيار الأصلي، والتوقعات الواقعية",
    image: "/images/article-royal-honey-hero.webp",
    category: "تغذية ومكملات",
    readMin: 6,
    emoji: "🍯",
  },
];

/** عدد المقالات التوعوية إجمالاً (أرقام ديناميكية في الواجهة — بلا hardcode). */
export const ARTICLE_COUNT = 56;
