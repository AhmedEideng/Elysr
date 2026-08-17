import { useCallback, useEffect, useMemo, useState } from "react";
import type { Product } from "@/data/product-types";

/**
 * ============================================================
 * Recently Viewed Products Hook
 * ============================================================
 * Tracks the last N product IDs the visitor opened on a PDP.
 * Useful for "Recently viewed" carousels and personalisation.
 *
 * - Storage key: elysr_recently_viewed_v1
 * - Max items: 12 (carousel-friendly)
 * - De-duplicates by id and moves the viewed product to the top
 * ============================================================
 */

export interface RecentlyViewedItem {
  id: string;
  slug: string;
  name: string;
  price: number;
  emoji: string;
  image?: string;
  viewedAt: number;
}

const STORAGE_KEY = "elysr_recently_viewed_v1";
const MAX_ITEMS = 12;

export const recentlyViewedStorage = {
  read(): RecentlyViewedItem[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as RecentlyViewedItem[];
      return Array.isArray(parsed)
        ? parsed.filter((i) => i?.id && i?.slug).slice(0, MAX_ITEMS)
        : [];
    } catch {
      return [];
    }
  },
  write(items: RecentlyViewedItem[]) {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent("elysr:recently-viewed-change"));
    } catch {
      // ignore
    }
  },
  subscribe(cb: () => void): () => void {
    if (typeof window === "undefined") return () => {};
    const handler = () => cb();
    window.addEventListener("elysr:recently-viewed-change", handler);
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) cb();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("elysr:recently-viewed-change", handler);
      window.removeEventListener("storage", onStorage);
    };
  },
};

export function useRecentlyViewed() {
  const [items, setItems] = useState<RecentlyViewedItem[]>(() => recentlyViewedStorage.read());

  useEffect(() => {
    return recentlyViewedStorage.subscribe(() => setItems(recentlyViewedStorage.read()));
  }, []);

  /** Track a product view — call this on PDP mount. */
  const track = useCallback((p: Product) => {
    const current = recentlyViewedStorage.read();
    const filtered = current.filter((i) => i.id !== p.id);
    const next: RecentlyViewedItem[] = [
      {
        id: p.id,
        slug: p.slug,
        name: p.name,
        price: p.price,
        emoji: p.emoji,
        image: p.image,
        viewedAt: Date.now(),
      },
      ...filtered,
    ].slice(0, MAX_ITEMS);
    recentlyViewedStorage.write(next);
  }, []);

  const clear = useCallback(() => recentlyViewedStorage.write([]), []);

  return useMemo(() => ({ items, track, clear }), [items, track, clear]);
}
