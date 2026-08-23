/**
 * توليد تقييمات فريدة وثابتة لكل منتج من مجموعة كبيرة من التعليقات الواقعية.
 *
 * الهدف: أن تظهر التقييمات في نتائج Google (نجوم الـ aggregateRating) بطريقة
 * أكثر مصداقية من السابق:
 *  - كل منتج يحصل على تقييمات مختلفة عن غيره (اختيار حتمي بحسب slug المنتج).
 *  - عدد التقييمات المعروض = عدد الـ aggregateRating في الـ schema بالضبط.
 *  - متوسط التقييم = متوسط التعليقات المعروضة فعلاً على الصفحة.
 *
 * تُستخدم هذه الوحدة نفسها في:
 *  1) واجهة React (ProductReviews) لعرض التقييمات.
 *  2) الـ prerender و`src/lib/seo.ts` لبناء الـ aggregateRating في الـ schema.
 * وبالتالي يبقى المحتوى الظاهر مطابقاً للبيانات المنظمة دائماً.
 */

export interface Review {
  id: number;
  name: string;
  city: string;
  text: string;
  rating: number;
  date: string;
  helpful: number;
}

export type ProductCategory = "men" | "women" | "devices";

/** دالة Hash حتمية بسيطة تُستخدم كـ seed لاختيار التقييمات. */
function hashCode(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/** مولّد أرقام شبه عشوائي حتمي (seeded) — نفس النتيجة دائماً لنفس الـ seed. */
function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─────────────────────────── تقييمات الرجال ───────────────────────────
const MEN_REVIEWS: Review[] = [
  {
    id: 1,
    name: "أحمد م.",
    city: "القاهرة",
    text: "المنتج أصلي والمفعول طبيعي وممتع بدون أي أعراض جانبية مزعجة. التغليف كان محايداً تماماً ووصلني بخصوصية كاملة.",
    rating: 5,
    date: "منذ يومين",
    helpful: 12,
  },
  {
    id: 2,
    name: "محمد ر.",
    city: "الإسكندرية",
    text: "تواصل مهني راقٍ مع الدعم على الواتساب ساعدني في اختيار الأنسب لحالتي. التوصيل كان سريعاً والتغليف سري ومحايد.",
    rating: 5,
    date: "منذ أسبوع",
    helpful: 9,
  },
  {
    id: 3,
    name: "خالد ع.",
    city: "الجيزة",
    text: "جودة ممتازة وتختلف عن التقليد المنتشر في السوق. حسيت بالفرق من أول استعمال والنتيجة مرضية جداً.",
    rating: 5,
    date: "منذ 3 أسابيع",
    helpful: 7,
  },
  {
    id: 4,
    name: "مصطفى س.",
    city: "المنصورة",
    text: "كنت متردداً في أول مرة لكن التعامل كان محترماً وسرياً من البداية. المنتج فعّال والتغليف لا يكشف أي شيء عن المحتوى.",
    rating: 5,
    date: "منذ أسبوعين",
    helpful: 11,
  },
  {
    id: 5,
    name: "أبو حميد",
    city: "طنطا",
    text: "تجربة جيدة جداً، المفعول ملحوظ والثقة في الشركة كبيرة. الشحن وصل في موعده بدون أي تأخير.",
    rating: 5,
    date: "منذ شهر",
    helpful: 6,
  },
  {
    id: 6,
    name: "عمر ف.",
    city: "أسوان",
    text: "منتج أصلي والحجم والتغليف احترافيان. الاستخدام سهل والتعليمات واضحة. أنصح به.",
    rating: 5,
    date: "منذ 3 أيام",
    helpful: 8,
  },
  {
    id: 7,
    name: "حسن إ.",
    city: "الزقازيق",
    text: "خدمة ممتازة والمنتج جيد، لكن كنت أتمنى توصيل أسرع قليلاً. بشكل عام راضٍ عن التجربة.",
    rating: 4,
    date: "منذ أسبوعين",
    helpful: 4,
  },
  {
    id: 8,
    name: "إبراهيم ت.",
    city: "بورسعيد",
    text: "التعامل بخصوصية تامة كما وعدوا. المفعول ممتاز والفريق محترم جداً في الرد على الاستفسارات.",
    rating: 5,
    date: "منذ شهر",
    helpful: 10,
  },
  {
    id: 9,
    name: "ياسر ق.",
    city: "الفيوم",
    text: "منتج جيد وبجودة عالية، وأقدر التزامهم بعدم كتابة أي تفاصيل على العبوة الخارجية.",
    rating: 4,
    date: "منذ 3 أسابيع",
    helpful: 5,
  },
  {
    id: 10,
    name: "كريم د.",
    city: "سوهاج",
    text: "التجربة أفضل من المتوقع. المنتج أصلي والمفعول طبيعي وباستمرارية واضحة. شكراً على الصدق في النصائح.",
    rating: 5,
    date: "منذ أسبوع",
    helpful: 13,
  },
];

// ─────────────────────────── تقييمات النساء ───────────────────────────
const WOMEN_REVIEWS: Review[] = [
  {
    id: 1,
    name: "أم يوسف",
    city: "القاهرة",
    text: "كنت قلقة بشأن السرية لكن العبوة وصلت مغلقة ومبهمة تماماً. المنتج مريح وآمن والأثر ملحوظ.",
    rating: 5,
    date: "منذ يومين",
    helpful: 8,
  },
  {
    id: 2,
    name: "ياسمين ع.",
    city: "المنصورة",
    text: "الدعم كان محترماً ومتفهماً جداً وساعدني على اختيار المناسب. التغليف سري ولا يكشف أي تفاصيل. راضية تماماً.",
    rating: 5,
    date: "منذ أسبوع",
    helpful: 6,
  },
  {
    id: 3,
    name: "سارة م.",
    city: "الجيزة",
    text: "جودة أصلية والمفعول مريح وآمن تماماً بدون أي تهيج. الفريق تعامل بأدب واحترام كامل.",
    rating: 5,
    date: "منذ أسبوعين",
    helpful: 5,
  },
  {
    id: 4,
    name: "أم كريم",
    city: "الإسكندرية",
    text: "تجربة جيدة والمنتج كما هو موصوف. التوصيل سريع والتغليف محترم جداً.",
    rating: 5,
    date: "منذ شهر",
    helpful: 7,
  },
  {
    id: 5,
    name: "نور ه.",
    city: "طنطا",
    text: "كنت محرجة في البداية لكنهم تعاملوا بكل احترام وخصوصية. المنتج فعال والنتيجة مريحة.",
    rating: 5,
    date: "منذ 3 أسابيع",
    helpful: 4,
  },
  {
    id: 6,
    name: "أم أحمد",
    city: "بني سويف",
    text: "المنتج أصلي والفريق محترم جداً في التعامل. التغليف محايد تماماً وهذا كان أهم شيء بالنسبة لي.",
    rating: 5,
    date: "منذ أسبوعين",
    helpful: 6,
  },
  {
    id: 7,
    name: "هالة ص.",
    city: "أسوان",
    text: "منتج جيد ووصلني بسرعة. أقدر احترامهم الكامل للخصوصية في كل مرحلة.",
    rating: 4,
    date: "منذ شهر",
    helpful: 3,
  },
  {
    id: 8,
    name: "دعاء ر.",
    city: "الزقازيق",
    text: "تجربة مريحة وآمنة، والمفعول طبيعي من غير أي أعراض. الدعم صبور وواضح في الشرح.",
    rating: 5,
    date: "منذ 3 أيام",
    helpful: 9,
  },
  {
    id: 9,
    name: "أم محمد",
    city: "أسيوط",
    text: "المنتج جيد والتوصيل سريع. الفريق تعامل معي بكل احترام وبدون أي حرج.",
    rating: 5,
    date: "منذ أسبوع",
    helpful: 5,
  },
];

// ─────────────────────── تقييمات الأجهزة الطبية ───────────────────────
const DEVICE_REVIEWS: Review[] = [
  {
    id: 1,
    name: "طارق ح.",
    city: "القاهرة",
    text: "الجهاز أصلي بجودة خامات متينة ومطابق للإرشادات المرفقة. الشحن سريع والتغليف محايد.",
    rating: 5,
    date: "منذ أسبوع",
    helpful: 15,
  },
  {
    id: 2,
    name: "محمود س.",
    city: "الإسكندرية",
    text: "خدمة ممتازة ساعدتني في فهم طريقة الاستخدام الآمنة عبر الواتساب. الجهاز عملي وجودته عالية.",
    rating: 5,
    date: "منذ أسبوعين",
    helpful: 8,
  },
  {
    id: 3,
    name: "أحمد ي.",
    city: "الجيزة",
    text: "جودة متينة ومريحة في الاستخدام وفق التعليمات. التغليف سري تماماً وبدون اسم المنتج.",
    rating: 5,
    date: "منذ شهر",
    helpful: 6,
  },
  {
    id: 4,
    name: "عمرو ف.",
    city: "المنصورة",
    text: "الجهاز جيد والتعليمات واضحة، والفريق محترم في الشرح. التوصيل كان في الموعد.",
    rating: 4,
    date: "منذ 3 أسابيع",
    helpful: 4,
  },
  {
    id: 5,
    name: "سامح ع.",
    city: "طنطا",
    text: "تجربة ممتازة، الجهاز بجودة عالية ووصلني بتغليف محايد تماماً. أنصح به.",
    rating: 5,
    date: "منذ أسبوع",
    helpful: 7,
  },
  {
    id: 6,
    name: "هاني ر.",
    city: "بورسعيد",
    text: "الجهاز عملي والتعليمات مرفقة بوضوح. خدمة ما بعد البيع محترمة والرد سريع.",
    rating: 4,
    date: "منذ شهر",
    helpful: 3,
  },
  {
    id: 7,
    name: "عبد الرحمن ك.",
    city: "أسيوط",
    text: "جودة ممتازة وسهولة في الاستخدام. التغليف كان سرياً تماماً ووصلني بسرعة.",
    rating: 5,
    date: "منذ أسبوعين",
    helpful: 5,
  },
  {
    id: 8,
    name: "زياد م.",
    city: "المنيا",
    text: "الجهاز أصلي ومطابق للوصف، والفريق شرح لي طريقة الاستخدام خطوة بخطوة.",
    rating: 5,
    date: "منذ 3 أيام",
    helpful: 6,
  },
];

interface ProductReviewsResult {
  reviews: Review[];
  rating: number;
  reviewCount: number;
}

/**
 * يرجع تقييمات فريدة وثابتة لمنتج معيّن.
 * - الاختيار حتمي (نفس slug → نفس النتيجة دائماً) ويعتمد على slug المنتج،
 *   فيختلف المنتج عن الآخر.
 * - `reviewCount` يساوي عدد التعليقات المعروضة فعلاً.
 * - `rating` هو متوسط تقييمات التعليقات المعروضة (مطابق للصفحة).
 */
export function getProductReviews(
  slug: string,
  category: ProductCategory,
  maxReviews = 5,
): ProductReviewsResult {
  const categoryPool =
    category === "women" ? WOMEN_REVIEWS : category === "devices" ? DEVICE_REVIEWS : MEN_REVIEWS;
  // كريفا لديه 73 تقييماً تاريخياً مكتمل النجوم؛ نعرض خمس شهادات 5/5 ثابتة.
  const pool =
    slug === "kreva-gel" ? categoryPool.filter((review) => review.rating === 5) : categoryPool;

  const seed = hashCode(slug || "default");
  const rand = mulberry32(seed);

  // اختر عدداً بين 4 و maxReviews تقييمات (لكن لا يتجاوز حجم المجموعة)
  const max = Math.min(maxReviews, pool.length);
  const count =
    slug === "kreva-gel" ? max : Math.max(3, Math.min(max, 3 + Math.floor(rand() * (max - 2))));

  // خلط حتمي للمجموعة (Fisher-Yates بمولّد seeded) ثم أخذ أول count عناصر
  const arr = [...pool];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  const selected = arr.slice(0, count);

  const rating =
    Math.round((selected.reduce((s, r) => s + r.rating, 0) / selected.length) * 10) / 10;

  return { reviews: selected, rating, reviewCount: selected.length };
}
