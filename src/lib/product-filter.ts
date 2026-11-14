/**
 * (2026-11-15 · Round 5) منطق تصفية الكتالوج + تسميات الأنواع كانا داخل ملف
 * مكوّن (`ProductCatalog.tsx`) — فحص react-refresh كان يحذّر: الملف يصدّر
 * دالة غير مكوّن، فيفقد Fast Refresh حده ويعيد تركيب الشجرة كاملة عند كل
 * تعديل. نُقل المنطق الخالص هنا: المكوّن صار مكوّنات فقط، والمنطق يُختبر
 * مباشرة بلا React.
 */
import type { Product } from "@/data/product-types";
import { getBundleProductType } from "@/lib/product-form";

export const CATALOG_TYPE_LABELS: Record<string, string> = {
  tablet: "أقراص",
  capsule: "كبسولات",
  gel: "جل",
  cream: "كريم",
  honey: "عسل",
  chocolate: "شوكولاتة",
  spray: "بخاخ",
  drops: "قطرات",
  gum: "لبان",
  wipes: "مناديل",
  sachet: "أكياس",
  coffee: "قهوة",
  "digital-pump": "مضخات رقمية",
  "electric-pump": "مضخات كهربائية",
  "manual-pump": "مضخات يدوية",
  "vacuum-kit": "حقائب تفريغ",
  "breast-kit": "أجهزة للصدر",
  "traction-device": "أجهزة شد",
  other: "أخرى",
};
export function filterCatalog(
  items: Product[],
  type: string,
  min: string,
  max: string,
  sort: string,
) {
  const filtered = items.filter(
    (p) =>
      (type === "all" || getBundleProductType(p) === type) &&
      (!min || p.price >= Number(min)) &&
      (!max || p.price <= Number(max)),
  );
  if (sort === "price-asc") filtered.sort((a, b) => a.price - b.price);
  if (sort === "price-desc") filtered.sort((a, b) => b.price - a.price);
  return filtered;
}
