/**
 * Helpers لإدارة الـ SEO على مستوى الـ SPA:
 * - تحديث <title>, meta description, og tags, twitter, canonical
 * - حقن JSON-LD (Schema.org)
 */

import { assetUrl } from "@/lib/cache";
import { PRODUCT_META_PROFILES } from "@/data/product-meta";
import {
  getProductReviews,
  reviewDatePublished,
  VISIBLE_REVIEW_COUNT,
  type ProductCategory,
} from "@/lib/legacy-product-reviews";
import { GOVERNORATE_SHIPPING, getShippingDeliveryWindow } from "@/lib/site-config";

const SITE_URL = "https://elysrmedical.store";

/**
 * يبني meta description بطول مثالي (~150-155 حرف) للظهور الكامل في نتائج Google.
 * يقطع عند حدود كلمة ويضيف "…" عند الاقتطاع. يُستخدم للـ meta description فقط
 * (الوصف الكامل يبقى في JSON-LD والمحتوى الفعلي).
 */
export function makeMetaDescription(text = "", maxLength = 155): string {
  const clean = String(text).trim().replace(/\s+/g, " ");
  if (clean.length <= maxLength) return clean;
  const cut = clean.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  const base = lastSpace > 40 ? cut.slice(0, lastSpace) : cut;
  return `${base}…`;
}

/**
 * Returns the product title for <title>/og:title.
 *
 * The limit only guards against runaway names: every catalog name (max 65
 * chars) is emitted verbatim, so the prerendered HTML and the hydrated head
 * show the identical, untruncated product name — Google decides display
 * truncation itself.
 */
export function makeProductMetaTitle(name: string, maxLength = 70): string {
  const clean = String(name).trim().replace(/\s+/g, " ");
  if (clean.length <= maxLength) return clean;

  const cut = clean.slice(0, Math.max(1, maxLength - 1));
  const lastSpace = cut.lastIndexOf(" ");
  let base = lastSpace > 20 ? cut.slice(0, lastSpace) : cut;
  const openParen = base.lastIndexOf("(");
  const closeParen = base.lastIndexOf(")");
  if (openParen > closeParen && openParen > base.length - 28) {
    base = base.slice(0, openParen).trimEnd();
  }
  return `${base.trimEnd()}…`;
}

type ProductMetaCategory = "men" | "women" | "devices";

type ProductMetaInput = {
  id?: string;
  name: string;
  nameEn?: string;
  category?: ProductMetaCategory;
  description: string;
  stock?: number;
  rating?: number;
  reviews?: number;
  benefits?: string[];
  ingredients?: string;
  usage?: string;
};

type ResolvedProductMetaProfile = {
  hook: string;
  form: "oral" | "topical" | "device";
};

const TOPICAL_NAME_PATTERN =
  /(?:^|[\s(،؛,:])(?:كريم|جل|بخاخ|رذاذ|مناديل|cream|gel|spray|wipes)(?=$|[\s)،؛,.:_-])/i;

/**
 * Product form is resolved from an explicit, reviewed profile keyed by the
 * stable product id. The fallback deliberately looks only at the product name
 * and category; ingredients/usage are not allowed to classify the product.
 */
function resolveProductMetaProfile(p: ProductMetaInput): ResolvedProductMetaProfile {
  if (p.id && PRODUCT_META_PROFILES[p.id]) return PRODUCT_META_PROFILES[p.id];
  if (p.category === "devices") return { form: "device", hook: "جهاز للاستخدام الشخصي" };
  if (TOPICAL_NAME_PATTERN.test(`${p.name} ${p.nameEn ?? ""}`)) {
    return { form: "topical", hook: "منتج موضعي للاستخدام الخارجي" };
  }
  if (p.category === "women") return { form: "oral", hook: "منتج للنساء بتركيبة عملية" };
  return { form: "oral", hook: "مكمل غذائي للرجال" };
}

function productAudienceSuffix(p: ProductMetaInput, hook: string): string {
  if (p.category === "devices") return "";
  const context = `${p.name} ${p.nameEn ?? ""} ${hook}`;
  if (
    /للرجال|للنساء|للزوجين|for men|for women|for him|for her|\bman\b|\bwomen\b|\bmen\b/i.test(
      context,
    )
  ) {
    return "";
  }
  return p.category === "women" ? " للنساء" : " للرجال";
}

function compactPhrase(text: string, maxLength: number): string {
  const clean = String(text).trim().replace(/\s+/g, " ");
  if (clean.length <= maxLength) return clean;
  const cut = clean.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 12 ? cut.slice(0, lastSpace) : cut).trimEnd();
}

