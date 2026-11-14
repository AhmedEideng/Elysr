#!/usr/bin/env node
/**
 * ============================================================
 * 🧪 تدقيق كتالوج المنتجات (89 منتجًا) — 2026-11-15 · Round 6
 * ============================================================
 * ليه السكربت ده موجود؟
 *   `scripts/data-integrity.test.mjs` بيحرس: وجود ملف الصورة، تفرّد بايتاتها،
 *   وجود Product-Meta profile، طول وصف الميتا، وتزامن products-db.json.
 *   لكنه لا يسأل: هل السعر معقول؟ هل الـ slug مطابق للاسم اللاتيني؟ هل
 *   crossSell يشاور على منتج موجود؟ هل الخصم/المخزون/التقييم متسق؟ هل
 *   عنوان صفحة المنتج ووصفها داخل حدود SERP وفريدين؟ هل الكتالوج المباع
 *   فعلًا (catalog-feed) يطابق المتجر في السعر والتوافر؟
 *
 *   أي خطأ من دول **صامت**: الصفحة تُبنى، الاختبارات تعدّي، والخطأ يظهر
 *   في SERP أو في Google Merchant أو في سلة العميل.
 *
 * التشغيل:
 *   node scripts/product-audit.mjs            # تقرير مقروء
 *   node scripts/product-audit.mjs --json /tmp/p.json
 *   node scripts/product-audit.mjs --strict   # exit 1 لو فيه أخطاء
 * ============================================================
 */

import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { createServer } from "vite";

const ROOT = resolve(import.meta.dirname, "..");
const DIST = resolve(ROOT, "dist");
const args = process.argv.slice(2);
const JSON_OUT = args.includes("--json") ? args[args.indexOf("--json") + 1] : null;
const STRICT = args.includes("--strict");

const issues = [];
const add = (level, code, subject, detail) => issues.push({ level, code, subject, detail });
const len = (s) => [...(s || "")].length;
/** أول مجموعة التقاط من regex — بدل `[, ""]` الذي يربك قاعدة no-sparse-arrays. */
const pick = (re, text) => (String(text).match(re) || [])[1] || "";

const vite = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
  optimizeDeps: { noDiscovery: true, include: [] },
  plugins: [],
  logLevel: "silent",
});

const { products, getProductsByCategory } = await vite.ssrLoadModule("/src/data/products.ts");
const { getBundleProductType } = await vite.ssrLoadModule("/src/lib/product-form.ts");
const { PRODUCT_META_PROFILES } = await vite.ssrLoadModule("/src/data/product-meta.ts");
const { getProductFAQs } = await vite.ssrLoadModule("/src/data/product-faqs.ts");
const { isMerchantFeedExcluded } = await vite.ssrLoadModule("/src/lib/site-config.ts");
const { articles } = await vite.ssrLoadModule("/src/data/articles.ts");
// (2026-11-15) طبقة البطاقات تُولَّد مسبقًا (H5) — أي انحراف بينها وبين
// الكتالوج يظهر كسعر/اسم قديم في الشبكة والسلة بلا أي تحذير.
const cardModule = await vite.ssrLoadModule("/src/data/product-cards.generated.ts");
const { getProductsForArticle, getArticlesForProduct } = await vite.ssrLoadModule(
  "/src/lib/internal-links.ts",
);

const ids = new Set(products.map((p) => p.id));
const byId = new Map(products.map((p) => [p.id, p]));

/* ───────────── 1) هوية وتفرّد ───────────── */
const seen = { id: new Map(), slug: new Map(), name: new Map(), nameEn: new Map() };
for (const p of products) {
  for (const [field, map] of Object.entries(seen)) {
    const key = String(p[field] ?? "")
      .trim()
      .toLowerCase();
    if (!key) {
      add("error", "identity-empty", p.id, `${field} فاضي`);
      continue;
    }
    if (map.has(key)) add("error", "identity-duplicate", p.id, `${field} مكرر مع ${map.get(key)}`);
    else map.set(key, p.id);
  }
}

