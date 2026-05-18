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
  isStockLimitReached: (id: string) => boolean;
}

// eslint-disable-next-line react-refresh/only-export-components
export const CartContext = createContext<CartCtx | null>(null);
const STORAGE_KEY = "elysr_cart_v1";
const MAX_CART_ITEMS = 50; // 🔧 حد أقصى لعدد الأصناف في السلة

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CartItem[];
        // 🔧 تحقق من صحة البيانات المحفوظة
        const valid = parsed.filter(
          (i) => i.id && i.name && typeof i.price === "number" && typeof i.qty === "number",
        );
        setItems(valid);
      }
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

  const add = useCallback((p: Product, qty = 1) => {
    setItems((prev) => {
      // 🔧 حد أقصى لعدد الأصناف
      if (prev.length >= MAX_CART_ITEMS && !prev.find((i) => i.id === p.id)) {
        return prev;
      }
      const maxStock = p.stock ?? 10;
      const safeQty = Math.max(1, Math.min(qty, maxStock));
      const ex = prev.find((i) => i.id === p.id);
      if (ex) {
        return prev.map((i) =>
          i.id === p.id
            ? {
                ...i,
                // 🔧 استخدام السعر الحالي من المنتج وليس القديم
                price: p.price,
                qty: Math.min(i.qty + safeQty, maxStock),
              }
            : i,
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
          qty: safeQty,
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

  // 🔧 دالة لمعرفة هل وصل المستخدم لحد المخزون
  const isStockLimitReached = useCallback(
    (id: string) => {
      const item = items.find((i) => i.id === id);
      if (!item) return false;
      return item.qty >= (item.stock ?? 10);
    },
    [items],
  );

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(() => {
    const count = items.reduce((s, i) => s + i.qty, 0);
    const total = items.reduce((s, i) => s + i.qty * i.price, 0);
    return { items, count, total, add, remove, setQty, clear, isStockLimitReached };
  }, [items, add, remove, setQty, clear, isStockLimitReached]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
