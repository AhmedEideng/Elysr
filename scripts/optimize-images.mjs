/**
 * ============================================================
 * Image Optimizer — sharp pipeline
 * ============================================================
 * Processes every product image in public/images/ and:
 *   1. Resizes to 800x800 max (preserving aspect ratio)
 *   2. Converts to WebP @ quality 50 (best size/quality tradeoff)
 *   3. Generates a 320x320 thumbnail in public/images/thumbs/
 *
 * Skips hero, article, and og-* images (handled separately).
 * Skips images that already exist & are smaller than input.
 *
 * Usage: node scripts/optimize-images.mjs [--force]
 * ============================================================
 */
import { readdirSync, readFileSync, statSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname, join, basename, extname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const IMAGES_DIR = resolve(ROOT, "public", "images");
const THUMBS_DIR = resolve(IMAGES_DIR, "thumbs");
const THUMBS_180_DIR = resolve(IMAGES_DIR, "thumbs-180");

const FORCE = process.argv.includes("--force");
const VERBOSE = process.argv.includes("--verbose");

const SKIP_PATTERNS = [/^hero-/, /^article-/, /^og-/, /^favicon/, /^logo/];

function shouldSkip(name) {
  return SKIP_PATTERNS.some((re) => re.test(name));
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === "thumbs" || entry === "thumbs-180") continue;
      out.push(...walk(full));
    } else if (/\.(png|jpe?g|webp)$/i.test(entry)) {
      out.push({ path: full, size: st.size, name: entry });
    }
  }
  return out;
}

if (!existsSync(THUMBS_DIR)) mkdirSync(THUMBS_DIR, { recursive: true });
if (!existsSync(THUMBS_180_DIR)) mkdirSync(THUMBS_180_DIR, { recursive: true });

const files = walk(IMAGES_DIR);
let processed = 0;
let skipped = 0;
let errors = 0;
let savedBytes = 0;

console.log(`🔍 Found ${files.length} images to inspect.\n`);

for (const file of files) {
  const name = file.name;
  const ext = extname(name).toLowerCase();

  if (shouldSkip(name.replace(/\.webp$/i, ""))) {
    if (VERBOSE) console.log(`⏭  Skip: ${name} (matched skip pattern)`);
    skipped++;
    continue;
  }

  const thumbPath = join(THUMBS_DIR, name.replace(/\.(png|jpe?g)$/i, ".webp"));
  const thumb180Path = join(THUMBS_180_DIR, name.replace(/\.(png|jpe?g)$/i, ".webp"));
  const targetPath = file.path.replace(/\.(png|jpe?g)$/i, ".webp");

  try {
    const inputBuffer = readFileSync(file.path);
    // Convert & resize main image
    const mainPipeline = sharp(inputBuffer)
      .rotate() // auto-rotate from EXIF
      .resize({ width: 800, height: 800, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 50, effort: 6 });

    // 🚀 AVIF نسخة إضافية — توفير 20-30% حجم
    const avifPipeline = sharp(inputBuffer)
      .rotate()
      .resize({ width: 800, height: 800, fit: "inside", withoutEnlargement: true })
      .avif({ quality: 40, effort: 4 });

    const thumbPipeline = sharp(inputBuffer)
      .rotate()
      .resize({ width: 480, height: 480, fit: "cover" })
      .webp({ quality: 75, effort: 6 });

    const thumb180Pipeline = sharp(inputBuffer)
      .rotate()
      .resize({ width: 360, height: 360, fit: "cover" })
      .webp({ quality: 75, effort: 6 });

    const [mainBuf, avifBuf, thumbBuf, thumb180Buf] = await Promise.all([
      mainPipeline.toBuffer(),
      avifPipeline.toBuffer(),
      thumbPipeline.toBuffer(),
      thumb180Pipeline.toBuffer(),
    ]);

    if (!FORCE && existsSync(targetPath) && existsSync(thumbPath) && existsSync(thumb180Path)) {
      const existingSize = statSync(targetPath).size;
      if (existingSize <= mainBuf.length) {
        if (VERBOSE) console.log(`⏭  Skip: ${name} (existing file is smaller)`);
        skipped++;
        continue;
      }
    }

    const avifPath = file.path.replace(/\.(png|jpe?g|webp)$/i, ".avif");
    writeFileSync(targetPath, mainBuf);
    writeFileSync(avifPath, avifBuf);
    writeFileSync(thumbPath, thumbBuf);
    writeFileSync(thumb180Path, thumb180Buf);

    savedBytes += file.size - mainBuf.length;
    processed++;

    if (processed % 10 === 0) {
      console.log(`   processed ${processed}/${files.length}…`);
    }
  } catch (err) {
    console.error(`❌ ${name}: ${err.message}`);
    errors++;
  }
}

console.log(`\n✅ Done. Processed: ${processed} | Skipped: ${skipped} | Errors: ${errors}`);
if (savedBytes > 0) {
  console.log(`💾 Saved: ${(savedBytes / 1024 / 1024).toFixed(2)} MB`);
}
if (errors > 0) process.exit(1);