/* ───────────── 2) الـ slug ───────────── */
const RESERVED_SLUGS = new Set(["men", "women", "devices", "guides", "all"]);
for (const p of products) {
  const slug = p.slug;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
    add("error", "slug-format", p.id, `صيغة غير صالحة: ${slug}`);
  if (RESERVED_SLUGS.has(slug)) add("error", "slug-reserved", p.id, `يصطدم بمسار قسم: ${slug}`);
  if (len(slug) > 60) add("warn", "slug-long", p.id, `${len(slug)} حرف`);
}
// (2026-11-15) لا نقارن الـ slug بـ nameEn: الـ 62 slug الحالية أقدم من الأسماء
// الإنجليزية الحالية ومعرّفة في Google — تغييرها لـ«مطابقة رياضية» كسر SEO لا
// إصلاح. المطلوب فقط: صيغة صالحة (أعلاه) + ألا يتقارب منتجان لدرجة التباس.
const slugTokens = products.map((p) => ({
  id: p.id,
  slug: p.slug,
  set: new Set(p.slug.split("-")),
}));
for (let i = 0; i < slugTokens.length; i++) {
  for (let j = i + 1; j < slugTokens.length; j++) {
    const a = slugTokens[i];
    const b = slugTokens[j];
    const shared = [...a.set].filter((t) => b.set.has(t) && t.length > 3);
    const ratio = shared.length / Math.max(a.set.size, b.set.size);
    if (ratio >= 0.9 && shared.length >= 3)
      add("warn", "slug-near-duplicate", a.id, `${a.slug} ≈ ${b.slug}`);
  }
}

/* ───────────── 3) المحتوى ───────────── */
for (const p of products) {
  const type = getBundleProductType(p);
  const form = PRODUCT_META_PROFILES?.[p.id]?.form;

  if (len(p.description) < 80)
    add("error", "description-thin", p.id, `${len(p.description)} حرف فقط`);
  if (len(p.description) > 1200) add("warn", "description-long", p.id, `${len(p.description)} حرف`);

  if (!Array.isArray(p.benefits) || p.benefits.length === 0)
    add("error", "benefits-missing", p.id, "لا فوائد");
  else {
    if (p.benefits.length < 3) add("warn", "benefits-few", p.id, `${p.benefits.length} فقط`);
    const dup = p.benefits.filter((b, i) => p.benefits.indexOf(b) !== i);
    if (dup.length) add("error", "benefits-duplicate", p.id, dup.join(" / "));
    for (const b of p.benefits) {
      if (len(b) < 8) add("warn", "benefit-thin", p.id, `قصيرة: "${b}"`);
      if (/[{}$<>]/.test(b)) add("error", "benefit-markup", p.id, b);
    }
  }

  if (!p.emoji) add("warn", "emoji-missing", p.id, "لا إيموجي بديل");

  // الاستخدام والمكونات: إلزامية للأشكال اللي بتتاخد أو بتتحط على الجلد
  // (2026-11-15) «drops» هنا **قطرات فموية** (Lady Era / Spanish Fly / Connubial)
  // — تُبلع لا تُدهن، والدليل حقل form=oral في PRODUCT_META_PROFILES. لذلك
  // تُحسب ضمن الفموي وتحتاج مكونات وطريقة استخدام مثل الأقراص.
  const oral = ["tablet", "capsule", "honey", "sachet", "gum", "coffee", "drops"].includes(type);
  const topical = ["gel", "cream", "spray", "wipes"].includes(type);
  if ((oral || topical) && !p.usage)
    add("error", "usage-missing", p.id, `الشكل ${type} بلا طريقة استخدام`);
  if (oral && !p.ingredients) add("error", "ingredients-missing", p.id, `الشكل ${type} بلا مكونات`);
  if (p.category === "devices" && form && form !== "device")
    add("error", "form-mismatch", p.id, `جهاز لكن form=${form}`);

  // نصوص ميكانيكية: مسافات مزدوجة، مسافة قبل ترقيم، أرقام لاتينية داخل نص عربي
  for (const [field, value] of [
    ["name", p.name],
    ["description", p.description],
    ["usage", p.usage],
    ["ingredients", p.ingredients],
  ]) {
    if (!value) continue;
    // مسافات/تابز فقط — أسطر فارغة = فواصل فقرات مقصودة في الوصف.
    if (/[ \t]{2,}/.test(value)) add("warn", "text-double-space", p.id, field);
    if (/\s+[,،.؛:!؟]/.test(value)) add("warn", "text-space-before-punct", p.id, field);
    if (/\u200f|\u200e/.test(value)) add("warn", "text-bidi-mark", p.id, field);
  }

  // تكرار **متجاور** فقط («عسل عسل») — التكرار المتباعد مشروع:
  // «أقراص سياليس … — 4 أقراص» وصف عبوة لا خطأ.
  const words = p.name.split(/\s+/).filter((w) => w.length > 2);
  const adjacent = words.filter((w, i) => i > 0 && words[i - 1] === w);
  if (adjacent.length) add("warn", "name-repeated-word", p.id, adjacent.join(","));
}

