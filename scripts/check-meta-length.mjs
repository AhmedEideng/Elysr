import { build } from 'esbuild';
const outfile='/tmp/lp.cjs';
await build({entryPoints:['src/data/landing-pages.ts'],outfile,bundle:true,platform:'node',format:'cjs',logLevel:'silent'});
const mod=await import(outfile+'?t='+Date.now());
const pages=mod.seoLandingPages;

console.log('=== LANDING PAGES with metaTitle >65 chars (get truncated in HTML) ===');
let n=0;
for(const p of pages.sort((a,b)=>b.metaTitle.length-a.metaTitle.length)){
  if(p.metaTitle.length>65){
    n++;
    console.log(`\n[${p.metaTitle.length}] ${p.slug}`);
    console.log(`  ${p.metaTitle}`);
  }
}
console.log(`\nTotal over-65 landing metaTitles: ${n}`);

// also count metaDescription >155
console.log('\n=== LANDING metaDescription >155 ===');
let d=0;
for(const p of pages){
  if(p.metaDescription.length>155){d++;console.log(`[${p.metaDescription.length}] ${p.slug}`);}
}
console.log(`Total: ${d}`);
