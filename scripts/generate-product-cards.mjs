/**
 * ⚙️ يُولِّد `src/data/product-cards.generated.ts` من الكتالوج الكامل.
 *
 * لماذا؟ (2026-11-14 · H5) الصفحة الرئيسية و`CartProvider` (يعمل في __root
 * أي على كل صفحة) كانا يستوردان `src/data/products.ts` — أي 89 منتجًا
 * بوصفها ومكوناتها وأسئلتها (~47KB مضغوط) قبل أي تفاعل. التحليل أظهر أن ما
 * يلزمهما فعليًا هو بطاقة العرض: id/slug/name/price/image/emoji/stock…
 *
 * هذا السكربت يقرأ الكتالوج مرة واحدة (Vite ssrLoadModule مثل prerender)
 * ويكتب ملفًا صغيرًا لا يتغيّر إلا بتغيّر البيانات، ويُشغَّل تلقائيًا قبل
 * `vite build` عبر `prebuild`. ملف المخرجات مُلتزَم في git حتى يعمل
 * typecheck/الاختبارات بلا بناء.
 */
import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(ROOT, "src/data/product-cards.generated.ts");

const vite = await createServer({
  root: ROOT,
  logLevel: "error",
  server: { middlewareMode: true },
  appType: "custom",
});

try {
  const { products } = await vite.ssrLoadModule("/src/data/products.ts");
  const { getUseBadge } = await vite.ssrLoadModule("/src/lib/product-badge.ts");

  const q = (value) => JSON.stringify(value);

  const rows = products.map((p) => {
    const badge = getUseBadge(p);
    const fields = [
      `    id: ${q(p.id)}`,
      `    slug: ${q(p.slug)}`,
      `    name: ${q(p.name)}`,
      `    nameEn: ${q(p.nameEn)}`,
      `    category: ${q(p.category)}`,
      `    price: ${p.price}`,
      `    stock: ${p.stock}`,
      `    emoji: ${q(p.emoji)}`,
    ];
    if (p.image) fields.push(`    image: ${q(p.image)}`);
    if (p.badge) fields.push(`    badge: ${q(p.badge)}`);
    if (p.featured) fields.push(`    featured: true`);
    if (p.rating !== undefined) fields.push(`    rating: ${p.rating}`);
    if (p.reviews !== undefined) fields.push(`    reviews: ${p.reviews}`);
    fields.push(`    badgeLabel: ${q(badge.label)}`);
    fields.push(`    badgeClass: ${q(badge.className)}`);
    return `  {\n${fields.join(",\n")},\n  },`;
  });

  const file = `/**
 * ⚙️ GENERATED FILE — لا يُعدَّل يدويًا.
 * المولِّد: scripts/generate-product-cards.mjs (يعمل تلقائيًا قبل كل بناء).
 * المصدر: src/data/products/*.ts عبر src/lib/product-selection.ts.
 *
 * (2026-11-14 · H5) بطاقات المنتجات (${rows.length}) — حقول العرض والسلة فقط،
 * كي لا يدخل الكتالوج الكامل بوصفه الطويل إلى المسار الحرج لكل صفحة.
 */
import type { ProductCardView } from "@/data/product-types";

export const productCards: ProductCardView[] = [
${rows.join("\n")}
];
`;

  writeFileSync(OUT, file);
  const kb = (Buffer.byteLength(file) / 1024).toFixed(1);
  console.log(
    `✓ product cards: ${rows.length} cards → src/data/product-cards.generated.ts (${kb} KB)`,
  );
} finally {
  await vite.close();
}