/* ───────────── 3.5) ألقاب البحث ───────────── */
// «حبوب»/«جيل»/«سبراي» ألقاب قسمية عامة على أكثر من منتج **بقصد** (توسيع
// البحث). المفيد هو التقاط التصادم **النوعي**: لقب طويل (≥12 حرفًا) يخص
// منتجين مختلفين، أو لقب يساوي اسم منتج آخر — دول بيخلطوا نية الباحث.
const aliasByTerm = new Map();
const nameSet = new Set(products.map((p) => p.name.trim()));
for (const p of products) {
  for (const raw of p.searchAliases || []) {
    const alias = String(raw).trim();
    if (!alias) {
      add("warn", "alias-empty", p.id, "");
      continue;
    }
    if (!aliasByTerm.has(alias)) aliasByTerm.set(alias, new Set());
    aliasByTerm.get(alias).add(p.id);
    if (alias === p.name.trim()) add("warn", "alias-equals-name", p.id, alias);
  }
}
for (const [alias, owners] of aliasByTerm) {
  if (owners.size < 2) continue;
  if (owners.size >= 3) {
    // لقب يشترك فيه 3+ منتجات = وصف فئة («العسل الملكي»، «حبوب») لا التباس.
    add("info", "alias-category-term", [...owners].join(","), `"${alias}"`);
  } else if (len(alias) >= 12 || nameSet.has(alias)) {
    add("warn", "alias-collision", [...owners].join(" · "), `"${alias}" لمنتجين مختلفين`);
  }
}

/* ───────────── 4) السعر والمخزون ───────────── */
for (const p of products) {
  if (!Number.isFinite(p.price) || p.price <= 0)
    add("error", "price-invalid", p.id, String(p.price));
  else if (!Number.isInteger(p.price)) add("warn", "price-fraction", p.id, String(p.price));
  if (!Number.isFinite(p.stock) || p.stock < 0)
    add("error", "stock-invalid", p.id, String(p.stock));
  if (p.stock === 0 && p.featured)
    add("warn", "featured-out-of-stock", p.id, "مميز لكن مخزونه صفر");
  if (p.rating !== undefined) {
    if (p.rating < 1 || p.rating > 5) add("error", "rating-range", p.id, String(p.rating));
    if (!p.reviews) add("error", "rating-without-reviews", p.id, "تقييم بلا عدد مراجعات");
  }
  if (p.reviews !== undefined && (!Number.isInteger(p.reviews) || p.reviews < 0))
    add("error", "reviews-invalid", p.id, String(p.reviews));
}
// شواذ السعر داخل القسم الواحد (IQR) — يكشف خطأ صفر أو رقم زيادة
for (const category of ["men", "women", "devices"]) {
  const list = getProductsByCategory(category)
    .map((p) => p.price)
    .sort((a, b) => a - b);
  if (list.length < 8) continue;
  const q1 = list[Math.floor(list.length * 0.25)];
  const q3 = list[Math.floor(list.length * 0.75)];
  const iqr = q3 - q1;
  const high = q3 + 3 * iqr;
  for (const p of getProductsByCategory(category)) {
    if (p.price > high)
      add("warn", "price-outlier", p.id, `${p.price} ج.م فوق ${high} (${category})`);
  }
}

/* ───────────── 5) الصور ───────────── */
for (const p of products) {
  if (!p.image) {
    add("warn", "image-missing", p.id, "لا صورة — يعتمد على الإيموجي");
    continue;
  }
  const file = resolve(ROOT, "public", String(p.image).replace(/^\/+/, ""));
  if (!existsSync(file)) {
    add("error", "image-file-missing", p.id, p.image);
    continue;
  }
  const size = statSync(file).size;
  if (size > 250 * 1024) add("warn", "image-heavy", p.id, `${(size / 1024).toFixed(0)} KB`);
  if (!/\.(webp|avif)$/i.test(p.image)) add("warn", "image-format", p.id, p.image);
}

