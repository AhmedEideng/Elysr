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
    // Deleted products → redirect to their category section (never to a
    // different product), per store policy. Renamed same-product aliases →
    // redirect to the current product slug.
    const legacyAliases = [
      { source: "/index.html", destination: "/", permanent: true },
      { source: "/index", destination: "/", permanent: true },
      { source: "/product/:slug", destination: "/products/:slug", permanent: true },
<<<<<<< HEAD
      { source: "/products/hammer-of-thor-herbal-supplement", destination: "/products/men", permanent: true },
      // 🗑️ منتجات محذوفة نهائيًا → القسم الخاص بها (مش منتج مختلف)
      { source: "/products/m-61", destination: "/products/men", permanent: true },
      { source: "/products/m-57", destination: "/products/women", permanent: true },
      { source: "/products/m-58", destination: "/products/women", permanent: true },
      { source: "/products/m-51", destination: "/products/men", permanent: true },
      { source: "/products/m-10", destination: "/products/men", permanent: true },
      { source: "/products/m-08", destination: "/products/men", permanent: true },
      { source: "/products/3d-super-green-coffee-30-sachets", destination: "/products/women", permanent: true },
      { source: "/products/overtime-erection-delay", destination: "/products/men", permanent: true },
      { source: "/products/original-black-horse-royal-honey", destination: "/products/men", permanent: true },
      { source: "/products/merson-gel-50-gm", destination: "/products/men", permanent: true },
      { source: "/products/sex-women-hot-life-wipes", destination: "/products/women", permanent: true },
=======
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
        destination: "/products/women",
        permanent: true,
      },
      {
        source: "/products/m-58",
        destination: "/products/women",
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
      // deleted products -> their section (not to a different product)
>>>>>>> 9ce8113 (fix(redirects): deleted products redirect to their section, not another product)
      { source: "/products/turbo-fitness-gel-50gm", destination: "/products/men", permanent: true },
      { source: "/products/brioge-gel", destination: "/products/men", permanent: true },
      { source: "/products/hulk-gel-50gm", destination: "/products/men", permanent: true },
      { source: "/products/royal-honey-malaysian", destination: "/products/men", permanent: true },
      { source: "/products/dooz-gel", destination: "/products/men", permanent: true },
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
<<<<<<< HEAD
      // 🔄 أسماء قديمة لنفس المنتج (Alias) → توجّه للمنتج الحالي المطابق
      { source: "/products/kreva", destination: "/products/kreva-gel", permanent: true },
      { source: "/products/kreva-gel-for-men", destination: "/products/kreva-gel", permanent: true },
      { source: "/products/sotara-gel", destination: "/products/sotara-gel-50gm", permanent: true },
      { source: "/products/sotara", destination: "/products/sotara-gel-50gm", permanent: true },
      { source: "/products/titan-gel-gold", destination: "/products/titan-gel-gold-special-gel", permanent: true },
      { source: "/products/titan-gel-gold-special-gel-for-men", destination: "/products/titan-gel-gold-special-gel", permanent: true },
      { source: "/products/royal-cream-for-men", destination: "/products/royal-cream", permanent: true },
      { source: "/products/stallion-delay-gel-for-men", destination: "/products/stallion-delay-gel", permanent: true },
      { source: "/products/leech-miracle-cream-for-men", destination: "/products/leech-miracle-cream", permanent: true },
      { source: "/products/dmas-chocolate-for-men-9-pcs", destination: "/products/dmas-chocolate-9-pcs", permanent: true },
      { source: "/products/golden-turkish-chocolate-for-men", destination: "/products/golden-turkish-chocolate", permanent: true },
      { source: "/products/checoo-love-chocolate-for-women", destination: "/products/checoo-love-chocolate", permanent: true },
      { source: "/products/royal-honey-for-women", destination: "/products/royal-honey", permanent: true },
      { source: "/products/coffemix-caviar-original-for-women", destination: "/products/coffemix-caviar-original", permanent: true },
      { source: "/products/viagra-for-women-20-tablets", destination: "/products/viagra-20-tablets", permanent: true },
      { source: "/products/black-widow-drops-for-women", destination: "/products/black-widow-drops", permanent: true },
=======
      {
        source: "/products/kreva-gel",
        destination: "/products/kreva-gel",
        permanent: true,
      },
      {
        source: "/products/kreva",
        destination: "/products/kreva-gel",
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
        destination: "/products/titan-gel-gold-special-gel",
        permanent: true,
      },
      {
        source: "/products/sex-women-hot-life-wipes",
        destination: "/products/women",
        permanent: true,
      },
>>>>>>> 9ce8113 (fix(redirects): deleted products redirect to their section, not another product)
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
