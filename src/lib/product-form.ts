import type { Product } from "@/data/product-types";

/**
 * (2026-11-14 · H5) تصنيف شكل المنتج (أقراص/كبسولات/جل/كريم…) — منطق خالص
 * يعتمد على الاسم والـ slug فقط. كان يعيش في `data/products.ts` فيجرّ معه
 * الكتالوج الكامل إلى أي ملف يستخدمه (مثل ProductCatalog) — وهو ملف يُستورد
 * من مسار قسم يُبنى مباشرة في الحزمة الأولى.
 */
type FormSource = Pick<Product, "name" | "nameEn" | "slug" | "category">;

/**
 * يحدد الشكل الصلب الفموي من الاسم/الـ slug فقط، بدون اختلاق حقل جديد في بيانات
 * المنتج. الهدف منع ظهور الأقراص والكبسولات داخل نفس باقة المنتج.
 */
export const getOralSolidForm = (product: FormSource): "tablet" | "capsule" | null => {
  const text = `${product.name} ${product.nameEn} ${product.slug}`.toLowerCase();
  const isCapsule = /كبسول|capsule/.test(text);
  const isTablet = /أقراص|قرص|حبوب|tablet|pill/.test(text);
  if (isCapsule && !isTablet) return "capsule";
  if (isTablet && !isCapsule) return "tablet";
  return null;
};

export const getBundlePresentation = (product: FormSource): "gel" | "cream" | null => {
  const text = `${product.name} ${product.nameEn} ${product.slug}`.toLowerCase();
  if (/جل|جيل|\bgel\b/.test(text)) return "gel";
  if (/كريم|\bcream\b/.test(text)) return "cream";
  return null;
};

/**
 * يحدد نوع المنتج الظاهر في الباقة. النوع هنا هو الشكل/الصنف التجاري
 * (عسل، جل، كريم، شوكولاتة، بخاخ...) وليس مجرد اختلاف الاسم.
 */
export const getBundleProductType = (
  product: FormSource,
):
  | "tablet"
  | "capsule"
  | "gel"
  | "cream"
  | "honey"
  | "chocolate"
  | "spray"
  | "drops"
  | "gum"
  | "wipes"
  | "sachet"
  | "coffee"
  | "digital-pump"
  | "vacuum-kit"
  | "manual-pump"
  | "breast-kit"
  | "traction-device"
  | "electric-pump"
  | "other" => {
  const text = `${product.name} ${product.nameEn} ${product.slug}`.toLowerCase();
  const oralForm = getOralSolidForm(product);
  if (oralForm) return oralForm;
  const presentation = getBundlePresentation(product);
  if (presentation) return presentation;
  if (/عسل|honey/.test(text)) return "honey";
  if (/شيكول|شوكول|chocolate/.test(text)) return "chocolate";
  if (/بخاخ|spray/.test(text)) return "spray";
  if (/قطر|قطرات|drops/.test(text)) return "drops";
  if (/علك|لبان|gum/.test(text)) return "gum";
  if (/مناديل|wipes/.test(text)) return "wipes";
  if (/أكياس|sachet/.test(text)) return "sachet";
  if (/قهوة|coffee/.test(text)) return "coffee";

  if (product.category === "devices") {
    if (/رقمية|digital/.test(text)) return "digital-pump";
    if (/حقيبة|kit/.test(text) && /صدر|breast/.test(text)) return "breast-kit";
    if (/حقيبة|kit/.test(text)) return "vacuum-kit";
    if (/شد|إطالة|traction/.test(text)) return "traction-device";
    if (/كهرب|electric/.test(text)) return "electric-pump";
    if (/يدوية|manual/.test(text)) return "manual-pump";
  }

  return "other";
};