/* ───────────── 6) العلاقات ───────────── */
for (const p of products) {
  if (!p.crossSell) continue;
  if (p.crossSell.includes(p.id)) add("error", "crosssell-self", p.id, "يشاور على نفسه");
  const dup = p.crossSell.filter((id, i) => p.crossSell.indexOf(id) !== i);
  if (dup.length) add("error", "crosssell-duplicate", p.id, dup.join(","));
  for (const id of p.crossSell) {
    if (!ids.has(id)) add("error", "crosssell-missing", p.id, `المنتج ${id} غير موجود`);
    else if (byId.get(id)?.category !== p.category)
      add("warn", "crosssell-cross-category", p.id, `${id} من قسم ${byId.get(id)?.category}`);
  }
}
// المقالات ← المنتجات: كل معرّف يجب أن يوجد
for (const article of articles) {
  for (const id of getProductsForArticle(article.slug) || []) {
    if (!ids.has(id)) add("error", "article-product-missing", article.slug, `المنتج ${id}`);
  }
}
// المنتجات ← المقالات: كل slug يجب أن يوجد
const articleSlugs = new Set(articles.map((a) => a.slug));
for (const p of products) {
  for (const slug of getArticlesForProduct(p) || []) {
    if (!articleSlugs.has(slug)) add("error", "product-article-missing", p.id, slug);
  }
}

/* ───────────── 6.5) طبقة البطاقات (product-cards.generated) ───────────── */
const cardList = cardModule.productCards || [];
const cardById = new Map(cardList.map((c) => [c.id, c]));
for (const p of products) {
  const card = cardById.get(p.id);
  if (!card) {
    add("error", "card-missing", p.id, "لا بطاقة مولَّدة");
    continue;
  }
  for (const field of ["price", "stock", "name", "slug"]) {
    if (card[field] !== p[field])
      add("error", "card-drift", p.id, `${field}: ${card[field]} ≠ ${p[field]}`);
  }
}

