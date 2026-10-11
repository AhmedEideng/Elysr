/**
 * (2026-10-11) النسخة الإنجليزية الجزئية — مصدر واحد للنصوص والـ hreflang.
 * قاعدة المحتوى: ترجمة أمينة للادعاءات الموجودة فعلياً في النسخة العربية
 * (نفس الميتا والهيرو والأسئلة الشائعة نصاً) — لا ادعاءات جديدة إطلاقاً.
 * الحدود: title ≤ 70 حرفاً وdescription ≤ 155 حرفاً مثل النسخة العربية.
 */

export interface EnFaq {
  question: string;
  answer: string;
}

export interface EnCategoryPage {
  /** مسار الصفحة الإنجليزية */
  path: string;
  /** مسار مقابلها العربي (لـ hreflang ولرابط التبديل) */
  arPath: string;
  title: string;
  description: string;
  eyebrow: string;
  heroTitle: string;
  heroDescription: string;
  faqs: EnFaq[];
  /** تصنيف الكتالوج العربي المعروض بقوائم nameEn */
  category: "men" | "women" | "devices";
  listLabel: string;
}

export const enHome = {
  path: "/en",
  arPath: "/",
  title: "Elysr Medical | Original Marital Health Products in Egypt",
  description:
    "Egypt's largest specialist in original marital health products for men and women: carefully selected originals, discreet shipping, cash on delivery.",
  h1: "Elysr Medical — Original Marital Health Products in Egypt",
  intro:
    "Elysr Medical is Egypt's largest company specialized in original marital health and happiness products for men and women. Carefully selected original products, discreet shipping and cash on delivery.",
  browseLabel: "Browse by category",
  noteLabel:
    "The full catalog, buying guides and educational articles are available in Arabic.",
  switchLabel: "العربية",
};

