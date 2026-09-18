import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { trackAddToCart, trackRemoveFromCart } from "@/lib/analytics";
import { toast } from "sonner";
import type { Product } from "@/data/product-types";
import {
  CATALOG_BY_ID,
  MAX_CART_ITEMS,
  MAX_QTY_PER_ITEM,
  normalizeCartItems,
  type CatalogById,
  type CartItem,
} from "@/lib/cart-normalization";
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

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const parsed = safeGetJson<Partial<CartItem>[]>(STORAGE_KEY, []);
      // توحيد normalization: النافد/المحذوف يتحذف، والكميات مقصورة
      // بمخزون الكتالوج (نفس القواعد في كل مسارات السلة).
      return normalizeCartItems(parsed, CATALOG_BY_ID);
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
      if (e.key !== STORAGE_KEY) return;
      // (2026-09-15) نفس قواعد التوحيد normalization — المسار القديم كان
      // Math.min(99, ...) من غير أي فحص مخزون (qty 99 ممكنة مع stock 5!)
      // وكان بيقفل حتى الـ stock field. بنقرأ من localStorage (المصدر
      // الوحيد للحقيقة) عشان نستقبل "اتغيرت القيمة" و"اتمسح المفتاح"
      // (newValue=null) مع بعض، والمسح بيتزامن (الكود القديم كان
      // بـ return من غير مزامنة).
      try {
        const parsed = safeGetJson<Partial<CartItem>[]>(STORAGE_KEY, []);
        setItems(normalizeCartItems(parsed, CATALOG_BY_ID));
      } catch {
        // Ignore parsing errors from other tabs
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // أحدث نسخة من السلة للتتبع — من غير ما نغير deps الكولبكات
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  });

  const add = useCallback((p: Product, qty = 1) => {
    // (2026-09-15) الـ context API نفسه لازم يكون صح: منتج نافد/مفيش مخزون
    // بياناته ما ينضيفش — Math.max(1, Math.min(qty, 0)) كان بضيف بـ qty=1!
    // (الـ UI كمان بيمنع، بس الـ API مستقل عن الـ UI لازم يكون محكم.)
    const stock = p.stock;
    if (stock === undefined || stock <= 0) return;
    const safeQty = Math.max(1, Math.min(qty, stock, MAX_QTY_PER_ITEM));

    // GA: add_to_cart — قبل تغيير الحالة، ورفض السلة الممتلئة مش بيحسب.
    // بنسجل الكمية المضافة **فعليًا** مش المطلوبة: لو المنتج موجود وسقف
    // المخزون قريب، الإضافة الفعلية ممكن تكون أقل (مثال: stock 5 وcurrent 4
    // وqty 3 → الفعلية 1). لو الإضافة الفعلية 0 مفيش event.
    const prevItems = itemsRef.current;
    const alreadyInCart = prevItems.some((i) => i.id === p.id);
    const rejectedByCap = !alreadyInCart && prevItems.length >= MAX_CART_ITEMS;
    if (!rejectedByCap) {
      const existingQty = alreadyInCart ? (prevItems.find((i) => i.id === p.id)?.qty ?? 0) : 0;
      const actualAdded = Math.min(safeQty, stock - existingQty);
      if (actualAdded > 0) {
        trackAddToCart({
          id: p.id,
          name: p.name,
          price: p.price,
          qty: actualAdded,
        });
      }
    }
    setItems((prev) => {
      if (prev.length >= MAX_CART_ITEMS && !prev.find((i) => i.id === p.id)) {
        return prev;
      }
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
                qty: Math.min(i.qty + safeQty, stock, MAX_QTY_PER_ITEM),
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
          stock,
        },
      ];
    });
  }, []);

  const remove = useCallback((id: string) => {
    const target = itemsRef.current.find((i) => i.id === id);
    if (target) {
      trackRemoveFromCart({ id, name: target.name, price: target.price, qty: target.qty });
    }
    setItems((p) => p.filter((i) => i.id !== id));
  }, []);

  const setQty = useCallback((id: string, qty: number) => {
    // (2026-09-17) الـ item نفسه هو اللي حامل الـ stock المتزامن من
    // الكتالوج (normalizeCartItem/add/syncCatalog) — فقيده منه مش من
    // static map: لو حصل remote sync بمخزون مختلف، كل عمليات الجلسة
    // (setQty/limit) تبقى متسقة مع القيمة المتزامنة. القاعدة:
    // stock نَفَد/مفيش بيانات → حذف العنصر (مش qty=1).
    setItems((p) =>
      p.flatMap((i): CartItem[] => {
        if (i.id !== id) return [i];
        const stock = i.stock;
        if (stock === undefined || stock <= 0) return [];
        return [{ ...i, qty: Math.max(1, Math.min(qty, stock, MAX_QTY_PER_ITEM)) }];
      }),
    );
  }, []);

  const syncCatalog = useCallback((catalog: Product[]) => {
    // (2026-09-17) Implementation واحدة: بدل إعادة بناء القواعد يدويًا
    // هنا (وكانت نسخة ثانية من منطق normalizeCartItem — نفس فخ
    // "4 implementations" اللي بدأ منه الـ bug الأصلي)، بنمرر
    // الكتالوج اللي اتمرر لـ normalizeCartItems مباشرة.
    // كتالوج فاضي = مفيش بيانات موثوقة → السلة بتفضل زي ما هي.
    if (!catalog.length) return;
    const catalogById: CatalogById = new Map(catalog.map((p) => [p.id, p]));
    // نحسب من itemsRef (قيمة لحظة الاستدعاء) — بنمرر id + qty بس
    // (القاعدة: من الـ cart بنثق في id + qty فقط، وكل حاجة من الـ catalog).
    const prev = itemsRef.current;
    const kept = normalizeCartItems(
      prev.map((item) => ({ id: item.id, qty: item.qty })),
      catalogById,
    );
    setItems(kept);
    if (kept.length !== prev.length) {
      toast.error("تمت إزالة منتجات غير متوفرة من سلتك.", { duration: 5000 });
    }
  }, []);

  const isStockLimitReached = useCallback(
    (id: string) => {
      const item = items.find((i) => i.id === id);
      if (!item) return false;
      // (2026-09-16) item.stock canonical ومطلوب (من مخزون الكتالوج) —
      // مفيش fallback `?? 10`.
      return item.qty >= item.stock;
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
