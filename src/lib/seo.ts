/**
 * Helpers لإدارة الـ SEO على مستوى الـ SPA:
 * - تحديث <title>, meta description, og tags, twitter, canonical
 * - حقن JSON-LD (Schema.org)
 */

const SITE_URL = "https://elysrmedical.com"; // غيّره عند الإطلاق
const DEFAULT_OG = `${SITE_URL}/og-default.png`;

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
  const title = meta.title ?? "اليسر ميديكال — منتجات طبية وصحية بأسعار الاستيراد";
  const description =
    meta.description ??
    "اليسر ميديكال - رقم 1 في المنتجات الطبية والصحية في مصر. توصيل سري ودفع عند الاستلام.";
  const image = meta.image ?? DEFAULT_OG;

  document.title = title;

  setMeta('meta[name="description"]', "content", description);
  setMeta('meta[name="robots"]', "content", meta.noindex ? "noindex,nofollow" : "index,follow");

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

// Schema builders جاهزة
export const productSchema = (p: {
  id: string;
  name: string;
  description: string;
  price: number;
  rating: number;
  reviews: number;
  stock: number;
  image?: string;
}) => ({
  "@context": "https://schema.org",
  "@type": "Product",
  name: p.name,
  description: p.description,
  sku: p.id,
  image: p.image ?? DEFAULT_OG,
  offers: {
    "@type": "Offer",
    price: p.price,
    priceCurrency: "EGP",
    availability: p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    url: `${SITE_URL}/products/${p.id}`,
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: p.rating,
    reviewCount: p.reviews,
  },
  brand: { "@type": "Brand", name: "Elysr Medical" },
});

export const articleSchema = (a: {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  readMin: number;
}) => ({
  "@context": "https://schema.org",
  "@type": "Article",
  headline: a.title,
  description: a.excerpt,
  image: DEFAULT_OG,
  articleSection: a.category,
  timeRequired: `PT${a.readMin}M`,
  inLanguage: "ar-EG",
  mainEntityOfPage: {
    "@type": "WebPage",
    "@id": `${SITE_URL}/education/${a.slug}`,
  },
  author: {
    "@type": "Organization",
    name: "Elysr Medical Group",
    url: SITE_URL,
  },
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
