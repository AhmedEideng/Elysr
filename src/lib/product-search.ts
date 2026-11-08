import type { Product } from "@/data/product-types";

/** Search-only normalization: never rewrites published names, URLs or copy. */
export function normalizeSearch(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}
const STOP = new Set(["سعر", "اسعار", "شراء", "اشتري", "ثمن", "بكام", "buy", "price"]);
const synonyms: Record<string, string[]> = {
  نقط: ["قطرات"],
  قطرات: ["نقط"],
  سبراي: ["بخاخ", "spray"],
  جيل: ["جل", "gel"],
  چل: ["جل", "gel"],
};
function tokens(query: string) {
  return normalizeSearch(query)
    .split(" ")
    .filter((t) => t && !STOP.has(t));
}
function fields(product: Product) {
  const aliases =
    product.searchAliases ?? (product.id === "m-60" ? ["جيل", "كريفا جيل", "كريفا چل"] : []);
  return [
    { text: normalizeSearch(`${product.name} ${product.nameEn}`), weight: 100 },
    { text: normalizeSearch(aliases.join(" ")), weight: 60 },
    { text: normalizeSearch(product.slug), weight: 40 },
    { text: normalizeSearch(`${product.description} ${product.ingredients ?? ""}`), weight: 5 },
  ];
}
export function productSearchScore(product: Product, query: string): number {
  const terms = tokens(query);
  if (!terms.length) return 0;
  const haystacks = fields(product);
  const compact = terms.join("");
  // Joined brand names such as بينكشوت remain discoverable.
  if (haystacks[0].text.replace(/ /g, "").includes(compact)) return 200 + terms.length;
  let score = 0;
  for (const term of terms) {
    const variants = [term, ...(synonyms[term] ?? [])];
    const match = haystacks.find(({ text }) => variants.some((variant) => text.includes(variant)));
    if (!match) return 0; // Every meaningful token must match; generic aliases cannot swallow a brand.
    score += match.weight;
  }
  return score;
}
export function rankProductSearch(products: Product[], query: string): Product[] {
  if (!query.trim()) return [...products];
  return products
    .map((product, index) => ({ product, index, score: productSearchScore(product, query) }))
    .filter((hit) => hit.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((hit) => hit.product);
}
function oneEdit(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0,
    j = 0,
    edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length >= b.length) i++;
    if (b.length >= a.length) j++;
  }
  return edits + Number(i < a.length || j < b.length) <= 1;
}
/** Explicit spelling suggestions only, never substitute products automatically. */
export function suggestProductSearch(products: Product[], query: string): Product[] {
  const terms = tokens(query);
  if (!terms.length || terms.length > 4 || !terms.some((t) => t.length >= 4)) return [];
  return products
    .filter((product) => {
      const words = fields(product)[0].text.split(" ");
      return terms.every((term) =>
        words.some((word) => word === term || (term.length >= 4 && oneEdit(term, word))),
      );
    })
    .slice(0, 3);
}