function compactProductName(name: string, maxLength = 46): string {
  const clean = String(name).trim().replace(/\s+/g, " ");
  if (clean.length <= maxLength) return clean;

  // Keep the Arabic product identity first; the English name remains in the
  // title, visible product heading, and Product structured data.
  const withoutEnglish = clean.replace(/\s*\([^)]*\)\s*$/, "").trim();
  const candidate = withoutEnglish || clean;
  if (candidate.length <= maxLength) return candidate;

  const cut = candidate.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 20 ? cut.slice(0, lastSpace) : cut).trimEnd();
}

/**
 * Builds a short, factual product-specific snippet instead of repeating a
 * category template. The reviewed profile contributes the product form and a
 * concrete pack/ingredient/feature hook; it never adds price, ratings, brand
 * identity, or medical outcomes that are not already in the product data.
 */
export function makeProductMetaDescription(p: ProductMetaInput, maxLength = 155): string {
  const profile = resolveProductMetaProfile(p);
  const name = compactProductName(p.name);
  const hook = `${profile.hook}${productAudienceSuffix(p, profile.hook)}`;
  const availability = p.stock === 0 ? "غير متوفر حالياً" : "اطلب الآن";
  const brand = "اليسر ميديكال";
  const tail = `${availability}؛ شحن سري ودفع عند الاستلام. ${brand}.`;

  const variants = [
    `${name} — ${hook}. ${tail}`,
    `${compactProductName(p.name, 40)} — ${compactPhrase(hook, 44)}. ${tail}`,
    `${compactProductName(p.name, 34)} — ${compactPhrase(hook, 34)}. ${tail}`,
  ];

  const complete = variants.find((variant) => variant.length <= maxLength);
  if (complete) return complete;

  // Keep the sentence complete even for a future unusually long product name.
  return `${compactProductName(p.name, 30)} — ${tail}`;
}
const DEFAULT_OG = `${SITE_URL}/og-default.webp`;