/* ───────────── 7) SEO على المخرجات المبنية ───────────── */
const titles = new Map();
const descriptions = new Map();
let checkedPages = 0;
for (const p of products) {
  const file = resolve(DIST, "products", `${p.slug}.html`);
  if (!existsSync(file)) {
    add("error", "page-missing", p.id, `dist/products/${p.slug}.html غير موجود`);
    continue;
  }
  checkedPages++;
  const html = readFileSync(file, "utf-8");
  const head = html.slice(0, html.indexOf("</head>"));
  const title = pick(/<title>(.*?)<\/title>/s, head).trim();
  const desc = pick(/<meta name="description" content="(.*?)"/s, head).trim();
  const canonical = pick(/<link rel="canonical" href="(.*?)"/, head);
  const h1 = pick(/<h1[^>]*>(.*?)<\/h1>/s, html)
    .replace(/<[^>]+>/g, "")
    .trim();

  if (!title) add("error", "page-title-missing", p.slug, "");
  if (len(title) > 65) add("error", "page-title-long", p.slug, `${len(title)}`);
  if (len(title) < 20) add("warn", "page-title-short", p.slug, `${len(title)}`);
  if (len(desc) < 70) add("error", "page-desc-short", p.slug, `${len(desc)}`);
  if (len(desc) > 160) add("error", "page-desc-long", p.slug, `${len(desc)}`);
  if (!canonical.endsWith(`/products/${p.slug}`))
    add("error", "page-canonical", p.slug, canonical || "مفقود");
  if (!h1.includes(p.name.slice(0, 12)))
    add("warn", "page-h1-mismatch", p.slug, `H1="${h1.slice(0, 40)}"`);

  const key = title.toLowerCase();
  if (titles.has(key)) add("error", "page-title-duplicate", p.slug, `مكرر مع ${titles.get(key)}`);
  else titles.set(key, p.slug);
  const dkey = desc.toLowerCase();
  if (descriptions.has(dkey))
    add("error", "page-desc-duplicate", p.slug, `مكرر مع ${descriptions.get(dkey)}`);
  else descriptions.set(dkey, p.slug);

  // صور المشاركة: og:image لازم يكون ملفًا موجودًا فعلًا
  const ogImage = pick(/<meta property="og:image" content="(.*?)"/, head);
  if (!ogImage) add("error", "page-og-image-missing", p.slug, "");
  else {
    const ogPath = ogImage.replace(/^https?:\/\/[^/]+/, "").split("?")[0];
    if (!existsSync(resolve(ROOT, "public", ogPath.replace(/^\/+/, ""))))
      add("error", "page-og-image-file", p.slug, ogPath);
  }

  // المحتوى المرئي: صفحة منتج رقيقة تخسر الترتيب حتى لو السكيما سليمة
  const bodyText = html
    .slice(html.indexOf("</head>"))
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");
  const words = bodyText.split(" ").filter((w) => w.length > 1).length;
  if (words < 200) add("warn", "page-thin", p.slug, `${words} كلمة`);

  // السعر والفوائد لازم يكونوا في النص المرئي الثابت (زائر بلا JS + زاحف)
  if (!bodyText.includes(String(p.price)))
    add("error", "page-price-not-rendered", p.slug, `السعر ${p.price} غير موجود في HTML`);
  const benefitsShown = (p.benefits || []).filter((b) =>
    bodyText.includes(b.replace(/\s+/g, " ").slice(0, 24)),
  ).length;
  if (benefitsShown < Math.min(3, (p.benefits || []).length))
    add("warn", "page-benefits-not-rendered", p.slug, `${benefitsShown}/${p.benefits.length}`);

  // الأسئلة الشائعة: كل سؤال مُولَّد يجب أن يظهر **نصًا مرئيًا** في HTML
  // (لا في JSON-LD وحده) — وإلا فوائد الاستهداف من الأسئلة ضائعة للزائر
  // وللزاحف بلا JS، وسكيما FAQPage تصف محتوى غير موجود على الصفحة.
  const faqs = getProductFAQs(p) || [];
  const missingFaqs = faqs.filter((faq) => !bodyText.includes(faq.question.slice(0, 30)));
  if (faqs.length > 0 && missingFaqs.length > 0)
    add("warn", "page-faq-missing", p.slug, `${missingFaqs.length}/${faqs.length} سؤال غير مرئي`);

  // JSON-LD: Product + offers
  const blocks = [...html.matchAll(/<script[^>]*ld\+json[^>]*>([\s\S]*?)<\/script>/g)];
  let productNode = null;
  for (const [, raw] of blocks) {
    try {
      const parsed = JSON.parse(raw);
      const nodes = Array.isArray(parsed) ? parsed : parsed["@graph"] ? parsed["@graph"] : [parsed];
      for (const node of nodes) if (node["@type"] === "Product") productNode = node;
    } catch {
      add("error", "page-jsonld-invalid", p.slug, "JSON غير صالح");
    }
  }
  if (!productNode) add("error", "page-product-schema-missing", p.slug, "");
  else {
    if (productNode.offers?.price !== undefined && Number(productNode.offers.price) !== p.price)
      add("error", "page-schema-price", p.slug, `${productNode.offers.price} ≠ ${p.price}`);
    if (!productNode.offers?.priceCurrency)
      add("error", "page-schema-currency", p.slug, "بلا priceCurrency");
    if (!productNode.offers?.availability) add("warn", "page-schema-availability", p.slug, "");
    if (!productNode.image) add("error", "page-schema-image", p.slug, "");
    if (p.rating && !productNode.aggregateRating)
      add("warn", "page-schema-rating", p.slug, "تقييم بلا aggregateRating");
    if (!p.rating && productNode.aggregateRating)
      add("error", "page-schema-rating-fake", p.slug, "aggregateRating بلا بيانات مصدر");
    // التوافر المعلن لازم يطابق المخزون (Google Merchant يتحقق من ده)
    const availability = String(productNode.offers?.availability || "");
    const wantsOut = p.stock <= 0;
    if (availability && wantsOut !== /OutOfStock/i.test(availability))
      add("error", "page-schema-availability", p.slug, `${availability} · stock=${p.stock}`);
  }
}

