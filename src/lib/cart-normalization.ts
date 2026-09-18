import type { Product } from "@/data/product-types";
import { products } from "@/data/products";

export interface CartItem {
  id: string;
  /** Pretty URL slug — used to build product links in order messages. */
  slug?: string;
  name: string;
  /** السعر الفعلي المُستحق للدفع (بعد أي خصومات) */
  price: number;
  /** السعر الأصلي قبل أي خصم (للعرض في رسالة الطلب) */
  originalPrice: number;
  emoji: string;
  image?: string;
  qty: number;
  /**
   * (2026-09-16) مطلوب مش اختياري: بيتضبط دايمًا من مخزون الكتالوج
   * الرسمي (normalizeCartItem/add/syncCatalog) — مفيش سكة لحد ما يبقى
   * عند كل عنصر stock حقيقي، فمفيش fallback `?? 10` في أي مكان.
   */
  stock: number;
}

export type CatalogById = ReadonlyMap<string, Product>;

export const CATALOG_BY_ID: CatalogById = new Map(products.map((p) => [p.id, p]));

// سقف كمية الصنف الواحد في السلة (مستقل عن المخزون — عميل حقيقي ما يطلبش
// 100 وحدة من صنف واحد، والسيرفر عنده سقف إجمالي 100 وحدة للطلب كله).
export const MAX_QTY_PER_ITEM = 99;
export const MAX_CART_ITEMS = 50;

// 🛡️ (2026-09-16 → 2026-09-17) مصدر الحقيقة للمنتج = الكتالوج الرسمي
// بالكامل. localStorage بياخد منه بس **id + qty** — كل حاجة تانية
// (name/price/slug/emoji/image/stock) بتتجاهل لو اتعدلت يدويًا.
//
// (2026-09-17) الـ normalizer دلوقتي **catalog-driven**: الـ catalog
// dependency صريح في التوقيع (مش state خفي من الـ module). كل سكة
// (hydration/storage/sync) بتمرر الكتالوج اللي عندها:
//   • hydration + storage event → CATALOG_BY_ID (الكتالوج الثابت)
//   • syncCatalog(catalog)      → الكتالوج اللي اتمرر (ممكن remote)
// فمفيش تاني سيناريو "static 5000 / remote 3" — نفس الدالة، نفس
// مصدر البيانات لكل سكة.
// ── (2026-09-15 → 2026-09-17) توحيد normalization عناصر السلة ──
// كان الـ bug موجود في 4 implementations بقواعد مختلفة:
//   hydration: 1..stock (مع ?? 10) · storage event: 1..99 من غير مخزون
//   add: stock=0 → qty=1 (!) · setQty: stock=0 → qty=1 (!)
// 2026-09-17: Implementation واحدة نقية + catalog كـ dependency:
//   • منتج مش في الكتالوج → حذف
//   • stock <= 0 (أو مفيش بيانات) → حذف
//   • qty مقصورة على min(stock, 99)
//   • name/price/slug/emoji/image/stock = من الكتالوج (مش من الـ storage)
// exported for unit tests (التوحيد normalization — قواعد مخزون السلة)
export function normalizeCartItem(
  raw: Partial<CartItem>,
  catalogById: CatalogById,
): CartItem | null {
  if (!raw.id || typeof raw.qty !== "number") {
    return null;
  }

  const product = catalogById.get(raw.id);

  // المنتج غير موجود أو غير متاح
  if (!product || product.stock === undefined || product.stock <= 0) {
    return null;
  }

  const qty = Math.max(1, Math.min(Math.floor(raw.qty), product.stock, MAX_QTY_PER_ITEM));

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    price: product.price,
    originalPrice: product.price,
    emoji: product.emoji,
    image: product.image ? product.image : undefined,
    qty,
    stock: product.stock,
  };
}

export function normalizeCartItems(
  raws: Partial<CartItem>[],
  catalogById: CatalogById,
): CartItem[] {
  const byId = new Map<string, CartItem>();
  for (const raw of raws) {
    const item = normalizeCartItem(raw, catalogById);
    if (item && !byId.has(item.id)) byId.set(item.id, item);
  }
  return [...byId.values()].slice(0, MAX_CART_ITEMS);
}
