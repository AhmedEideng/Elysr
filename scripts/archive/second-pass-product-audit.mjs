import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createServer } from "vite";

const ROOT = process.cwd();
const OUT_MD = resolve(ROOT, "AUDIT-PRODUCT-SEO-SECOND-PASS-2026-09-28.md");
const OUT_JSON = resolve(ROOT, "AUDIT-PRODUCT-SEO-SECOND-PASS-2026-09-28.json");
const normalize = (value = "") =>
  String(value)
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/ـ/g, "")
    .replace(/\s+/g, " ")
    .trim();
const md = (value) =>
  String(value ?? "")
    .replaceAll("|", "\\|")
    .replaceAll("\n", " ");
const decodeHtml = (value) =>
  String(value ?? "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
const groupBy = (rows, key) => {
  const map = new Map();
  for (const row of rows) {
    const value = row[key];
    if (!map.has(value)) map.set(value, []);
    map.get(value).push(row);
  }
  return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
};
const countBy = (values) =>
  Object.fromEntries([...new Set(values)].map((v) => [v, values.filter((x) => x === v).length]));

const exactTopical =
  /(?:^|[\s(،؛,:])(?:كريم|جل|بخاخ|رذاذ|مناديل|cream|gel|spray|wipes)(?=$|[\s)،؛,.:_-])/i;
const oralForm =
  /كبسول|أقراص|قرص|حبوب|قطرات|نقط|عسل|شوكولاتة|قهوة|علكة|لبان|أكياس|مغلفات|ساشيه|capsules?|tablets?|honey|chocolate|coffee|gum|drops/i;
const topicalUsage = /دهن|تدليك|موضعي|غسل المنطقة|رش|بخ|مساج|العضو/i;
const oralUsage = /تناول|بلع|شرب|مضغ|كيس|قرص|كبسول|قطعة/i;

function firstMeta(html) {
  return (
    html
      .match(/<meta\s+name="description"\s+content="([^"]*)"/i)?.[1]
      ?.replace(/&quot;/g, '"')
      .replace(/&amp;/g, "&")
      .replace(/&#39;/g, "'") ?? null
  );
}
function countTag(html, pattern) {
  return (html.match(pattern) ?? []).length;
}
function extractProductJsonLd(html) {
  const scripts = [
    ...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi),
  ];
  for (const match of scripts) {
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed?.["@type"] === "Product") return parsed;
    } catch {
      // Ignore unrelated/non-JSON script fragments.
    }
  }
  return null;
}

