import { useRecentlyViewed } from "@/hooks/use-recently-viewed";
import { formatPrice } from "@/data/product-types";
import { getProductBySlug } from "@/data/products";
import { X } from "lucide-react";
import { thumbUrl, assetUrl } from "@/lib/cache";

/**
 * ============================================================
 * Recently Viewed Carousel
 * ============================================================
 * Shows the last 12 PDPs the visitor opened. Stored in
 * localStorage (key elysr_recently_viewed_v1) by
 * `useRecentlyViewed()`. Cross-tab synced.
 *
 * Hidden automatically when the list is empty so it doesn't
 * take up space on first-visit pages.
 *
 * Designed to be lazy-loaded on PDPs.
 * ============================================================
 */
export function RecentlyViewed({ currentSlug }: { currentSlug?: string }) {
  const { items, clear } = useRecentlyViewed();

  // 🔒 تُصفّى العناصر التي لم يعد منتجها موجوداً في الكتالوج الحالي (مثل منتج حُذف
  // من الشركة) — يمنع عرض روابط تؤدي إلى 404، ويستبدل البيانات القديمة
  // (سعر/اسم) بالبيانات المحدّثة من المصدر الحالي.
  const enriched = items
    .map((item) => {
      const product = getProductBySlug(item.slug);
      return product ? { item, product } : null;
    })
    .filter(
      (
        e,
      ): e is {
        item: (typeof items)[number];
        product: NonNullable<ReturnType<typeof getProductBySlug>>;
      } => Boolean(e),
    );

  // Hide if no items or only the current page
  const filtered = currentSlug ? enriched.filter((e) => e.item.slug !== currentSlug) : enriched;
  if (filtered.length === 0) return null;

  return (
    <section aria-label="شاهدتها مؤخراً" className="mx-auto w-full max-w-7xl px-4 py-3 sm:py-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-black text-foreground sm:text-2xl">👀 شاهدتها مؤخراً</h2>
        <button
          type="button"
          onClick={clear}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          aria-label="مسح سجل المشاهدة"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
          مسح السجل
        </button>
      </div>

      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-4 [scrollbar-width:thin] sm:gap-4">
        {filtered.map(({ item, product }) => (
          // Use a plain anchor for slug-based links since TanStack Router's
          // typed `to` prop requires literal route paths only. The Link
          // component still preserves client-side navigation via history.
          // نعرض البيانات المحدّثة من الكتالوج الحالي (product) بدلاً من المخزّنة.
          <a
            key={item.id}
            href={`/products/${product.slug}`}
            className="
              group flex w-[160px] shrink-0 flex-col overflow-hidden
              rounded-2xl border border-border/60 bg-card
              shadow-sm transition-all duration-200
              hover:-translate-y-1 hover:shadow-lg sm:w-[200px]
            "
          >
            <div className="aspect-square overflow-hidden bg-muted">
              {product.image ? (
                <img
                  src={thumbUrl(product.image, "thumbs")}
                  srcSet={`${thumbUrl(product.image, "thumbs-180")} 360w, ${thumbUrl(product.image, "thumbs")} 480w, ${assetUrl(product.image)} 800w`}
                  sizes="(max-width: 640px) 180px, 240px"
                  alt={product.name}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  width={480}
                  height={480}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-4xl">
                  {product.emoji}
                </div>
              )}
            </div>
            <div className="p-3">
              <h3 className="line-clamp-2 text-xs font-bold leading-tight text-foreground sm:text-sm">
                {product.name}
              </h3>
              <p className="mt-1 text-sm font-black text-primary sm:text-base">
                {formatPrice(product.price)}
              </p>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
