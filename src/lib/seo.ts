/**
 * Helpers لإدارة الـ SEO على مستوى الـ SPA:
 * - تحديث <title>, meta description, og tags, twitter, canonical
 * - حقن JSON-LD (Schema.org)
 */

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
const DEFAULT_OG = `${SITE_URL}/og-default.webp`;

function oneYearFromToday(): string {
  return new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function absoluteUrl(url?: string): string {
  if (!url) return DEFAULT_OG;
  if (/^https?:\/\//i.test(url)) return url;
  return `${SITE_URL}${url.startsWith("/") ? url : `/${url}`}`;
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
  const title = meta.title ?? "اليسر — منتجات الصحة الزوجية الأصلية في مصر | شحن سري";
  const description =
    meta.description ??
    "اليسر أكبر شركة متخصصة في منتجات الصحة الزوجية الأصلية للرجال والنساء في مصر. شحن سري وتغليف محايد ودفع عند الاستلام مع دعم متخصص عبر واتساب.";
  const image = absoluteUrl(meta.image);

  document.title = title;

  setMeta('meta[name="description"]', "content", description);
  // Use richer robots directive on indexable pages so Google can preview large images
  // and longer snippets (better SERP CTR).
  setMeta(
    'meta[name="robots"]',
    "content",
    meta.noindex ? "noindex,follow" : "index,follow,max-image-preview:large,max-snippet:-1",
  );

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
export const productSchema = (p: {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  rating: number;
  reviews: number;
  stock: number;
  image?: string;
}) => {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description,
    sku: p.id,
    mpn: p.id,
    image: absoluteUrl(p.image),
    // ⭐ aggregateRating — قيم معقولة (reviewCount 5-13) مطابقة لما يظهر على الصفحة
    ...(p.reviews > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: Math.max(0, Math.min(5, Number(p.rating ?? 0))),
            reviewCount: Math.max(0, Math.floor(p.reviews ?? 0)),
            bestRating: 5,
            worstRating: 1,
          },
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
        returnFees: "https://schema.org/ReturnShippingFees",
        returnShippingFeesAmount: {
          "@type": "MonetaryAmount",
          value: 50,
          currency: "EGP",
        },
      },
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingDestination: {
          "@type": "DefinedRegion",
          addressCountry: "EG",
        },
        shippingRate: {
          "@type": "MonetaryAmount",
          value: 50,
          currency: "EGP",
        },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          handlingTime: {
            "@type": "QuantitativeValue",
            minValue: 0,
            maxValue: 1,
            unitCode: "DAY",
          },
          transitTime: {
            "@type": "QuantitativeValue",
            minValue: 1,
            maxValue: 5,
            unitCode: "DAY",
          },
        },
      },
    },
    brand: { "@type": "Brand", name: "Elysr Medical" },
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
  publishedAt?: string;
  updatedAt?: string;
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
  datePublished: a.publishedAt ?? "2025-01-01",
  dateModified: a.updatedAt ?? new Date().toISOString().slice(0, 10),
  author: {
    "@type": "Person",
    name: a.author?.name ?? "د. أحمد عيد",
    description: a.author?.credentials,
    jobTitle: a.author?.role ?? "إعداد ومراجعة المحتوى",
    url: `${SITE_URL}/medical-review-board`,
    worksFor: {
      "@type": "Organization",
      name: "اليسر ميديكال",
      url: SITE_URL,
    },
  },
  reviewedBy: {
    "@type": "Organization",
    name: a.reviewer?.name ?? "هيئة المراجعة الطبية — اليسر ميديكال",
    description: a.reviewer?.credentials,
    url: `${SITE_URL}/medical-review-board`,
  },
  citation:
    a.sources?.map((source) => ({
      "@type": "CreativeWork",
      name: source.title,
      url: source.url,
      publisher: { "@type": "Organization", name: source.publisher },
    })) ?? [],
  publisher: {
    "@type": "Organization",
    name: "Elysr Medical Group",
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
  items: { name: string; slug: string; image?: string; price: number }[],
  listName: string,
) => ({
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: listName,
  numberOfItems: items.length,
  itemListElement: items.map((it, i) => ({
    "@type": "ListItem",
    position: i + 1,
    url: `${SITE_URL}/products/${it.slug}`,
    name: it.name,
    image: it.image ? absoluteUrl(it.image) : undefined,
  })),
});
