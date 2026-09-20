#!/usr/bin/env node
/**
 * ============================================================
 * ⚡ Critical CSS Injector (post-build)
 * ============================================================
 * الهدف: أول رسمة للصفحة (FCP/LCP) ما تستناش تحميل الـ CSS كامل.
 *
 * الطريقة:
 *  1) نجمع الـ classes اللي فعلاً معروضة في أول جزء من body لكل
 *     نوع صفحة من الـ HTML المولّد (home/منتج/مقال/تعليم/سلة/landing)
 *     — يعني الـ set بيتحدّث تلقائيًا مع أي تغيير في الماركب.
 *  2) من الـ CSS المبنى بنجيب كل rule تحتوي أي class من الـ set
 *     (بما فيها قواعد الـ responsive داخل @media) + قواعد العناصر
 *     الأساسية + block الـ properties بتاع Tailwind (متغيرات transform).
 *  3) نحط الناتج inline في <style> بكل صفحات dist/*.html، ونحوّل
 *     الـ <link rel="stylesheet"> إلى preload + swapper خارجي
 *     (CSP: script-src-attr 'none' تمنع onload inline) +
 *     <noscript> fallback عشان الـ crawlers ياخدوا الـ CSS كامل.
 *
 * الأمان:
 *  - مفيش تغيير في الـ CSS نفسه — نفس الملف بيتحمّل في الخلفية
 *    وبيتحلل فوق الـ critical (العرض النهائي مطابق 100%).
 *  - cap حجمي عشان الـ HTML ما ينفخش.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { transform } from "esbuild";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DIST = resolve(ROOT, "dist");

const CRITICAL_BUDGET = 30 * 1024; // سقف الحجم (bytes)
const BODY_SAMPLE = 9000; // أول 9KB من body لكل صفحة عينة

// ── 1) إيجاد الـ CSS المبنى ──
const assetsDir = resolve(DIST, "assets");
const cssFiles = readdirSync(assetsDir).filter((f) => /^index-.*\.css$/.test(f));
if (cssFiles.length !== 1) {
  console.error(`✗ متوقع index-*.css واحد في dist/assets، لقينا: ${cssFiles}`);
  process.exit(1);
}
const cssHref = `/assets/${cssFiles[0]}`;
const css = readFileSync(resolve(assetsDir, cssFiles[0]), "utf-8");

// ── 2) جمع الـ classes من مصادر فوق الـ fold (بتتحديث تلقائيًا مع الكود) ──
const SOURCES = [
  // shell مشترك لكل الصفحات
  "src/components/layout/Header.tsx",
  "src/components/PageHero.tsx",
  "src/components/FloatingActions.tsx",
  // الرئيسية (hero = الـ LCP)
  "src/components/sections/Hero.tsx",
  "src/components/sections/AnniversaryPromo.tsx",
  "src/components/sections/WhyUs.tsx",
  // صفحات المنتجات
  "src/components/ProductCard.tsx",
  "src/features/product/components/ProductCardImage.tsx",
  "src/features/product/components/ProductImage.tsx",
];
const JS_KEYWORDS = new Set([
  "if",
  "else",
  "return",
  "const",
  "let",
  "var",
  "function",
  "true",
  "false",
  "null",
  "undefined",
  "import",
  "from",
  "export",
  "default",
  "type",
  "interface",
  "void",
  "typeof",
  "new",
  "this",
  "await",
  "async",
  "switch",
  "case",
  "break",
  "continue",
  "in",
  "of",
  "do",
  "try",
  "catch",
  "finally",
  "throw",
  "extends",
  "super",
  "class",
  "static",
  "get",
  "set",
  "delete",
  "instanceof",
  "with",
  "yield",
  "enum",
  "declare",
  "abstract",
  "implements",
  "namespace",
  "module",
  "public",
  "private",
  "protected",
  "readonly",
  "as",
  "is",
  "keyof",
  "infer",
  "never",
  "unknown",
  "any",
  "string",
  "number",
  "boolean",
  "object",
  "symbol",
  "bigint",
  "react",
  "children",
  "className",
]);
const classSet = new Set();
const classFreq = new Map(); // تكرار الكلاس في المصادر = بديل الأولوية (فوق الـ fold بيتكرر أكتر)
const addClass = (t, w = 1) => {
  classSet.add(t);
  classFreq.set(t, (classFreq.get(t) || 0) + w);
};
for (const f of SOURCES) {
  const src = readFileSync(resolve(ROOT, f), "utf-8");
  for (const m of src.matchAll(/["'`]([A-Za-z0-9_\-:/\.\[\]%! ]+)["'`]/g)) {
    for (const t of m[1].split(/\s+/)) {
      if (
        t.length < 40 &&
        /^[A-Za-z][A-Za-z0-9_\-:/]*([:!][A-Za-z0-9_\-:/\[\]%]*|[!.]?[A-Za-z0-9_\-:/\[\]%]*)$/.test(
          t,
        ) &&
        !JS_KEYWORDS.has(t)
      ) {
        addClass(t);
      }
    }
  }
}
// utilities أساسية مشتركة في ماركب الـ routes (فوق الـ fold)
for (const t of [
  "container",
  "mx-auto",
  "px-4",
  "px-3",
  "flex",
  "flex-col",
  "flex-1",
  "items-center",
  "items-start",
  "items-end",
  "justify-between",
  "justify-center",
  "justify-start",
  "gap-1",
  "gap-1.5",
  "gap-2",
  "gap-2.5",
  "gap-3",
  "gap-4",
  "gap-5",
  "grid",
  "grid-cols-1",
  "grid-cols-2",
  "grid-cols-3",
  "grid-cols-4",
  "text-center",
  "text-left",
  "text-right",
  "text-xs",
  "text-sm",
  "text-base",
  "text-lg",
  "text-xl",
  "text-2xl",
  "text-3xl",
  "text-4xl",
  "font-medium",
  "font-bold",
  "font-black",
  "leading-none",
  "leading-tight",
  "leading-snug",
  "leading-6",
  "leading-relaxed",
  "rounded-lg",
  "rounded-xl",
  "rounded-2xl",
  "rounded-full",
  "bg-white",
  "bg-card",
  "bg-background",
  "bg-muted",
  "border",
  "border-b",
  "border-t",
  "shadow-sm",
  "shadow-md",
  "shadow-elegant",
  "transition",
  "transition-all",
  "transition-smooth",
  "hover:shadow-sm",
  "hover:shadow-md",
  "w-full",
  "w-fit",
  "h-full",
  "h-fit",
  "min-w-0",
  "shrink-0",
  "block",
  "hidden",
  "md:block",
  "sm:block",
  "md:flex",
  "md:flex-row",
  "sm:gap-3",
  "sm:gap-4",
  "md:p-6",
  "md:px-4",
  "mb-1",
  "mb-1.5",
  "mb-2",
  "mb-2.5",
  "mb-3",
  "mb-4",
  "mb-5",
  "mb-6",
  "mt-1",
  "mt-1.5",
  "mt-2",
  "mt-3",
  "mt-4",
  "mt-5",
  "mt-6",
  "mt-auto",
  "p-3",
  "p-4",
  "p-5",
  "line-clamp-2",
  "line-clamp-3",
  "overflow-hidden",
  "overflow-x-hidden",
  "cursor-pointer",
  "select-none",
  "aspect-video",
  "aspect-square",
  "aspect-auto",
  "uppercase",
  "tracking-wide",
  "truncate",
  "whitespace-nowrap",
  "relative",
  "absolute",
  "inset-0",
  "z-10",
  "z-50",
  "object-cover",
  "object-contain",
  "opacity-80",
  "pointer-events-none",
  "aria-hidden",
])
  addClass(t, 2); // وزن أعلى: مشروعين في كل الـ above-the-fold
console.log(`✓ classes من ${SOURCES.length} مصادر + core utils: ${classSet.size}`);

// ── 3) tokenizer بسيط للـ CSS + جمع الـ rules المطابقة ──
const JS_CLS = (sel) =>
  [...sel.matchAll(/\.([A-Za-z0-9_\-:/!%[\]()\\]+)(?=[\s,{:.+)>~*]|$)/g)].map((m) =>
    m[1].replace(/\\/g, ""),
  );
const BASE_ELEMENTS = new Set([
  "html",
  "body",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "p",
  "a",
  "img",
  "button",
  "input",
  "ul",
  "li",
  "ol",
  "blockquote",
  "strong",
  "em",
  "span",
  "div",
  "table",
  "th",
  "td",
  "form",
  "select",
  "textarea",
  "nav",
  "header",
  "main",
  "section",
  "footer",
  "svg",
  "path",
  "dl",
  "dt",
  "dd",
  "hr",
  "pre",
  "code",
]);

function blockMatchScore(header) {
  // 0 = مطابق (class من الـ set، أو عنصر أساسي، أو :root، أو universal/pseudo)
  const h = header.trim();
  if (/^:root\b/.test(h)) return 0; // متغيرات البراند (primary/card/foreground...)
  if (JS_CLS(h).some((c) => classSet.has(c))) return 0;
  if (h.startsWith("*") || h.startsWith(":")) return 0; // universal + pseudo-elements
  if (
    h
      .split(",")
      .some((p) => BASE_ELEMENTS.has(p.trim().replace(/:before|:after|::before|::after/g, "")))
  ) {
    return 0;
  }
  return -1;
}

const kept = []; // {score, size, text}

// walk متكرر للـ CSS text — بيتعامل مع @media/@supports المتداخلة
// (responsive variants بتاعت Tailwind جواهم)
function collectRules(text, emitRule) {
  let k = 0;
  while (k < text.length) {
    const bb = text.indexOf("{", k);
    if (bb === -1) break;
    const bh = text.slice(k, bb).trim();
    let d2 = 1;
    let jj = bb + 1;
    while (jj < text.length && d2 > 0) {
      if (text[jj] === "{") d2++;
      else if (text[jj] === "}") d2--;
      jj++;
    }
    const sub = text.slice(k, jj);
    k = jj;
    if (bh.startsWith("@media") || bh.startsWith("@supports")) {
      // المهم: الـ rules الداخلية لازم ترجع ملفوفة بنفس الـ @media —
      // .md\:flex من غير (min-width:48rem) هيتطبق على كل الشاشات = كسر mobile
      const inner = sub.slice(sub.indexOf("{") + 1, sub.lastIndexOf("}"));
      const innerRules = [];
      collectRules(inner, (r) => innerRules.push(r));
      if (innerRules.length) emitRule(bh + "{" + innerRules.join("") + "}");
      continue;
    }
    // rules اللي تعتمد على متغيرات transform من غير fallback (rotate/scale/
    // translate/shadow/blur/gradient) مالهاش قيمة من غير properties layer →
    // للـ CSS الكامل. استثناء: var(--tw-leading,...) عنده fallback للـ theme.
    const body = sub.slice(bb + 1, sub.lastIndexOf("}"));
    if (
      sub.includes("var(--tw-") &&
      /var\(--tw-(?!leading)[a-z-]*\)/.test(body.replace(/var\(--tw-leading[^)]*\)/g, ""))
    ) {
      continue;
    }
    if (blockMatchScore(bh) >= 0) emitRule(sub);
  }
}
let i = 0;
while (i < css.length) {
  const semi = css.indexOf(";", i);
  const brace = css.indexOf("{", i);
  if (brace === -1) break;
  // statements زي "@layer components;" (تسجيل layer من غير body)
  if (semi !== -1 && semi < brace) {
    i = semi + 1;
    continue;
  }
  const header = css.slice(i, brace).trim();
  let depth = 1;
  let j = brace + 1;
  while (j < css.length && depth > 0) {
    if (css[j] === "{") depth++;
    else if (css[j] === "}") depth--;
    j++;
  }
  const block = css.slice(i, j);
  i = j;

  const h = header
    .replace(/^\/\*[\s\S]*?\*\//, "")
    .trim()
    .toLowerCase();
  if (h.startsWith("@keyframes")) continue; // أنيميشن: بيتطبق مع الـ CSS الكامل (بلا تأثير layout)
  if (h.startsWith("@font-face")) {
    kept.push({ score: 0, size: block.length, text: block });
    continue;
  }
  if (h.startsWith("@layer")) {
    // theme/base = متغيرات ألوان/خطوط + resets بنلازمها (الـ utilities بتعتمد عليهم).
    // بنفككهم بـ collectRules (نفس طريقة الـ utilities) عشان كل حاجة تدخل
    // جوا @layer critical فيبقى أولويتها أقل من كل طبقات الـ CSS الكامل.
    // الـ properties (متغيرات transform) بنسبها: بتستهلك 4.5KB من الـ budget.
    if (!h.includes("utilities") && !h.includes("properties")) {
      const inner = block.slice(block.indexOf("{") + 1, block.lastIndexOf("}"));
      collectRules(inner, (sub) => kept.push({ score: 0, size: sub.length, text: sub }));
      continue;
    }
    // @layer utilities: بنخطف الـ rules المطابقة — بما فيها المتجايلة جوا
    // @media للـ responsive variants (sm:/md:/lg:) — كل rule لوحدها عشان
    // الـ budget يقدر يختار أفضل subset
    let matched = 0;
    const innerText = block.slice(block.indexOf("{") + 1, block.lastIndexOf("}"));
    collectRules(innerText, (sub) => {
      // freq من كل الـ classes في النص (شامل rules جوا @media المجمعة)
      const freq = JS_CLS(sub).reduce((s2, c) => s2 + (classFreq.get(c) || 0), 0);
      kept.push({ score: 1, freq, size: sub.length, text: sub });
      matched++;
    });
    console.log(`DEBUG utilities matched: ${matched} rules`);
    continue;
  }
  if (h.startsWith("@supports") || h.startsWith("@media")) {
    const innerText = block.slice(block.indexOf("{") + 1, block.lastIndexOf("}"));
    let out = "";
    let k = 0;
    while (k < innerText.length) {
      const bb = innerText.indexOf("{", k);
      if (bb === -1) break;
      const bh = innerText.slice(k, bb).trim();
      let d2 = 1;
      let jj = bb + 1;
      while (jj < innerText.length && d2 > 0) {
        if (innerText[jj] === "{") d2++;
        else if (innerText[jj] === "}") d2--;
        jj++;
      }
      const sub = innerText.slice(k, jj);
      k = jj;
      if (blockMatchScore(bh) >= 0) out += sub;
    }
    if (out)
      kept.push({ score: 2, size: header.length + 2 + out.length, text: header + "{" + out + "}" });
    continue;
  }
  if (h.startsWith("@")) continue; // @property/باقي

  const score = blockMatchScore(header);
  if (score >= 0) kept.push({ score, size: block.length, text: block });
}

// ── 4) ترتيب بالأولوية + تطبيق الـ budget ──
kept.sort((a, b) => a.score - b.score || (b.freq || 0) - (a.freq || 0) || a.size - b.size);
let total = 0;
const chosen = [];
for (const k of kept) {
  if (total + k.size > CRITICAL_BUDGET && chosen.length > 0) continue;
  chosen.push(k);
  total += k.size;
}
// مهم جدًا: كل القواعد جوا @layer critical — الـ layer بيظهر قبل طبقات الـ CSS
// الكامل (theme/base/components/utilities) فأولويته أدنى: لو في تعارض،
// الـ CSS الكامل دايمًا يفوز (critical = أول رسمة بس، مش مصدر الحقيقة).
const criticalCss = "@layer critical{" + chosen.map((k) => k.text).join("") + "}";
// The main stylesheet is minified by Vite, but this inline stylesheet bypasses
// Vite. Minify it here too so PageSpeed does not count whitespace/comments as
// render-blocking CSS bytes.
const minifiedCriticalCss = (
  await transform(criticalCss, { loader: "css", minify: true, target: "es2022" })
).code.trim();
console.log(
  `✓ critical CSS: ${(minifiedCriticalCss.length / 1024).toFixed(1)}KB من ${kept.length} rules (budget ${CRITICAL_BUDGET / 1024}KB)`,
);

// ── 5) حقن في كل صفحات dist ──
const htmlFiles = [];
(function walk(dir) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    const st = statSync(p);
    if (st.isDirectory()) walk(p);
    else if (e.endsWith(".html")) htmlFiles.push(p);
  }
})(DIST);

// defer: بيتحمّل بالتوازي مع الـ HTML (مفيش round-trip مانع) وبيشتغل فور
// ما الـ parsing يخلص — الـ preload كان بدأ تحميل الـ CSS من الأول
const swapper = `<script src="/scripts/css-swapper.js" defer></script>`;
let pages = 0;
for (const f of htmlFiles) {
  let html = readFileSync(f, "utf-8");
  if (!html.includes('rel="stylesheet"')) continue;
  // 5a) استبدال الـ link بـ preload + noscript + swapper
  html = html.replace(
    /<link rel="stylesheet" crossorigin href="([^"]+)">/,
    `<link rel="preload" href="$1" as="style">\n    <noscript><link rel="stylesheet" href="$1"></noscript>\n    ${swapper}`,
  );
  // 5b) إضافة الـ critical style بعد الـ <style> الحالي (أو قبل </head>)
  const styleClose = html.indexOf("</style>");
  const insert = `<style id="critical-above-the-fold">${minifiedCriticalCss}</style>`;
  if (styleClose !== -1) {
    html = html.slice(0, styleClose + 8) + "\n    " + insert + html.slice(styleClose + 8);
  } else {
    html = html.replace("</head>", "  " + insert + "\n</head>");
  }
  writeFileSync(f, html, "utf-8");
  pages++;
}
console.log(`✓ حقن الـ critical CSS في ${pages} صفحة`);