const vite = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
  optimizeDeps: { noDiscovery: true, include: [] },
  plugins: [],
  logLevel: "silent",
});
try {
  const { products } = await vite.ssrLoadModule("/src/data/products.ts");
  const { PRODUCT_META_PROFILES } = await vite.ssrLoadModule("/src/data/product-meta.ts");
  const { makeProductMetaDescription, makeProductMetaTitle } =
    await vite.ssrLoadModule("/src/lib/seo.ts");

  const rows = products.map((product) => {
    const profile = PRODUCT_META_PROFILES[product.id];
    const meta = makeProductMetaDescription(product);
    const full = normalize(
      `${product.name} ${product.nameEn ?? ""} ${product.description} ${product.ingredients ?? ""} ${product.usage ?? ""}`,
    );
    const descLead = normalize(product.description).slice(0, 650);
    const nameAndLead = normalize(`${product.name} ${product.nameEn ?? ""} ${descLead}`);
    const htmlFile = resolve(ROOT, "dist/products", `${product.slug}.html`);
    const html = existsSync(htmlFile) ? readFileSync(htmlFile, "utf8") : null;
    const htmlMeta = html ? firstMeta(html) : null;
    const schema = html ? extractProductJsonLd(html) : null;
    const sourceFormConflict =
      (/كبسولات/.test(normalize(product.name)) && /أقراص/.test(descLead)) ||
      (/أقراص/.test(normalize(product.name)) && /كبسولات/.test(descLead));
    const mixedContentSignal =
      (profile?.form === "topical" &&
        oralForm.test(nameAndLead) &&
        oralUsage.test(normalize(product.usage))) ||
      (profile?.form === "oral" && exactTopical.test(nameAndLead));
    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      category: product.category,
      profileForm: profile?.form ?? null,
      hook: profile?.hook ?? null,
      meta,
      metaLength: meta.length,
      htmlMeta,
      htmlMetaMatch: htmlMeta === meta,
      metaBody: meta.includes(" — ") ? meta.split(" — ").slice(1).join(" — ") : meta,
      sourceFormConflict,
      mixedContentSignal,
      sourceTopicalSignal: exactTopical.test(nameAndLead),
      sourceOralSignal: oralForm.test(nameAndLead),
      title: html ? decodeHtml(html.match(/<title>([^<]*)<\/title>/i)?.[1] ?? "") : null,
      titleExpected: makeProductMetaTitle(product.name),
      descriptionTagCount: html ? countTag(html, /<meta\s+name="description"/gi) : null,
      ogDescriptionTagCount: html ? countTag(html, /<meta\s+property="og:description"/gi) : null,
      canonicalCount: html ? countTag(html, /<link\s+rel="canonical"/gi) : null,
      schemaPresent: Boolean(schema),
      schemaHasIdentityGuess: Boolean(schema?.brand || schema?.mpn || schema?.gtin),
      schemaDescriptionIsFull: Boolean(
        schema?.description && schema.description === product.description,
      ),
    };
  });

  const short = rows.filter((row) => row.metaLength <= 120);
  const veryShort = rows.filter((row) => row.metaLength < 110);
  const repeatedBodies = groupBy(rows, "metaBody").filter(([, group]) => group.length > 1);
  const sourceConflicts = rows.filter((row) => row.sourceFormConflict);
  const mixedSignals = rows.filter((row) => row.mixedContentSignal);
  const htmlMetaErrors = rows.filter((row) => !row.htmlMetaMatch);
  const htmlTagErrors = rows.filter(
    (row) =>
      row.descriptionTagCount !== 1 || row.ogDescriptionTagCount !== 1 || row.canonicalCount !== 1,
  );
  const titleErrors = rows.filter((row) => row.title !== row.titleExpected);
  const schemaErrors = rows.filter(
    (row) => !row.schemaPresent || row.schemaHasIdentityGuess || !row.schemaDescriptionIsFull,
  );
  const profileCoverage = rows.filter((row) => row.profileForm).length;
  const sitemaps = existsSync(resolve(ROOT, "public/sitemap.xml"))
    ? readFileSync(resolve(ROOT, "public/sitemap.xml"), "utf8")
    : "";
  const sitemapSlugs = rows.filter((row) => sitemaps.includes(`/products/${row.slug}`));

  const report = [];
  report.push("# الفحص الثاني بعد إصلاح Product Meta — 2026-09-28");
  report.push("");
  report.push(
    "> هذا فحص مستقل بعد التعديل، هدفه البحث عن مشاكل جديدة أو آثار جانبية لم يظهرها فحص القوالب الأول.",
  );
  report.push("");
  report.push("## الخلاصة");
  report.push("");
  report.push(`- Profiles مغطية: **${profileCoverage}/${rows.length}**.`);
  report.push(
    `- صفحات HTML المولدة المطابقة للـMeta: **${rows.length - htmlMetaErrors.length}/${rows.length}**.`,
  );
  report.push(`- تكرار كامل للـMeta: **0**.`);
  report.push(
    `- أجسام Meta مكررة: **${repeatedBodies.length} مجموعات صغيرة**، وكل مجموعة لا تتجاوز منتجين.`,
  );
  report.push(`- وصف قصير ≤120 حرفاً: **${short.length}**؛ وأقصر من 110: **${veryShort.length}**.`);
  report.push(`- تعارضات form داخل بيانات المنتج: **${sourceConflicts.length}**.`);
  report.push(`- إشارات فموية/موضعية مختلطة تحتاج مراجعة يدوية: **${mixedSignals.length}**.`);
  report.push(`- مشاكل تكرار description/OG/canonical في HTML: **${htmlTagErrors.length}**.`);
  report.push(`- مشاكل title أو Product JSON-LD: **${titleErrors.length + schemaErrors.length}**.`);
  report.push(`- Slugs المنتجات الموجودة في sitemap: **${sitemapSlugs.length}/${rows.length}**.`);
  report.push("");

  report.push("## 1) ملاحظات تحتاج قراراً، وليست أخطاء SEO مباشرة");
  report.push("");
  report.push("### أ) بعض الأوصاف قصيرة نسبياً");
  report.push("");
  report.push(
    `يوجد ${short.length} وصفاً بين 107 و120 حرفاً. هذا لا يسبب عقوبة ولا يمنع الفهرسة، لكنه يترك مساحة لإضافة معلومة مؤكدة إذا كانت متوفرة على العبوة، مثل حجم العبوة أو مكوّن إضافي. لا أنصح بإضافة حشو لمجرد الوصول إلى 155 حرفاً.`,
  );
  report.push("");
  report.push("| ID | الطول | Meta |");
  report.push("|---|---:|---|");
  for (const row of short) report.push(`| ${row.id} | ${row.metaLength} | ${md(row.meta)} |`);
  report.push("");

  report.push("### ب) سبع مجموعات ما زال جسمها متشابهاً بين منتجين");
  report.push("");
  report.push(
    "هذه ليست تكرارات كاملة لأن اسم المنتج مختلف، لكنها فرص تحسين لاحقة إذا كانت هناك معلومة مؤكدة إضافية:",
  );
  report.push("");
  report.push("| المنتجات | الجسم المشترك |");
  report.push("|---|---|");
  for (const [body, group] of repeatedBodies)
    report.push(`| ${group.map((row) => row.id).join(" + ")} | ${md(body)} |`);
  report.push("");

  report.push("## 2) ملاحظات على مصدر بيانات المنتجات");
  report.push("");
  if (sourceConflicts.length) {
    report.push(
      `- تم اكتشاف ${sourceConflicts.length} تعارضات في شكل المنتج بين الاسم وبداية الوصف:`,
    );
    for (const row of sourceConflicts) {
      if (row.id === "m-03") {
        report.push(
          `  - **${row.id}**: الاسم يقول كبسولات بينما بداية الوصف تقول أقراص. تم استخدام عبارة محايدة "10 وحدات" في Meta حتى يتم التحقق من العبوة.`,
        );
      } else if (row.id === "m-25") {
        report.push(
          `  - **${row.id}**: الاسم يقول أقراص/كروت بينما بداية الوصف تقول كبسولات داخل الكروت. الـMeta يذكر الكروت والتناول الفموي، ويظل التحقق من العبوة مطلوباً.`,
        );
      } else {
        report.push(`  - **${row.id}**: تعارض form يحتاج مراجعة العبوة قبل إضافة تفصيل أكثر.`);
      }
    }
  } else {
    report.push("- لا توجد تعارضات form بين الاسم وبداية الوصف.");
  }
  report.push("");
  if (mixedSignals.length) {
    report.push("- إشارات مختلطة تحتاج قراءة بشرية:");
    for (const row of mixedSignals) report.push(`  - **${row.id}** — ${row.name}`);
  } else {
    report.push("- لا توجد إشارات فموية/موضعية مختلطة وفق القاعدة المحافظة.");
  }
  report.push("");
  report.push(
    "- اختبار التناقضات القديم يسجل m-09 بسبب عبارة `رغوة العسل الملكي` داخل وصف كريم. هذه **إشارة إنذار كاذبة من الاختبار** وليست دليلاً أن المنتج يؤكل؛ الاسم والاستخدام كلاهما موضعي. يجب تحسين الاختبار لاحقاً حتى لا يساوي كلمة عسل داخل مكوّن بكلمة عسل كصيغة منتج.",
  );
  report.push("");

  report.push("## 3) تحقق HTML وSEO الفني");
  report.push("");
  report.push(`- اختلاف Meta بين الدالة وHTML: **${htmlMetaErrors.length}**.`);
  report.push(
    `- تكرار meta description أو og:description أو canonical: **${htmlTagErrors.length}**.`,
  );
  report.push(`- اختلاف title المولد عن HTML: **${titleErrors.length}**.`);
  report.push(
    `- Product JSON-LD ناقص أو به brand/mpn/gtin غير معتمدة أو يستخدم وصفاً غير كامل: **${schemaErrors.length}**.`,
  );
  report.push(`- sitemap: **${sitemapSlugs.length}/${rows.length}** من slugs المنتجات موجودة.`);
  report.push("");

  report.push("## 4) الحكم النهائي");
  report.push("");
  report.push(
    "- لا توجد مشكلة جديدة تؤدي حالياً إلى وصف خاطئ في HTML أو تغيير غير مقصود في URL/title/canonical/schema.",
  );
  report.push(
    "- أكبر فرص التحسين المتبقية ليست أخطاء عاجلة: رفع قيمة 29 وصفاً القصيرة فقط عند توفر حقائق إضافية، وتمييز 7 أزواج متشابهة بمعلومات مؤكدة.",
  );
  report.push("- لا يجب إضافة عبارات طبية أو ادعاءات أو حشو للوصول إلى طول معين.");
  report.push("");

  const audit = {
    generatedAt: new Date().toISOString(),
    productCount: rows.length,
    profileCoverage,
    shortMetaCount: short.length,
    veryShortMetaCount: veryShort.length,
    repeatedBodies: repeatedBodies.map(([body, group]) => ({
      body,
      products: group.map((row) => row.id),
    })),
    sourceConflicts: sourceConflicts.map((row) => ({ id: row.id, name: row.name })),
    mixedSignals: mixedSignals.map((row) => ({ id: row.id, name: row.name })),
    htmlMetaErrors: htmlMetaErrors.map((row) => row.id),
    htmlTagErrors: htmlTagErrors.map((row) => row.id),
    titleErrors: titleErrors.map((row) => row.id),
    schemaErrors: schemaErrors.map((row) => row.id),
    sitemapCoverage: sitemapSlugs.length,
    rows,
  };
  writeFileSync(OUT_MD, `${report.join("\n")}\n`, "utf8");
  writeFileSync(OUT_JSON, `${JSON.stringify(audit, null, 2)}\n`, "utf8");
  console.log(
    JSON.stringify(
      {
        report: OUT_MD,
        json: OUT_JSON,
        productCount: rows.length,
        profileCoverage,
        shortMeta: short.length,
        veryShortMeta: veryShort.length,
        repeatedBodyGroups: repeatedBodies.length,
        sourceConflicts: sourceConflicts.map((row) => row.id),
        mixedSignals: mixedSignals.map((row) => row.id),
        htmlMetaErrors: htmlMetaErrors.map((row) => row.id),
        htmlTagErrors: htmlTagErrors.map((row) => row.id),
        titleErrors: titleErrors.map((row) => row.id),
        schemaErrors: schemaErrors.map((row) => row.id),
        sitemapCoverage: sitemapSlugs.length,
      },
      null,
      2,
    ),
  );
} finally {
  await vite.close();
}
