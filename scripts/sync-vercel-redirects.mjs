/**
 * Sync product legacy-ID redirects in vercel.json from src/data/products.ts.
 * Uses Vite's ssrLoadModule for robust TypeScript resolution of all products!
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const vercelPath = resolve(ROOT, "vercel.json");
const vercel = JSON.parse(readFileSync(vercelPath, "utf-8"));

async function syncRedirects() {
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: "custom",
    optimizeDeps: { noDiscovery: true, include: [] },
    plugins: [],
    logLevel: "silent",
  });

  try {
    const { products } = await vite.ssrLoadModule("/src/data/products.ts");
    const productRedirects = [];
    const seen = new Set();

    for (const p of products) {
      const source = `/products/${p.id}`;
      if (seen.has(source)) continue;
      seen.add(source);
      productRedirects.push({
        source,
        destination: `/products/${p.slug}`,
        permanent: true,
      });
    }

    // Hand-maintained legacy aliases that are not current product IDs anymore.
    const legacyAliases = [
      { source: "/index.html", destination: "/", permanent: true },
      { source: "/index", destination: "/", permanent: true },
      { source: "/product/:slug", destination: "/products/:slug", permanent: true },
      {
        source: "/products/hammer-of-thor-herbal-supplement",
        destination: "/products/men",
        permanent: true,
      },
      {
        source: "/products/m-61",
        destination: "/products/men",
        permanent: true,
      },
      {
        source: "/products/m-57",
        destination: "/products/toro-duro-woman",
        permanent: true,
      },
      {
        source: "/products/m-58",
        destination: "/products/black-widow-drops-for-women",
        permanent: true,
      },
      {
        source: "/products/3d-super-green-coffee-30-sachets",
        destination: "/products/women",
        permanent: true,
      },
      {
        source: "/products/m-51",
        destination: "/products/men",
        permanent: true,
      },
      {
        source: "/products/m-10",
        destination: "/products/men",
        permanent: true,
      },
      {
        source: "/products/m-08",
        destination: "/products/men",
        permanent: true,
      },
      {
        source: "/products/overtime-erection-delay",
        destination: "/products/men",
        permanent: true,
      },
      {
        source: "/products/original-black-horse-royal-honey",
        destination: "/products/men",
        permanent: true,
      },
      { source: "/products/merson-gel-50-gm", destination: "/products/men", permanent: true },
      { source: "/blog", destination: "/education", permanent: true },
      { source: "/blog/:slug", destination: "/education/:slug", permanent: true },
      { source: "/articles", destination: "/education", permanent: true },
      { source: "/articles/:slug", destination: "/education/:slug", permanent: true },
      { source: "/category/:slug", destination: "/products/:slug", permanent: true },
      { source: "/products/category/:slug", destination: "/products/:slug", permanent: true },
      { source: "/contact-us", destination: "/contact", permanent: true },
      { source: "/about-us", destination: "/about", permanent: true },
      { source: "/shipping-policy", destination: "/shipping", permanent: true },
      { source: "/return-policy", destination: "/returns", permanent: true },
      { source: "/terms-and-conditions", destination: "/terms", permanent: true },
      { source: "/privacy-policy", destination: "/privacy", permanent: true },
      {
        source: "/products/kreva-gel",
        destination: "/products/kreva-gel-for-men",
        permanent: true,
      },
      {
        source: "/products/kreva",
        destination: "/products/kreva-gel-for-men",
        permanent: true,
      },
      {
        source: "/products/sotara-gel",
        destination: "/products/sotara-gel-50gm",
        permanent: true,
      },
      {
        source: "/products/sotara",
        destination: "/products/sotara-gel-50gm",
        permanent: true,
      },
      {
        source: "/products/titan-gel-gold",
        destination: "/products/titan-gel-gold-special-gel-for-men",
        permanent: true,
      },
      {
        source: "/products/sex-women-hot-life-wipes",
        destination: "/products/connubial-drops",
        permanent: true,
      },
    ];

    for (const redirect of legacyAliases) {
      if (!seen.has(redirect.source)) {
        productRedirects.push(redirect);
        seen.add(redirect.source);
      }
    }

    vercel.redirects = productRedirects;
    writeFileSync(vercelPath, `${JSON.stringify(vercel, null, 2)}\n`, "utf-8");

    console.log(`✓ vercel.json redirects synced (${productRedirects.length} redirects)`);
  } finally {
    await vite.close();
  }
}

syncRedirects().catch((err) => {
  console.error("Sync redirects failed:", err);
  process.exit(1);
});
