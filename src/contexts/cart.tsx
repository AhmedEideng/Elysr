import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Product } from "@/data/product-types";
import { getPromoTier, type PromoTier } from "@/lib/promo";

// 🔒 Safe localStorage wrapper — handles quota exceeded and private browsing gracefully
function safeGetJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function safeSetJson(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    console.warn(`localStorage quota exceeded or unavailable for key: ${key}`);
    return false;
  }
}

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
  stock?: number;
}

export interface CartCtx {
  items: CartItem[];
  count: number;
  total: number;
  /** مجموع الأسعار قبل تطبيق خصم العرض المتدرج */
  subtotalBeforeDiscount: number;
  /** قيمة خصم العرض المتدرج (يُحسب على إجمالي السلة) */
  discount: number;
  /** شريحة الخصم المُطبَّقة حالياً (null لو لا يوجد خصم) */
  tier: PromoTier | null;
  add: (p: Product, qty?: number) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  syncCatalog: (catalog: Product[]) => void;
  isStockLimitReached: (id: string) => boolean;
}

// eslint-disable-next-line react-refresh/only-export-components
export const CartContext = createContext<CartCtx | null>(null);
const STORAGE_KEY = "elysr_cart_v3";
const MAX_CART_ITEMS = 50;

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const parsed = safeGetJson<Partial<CartItem>[]>(STORAGE_KEY, []);
      if (parsed.length > 0) {
        return parsed
          .filter((i) => i.id && typeof i.qty === "number" && i.name && i.price)
          .slice(0, MAX_CART_ITEMS)
          .map((i) => ({
            id: i.id!,
            slug: i.slug,
            name: i.name!,
            price: i.originalPrice ?? i.price!,
            originalPrice: i.originalPrice ?? i.price!,
            emoji: i.emoji ?? "💊",
            image: i.image,
            qty: Math.max(1, Math.min(i.qty!, i.stock ?? 10)),
            stock: i.stock,
          }));
      }
    } catch (err) {
      console.warn("Failed to read cart from localStorage:", err);
    }
    return [];
  });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setTimeout(() => setHydrated(true), 0);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      safeSetJson(STORAGE_KEY, items);
    } catch (err) {
      console.warn("Failed to persist cart to localStorage:", err);
    }
  }, [items, hydrated]);

  // Sync cart across multiple tabs in real-time
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = safeGetJson<Partial<CartItem>[]>(STORAGE_KEY, []);
          if (parsed.length === 0) return;
          const valid: CartItem[] = parsed
            .filter((i) => i.id && typeof i.qty === "number" && i.name && i.price)
            .slice(0, MAX_CART_ITEMS)
            .map((i) => ({
              id: i.id!,
              slug: i.slug,
              name: i.name!,
              price: i.originalPrice ?? i.price!,
              originalPrice: i.originalPrice ?? i.price!,
              emoji: i.emoji ?? "💊",
              qty: Math.min(99, Math.max(1, i.qty!)),
              image: i.image,
            }));
          setItems(valid);
        } catch {
          // Ignore parsing errors from other tabs
        }
      } else if (e.key === STORAGE_KEY && !e.newValue) {
        setItems([]);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const add = useCallback((p: Product, qty = 1) => {
    setItems((prev) => {
      if (prev.length >= MAX_CART_ITEMS && !prev.find((i) => i.id === p.id)) {
        return prev;
      }
      const maxStock = p.stock ?? 10;
      const safeQty = Math.max(1, Math.min(qty, maxStock));
      // النظام الجديد: سعر المنتج ثابت. الخصم يُحسب على إجمالي السلة في useMemo أدناه.
      const ex = prev.find((i) => i.id === p.id);
      if (ex) {
        return prev.map((i) =>
          i.id === p.id
            ? {
                ...i,
                slug: p.slug,
                price: p.price,
                originalPrice: p.price,
                qty: Math.min(i.qty + safeQty, maxStock),
              }
            : i,
        );
      }
      return [
        ...prev,
        {
          id: p.id,
          slug: p.slug,
          name: p.name,
          price: p.price,
          originalPrice: p.price,
          emoji: p.emoji,
          image: p.image ? p.image : undefined,
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

  const syncCatalog = useCallback((catalog: Product[]) => {
    if (!catalog.length) return;
    setItems((prev) =>
      prev.flatMap((item): CartItem[] => {
        const product = catalog.find((p) => p.id === item.id);
        if (!product) return [];
        return [
          {
            ...item,
            slug: product.slug,
            name: product.name,
            price: product.price,
            originalPrice: product.price,
            emoji: product.emoji ?? item.emoji,
            image: product.image ? product.image : undefined,
            qty: Math.min(item.qty, product.stock ?? item.stock ?? 10),
            stock: product.stock,
          },
        ];
      }),
    );
  }, []);

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
    // Normalize legacy cart items: الخصم الآن basket-level فقط، تأكد price === originalPrice دائماً
    // (يحل "اختلاف إجمالي" من بيانات localStorage القديمة حيث كان الخصم per-item)
    const normalizedItems = items.map((i) => ({
      ...i,
      price: i.originalPrice ?? i.price,
      originalPrice: i.originalPrice ?? i.price,
    }));
    const subtotalBeforeDiscount = normalizedItems.reduce((s, i) => s + i.qty * i.originalPrice, 0);
    // الخصم المتدرج يُحسب على إجمالي السلة (وليس على كل منتج)
    const tier = getPromoTier(subtotalBeforeDiscount);
    const discount = tier ? Math.round(subtotalBeforeDiscount * tier.discount) : 0;
    const total = subtotalBeforeDiscount - discount;
    return {
      items: normalizedItems, // استخدم الـ normalized للـ consistency في الـ payload والـ UI
      count,
      total,
      subtotalBeforeDiscount,
      discount,
      tier,
      add,
      remove,
      setQty,
      clear,
      syncCatalog,
      isStockLimitReached,
    };
  }, [items, add, remove, setQty, clear, syncCatalog, isStockLimitReached]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
