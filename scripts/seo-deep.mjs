import fs from 'fs';
import path from 'path';

function walk(dir){let o=[];for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())o=o.concat(walk(p));else if(e.name.endsWith('.html'))o.push(p);}return o;}
const guides = walk('dist/products/guides');

function analyze(f){
  const html=fs.readFileSync(f,'utf8');
  const mTitle=(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1]?.trim()||'';
  const h1=(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)||[])[1]?.replace(/<[^>]+>/g,'').trim()||'';
  const body=html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ');
  return {f, mTitle, h1, bodyLen:body.length};
}
const rows=guides.map(analyze);

// 1. Duplicate titles
const titleCount={};
for(const r of rows) titleCount[r.mTitle]=(titleCount[r.mTitle]||0)+1;
const dups=Object.entries(titleCount).filter(([,c])=>c>1);
console.log('=== DUPLICATE TITLES ===');
console.log(dups.length?dups.map(([t,c])=>`${c}x: ${t}`).join('\n'):'None ✓');

// 2. Title vs H1 mismatch (big difference)
console.log('\n=== TITLE vs H1 (large divergence >20 chars) ===');
let mismatch=0;
for(const r of rows){
  // check if H1 is a substring-ish of title or vice versa (ignoring brand)
  const tClean=r.mTitle.replace(/\s*[|—-].*$/,'').trim();
  const overlap = tClean.includes(r.h1) || r.h1.includes(tClean);
  if(!overlap && r.h1 && Math.abs(r.h1.length-tClean.length)>8){mismatch++;console.log(`\n[${path.basename(r.f)}]\n T: ${r.mTitle}\n H1: ${r.h1}`);}
}
console.log(mismatch?`(${mismatch} divergent)`:'');

// 3. H1 length
console.log('\n=== H1 LENGTH ===');
const shortH1=rows.filter(r=>r.h1.length<8);
console.log('H1 <8 chars:', shortH1.length, shortH1.map(r=>`${path.basename(r.f)}=${r.h1}`).join(', '));

// 4. Titles near limit (61-65) - risk of truncation with brand
console.log('\n=== TITLES 61-65 (near truncation limit) ===');
for(const r of [...rows].filter(r=>r.mTitle.length>=61).sort((a,b)=>b.mTitle.length-a.mTitle.length)) console.log(`${r.mTitle.length}\t${path.basename(r.f)}: ${r.mTitle}`);

// 5. Check brand consistency — title should include اليسر ميديكال
console.log('\n=== TITLES WITHOUT "اليسر ميديكال" ===');
const noBrand=rows.filter(r=>!r.mTitle.includes('اليسر ميديكال'));
console.log(noBrand.length?noBrand.map(r=>`${path.basename(r.f)}: ${r.mTitle}`).join('\n'):'All include brand ✓');