export const enCategories: EnCategoryPage[] = [
  {
    path: "/en/products/men",
    arPath: "/products/men",
    title: "Men's Marital Health Products in Egypt | Elysr Medical",
    description:
      "Original men's marital health products in Egypt: supplements, honey, gels and sprays for energy and performance. Discreet shipping, cash on delivery.",
    eyebrow: "Men's Health",
    heroTitle: "Men's Marital Health Products",
    heroDescription:
      "Carefully selected dietary supplements, royal honey, sprays, creams and topical gels supporting men's marital health, with privacy and discreet shipping across Egypt.",
    listLabel: "All men's products",
    category: "men",
    faqs: [
      {
        question: "What are men's marital health products?",
        answer:
          "They are selected products that support a man's needs within marriage, such as energy and vitality, timing control, comfort and confidence. The right choice depends on your health condition and type of need, and consulting a doctor is necessary with chronic diseases or when taking other medications.",
      },
      {
        question: "How do I choose between honey, capsules, gel or spray?",
        answer:
          "Honey and supplements usually support energy and vitality, while topical products such as gels or sprays are used per their instructions for a specific need. Read each product's description, ingredients and usage instructions, and do not combine more than one strong product at the same time without specialist advice.",
      },
      {
        question: "Are men's marital happiness products safe?",
        answer:
          "Safety depends on the ingredients, dose, product source and your health condition. Do not use any product if you take heart, blood pressure or nitrate medications except after consulting your doctor. All orders at Elysr Medical are shipped discreetly with clear usage instructions for each product.",
      },
      {
        question: "Is there discreet shipping for men's marital health products inside Egypt?",
        answer:
          "Yes, orders ship in neutral, discreet packaging to all governorates, with no indication of the product's nature on the outer package to protect your privacy.",
      },
      {
        question: "When should I consult a doctor before using marital health products?",
        answer:
          "Consult a doctor if you have heart, blood pressure, diabetes, liver or kidney disease, take chronic medications, or have a known allergy to any ingredient. The content and products are not a substitute for specialized medical advice.",
      },
    ],
  },
  {
    path: "/en/products/women",
    arPath: "/products/women",
    title: "Women's Marital Health Products in Egypt | Elysr Medical",
    description:
      "Original women's marital health products in Egypt: drops, honey, gels and selected products for comfort and vitality. Discreet shipping, cash on delivery.",
    eyebrow: "Women's Health",
    heroTitle: "Women's Marital Health Products",
    heroDescription:
      "Carefully selected products supporting comfort, lubrication, vitality and confidence in marriage for women, with full commitment to privacy and discreet delivery.",
    listLabel: "All women's products",
    category: "women",
    faqs: [
      {
        question: "What are women's marital health products?",
        answer:
          "They are selected products supporting comfort, vitality, lubrication, confidence and a better marital experience for women. The choice method varies by need and product type; reading ingredients and instructions and consulting a doctor during pregnancy or breastfeeding or with chronic diseases is preferred.",
      },
      {
        question: "How do I choose between drops, honey, gel or topical products?",
        answer:
          "Drops and honey usually support vitality, mood and energy, while gels and topical products are used for needs such as lubrication or local comfort per the product's instructions. Do not use more than one product at the same time without understanding the ingredients or consulting a specialist.",
      },
      {
        question: "Are women's marital happiness products suitable for all women?",
        answer:
          "Not all products suit everyone. Avoid any product containing ingredients you may be allergic to, and consult a doctor during pregnancy and breastfeeding, hormone disorders, chronic diseases or regular medication use.",
      },
      {
        question: "Is shipping discreet for women's marital health products?",
        answer:
          "Yes, orders are prepared in neutral, discreet packaging, and the product's nature is not mentioned on the outer package to protect privacy in all governorates of Egypt.",
      },
      {
        question: "Can I pay on delivery?",
        answer:
          "Yes, you can complete your order via WhatsApp or direct order, with cash on delivery available depending on the governorate and the shipping details available at order confirmation.",
      },
    ],
  },
  {
    path: "/en/products/devices",
    arPath: "/products/devices",
    title: "Medical Devices & Supplies — Elysr Medical",
    description:
      "Marital health devices and medical supplies: vacuum pumps, traction devices and rehabilitation tools, clearly described quality, discreet shipping.",
    eyebrow: "Medical Devices",
    heroTitle: "Medical Devices & Supplies",
    heroDescription:
      "Reliable, carefully selected medical devices and supplies, with high quality and discreet shipping to all governorates for a safer, more professional experience.",
    listLabel: "All devices & supplies",
    category: "devices",
    faqs: [
      {
        question: "What medical devices and supplies are available in this section?",
        answer:
          "The section includes carefully selected vacuum pumps, traction devices and rehabilitation tools supporting marital health needs, with a clear description for each product on its page.",
      },
      {
        question: "How do I choose the right device for me?",
        answer:
          "Read the product description, usage instructions and warnings stated on its page, and choose according to your need. If you have a chronic health condition or take medications, consult your doctor before use.",
      },
      {
        question: "Is shipping discreet for medical devices and supplies?",
        answer:
          "Yes, all orders ship in completely neutral packaging that does not reveal the product's nature, and no content details are written on the outer package or the shipping policy.",
      },
      {
        question: "Can I pay on delivery?",
        answer:
          "Yes, you can complete your order via WhatsApp or direct order, with cash on delivery available depending on the governorate and the shipping details available at order confirmation.",
      },
      {
        question: "What is the return policy for devices?",
        answer:
          "You are entitled to exchange or return within 14 days from the receipt date, provided the product is unopened and in its original condition, and the refund is processed within 7 business days after inspection.",
      },
    ],
  },
];

/** خرائط التقابل عربي/إنجليزي للـ hreflang (الرئيسية + 3 فئات). */
export const hreflangMap: Record<string, string> = {
  "/": "/en",
  "/products/men": "/en/products/men",
  "/products/women": "/en/products/women",
  "/products/devices": "/en/products/devices",
  "/en": "/",
  "/en/products/men": "/products/men",
  "/en/products/women": "/products/women",
  "/en/products/devices": "/products/devices",
};

/**
 * قائمة alternates الكاملة لصفحة معطاة: النسخة العربية، الإنجليزية، وx-default
 * (العربية هي الافتراضية للموقع). تُستخدم في الـ prerender والـ sitemap ووقت التشغيل.
 */
export function alternatesFor(path: string): { lang: string; href: string }[] {
  const other = hreflangMap[path];
  if (!other) return [];
  const isEn = path.startsWith("/en");
  const ar = isEn ? other : path;
  const en = isEn ? path : other;
  return [
    { lang: "ar", href: ar },
    { lang: "en", href: en },
    { lang: "x-default", href: ar },
  ];
}
