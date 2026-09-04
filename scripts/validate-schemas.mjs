/**
 * ============================================================
 * JSON-LD Schema Validator
 * ============================================================
 * Extracts every <script type="application/ld+json"> block from
 * the prerendered dist/ directory and validates it against the
 * expected @context/@type shapes used in this project.
 *
 * Handles:
 *   - <script> with @graph containing multiple sub-schemas
 *   - @type as either string ("Product") or array
 *     (["Organization","MedicalOrganization"])
 *   - Nested objects (PostalAddress, Offer, etc.)
 *
 * Catches:
 *   - Invalid JSON syntax
 *   - Missing @context / @type / @graph
 *   - Wrong types for known shapes (Product, Article, etc.)
 *   - Missing required fields (name, url, image, etc.)
 *   - Non-absolute URLs where absolute is required
 *
 * Exits with code 1 if any validation error is found.
 * ============================================================
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { resolve, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DIST = resolve(ROOT, "dist");
const SITE_URL = "https://elysrmedical.store";
const NOINDEX_PRODUCT_FILES = new Set([
  "products/hard-on-sildenafil-130mg-dapoxetine-60mg.html",
  "products/vegal-extra-sildenafil-130mg-cobra.html",
  "products/cialis-tadalafil-20mg-30-tablets.html",
  "products/power-36-power-control-for-36-hours.html",
  "products/procomil-fort-tablet.html",
  "products/viagra-pfizer-100mg.html",
  "products/levitra-100mg.html",
]);
const NOINDEX_PRODUCT_URLS = new Set(
  [...NOINDEX_PRODUCT_FILES].map((file) => `${SITE_URL}/${file.replace(/\.html$/, "")}`),
);

if (!existsSync(DIST)) {
  console.error("❌ dist/ not found. Run `npm run build` first.");
  process.exit(1);
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walk(full));
    else if (entry.endsWith(".html")) out.push(full);
  }
  return out;
}

function extractJsonLd(html) {
  const blocks = [];
  const regex = /<script\s+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;
  let match;
  let i = 0;
  while ((match = regex.exec(html)) !== null) {
    try {
      blocks.push({ raw: match[1], parsed: JSON.parse(match[1]), index: i });
    } catch (err) {
      blocks.push({ raw: match[1], parsed: null, index: i, error: err.message });
    }
    i++;
  }
  return blocks;
}

/**
 * Normalise @type — it may be a string or an array.
 * Returns the first non-null type string.
 */
function getPrimaryType(schema) {
  if (!schema) return null;
  const t = schema["@type"];
  if (typeof t === "string") return t;
  if (Array.isArray(t) && t.length > 0) return String(t[0]);
  return null;
}

/**
 * Validate a single (already-expanded) schema object.
 */
function validateSchema(filePath, schema) {
  const errors = [];
  const warnings = [];

  if (!schema["@context"]) errors.push("Missing @context");

  const primaryType = getPrimaryType(schema);
  if (!primaryType) errors.push("Missing @type");

  const rel = relative(DIST, filePath);

  switch (primaryType) {
    case "Product": {
      const required = ["name", "description", "sku", "image", "offers", "brand"];
      for (const key of required) {
        if (!schema[key]) errors.push(`Product missing required field: ${key}`);
      }
      if (schema.aggregateRating) {
        const aggregate = schema.aggregateRating;
        if (
          typeof aggregate.ratingValue !== "number" ||
          aggregate.ratingValue < 1 ||
          aggregate.ratingValue > 5
        )
          errors.push("Product aggregateRating.ratingValue must be between 1 and 5");
        if (typeof aggregate.reviewCount !== "number" || aggregate.reviewCount < 1)
          errors.push("Product aggregateRating.reviewCount must be a positive number");
      }
      if (schema.offers && typeof schema.offers === "object") {
        if (!schema.offers.price && schema.offers.price !== 0)
          errors.push("Product offers.price missing");
        if (schema.offers.priceCurrency && schema.offers.priceCurrency !== "EGP")
          errors.push(
            `Product offers.priceCurrency should be "EGP" (got "${schema.offers.priceCurrency}")`,
          );
        if (!schema.offers.availability) errors.push("Product offers.availability missing");
        if (!schema.offers.url || !schema.offers.url.startsWith(SITE_URL))
          errors.push(`Product offers.url must be absolute ${SITE_URL} URL`);

        const returnPolicy = schema.offers.hasMerchantReturnPolicy;
        if (returnPolicy && typeof returnPolicy === "object") {
          const returnFees = returnPolicy.returnFees;
          const feesAmount = returnPolicy.returnShippingFeesAmount;
          if (returnFees === "https://schema.org/ReturnShippingFees" && !feesAmount) {
            errors.push("ReturnShippingFees requires returnShippingFeesAmount");
          }
          if (returnFees === "https://schema.org/ReturnFeesCustomerResponsibility" && feesAmount) {
            errors.push("Customer-responsibility returns must omit returnShippingFeesAmount");
          }
        }
      }
      if (schema.image && !String(schema.image).startsWith("http")) {
        errors.push(`Product image must be absolute URL (got "${schema.image}")`);
      }
      break;
    }
    case "Article":
    case "NewsArticle":
    case "BlogPosting":
    case "MedicalWebPage": {
      const required = ["headline", "image", "datePublished", "author", "publisher"];
      for (const key of required) {
        if (!schema[key]) errors.push(`Article missing required field: ${key}`);
      }
      if (schema.author && typeof schema.author === "object" && !schema.author.name)
        errors.push("Article author.name missing");
      if (schema.publisher && typeof schema.publisher === "object" && !schema.publisher.name)
        errors.push("Article publisher.name missing");
      break;
    }
    case "Organization":
    case "MedicalOrganization":
    case "LocalBusiness":
      if (!schema.name) errors.push(`${primaryType} missing name`);
      if (!schema.url) errors.push(`${primaryType} missing url`);
      break;
    case "WebSite": {
      if (!schema.url) errors.push("WebSite missing url");
      if (!schema.name) errors.push("WebSite missing name");
      break;
    }
    case "WebPage":
      if (!schema["@id"] && !schema.url) warnings.push(`WebPage missing both @id and url (${rel})`);
      break;
    case "FAQPage":
      if (!Array.isArray(schema.mainEntity)) errors.push("FAQPage.mainEntity must be an array");
      break;
    case "ItemList":
      if (!Array.isArray(schema.itemListElement)) {
        errors.push("ItemList.itemListElement must be an array");
      } else {
        for (const item of schema.itemListElement) {
          if (NOINDEX_PRODUCT_URLS.has(item?.url) || NOINDEX_PRODUCT_URLS.has(item?.item)) {
            errors.push(`ItemList exposes a noindex product URL: ${item.url ?? item.item}`);
          }
        }
      }
      break;
    case "BreadcrumbList":
      if (!Array.isArray(schema.itemListElement))
        errors.push("BreadcrumbList.itemListElement must be an array");
      break;
    case "ImageObject":
    case "Person":
    case "WebSiteElement":
    case "SearchAction":
      // Light validation only
      break;
    case "Offer":
      if (schema.price === undefined) errors.push("Offer missing price");
      break;
    default:
      if (primaryType) warnings.push(`Unknown @type "${primaryType}" (${rel})`);
  }

  return { errors, warnings };
}

