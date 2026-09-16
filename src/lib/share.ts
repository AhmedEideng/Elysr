/**
 * ============================================================
 * Share messages — حلقة الانتشار عبر واتساب (2026-09-16)
 * ============================================================
 * النيتش ده بيتنشر واتساب: العميل بيبعت المنتج لزوجه/صاحبه،
 * والمقال النافع بيبعت "لحد يعرفه". قبل كده مفيش زر مشاركة
 * في أي صفحة بالموقع — دلوقتي كل صفحة عامة (منتج/مقال/دليل)
 * ليها زر بيقدم الرسالة جاهزة (اسم + لينك) بدون أي مجهود.
 *
 * قواعد الصياغة:
 *   • رسالة طبيعية مش إعلانية — التحويل بيتم على أساس الثقة،
 *     والرسالة اللي "تبيع" كتير ما بتتشاركش.
 *   • اللينك دايمًا آخر سطر (قابل للنقر في كل المنصات).
 *   • السعر في مشاركة المنتجات بس (قيمة عملية للمشارك).
 * ============================================================
 */

const SITE_URL = "https://elysrmedical.store";

/** يبني لينك wa.me الرسمي لمشاركة نص (بلا رقم = شاشة اختيار جهة الإرسال). */
export function waShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/** لينك الصفحة المطلق (مستقر — مفيش query params في الروابط المشاركة). */
export function absoluteUrl(path: string): string {
  return path.startsWith("http") ? path : `${SITE_URL}${path}`;
}

/** منتج: الاسم + السعر + اللينك */
export function shareProductText(name: string, price: number, path: string): string {
  return `شوف «${name}» عند اليسر ميديكال — ${price} ج.م (شحن سري ودفع عند الاستلام)\n${absoluteUrl(path)}`;
}

/** مقال: توعوي — العنوان + اللينك بس (مفيش بيع: التحويل ثقة) */
export function shareArticleText(title: string, path: string): string {
  return `مقال يستاهل قراءتك: «${title}» — اليسر ميديكال\n${absoluteUrl(path)}`;
}

/** دليل: عنوان + اللينك */
export function shareGuideText(title: string, path: string): string {
  return `دليل مفيد: «${title}» — اليسر ميديكال\n${absoluteUrl(path)}`;
}
