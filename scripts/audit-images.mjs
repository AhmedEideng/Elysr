import { readdirSync, readFileSync, statSync, existsSync, unlinkSync } from "node:fs";
import { resolve, join, basename, extname } from "node:path";
import crypto from "node:crypto";
import { createServer } from "vite";

const ROOT = process.cwd();
const IMAGES_DIR = resolve(ROOT, "public", "images");
const THUMBS_DIR = resolve(IMAGES_DIR, "thumbs");
const THUMBS_180_DIR = resolve(IMAGES_DIR, "thumbs-180");

async function audit() {
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: "custom",
    optimizeDeps: { noDiscovery: true, include: [] },
    plugins: [],
    logLevel: "silent",
  });

  try {
    const { products } = await vite.ssrLoadModule("/src/data/products.ts");
    const { articles } = await vite.ssrLoadModule("/src/data/articles.ts");

    // Gather all referenced images from products and articles
    const referencedImages = new Set();

    for (const p of products) {
      if (p.image) {
        // e.g. "/images/some-image.webp?v=7" -> "some-image.webp"
        const cleanName = p.image.split("?")[0].replace("/images/", "");
        referencedImages.add(cleanName);
      }
    }

    for (const a of articles) {
      if (a.image) {
        const cleanName = a.image.split("?")[0].replace("/images/", "");
        referencedImages.add(cleanName);
      }
    }

    // Static references
    const staticRefs = [
      "logo.webp",
      "logo-mono.webp",
      "logo-square.webp",
      "favicon.ico",
      "apple-touch-icon.png",
      "og-default.webp",
      "hero-banner.webp",
      "hero-banner-768.webp",
    ];
    for (const ref of staticRefs) {
      referencedImages.add(ref);
    }

    console.log(`ℹ️ Total unique referenced images: ${referencedImages.size}`);

    // Walk public/images and find files in ALL subdirectories
    const allFiles = [];
    function walk(dir) {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        const st = statSync(full);
        if (st.isDirectory()) {
          walk(full);
        } else {
          allFiles.push({ path: full, name: entry, size: st.size });
        }
      }
    }
    walk(IMAGES_DIR);

    console.log(
      `ℹ️ Total physical files found in public/images/ (incl. thumbs): ${allFiles.length}`,
    );

    const unusedFiles = [];
    const duplicatesMap = new Map(); // hash -> list of paths
    const duplicateFiles = [];

    for (const file of allFiles) {
      const ext = extname(file.name).toLowerCase();
      // Extract base name to match referenced WebP names (e.g. some-image.avif or thumbs/some-image.webp -> some-image.webp)
      const baseName = file.name.replace(/\.(png|jpe?g|avif|webp)$/i, ".webp");

      if (!referencedImages.has(baseName)) {
        unusedFiles.push(file);
      } else {
        // For referenced files, compute hash to find duplicates only among main images (not thumbs)
        if (!file.path.includes("thumbs") && !file.path.includes("thumbs-180")) {
          if (ext === ".webp" || ext === ".png" || ext === ".jpg" || ext === ".jpeg") {
            try {
              const buf = readFileSync(file.path);
              const hash = crypto.createHash("md5").update(buf).digest("hex");
              if (!duplicatesMap.has(hash)) {
                duplicatesMap.set(hash, []);
              }
              duplicatesMap.get(hash).push(file);
            } catch (err) {
              console.error(`Error hashing ${file.name}:`, err.message);
            }
          }
        }
      }
    }

    // Process duplicates
    for (const [hash, list] of duplicatesMap.entries()) {
      if (list.length > 1) {
        duplicateFiles.push({
          hash,
          files: list.map((f) => ({ name: f.name, path: f.path, size: f.size })),
        });
      }
    }

    console.log(`\n=== 🚨 AUDIT REPORT: UNUSED IMAGES ===`);
    console.log(`Found ${unusedFiles.length} unused files (main, avif, or thumbnails):`);
    let totalUnusedSize = 0;
    for (const file of unusedFiles) {
      console.log(
        `- ${file.path.replace(ROOT + "/public/", "")} (${(file.size / 1024).toFixed(1)} KB)`,
      );
      totalUnusedSize += file.size;
    }
    console.log(`Total unused file size: ${(totalUnusedSize / 1024 / 1024).toFixed(2)} MB`);

    console.log(`\n=== 🚨 AUDIT REPORT: DUPLICATE CONTENT ===`);
    console.log(`Found ${duplicateFiles.length} groups of duplicate images:`);
    for (const dup of duplicateFiles) {
      console.log(`Hash: ${dup.hash}`);
      for (const f of dup.files) {
        console.log(`  - ${f.name} (${(f.size / 1024).toFixed(1)} KB)`);
      }
    }

    // Automatically delete unused files to sanitize the codebase!
    if (unusedFiles.length > 0) {
      console.log(`\n🧹 Cleaning up ${unusedFiles.length} unused files...`);
      for (const file of unusedFiles) {
        if (existsSync(file.path)) {
          unlinkSync(file.path);
          console.log(`  🗑️ Deleted: ${file.path.replace(ROOT + "/", "")}`);
        }
      }
      console.log(`✅ Cleanup complete. Codebase is completely sanitized!`);
    } else {
      console.log(`\n✨ No unused images to clean! Codebase is perfectly clean.`);
    }

    return { unusedFiles, duplicateFiles };
  } finally {
    await vite.close();
  }
}

audit().catch((err) => {
  console.error("Audit failed:", err);
  process.exit(1);
});