const files = walk(DIST);
let totalSchemas = 0;
let totalErrors = 0;
let totalWarnings = 0;
const errorFiles = [];

for (const file of files) {
  const html = readFileSync(file, "utf-8");
  const relFile = relative(DIST, file).replace(/\\/g, "/");
  if (NOINDEX_PRODUCT_FILES.has(relFile)) {
    for (const metaName of ["robots", "googlebot"]) {
      const match = html.match(new RegExp(`<meta name="${metaName}" content="([^"]+)"`));
      if (!match?.[1]?.includes("noindex")) {
        console.error(`❌ ${relFile}: ${metaName} must include noindex`);
        totalErrors++;
        errorFiles.push(file);
      }
    }
  }
  const blocks = extractJsonLd(html);
  if (
    NOINDEX_PRODUCT_FILES.has(relFile) &&
    blocks.some((block) => block.parsed?.["@type"] === "Product")
  ) {
    console.error(`❌ ${relFile}: noindex medicine page must not expose Product JSON-LD`);
    totalErrors++;
    errorFiles.push(file);
  }
  for (const block of blocks) {
    if (!block.parsed) {
      console.error(
        `❌ ${relative(DIST, file)}  [block #${block.index}]  Invalid JSON: ${block.error}`,
      );
      totalErrors++;
      errorFiles.push(file);
      continue;
    }

    // @graph expands into individual sub-schemas.
    const subSchemas = Array.isArray(block.parsed["@graph"])
      ? block.parsed["@graph"]
      : [block.parsed];

    // @context (and other top-level keys) apply to all sub-schemas.
    // Inject them so validation against the expanded shape works.
    const inheritedContext = block.parsed["@context"];
    const expanded = subSchemas.map((s) => {
      if (typeof s !== "object" || s === null) return s;
      if (!s["@context"] && inheritedContext) return { ...s, "@context": inheritedContext };
      return s;
    });

    for (const schema of expanded) {
      if (typeof schema !== "object" || schema === null) continue;
      totalSchemas++;
      const { errors, warnings } = validateSchema(file, schema);
      if (errors.length > 0) {
        const t = getPrimaryType(schema) || "(no @type)";
        console.error(`❌ ${relative(DIST, file)}  [block #${block.index}]  ${t}`);
        errors.forEach((e) => console.error(`     • ${e}`));
        totalErrors += errors.length;
        errorFiles.push(file);
      }
      if (warnings.length > 0) {
        warnings.forEach((w) => console.warn(`⚠️  ${relative(DIST, file)}  • ${w}`));
        totalWarnings += warnings.length;
      }
    }
  }
}

console.log(`\n📊 Scanned ${files.length} HTML files, found ${totalSchemas} JSON-LD schemas.`);
console.log(`   ${totalErrors} errors, ${totalWarnings} warnings.`);

if (totalErrors > 0) {
  console.error(`\n❌ Schema validation FAILED on ${errorFiles.length} files.`);
  process.exit(1);
}
console.log("✅ All JSON-LD schemas valid.");
