import { build } from 'esbuild';
const outfile='/tmp/kw.cjs';
await build({entryPoints:['src/data/landing-pages.ts'],outfile,bundle:true,platform:'node',format:'cjs',logLevel:'silent'});
const mod=await import(outfile+'?t='+Date.now());
const pages=mod.seoLandingPages;

// 1. Empty / missing primaryKeyword
const missing = pages.filter(p=>!p.primaryKeyword || !p.primaryKeyword.trim());
console.log('=== 1. Pages with EMPTY primaryKeyword ===');
console.log(missing.length? missing.map(p=>p.slug).join(', ') : 'None ✓');

// 2. Duplicate primaryKeyword
const count = {};
for(const p of pages){ const k=(p.primaryKeyword||'').trim().toLowerCase(); count[k]=(count[k]||[]).concat(p.slug); }
const dups = Object.entries(count).filter(([k,v])=>v.length>1 && k);
console.log('\n=== 2. DUPLICATE primaryKeyword across pages ===');
console.log(dups.length? dups.map(([k,v])=>`"${k}" -> ${v.join(', ')}`).join('\n') : 'None ✓');

// 3. primaryKeyword length
console.log('\n=== 3. primaryKeyword too short (<3 chars) or too long (>60) ===');
const badLen = pages.filter(p=>(p.primaryKeyword||'').length<3 || (p.primaryKeyword||'').length>60);
console.log(badLen.length? badLen.map(p=>`${p.primaryKeyword} (${p.primaryKeyword.length}) [${p.slug}]`).join('\n') : 'None ✓');

// 4. Empty relatedKeywords
const noRel = pages.filter(p=>!p.relatedKeywords || p.relatedKeywords.length===0);
console.log('\n=== 4. Pages with EMPTY relatedKeywords ===');
console.log(noRel.length? noRel.map(p=>p.slug).join(', ') : 'None ✓');

// 5. Does primaryKeyword appear in metaTitle? (keyword-title alignment)
console.log('\n=== 5. primaryKeyword NOT present in metaTitle ===');
const noTitle = pages.filter(p=>!(p.metaTitle||'').includes((p.primaryKeyword||'').slice(0,10)));
console.log(noTitle.length? noTitle.map(p=>`[${p.slug}] kw="${p.primaryKeyword}" title="${p.metaTitle}"`).join('\n') : 'All primaryKeywords appear in metaTitle ✓');

// 6. Does primaryKeyword appear in intro/sections?
console.log('\n=== 6. primaryKeyword NOT found in page content (intro+sections) ===');
const contentOf = p => (p.intro||'') + ' ' + (p.heroDescription||'') + ' ' + p.sections.map(s=>s.heading+' '+s.body).join(' ') + ' ' + (p.metaDescription||'');
const noContent = pages.filter(p=>{
  const c=contentOf(p);
  return !c.includes((p.primaryKeyword||'').trim()) && !(p.primaryKeyword||'').trim().includes(' ') && (p.primaryKeyword||'').trim();
});
console.log(noContent.length? noContent.map(p=>`[${p.slug}] kw="${p.primaryKeyword}"`).join('\n') : 'All primaryKeywords found in content ✓');

// 7. primaryKeyword similar to relatedKeywords (near-duplicate)
console.log('\n=== 7. Primary keyword stats ===');
const lens = pages.map(p=>(p.primaryKeyword||'').length).sort((a,b)=>a-b);
console.log(`primaryKeyword length min=${lens[0]} max=${lens[lens.length-1]} avg=${Math.round(lens.reduce((a,b)=>a+b,0)/lens.length)}`);
console.log(`Pages with relatedKeywords: ${pages.filter(p=>p.relatedKeywords&&p.relatedKeywords.length>0).length}/${pages.length}`);

// Sample of all primary keywords
console.log('\n=== 8. SAMPLE primaryKeywords (first 30) ===');
for(const p of pages.slice(0,30)) console.log(`[${p.slug}] ${p.primaryKeyword}`);
