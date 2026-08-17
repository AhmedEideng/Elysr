/**
 * ============================================================
 * Hero Image Optimizer — Maximum compression, preserved quality
 * ============================================================
 * Processes the new hero image with multiple quality levels and
 * picks the best (smallest) WebP file that still looks good.
 *
 * Strategy:
 *   - Try quality 60, 65, 70, 75, 80
 *   - Pick the smallest file (best compression at acceptable quality)
 *   - Use maximum encoder effort (6)
 *   - Strip all metadata
 *   - Generate 3 sizes: 480w, 768w, 1200w
 * ============================================================
 */
import sharp from "sharp";
import { readFileSync, writeFileSync, statSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const INPUT = process.argv[2] || "/home/user/uploads/file_0000000081b871f4b983ba031806e519.png";
const OUT_DIR = resolve(ROOT, "public", "images");

if (!existsSync(INPUT)) {
  console.error(`❌ Input not found: ${INPUT}`);
  process.exit(1);
}

const SIZES = [
  { width: 480, suffix: "" }, // will be hero-banner-480.webp
  { width: 768, suffix: "-768" }, // hero-banner-768.webp
  { width: 1200, suffix: "" }, // hero-banner.webp (main)
];

const QUALITIES = [60, 65, 70, 75, 80];

async function findBestQuality(buffer, width) {
  const target = width / (await sharp(buffer).metadata()).width;
  const results = [];

  for (const q of QUALITIES) {
    const buf = await sharp(buffer)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: q, effort: 6, smartSubsample: true })
      .toBuffer();
    results.push({ quality: q, size: buf.length, buffer: buf });
  }

  // Pick the smallest that is < 90% of the next-larger-quality file
  // (so we don't pick something that's only marginally smaller but
  // visibly worse).
  let best = results[0];
  for (let i = 1; i < results.length; i++) {
    const r = results[i];
    const prev = results[i - 1];
    if (r.size < prev.size * 0.92) {
      // significant savings — keep the lower-quality one
      best = r;
    } else {
      // diminishing returns — go with higher quality
      best = prev;
      break;
    }
  }
  return best;
}

const inputBuffer = readFileSync(INPUT);
const meta = await sharp(inputBuffer).metadata();
console.log(
  `📐 Input: ${meta.width}×${meta.height} ${meta.format.toUpperCase()} ${(statSync(INPUT).size / 1024).toFixed(0)} KB`,
);

const inputSize = statSync(INPUT).size;
let totalOut = 0;

for (const size of SIZES) {
  if (size.width > meta.width * 1.2) continue; // don't enlarge

  console.log(`\n🎯 Generating ${size.width}w (${size.suffix || "main"})…`);
  const best = await findBestQuality(inputBuffer, size.width);
  const outName = `hero-banner${size.suffix}.webp`;
  const outPath = resolve(OUT_DIR, outName);
  writeFileSync(outPath, best.buffer);
  totalOut += best.buffer.length;
  const savings = (
    (1 - best.buffer.length / (inputSize * (size.width / meta.width))) *
    100
  ).toFixed(0);
  console.log(
    `   ✅ ${outName}  q=${best.quality}  ${(best.buffer.length / 1024).toFixed(1)} KB  (${savings}% smaller than scaled input)`,
  );
}

console.log(`\n💾 Total output: ${(totalOut / 1024).toFixed(1)} KB`);
console.log(`📉 Original PNG: ${(inputSize / 1024).toFixed(1)} KB`);
console.log(`🚀 Compression ratio: ${((1 - totalOut / inputSize) * 100).toFixed(1)}%`);
