import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Product } from "@/data/product-types";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  emoji: string;
  image?: string;
  qty: number;
  stock?: number;
}

export interface CartCtx {
  items: CartItem[];
  count: number;
  total: number;
  add: (p: Product, qty?: number) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const CartContext = createContext<CartCtx | null>(null);
const STORAGE_KEY = "elysr_cart_v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch (err) {
      console.warn("Failed to read cart from localStorage:", err);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (err) {
      console.warn("Failed to persist cart to localStorage:", err);
    }
  }, [items, hydrated]);

  const add = useCallback((p, qty = 1) => {
    setItems((prev) => {
      const ex = prev.find((i) => i.id === p.id);
      const maxStock = p.stock ?? 10;
      if (ex) {
        return prev.map((i) =>
          i.id === p.id ? { ...i, qty: Math.min(i.qty + qty, maxStock) } : i,
        );
      }
      return [
        ...prev,
        {
          id: p.id,
          name: p.name,
          price: p.price,
          emoji: p.emoji,
          image: p.image,
          qty: Math.min(qty, maxStock),
          stock: maxStock,
        },
      ];
    });
  }, []);

  const remove = useCallback((id: string) => setItems((p) => p.filter((i) => i.id !== id)), []);

  const setQty = useCallback(
    (id: string, qty: number) =>
      setItems((p) =>
        p.map((i) => (i.id === id ? { ...i, qty: Math.max(1, Math.min(qty, i.stock ?? 10)) } : i)),
      ),
    [],
  );

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(() => {
    const count = items.reduce((s, i) => s + i.qty, 0);
    const total = items.reduce((s, i) => s + i.qty * i.price, 0);
    return { items, count, total, add, remove, setQty, clear };
  }, [items, add, remove, setQty, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
