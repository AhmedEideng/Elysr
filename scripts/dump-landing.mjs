import { build } from 'esbuild';
const outfile = '/tmp/landing.cjs';
await build({ entryPoints: ['src/data/landing-pages.ts'], outfile, bundle: true, platform: 'node', format: 'cjs', logLevel: 'silent' });
const mod = await import(outfile + '?t=' + Date.now());
const pages = mod.seoLandingPages;
const slugs = process.argv.slice(2);
for (const slug of slugs) {
  const p = pages.find((x) => x.slug === slug);
  if (!p) { console.log('NOT FOUND', slug); continue; }
  console.log('================ ' + slug + ' ================');
  console.log('TITLE:', p.title);
  console.log('INTRO:', p.intro);
  console.log('HERO:', p.heroDescription);
  console.log('--- SECTIONS ---');
  for (const s of p.sections) console.log(`\n[${s.heading}]\n${s.body}`);
  console.log('\n--- FAQS ---');
  for (const f of p.faqs) console.log(`\nQ: ${f.question}\nA: ${f.answer}`);
  console.log('\nPRODUCTS:', JSON.stringify(p.productIds));
  console.log('LINKS:', JSON.stringify(p.links.map(l=>l.href)));
}