/* ───────────── 7.2) صفحات الأقسام: كل منتج قابل للزحف من قسمه ───────────── */
for (const category of ["men", "women", "devices"]) {
  const file = resolve(DIST, "products", `${category}.html`);
  if (!existsSync(file)) {
    add("error", "category-page-missing", category, `${category}.html`);
    continue;
  }
  const html = readFileSync(file, "utf-8");
  const listed = new Set(
    [
      ...html.matchAll(
        /href="(?:https:\/\/elysrmedical\.store)?\/products\/([a-z0-9-]+)(?:[?#][^"]*)?"/g,
      ),
    ]
      .map((m) => m[1])
      .filter((slug) => !["men", "women", "devices", "guides"].includes(slug)),
  );
  const expected = getProductsByCategory(category);
  const missing = expected.filter((p) => !listed.has(p.slug));
  if (missing.length)
    add("error", "category-page-missing-products", category, missing.map((p) => p.slug).join(", "));
}

/* ───────────── 7.5) عضوية الـ sitemap ───────────── */
const sitemapPath = resolve(DIST, "sitemap.xml");
if (existsSync(sitemapPath)) {
  const sitemap = readFileSync(sitemapPath, "utf-8");
  for (const p of products) {
    const url = `https://elysrmedical.store/products/${p.slug}`;
    if (!sitemap.includes(url)) add("error", "sitemap-missing-product", p.slug, url);
  }
}

