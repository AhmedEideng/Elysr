import { build } from 'esbuild';
import path from 'path';
import fs from 'fs';

// Transpile the TS data module to CJS and load it
const outfile = '/tmp/landing.cjs';
await build({
  entryPoints: ['src/data/landing-pages.ts'],
  outfile,
  bundle: true,
  platform: 'node',
  format: 'cjs',
  logLevel: 'silent',
});

const mod = await import(outfile + '?t=' + Date.now());
const pages = mod.seoLandingPages;

function words(s) {
  if (!s) return 0;
  // strip tags & entities, count arabic words
  const clean = String(s)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/g, ' ')
    .replace(/[0-9]/g, ' ')
    .replace(/[a-zA-Z0-9]/g, ' ')
    .trim();
  const m = clean.match(/[\u0600-\u06FF]+/g);
  return m ? m.length : 0;
}

function introWords(p) {
  const parts = [p.intro, p.heroDescription, p.eyebrow, p.metaDescription];
  return parts.map(words).reduce((a, b) => a + b, 0);
}

function totalWords(p) {
  let total = introWords(p);
  for (const s of p.sections || []) total += words(s.heading) + words(s.body);
  for (const f of p.faqs || []) total += words(f.q) + words(f.a);
  return total;
}

const rows = pages.map((p) => ({
  slug: p.slug,
  total: totalWords(p),
  intro: introWords(p),
  sections: (p.sections || []).length,
  faqs: (p.faqs || []).length,
}));

rows.sort((a, b) => a.total - b.total);

console.log('TOTAL PAGES:', pages.length);
const short = rows.filter((r) => r.total < 250);
console.log('SHORT (<250):', short.length);
console.log('');
console.log('=== 60 SHORTEST PAGES ===');
for (const r of short.slice(0, 60)) {
  console.log(`${r.total}\tintro=${r.intro}\tsec=${r.sections}\tfaq=${r.faqs}\t${r.slug}`);
}

console.log('\n=== TARGET PAGES (word counts) ===');
for (const slug of ['energy-performance-supplements-men','traction-device-safety','women-topical-products-safety']) {
  const p = pages.find(x=>x.slug===slug);
  console.log(totalWords(p), p.slug, 'sections:', p.sections.length, 'faqs:', p.faqs.length);
}
