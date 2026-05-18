import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DIST = resolve(ROOT, "dist");
const SITE_URL = process.env.SITE_URL || "https://elysrmedical.com";

/** تنظيف HTML entities */
function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function prerender() {
  if (!existsSync(resolve(DIST, "index.html"))) {
    console.error("dist/index.html not found. Run npm run build first.");
    process.exit(1);
  }

  const template = readFileSync(resolve(DIST, "index.html"), "utf-8");

  const vite = await createServer({
    server: { middlewareMode: true },
    appType: "custom",
  });

  try {
    const { products } = await vite.ssrLoadModule("/src/data/products.ts");

    // Create products directory
    const productsDir = resolve(DIST, "products");
    if (!existsSync(productsDir)) mkdirSync(productsDir, { recursive: true });

    for (const product of products) {
      const title = escapeHtml(`${product.name} — اليسر ميديكال`);
      const desc = escapeHtml(product.description);
      const img = product.image ? `${SITE_URL}${product.image}` : `${SITE_URL}/favicon.svg`;

      // توليد JSON-LD للمنتج مباشرة في HTML
      const productJsonLd = {
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.name,
        description: product.description,
        sku: product.id,
        image: img,
        offers: {
          "@type": "Offer",
          price: product.price,
          priceCurrency: "EGP",
          availability:
            product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          url: `${SITE_URL}/products/${product.id}`,
        },
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: product.rating,
          reviewCount: product.reviews,
        },
        brand: { "@type": "Brand", name: "Elysr Medical" },
      };

      let html = template;

      html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`);
      html = html.replace(
        /<meta name="description"[^>]*>/,
        `<meta name="description" content="${desc}" />`,
      );
      html = html.replace(
        /<meta property="og:title"[^>]*>/,
        `<meta property="og:title" content="${title}" />`,
      );
      html = html.replace(
        /<meta property="og:description"[^>]*>/,
        `<meta property="og:description" content="${desc}" />`,
      );

      if (html.includes('<meta property="og:image"')) {
        html = html.replace(
          /<meta property="og:image"[^>]*>/,
          `<meta property="og:image" content="${img}" />`,
        );
      } else {
        html = html.replace("</head>", `  <meta property="og:image" content="${img}" />\n</head>`);
      }

      if (html.includes('<meta name="twitter:image"')) {
        html = html.replace(
          /<meta name="twitter:image"[^>]*>/,
          `<meta name="twitter:image" content="${img}" />`,
        );
      } else {
        html = html.replace("</head>", `  <meta name="twitter:image" content="${img}" />\n</head>`);
      }

      // حقن JSON-LD مباشرة في HTML
      const jsonLdTag = `<script type="application/ld+json" id="prerender-product">${JSON.stringify(productJsonLd)}</script>`;
      html = html.replace("</head>", `${jsonLdTag}\n</head>`);

      writeFileSync(resolve(DIST, "products", `${product.id}.html`), html);
      console.log(`Prerendered: /products/${product.id}`);
    }

    // Articles
    try {
      const { articles } = await vite.ssrLoadModule("/src/data/articles.ts");
      const eduDir = resolve(DIST, "education");
      if (!existsSync(eduDir)) mkdirSync(eduDir, { recursive: true });

      for (const article of articles) {
        const title = escapeHtml(`${article.title} — اليسر ميديكال`);
        const desc = escapeHtml(article.excerpt);
        const img = article.image || `${SITE_URL}/favicon.svg`;

        const articleJsonLd = {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: article.title,
          description: article.excerpt,
          image: img,
          articleSection: article.category,
          inLanguage: "ar-EG",
          mainEntityOfPage: {
            "@type": "WebPage",
            "@id": `${SITE_URL}/education/${article.slug}`,
          },
          author: {
            "@type": "Organization",
            name: "Elysr Medical Group",
          },
        };

        let html = template;
        html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`);
        html = html.replace(
          /<meta name="description"[^>]*>/,
          `<meta name="description" content="${desc}" />`,
        );
        html = html.replace(
          /<meta property="og:title"[^>]*>/,
          `<meta property="og:title" content="${title}" />`,
        );
        html = html.replace(
          /<meta property="og:description"[^>]*>/,
          `<meta property="og:description" content="${desc}" />`,
        );

        if (html.includes('<meta property="og:image"')) {
          html = html.replace(
            /<meta property="og:image"[^>]*>/,
            `<meta property="og:image" content="${img}" />`,
          );
        } else {
          html = html.replace(
            "</head>",
            `  <meta property="og:image" content="${img}" />\n</head>`,
          );
        }

        const jsonLdTag = `<script type="application/ld+json" id="prerender-article">${JSON.stringify(articleJsonLd)}</script>`;
        html = html.replace("</head>", `${jsonLdTag}\n</head>`);

        writeFileSync(resolve(DIST, "education", `${article.slug}.html`), html);
        console.log(`Prerendered: /education/${article.slug}`);
      }
    } catch (err) {
      console.log("No articles found or error loading them.", err.message);
    }

    console.log(`\n✅ Prerender complete: ${products.length} products + articles`);
  } finally {
    await vite.close();
  }
}

prerender();
