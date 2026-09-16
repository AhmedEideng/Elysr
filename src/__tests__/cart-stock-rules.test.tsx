/**
 * ============================================================
 * Regression tests — cart stock rules (2026-09-15)
 * ============================================================
 * The stock=0 bug existed in 4 different implementations with
 * diverging rules:
 *   hydration: 1..stock(??10) · storage event: 1..99 (no stock!)
 *   add():      stock=0 → qty=1 (!)  · setQty(): stock=0 → qty=1 (!)
 * All paths now share normalizeCartItem/normalizeCartItems:
 *   - product not in catalog → removed
 *   - stock <= 0 → removed
 *   - qty capped at min(catalog stock, 99)
 * ============================================================
 */
import { describe, it, expect, beforeEach } from "vitest";
import { useEffect } from "react";
import { render, act } from "@testing-library/react";
import { useCart } from "@/hooks/use-cart";
import {
  CartProvider,
  normalizeCartItem,
  normalizeCartItems,
  type CartCtx,
  type CartItem,
} from "@/contexts/cart";
import { products } from "@/data/products";
import type { Product } from "@/data/product-types";

const STORAGE_KEY = "elysr_cart_v3";

// The context value object is recreated on every update — tests must read
// the FRESH context, not a stale snapshot from the first render.
// (التخزين في effect مش في الـ render — قواعد React Compiler/react-hooks
// تمنع أي side effect وقت الـ render، والـ effect هو المكان المسموح.)
const cartHolder: { current: CartCtx | null } = { current: null };
function Probe() {
  const ctx = useCart();
  useEffect(() => {
    cartHolder.current = ctx;
  });
  return null;
}
function renderCart() {
  cartHolder.current = null;
  render(
    <CartProvider>
      <Probe />
    </CartProvider>,
  );
  return cartHolder.current!;
}
const fresh = (): CartCtx => {
  if (!cartHolder.current) throw new Error("cart not rendered");
  return cartHolder.current;
};

const inStockProduct = products.find((p) => p.stock && p.stock > 0)!;
const outOfStockProduct = { ...inStockProduct, id: "test-oos", stock: 0 } as Product;

describe("normalizeCartItem — the single stock rule", () => {
  it("caps qty at min(catalog stock, 99)", () => {
    const item = normalizeCartItem({
      id: inStockProduct.id,
      name: inStockProduct.name,
      price: inStockProduct.price,
      emoji: "💊",
      qty: 9999,
    });
    expect(item).not.toBeNull();
    expect(item!.qty).toBe(Math.min(inStockProduct.stock, 99));
    expect(item!.stock).toBe(inStockProduct.stock);
  });

  it("keeps qty when it is within stock", () => {
    const item = normalizeCartItem({
      id: inStockProduct.id,
      name: inStockProduct.name,
      price: inStockProduct.price,
      emoji: "💊",
      qty: 2,
    });
    expect(item!.qty).toBe(2);
  });

  it("drops products that are no longer in the catalog (deleted products)", () => {
    expect(
      normalizeCartItem({ id: "no-such-id", name: "x", price: 1, emoji: "💊", qty: 1 }),
    ).toBeNull();
  });

  it("rejects malformed raw entries", () => {
    expect(normalizeCartItem({ name: "x", price: 1, qty: 1, emoji: "💊" })).toBeNull();
    expect(
      normalizeCartItem({
        id: inStockProduct.id,
        name: "x",
        price: 1,
        qty: "2" as unknown as number,
        emoji: "💊",
      }),
    ).toBeNull();
  });
});

describe("normalizeCartItems — dedupe + cap", () => {
  it("dedupes by id (first occurrence wins) and caps at MAX_CART_ITEMS", () => {
    const p = inStockProduct;
    const base: Partial<CartItem> = {
      name: p.name,
      price: p.price,
      originalPrice: p.price,
      emoji: "💊",
      qty: 1,
    };
    const raws: Partial<CartItem>[] = [
      { ...base, id: p.id, qty: 3 },
      { ...base, id: p.id, qty: 5 },
    ];
    for (let i = 0; i < 60; i++) {
      raws.push({ ...base, id: products[i % products.length].id });
    }
    const items = normalizeCartItems(raws);
    expect(items.filter((i) => i.id === p.id)).toHaveLength(1);
    expect(items.find((i) => i.id === p.id)!.qty).toBe(3);
    expect(items.length).toBeLessThanOrEqual(50);
  });
});

describe("CartProvider — hydration, add, setQty, cross-tab sync", () => {
  beforeEach(() => {
    localStorage.clear();
    cartHolder.current = null;
  });

  it("hydration drops deleted/out-of-stock items from localStorage", () => {
    const p = inStockProduct;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        { id: p.id, name: p.name, price: p.price, originalPrice: p.price, emoji: "💊", qty: 2 },
        {
          id: "no-such-id",
          name: "deleted product",
          price: 1,
          originalPrice: 1,
          emoji: "💊",
          qty: 1,
        },
      ]),
    );
    renderCart();
    expect(fresh().items.map((i) => i.id)).toEqual([p.id]);
    expect(fresh().items[0].qty).toBe(2);
    expect(fresh().items[0].stock).toBe(p.stock);
  });

  it("add() refuses out-of-stock products (regression: Math.max(1, min(qty, 0)) gave qty=1)", () => {
    renderCart();
    act(() => fresh().add(outOfStockProduct));
    expect(fresh().items).toEqual([]);
  });

  it("add() caps qty at min(catalog stock, 99)", () => {
    renderCart();
    act(() => fresh().add(inStockProduct, 9999));
    expect(fresh().items).toHaveLength(1);
    expect(fresh().items[0].qty).toBe(Math.min(inStockProduct.stock, 99));
  });

  it("add() merges qty on repeated adds", () => {
    renderCart();
    act(() => fresh().add(inStockProduct, 2));
    act(() => fresh().add(inStockProduct, 3));
    expect(fresh().items).toHaveLength(1);
    expect(fresh().items[0].qty).toBe(5);
  });

  it("storage event syncs cross-tab and enforces the stock rule (regression: was 1..99 without stock)", () => {
    renderCart();
    const p = inStockProduct;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        { id: p.id, name: p.name, price: p.price, originalPrice: p.price, emoji: "💊", qty: 1 },
        { id: "no-such-id", name: "deleted", price: 1, originalPrice: 1, emoji: "💊", qty: 1 },
      ]),
    );
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
    });
    expect(fresh().items.map((i) => i.id)).toEqual([p.id]);
    expect(fresh().items[0].qty).toBe(1);
  });

  it("storage event with an empty value clears the cart (tab A cleared → tab B syncs)", () => {
    renderCart();
    act(() => fresh().add(inStockProduct, 1));
    expect(fresh().items).toHaveLength(1);
    localStorage.clear();
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY, newValue: "[]" }));
    });
    expect(fresh().items).toEqual([]);
  });
});