function oneYearFromToday(): string {
  return new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function absoluteUrl(url?: string): string {
  if (!url) return DEFAULT_OG;
  if (/^https?:\/\//i.test(url)) return url;
  return `${SITE_URL}${url.startsWith("/") ? url : `/${url}`}`;
}

/**
 * Structured data + social previews use the plain absolute image URL.
 *
 * The cache-busting `?v=N` suffix belongs to on-page <img> tags only: adding it
 * here made the hydrated og:image/Product schema disagree with the identical
 * value the prerendered HTML already declares.
 */
function absoluteProductImage(url?: string): string {
  if (!url) return DEFAULT_OG;
  // نفس suffix كسر الكاش الذي يستخدمه الفيد والـ og:image في نسخة الـ prerender:
  // عنوان صورة جديد يجبر جوجل على إعادة جلبها بدل الاعتماد على مصغّرة قديمة.
  return absoluteUrl(assetUrl(url));
}

export interface SeoMeta {
  title?: string;
  description?: string;
  image?: string;
  type?: "website" | "article" | "product";
  noindex?: boolean;
}

function setMeta(selector: string, attr: string, value: string) {
  let el = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    const [, key, val] = selector.match(/\[(.+?)="(.+?)"\]/) ?? [];
    if (key && val) el.setAttribute(key, val);
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
}

function setLink(rel: string, href: string) {
  let el = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

export function applySeo(meta: SeoMeta = {}) {
  const path = typeof window !== "undefined" ? window.location.pathname : "/";
  const url = `${SITE_URL}${path}`;
  const title =
    meta.title ?? "اليسر ميديكال — أكبر شركة متخصصة في منتجات الصحة الزوجية الأصلية في مصر";
  const description =
    meta.description ??
    "اليسر ميديكال أكبر شركة متخصصة في منتجات الصحة الزوجية الأصلية للرجال والنساء في مصر. منتجات أصلية مختارة بعناية، شحن سري ودفع عند الاستلام.";
  const image = absoluteUrl(meta.image);

  document.title = title;

  setMeta('meta[name="description"]', "content", description);
  // Use richer robots directive on indexable pages so Google can preview large images
  // and longer snippets (better SERP CTR).
  const robotsContent = meta.noindex
    ? "noindex,follow,noarchive,nosnippet,noimageindex"
    : "index,follow,max-image-preview:large,max-snippet:-1";
  setMeta('meta[name="robots"]', "content", robotsContent);
  // A Google-specific tag exists in the HTML template, so it must be updated too;
  // otherwise it can override the general robots directive after SPA navigation.
  setMeta('meta[name="googlebot"]', "content", robotsContent);

  // Open Graph
  setMeta('meta[property="og:title"]', "content", title);
  setMeta('meta[property="og:description"]', "content", description);
  setMeta('meta[property="og:type"]', "content", meta.type ?? "website");
  setMeta('meta[property="og:url"]', "content", url);
  setMeta('meta[property="og:image"]', "content", image);
  setMeta('meta[property="og:locale"]', "content", "ar_EG");

  // Twitter
  setMeta('meta[name="twitter:card"]', "content", "summary_large_image");
  setMeta('meta[name="twitter:title"]', "content", title);
  setMeta('meta[name="twitter:description"]', "content", description);
  setMeta('meta[name="twitter:image"]', "content", image);

  // Canonical
  setLink("canonical", url);
}

/**
 * يحقن JSON-LD في <head> مع id محدد لتجنّب التكرار.
 */
export function injectJsonLd(id: string, data: Record<string, unknown>) {
  const tagId = `ldjson-${id}`;
  let el = document.getElementById(tagId) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement("script");
    el.id = tagId;
    el.type = "application/ld+json";
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

export function clearJsonLd(id: string) {
  document.getElementById(`ldjson-${id}`)?.remove();
}

/**
 * يزيل سكربتات JSON-LD التي حُقنت وقت الـ prerender (data-prerender)
 * حتى لا تتكرر مع النسخ التي يحقنها React بعد الـ hydration.
 * تُستدعى مرة واحدة قبل injectJsonLd في صفحات المنتجات/المقالات/الفئات.
 */
export function clearPrerenderJsonLd() {
  document
    .querySelectorAll('script[type="application/ld+json"][data-prerender]')
    .forEach((el) => el.remove());
}

// Schema builders جاهزة
/** Merchant shipping bands generated from the same governorate config used at checkout. */
export function merchantShippingDetails() {
  type ShippingBand = {
    rate: number;
    regions: string[];
    delivery: ReturnType<typeof getShippingDeliveryWindow>;
  };

  // Group by both price and delivery window so the schema cannot claim
  // 1–5 days for Cairo/Giza when the customer-facing policy says 24–48 hours.
  const byBand = new Map<string, ShippingBand>();
  for (const entry of GOVERNORATE_SHIPPING) {
    const delivery = getShippingDeliveryWindow(entry.name);
    const key = `${entry.shipping}:${delivery.key}`;
    const band = byBand.get(key) ?? { rate: entry.shipping, regions: [], delivery };
    band.regions.push(entry.name);
    byBand.set(key, band);
  }

  return [...byBand.values()].map(({ rate, regions, delivery }) => ({
    "@type": "OfferShippingDetails",
    shippingDestination: {
      "@type": "DefinedRegion",
      addressCountry: "EG",
      addressRegion: regions,
    },
    shippingRate: {
      "@type": "MonetaryAmount",
      value: rate,
      currency: "EGP",
    },
    deliveryTime: {
      "@type": "ShippingDeliveryTime",
      // The public promise is already a total delivery window. Keep handling
      // at zero here so transitTime matches the visible 1–2 / 2–4 day range.
      handlingTime: {
        "@type": "QuantitativeValue",
        minValue: 0,
        maxValue: 0,
        unitCode: "DAY",
      },
      transitTime: {
        "@type": "QuantitativeValue",
        minValue: delivery.minDays,
        maxValue: delivery.maxDays,
        unitCode: "DAY",
      },
    },
  }));
}

export const productSchema = (p: {
  id: string;
  slug: string;
  name: string;
  nameEn?: string;
  searchAliases?: string[];
  brand?: string;
  mpn?: string;
  gtin?: string;
  description: string;
  price: number;
  stock: number;
  approvedReviewSummary?: { ratingValue: number; reviewCount: number };
  category?: string;
  image?: string;
}) => {
  // الـ markup يعكس المحتوى المرئي حرفياً: نفس دالة الاختيار الحتمية ونفس
  // العدد الذي تعرضه واجهة React (مصدر وحيد VISIBLE_REVIEW_COUNT).
  const reviewCategory: ProductCategory | null =
    p.category === "men" || p.category === "women" || p.category === "devices" ? p.category : null;
  const visibleReviews =
    reviewCategory && p.approvedReviewSummary
      ? getProductReviews(p.slug, reviewCategory, VISIBLE_REVIEW_COUNT).reviews
      : [];
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    // Search aliases must stay in both copies (prerender + hydrated) so the
    // initial HTML and the rendered DOM never declare different structured data.
    ...(p.searchAliases?.length ? { alternativeName: p.searchAliases } : {}),
    description: p.description,
    sku: p.id,
    ...(p.mpn?.trim() ? { mpn: p.mpn.trim() } : {}),
    ...(p.gtin?.trim() ? { gtin: p.gtin.trim() } : {}),
    image: absoluteProductImage(p.image),
    ...(p.approvedReviewSummary &&
    Number.isFinite(p.approvedReviewSummary.ratingValue) &&
    p.approvedReviewSummary.ratingValue >= 1 &&
    p.approvedReviewSummary.ratingValue <= 5 &&
    Number.isInteger(p.approvedReviewSummary.reviewCount) &&
    p.approvedReviewSummary.reviewCount >= 1
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: p.approvedReviewSummary.ratingValue,
            reviewCount: p.approvedReviewSummary.reviewCount,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
    ...(visibleReviews.length
      ? {
          review: visibleReviews.map((r) => ({
            "@type": "Review",
            author: { "@type": "Person", name: r.name },
            ...(reviewDatePublished(r) ? { datePublished: reviewDatePublished(r) } : {}),
            reviewBody: r.text,
            reviewRating: {
              "@type": "Rating",
              ratingValue: r.rating,
              bestRating: 5,
              worstRating: 1,
            },
          })),
        }
      : {}),
    offers: {
      "@type": "Offer",
      price: p.price,
      priceCurrency: "EGP",
      availability: p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `${SITE_URL}/products/${p.slug}`,
      priceValidUntil: oneYearFromToday(),
      validFrom: "2026-01-01",
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "EG",
        returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
        merchantReturnDays: 14,
        returnMethod: "https://schema.org/ReturnByMail",
        returnFees: "https://schema.org/ReturnFeesCustomerResponsibility",
      },
      shippingDetails: merchantShippingDetails(),
    },
    ...(p.brand?.trim() ? { brand: { "@type": "Brand", name: p.brand.trim() } } : {}),
  };
};

export const articleSchema = (a: {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  readMin: number;
  image?: string;
  author?: { name: string; role: string; credentials: string };
  reviewer?: { name: string; role: string; credentials: string };
  // (2026-09-17) إلزامي بلا fallback: تاريخ ناقص = الحقل بيختفي من
  // الـ schema (JSON بيحذف undefined) — أفضل من تاريخ مزيف (Trust).
  publishedAt: string;
  updatedAt: string;
  sources?: { title: string; url: string; publisher: string }[];
}) => ({
  "@context": "https://schema.org",
  "@type": "Article",
  headline: a.title,
  description: a.excerpt,
  image: absoluteUrl(a.image),
  articleSection: a.category,
  timeRequired: `PT${a.readMin}M`,
  inLanguage: "ar-EG",
  mainEntityOfPage: {
    "@type": "WebPage",
    "@id": `${SITE_URL}/education/${a.slug}`,
  },
  // (2026-09-17) مفيش أي fallback مزيف: التاريخ حق المقال الحقيقي
  // (data-integrity بتتأكد منه) — و لو ناقص، الحقل بيختفي من الـ schema
  // بدل ما نطبع 2025-01-01 أو "اليوم" (Trust issue في الـ YMYL niche).
  datePublished: a.publishedAt,
  dateModified: a.updatedAt,
  author: {
    "@type": "Person",
    // (2026-09-16) ربط هوكلية بذات كيان المؤسس في /about (نفس الـ @id) —
    // كل المقالات 56 + صفحة من نحن تشير لـ Person واحد صاحب الاعتمادات
    // (إشارة E-E-A-T واضحة بدل 56 كيانًا منفصلًا).
    "@id": `${SITE_URL}/about#founder`,
    name: a.author?.name ?? "د. أحمد عابد",
    description: a.author?.credentials,
    jobTitle: a.author?.role ?? "إعداد ومراجعة المحتوى",
    url: `${SITE_URL}/about`,
    worksFor: {
      "@type": "Organization",
      name: "اليسر ميديكال",
      url: SITE_URL,
    },
  },
  // Prerender parity: the static HTML declares each citation as a CreativeWork
  // (title + publisher) and the publisher as the Arabic brand name. Both copies
  // must stay identical or Google sees two different Article entities.
  citation:
    a.sources?.map((source) => ({
      "@type": "CreativeWork",
      name: source.title,
      url: source.url,
      publisher: { "@type": "Organization", name: source.publisher },
    })) ?? [],
  publisher: {
    "@type": "Organization",
    name: "اليسر ميديكال",
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/logo.png`,
    },
  },
});

export const breadcrumbSchema = (items: { name: string; url: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((it, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: it.name,
    item: `${SITE_URL}${it.url}`,
  })),
});

/**
 * FAQPage schema — Google يعرضها كـ rich result expandable
 * مباشرة في نتائج البحث (يمكن أن يضاعف الـ CTR).
 */
export const faqSchema = (faqs: { question: string; answer: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: f.answer,
    },
  })),
});

/**
 * ItemList schema — لصفحات الفئات (men/women/devices).
 * يساعد Google يفهم أن الصفحة قائمة منتجات مرتبة.
 */
export const itemListSchema = (
  items: { id?: string; name: string; slug: string; image?: string; price: number }[],
  listName: string,
) => {
  const indexableItems = items;
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: listName,
    numberOfItems: indexableItems.length,
    itemListElement: indexableItems.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE_URL}/products/${it.slug}`,
      name: it.name,
      image: it.image ? absoluteUrl(it.image) : undefined,
    })),
  };
};
