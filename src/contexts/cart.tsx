import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Product } from "@/data/product-types";
import { getPromoTier, type PromoTier } from "@/lib/promo";
import { products } from "@/data/products";

// 🛡️ مصدر حقيقة المخزون هو الكتالوج الرسمي — قيمة الـ localStorage محفوظة
// مجرد snapshot لحظة الإضافة (قد تكون قديمة). لو المنتج موجود في
// الكتالوج، قيمته في الكتالوج هي الحاكمة (المراجع: stock fallback 10
// للسلة القديمة كان يخلي المستخدم يظبط كمية يرفضها الـ checkout).
const CATALOG_STOCK_BY_ID = new Map(products.map((p) => [p.id, p.stock]));
const catalogStock = (id: string) => CATALOG_STOCK_BY_ID.get(id);

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
  /** قيمة خصم الباقة الحقيقي (0 لو لا توجد باقة مكتملة) */
  bundleDiscount: number;
  /** الباقة المكتملة المطبقة حالياً (null لو لا توجد) */
  appliedBundle: { mainId: string; ids: string[] } | null;
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
            qty: Math.max(1, Math.min(i.qty!, catalogStock(i.id!) ?? i.stock ?? 10)),
            stock: catalogStock(i.id!) ?? i.stock,
          }));
      }
    } catch (err) {
      console.warn("Failed to read cart from localStorage:", err);
    }
    return [];
  });
  const [hydrated, setHydrated] = useState(false);

  // 🎁 خصم الباقة الحقيقي — يُحسب من محرك الباقات (chunk منفصل يُحمَّل
  // كسولاً فقط عندما تحتوي السلة على عنصرين أو أكثر — الباقة تحتاج ≥2).
  // نفس القاعدة تماماً في السيرفر (bundles-db.json) فيُتحقق منه خلفياً.
  // نمط القيمة المشتقة: الإعادة للوضع الأساسي أثناء الـ render (بدون effect)،
  // ونتيجة الاستيراد المتزامن تُقبل فقط إذا لم تتغير العناصر (race guard).
  const itemsKey = items.map((i) => `${i.id}:${i.qty}`).join("|");
  const [bundleState, setBundleState] = useState<{
    key: string;
    discount: number;
    bundle: { mainId: string; ids: string[] } | null;
  }>({ key: "", discount: 0, bundle: null });

  if (bundleState.key !== itemsKey) {
    setBundleState({ key: itemsKey, discount: 0, bundle: null });
  }

  useEffect(() => {
    if (items.length < 2) return; // لا يمكن اكتمال أي باقة
    let cancelled = false;
    import("@/lib/bundle-discount").then(({ calcBundleDiscountForItems }) => {
      if (cancelled) return;
      const { discount, bundle } = calcBundleDiscountForItems(
        items.map((i) => ({ id: i.id, qty: i.qty, price: i.price })),
      );
      setBundleState((prev) =>
        prev.key === itemsKey ? { key: itemsKey, discount, bundle } : prev,
      );
    });
    return () => {
      cancelled = true;
    };
  }, [items, itemsKey]);

  const bundleDiscount = bundleState.discount;
  const appliedBundle = bundleState.bundle;

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
        p.map((i) =>
          i.id === id
            ? { ...i, qty: Math.max(1, Math.min(qty, catalogStock(id) ?? i.stock ?? 10)) }
            : i,
        ),
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
    // 🔀 الخصمان متبادلا الاستبعاد (مطابق لحساب السيرفر):
    // عند اكتمال باقة → خصم الباقة (20%) هو الخصم الوحيد لهذا الطلب،
    // وخصم الشرائح موقوف. من غير باقة → يعمل الخصم المتدرج كالمعتاد.
    const tierDiscount = tier ? Math.round(subtotalBeforeDiscount * tier.discount) : 0;
    const discount = bundleDiscount > 0 ? 0 : tierDiscount;
    // الإجمالي = قبل الخصم − الخصم المطبق (واحد فقط)
    const total = subtotalBeforeDiscount - discount - bundleDiscount;
    return {
      items: normalizedItems, // استخدم الـ normalized للـ consistency في الـ payload والـ UI
      count,
      total,
      subtotalBeforeDiscount,
      discount,
      tier,
      bundleDiscount,
      appliedBundle,
      add,
      remove,
      setQty,
      clear,
      syncCatalog,
      isStockLimitReached,
    };
  }, [
    items,
    bundleDiscount,
    appliedBundle,
    add,
    remove,
    setQty,
    clear,
    syncCatalog,
    isStockLimitReached,
  ]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