/* ───────────── 7.7) شبكة «منتجات قد تعجبك» ───────────── */
// العيب المرجعي (2026-11-15): الاختيار كان «أول 4 أبجديًا» ⇒ 52 صفحة من 89
// تعرض نفس المنتجات الأربعة، و55 منتجًا بلا أي رابط داخل. القياس هنا يمنع
// رجوعه: تنوّع القوائم + تغطية كل منتج برابط داخل واحد على الأقل.
{
  const relatedSets = new Map();
  const inboundCount = new Map();
  for (const p of products) {
    const file = resolve(DIST, "products", `${p.slug}.html`);
    if (!existsSync(file)) continue;
    const html = readFileSync(file, "utf-8");
    const block = (html.match(/منتجات قد تعجبك[^<]*<\/h2><ul>([\s\S]*?)<\/ul>/) || [])[1] || "";
    const links = [...new Set([...block.matchAll(/\/products\/([a-z0-9-]+)"/g)].map((m) => m[1]))];
    relatedSets.set(p.slug, links.join(","));
    for (const link of links) inboundCount.set(link, (inboundCount.get(link) || 0) + 1);
  }
  const perSet = new Map();
  for (const key of relatedSets.values()) perSet.set(key, (perSet.get(key) || 0) + 1);
  const worst = Math.max(0, ...perSet.values());
  if (perSet.size < products.length * 0.8)
    add(
      "error",
      "related-sets-too-few",
      "related",
      `${perSet.size} قائمة مختلفة لـ ${products.length} صفحة`,
    );
  if (worst > 4) add("error", "related-concentrated", "related", `${worst} صفحة تعرض نفس القائمة`);
  for (const p of products) {
    if (!inboundCount.get(p.slug))
      add("error", "related-orphan", p.slug, "لا تشير إليه أي صفحة منتج");
  }
}

/* ───────────── 8) فيد التجّار ───────────── */
const feedPath = resolve(DIST, "catalog-feed.xml");
if (existsSync(feedPath)) {
  const feed = readFileSync(feedPath, "utf-8");
  const items = [...feed.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
  let feedMissingBrand = 0;
  const feedSeen = new Set();
  const eligible = products.filter((p) => !isMerchantFeedExcluded?.(p));
  if (items.length !== eligible.length)
    add(
      "error",
      "feed-count",
      "catalog-feed",
      `${items.length} عنصر مقابل ${eligible.length} منتج مؤهل`,
    );
  for (const item of items) {
    // الفيد يستخدم مساحة أسماء Google Merchant: <g:link> لا <link>.
    const link = pick(/<(?:g:)?link>(.*?)<\/(?:g:)?link>/, item);
    const price = pick(/<g:price>(.*?)<\/g:price>/, item);
    const avail = pick(/<g:availability>(.*?)<\/g:availability>/, item);
    const slug = link.split("/products/")[1] || "";
    const product = products.find((p) => p.slug === slug);
    if (!product) {
      add("error", "feed-unknown-item", slug, link);
      continue;
    }
    const feedPrice = Number(String(price).replace(/[^\d.]/g, ""));
    if (feedPrice !== product.price)
      add("error", "feed-price", slug, `${feedPrice} ≠ ${product.price}`);
    if (!/<g:image_link>/.test(item)) add("error", "feed-image", slug, "بلا g:image_link");
    if (!/<g:availability>/.test(item)) add("error", "feed-availability", slug, "");
    if (!/<g:brand>/.test(item)) feedMissingBrand++;
    // التوافر في الفيد لازم يطابق المخزون الحقيقي
    const expectedAvail = product.stock > 0 ? "in stock" : "out of stock";
    if (avail && avail !== expectedAvail)
      add("error", "feed-availability-mismatch", slug, `${avail} ≠ ${expectedAvail}`);
    if (!/<g:title>/.test(item)) add("error", "feed-title", slug, "");
    const feedId = pick(/<g:id>(.*?)<\/g:id>/, item);
    if (feedSeen.has(feedId)) add("error", "feed-duplicate", slug, `المعرّف ${feedId} مكرر`);
    else feedSeen.add(feedId);
  }
  if (feedMissingBrand > 0)
    add(
      "info",
      "feed-brand-absent",
      "catalog-feed",
      `${feedMissingBrand} عنصر بلا g:brand — لا يوجد حقل brand موثّق لأي منتج في الكتالوج (قرار امتثال: لا ننسب براندًا غير مؤكَّد؛ البديل هو identifier_exists=no وهو مضبوط)`,
    );
} else {
  add("warn", "feed-missing", "catalog-feed", "dist/catalog-feed.xml غير موجود — نفّذ build");
}

/* ───────────── 9) عدّادات مساعدة ───────────── */
const summary = {
  products: products.length,
  men: getProductsByCategory("men").length,
  women: getProductsByCategory("women").length,
  devices: getProductsByCategory("devices").length,
  featured: products.filter((p) => p.featured).length,
  withImage: products.filter((p) => p.image).length,
  withRating: products.filter((p) => p.rating).length,
  withCrossSell: products.filter((p) => p.crossSell?.length).length,
  outOfStock: products.filter((p) => p.stock === 0).length,
  pagesChecked: checkedPages,
  priceMin: Math.min(...products.map((p) => p.price)),
  priceMax: Math.max(...products.map((p) => p.price)),
  priceMedian: [...products.map((p) => p.price)].sort((a, b) => a - b)[
    Math.floor(products.length / 2)
  ],
  errors: issues.filter((i) => i.level === "error").length,
  warnings: issues.filter((i) => i.level === "warn").length,
};

await vite.close();

if (JSON_OUT) {
  const { writeFileSync } = await import("node:fs");
  writeFileSync(JSON_OUT, JSON.stringify({ summary, issues }, null, 2));
}

const byCode = new Map();
for (const i of issues) {
  const key = `${i.level}:${i.code}`;
  byCode.set(key, (byCode.get(key) || 0) + 1);
}
console.log("\n📊 ملخص كتالوج المنتجات");
console.table(summary);
if (byCode.size) {
  console.log("📋 الأعطال حسب النوع");
  console.table(
    [...byCode.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => ({ code: k, n })),
  );
}
const bad = issues.filter((i) => i.level === "error");
if (bad.length) {
  console.log(`❌ أول ${Math.min(25, bad.length)} خطأ:`);
  for (const i of bad.slice(0, 25)) console.log(`   [${i.code}] ${i.subject} — ${i.detail}`);
}
const warnList = issues.filter((i) => i.level === "warn");
if (warnList.length) {
  console.log(`⚠️  أول ${Math.min(15, warnList.length)} تحذير:`);
  for (const i of warnList.slice(0, 15)) console.log(`   [${i.code}] ${i.subject} — ${i.detail}`);
}
console.log(
  `\n${summary.errors === 0 && summary.warnings === 0 ? "✓ نظيف" : "→"} ${summary.errors} خطأ · ${summary.warnings} تحذير`,
);
if (JSON_OUT) console.log(`💾 ${JSON_OUT}`);
if (STRICT && summary.errors > 0) process.exit(1);
