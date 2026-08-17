import fs from 'fs';
import path from 'path';

const guidesDir = 'dist/products/guides';

// --- Collect HTML files ---
function walk(dir) {
  let out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(walk(p));
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

const guides = walk(guidesDir);
const products = ['dist/products/men.html','dist/products/women.html','dist/products/devices.html'];
const statics = ['dist/index.html','dist/about.html','dist/contact.html','dist/education.html','dist/shipping.html','dist/returns.html','dist/terms.html','dist/privacy.html'];

function analyze(f, label) {
  const html = fs.readFileSync(f, 'utf8');
  const mTitle = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]?.trim() || '';
  const mDesc = (html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["']/i) || [])[1] || '';
  const mDesc2 = (html.match(/<meta[^>]+content=["']([\s\S]*?)["'][^>]+name=["']description["']/i) || [])[1] || '';
  const desc = mDesc || mDesc2;
  const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map(m => m[1].replace(/<[^>]+>/g,'').trim());
  const canon = (html.match(/rel=["']canonical["'][^>]*href=["']([^"']+)["']/i) || [])[1] || '';
  const ogTitle = (html.match(/property=["']og:title["'][^>]*content=["']([^"']*)["']/i) || [])[1] || '';
  const relLen = (mTitle.length > 65) ? `TRUNC-${mTitle.length}` : `${mTitle.length}`;
  return { label, f, mTitle, mTitleLen: mTitle.length, relLen, desc, descLen: desc.length, h1s, canon, ogTitle };
}

let rows = [];
let issues = [];
for (const f of guides) rows.push(analyze(f, 'guide'));
for (const f of products) rows.push(analyze(f, 'product'));
for (const f of statics) rows.push(analyze(f, 'static'));

// --- Issue detection ---
const guidesMap = rows.filter(r => r.label==='guide');
const prodRows = rows.filter(r => r.label==='product');
const staticRows = rows.filter(r => r.label==='static');

// Title checks
for (const r of rows) {
  if (!r.mTitle) issues.push(`[${r.label}] ${r.f}: MISSING <title>`);
  else if (r.mTitle.length > 65) issues.push(`[${r.label}] ${r.f}: TITLE >65 (${r.mTitle.length}): ${r.mTitle}`);
  else if (r.mTitle.length < 15) issues.push(`[${r.label}] ${r.f}: TITLE too short (${r.mTitle.length}): ${r.mTitle}`);
}

// Description checks
for (const r of rows) {
  if (!r.desc) issues.push(`[${r.label}] ${r.f}: MISSING meta description`);
  else if (r.desc.length > 160) issues.push(`[${r.label}] ${r.f}: DESC >160 (${r.desc.length})`);
  else if (r.desc.length < 70) issues.push(`[${r.label}] ${r.f}: DESC too short (${r.desc.length})`);
}

// H1 checks
for (const r of rows) {
  if (r.h1s.length === 0) issues.push(`[${r.label}] ${r.f}: NO H1`);
  else if (r.h1s.length > 1) issues.push(`[${r.label}] ${r.f}: MULTIPLE H1 (${r.h1s.length})`);
}

// Canonical checks
for (const r of rows) {
  if (!r.canon) issues.push(`[${r.label}] ${r.f}: MISSING canonical`);
}

// og:title checks
for (const r of rows) {
  if (!r.ogTitle) issues.push(`[${r.label}] ${r.f}: MISSING og:title`);
}

// Title == H1 check (avoid duplicates, but check keyword alignment)
// Check title contains keyword-ish, skip

console.log('=== SUMMARY ===');
console.log(`guides: ${guidesMap.length}, products: ${prodRows.length}, statics: ${staticRows.length}`);
console.log(`Total analyzed: ${rows.length}`);

const titleOver = rows.filter(r => r.mTitle.length > 65);
const descOver = rows.filter(r => r.desc.length > 160);
const descShort = rows.filter(r => r.desc.length < 70);
const noH1 = rows.filter(r => r.h1s.length === 0);
const multiH1 = rows.filter(r => r.h1s.length > 1);
console.log(`\nTitles >65: ${titleOver.length}`);
console.log(`Descriptions >160: ${descOver.length}`);
console.log(`Descriptions <70: ${descShort.length}`);
console.log(`No H1: ${noH1.length}, Multiple H1: ${multiH1.length}`);

console.log('\n=== ALL ISSUES ===');
if (issues.length === 0) console.log('No issues found ✓');
else for (const i of issues) console.log(i);

console.log('\n=== TITLE LENGTH DISTRIBUTION (guides) ===');
const lens = guidesMap.map(r => r.mTitle.length).sort((a,b)=>a-b);
console.log(`min=${lens[0]} max=${lens[lens.length-1]} avg=${Math.round(lens.reduce((a,b)=>a+b,0)/lens.length)}`);
console.log(`Titles in 30-65 range: ${guidesMap.filter(r=>r.mTitle.length>=30&&r.mTitle.length<=65).length}/${guidesMap.length}`);

// longest titles
console.log('\n=== 10 LONGEST TITLES ===');
for (const r of [...rows].sort((a,b)=>b.mTitle.length-a.mTitle.length).slice(0,10)) {
  console.log(`${r.mTitle.length}\t${r.mTitle}`);
}

// shortest guides
console.log('\n=== 10 SHORTEST GUIDE TITLES ===');
for (const r of [...guidesMap].sort((a,b)=>a.mTitle.length-b.mTitle.length).slice(0,10)) {
  console.log(`${r.mTitle.length}\t${r.mTitle}`);
}
