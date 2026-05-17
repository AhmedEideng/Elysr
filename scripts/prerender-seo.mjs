import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DIST = resolve(ROOT, "dist");
const SITE_URL = process.env.SITE_URL || "https://elysrmedical.com";

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
      const title = `${product.name} — اليسر ميديكال`;
      const desc = product.description.replace(/"/g, "&quot;");
      const img = product.image ? `${SITE_URL}${product.image}` : `${SITE_URL}/favicon.svg`;

      let html = template
        .replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`)
        .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${desc}" />`)
        .replace(
          /<meta property="og:title"[^>]*>/,
          `<meta property="og:title" content="${title}" />`,
        )
        .replace(
          /<meta property="og:description"[^>]*>/,
          `<meta property="og:description" content="${desc}" />`,
        );

      // Inject og:image if not present, or replace if exists
      if (html.includes('<meta property="og:image"')) {
        html = html.replace(
          /<meta property="og:image"[^>]*>/,
          `<meta property="og:image" content="${img}" />`,
        );
      } else {
        html = html.replace("</head>", `  <meta property="og:image" content="${img}" />\n</head>`);
      }

      // Add twitter:image
      if (html.includes('<meta name="twitter:image"')) {
        html = html.replace(
          /<meta name="twitter:image"[^>]*>/,
          `<meta name="twitter:image" content="${img}" />`,
        );
      } else {
        html = html.replace("</head>", `  <meta name="twitter:image" content="${img}" />\n</head>`);
      }

      writeFileSync(resolve(DIST, "products", `${product.id}.html`), html);
      console.log(`Prerendered: /products/${product.id}`);
    }

    // Attempt articles
    try {
      const { articles } = await vite.ssrLoadModule("/src/data/articles.ts");
      const eduDir = resolve(DIST, "education");
      if (!existsSync(eduDir)) mkdirSync(eduDir, { recursive: true });

      for (const article of articles) {
        const title = `${article.title} — اليسر ميديكال`;
        const desc = article.excerpt.replace(/"/g, "&quot;");
        const img = `${SITE_URL}/favicon.svg`;

        let html = template
          .replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`)
          .replace(
            /<meta name="description"[^>]*>/,
            `<meta name="description" content="${desc}" />`,
          )
          .replace(
            /<meta property="og:title"[^>]*>/,
            `<meta property="og:title" content="${title}" />`,
          )
          .replace(
            /<meta property="og:description"[^>]*>/,
            `<meta property="og:description" content="${desc}" />`,
          );

        if (!html.includes('<meta property="og:image"')) {
          html = html.replace(
            "</head>",
            `  <meta property="og:image" content="${img}" />\n</head>`,
          );
        }

        writeFileSync(resolve(DIST, "education", `${article.slug}.html`), html);
        console.log(`Prerendered: /education/${article.slug}`);
      }
    } catch (err) {
      console.log("No articles found or error loading them.", err.message);
    }
  } finally {
    // Close server after ALL async operations complete
    await vite.close();
  }
}

prerender();
