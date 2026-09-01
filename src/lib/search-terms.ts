/**
 * مرادفات البحث باللهجة المصرية — وحدة خفيفة (بدون بيانات كتالوج)
 * حتى يستطيع SearchBar استيرادها statically بدون تحميل كتالوج المنتجات
 * كاملاً في الحزمة الأولى.
 *
 * الاتجاه ثنائي: البحث عن "نقط" يطابق منتجات "قطرات" والعكس.
 */
const SEARCH_SYNONYMS: Record<string, string[]> = {
  "نقط": ["قطرات"],
  "قطرات": ["نقط"],
};

/** يوسّع المصطلح: الأصل + مرادفاته (فارغ لو مفيش مرادفات). */
export const expandSearchTerm = (q: string): string[] => {
  const term = q.trim();
  if (!term) return [];
  return [term, ...(SEARCH_SYNONYMS[term] ?? [])];
};
