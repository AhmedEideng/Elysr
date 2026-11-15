#!/usr/bin/env node
/**
 * Inline the complete Vite entry stylesheet in each prerendered page.
 *
 * A partial critical stylesheet allowed visibly unstyled content on slow
 * connections. Keeping the exact full stylesheet in the initial HTML ensures
 * that the first paint does not depend on a separate stylesheet request or on
 * JavaScript. The trade-off is larger HTML and no cross-page CSS cache reuse.
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = resolve(ROOT, "dist");
const cssFiles = readdirSync(resolve(DIST, "assets")).filter((name) =>
  /^index-.*\.css$/.test(name),
);
if (cssFiles.length !== 1) throw new Error(`Expected one entry stylesheet; found: ${cssFiles}`);
const cssName = cssFiles[0];
const css = readFileSync(resolve(DIST, "assets", cssName), "utf8");
// Relative CSS URLs resolve against the CSS file, not the HTML document. Fail
// safely rather than silently changing their meaning when inlining the file.
if (/<\/style/i.test(css) || /@import\b/i.test(css)) {
  throw new Error("Entry CSS contains </style or @import and cannot be safely inlined");
}
for (const match of css.matchAll(/url\(\s*['"]?([^'"\s)]+)/gi)) {
  if (!/^(?:\/|https?:|data:|blob:|#)/i.test(match[1])) {
    throw new Error(`Entry CSS has a relative URL that cannot be safely inlined: ${match[1]}`);
  }
}
const stylesheet = /<link\s+rel="stylesheet"\s+crossorigin\s+href="([^"]+)"\s*\/?>/g;
let pages = 0;
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(path);
      continue;
    }
    if (!entry.name.endsWith(".html")) continue;
    const html = readFileSync(path, "utf8");
    let replacements = 0;
    const result = html.replace(stylesheet, (tag, href) => {
      if (href !== `/assets/${cssName}`) return tag;
      replacements++;
      return `<style id="entry-stylesheet">${css}</style>`;
    });
    if (path === resolve(DIST, "404.html") && replacements === 0) continue;
    if (replacements !== 1) {
      throw new Error(`Expected exactly one entry stylesheet in ${path}; found ${replacements}`);
    }
    writeFileSync(path, result, "utf8");
    pages++;
  }
}
walk(DIST);
if (pages === 0) throw new Error("No pages received the entry stylesheet");
console.log(
  `✓ Full CSS inlined in ${pages} pages (${(Buffer.byteLength(css) / 1024).toFixed(1)} KB per page)`,
);
