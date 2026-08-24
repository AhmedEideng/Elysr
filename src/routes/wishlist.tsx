import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, ShoppingCart, Trash2, Share2, ChevronLeft, Package } from "lucide-react";
import { useWishlist } from "@/hooks/use-wishlist";
import { useCart } from "@/hooks/use-cart";
import { products as allProducts } from "@/data/products";
import { formatPrice } from "@/data/product-types";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import { thumbUrl, assetUrl } from "@/lib/cache";

export const Route = createFileRoute("/wishlist")({
  head: () => ({
    meta: [
      { title: "المفضلة ❤️ | اليسر ميديكال" },
      {
        name: "description",
        content:
          "منتجاتك المفضلة في مكان واحد. اضغط على أيقونة القلب على أي بطاقة منتج لحفظه، ثم أكمل الطلب بسهولة.",
      },
      { name: "robots", content: "noindex,follow" },
    ],
  }),
  component: WishlistPage,
});

type SortKey = "newest" | "price-asc" | "price-desc" | "rating";

function WishlistPage() {
  const { items, count, clear } = useWishlist();
  const { add: addToCart } = useCart();
  const [sort, setSort] = useState<SortKey>("newest");

  // Resolve fresh product data (price/stock may have changed since added)
  const enriched = useMemo(() => {
    return items
      .map((item) => {
        const product = allProducts.find((p) => p.id === item.id);
        return { item, product };
      })
      .filter((entry) => entry.product); // drop items no longer in catalog
  }, [items]);

  const sortedEnriched = useMemo(() => {
    const arr = [...enriched];
    switch (sort) {
      case "price-asc":
        arr.sort((a, b) => (a.product?.price ?? 0) - (b.product?.price ?? 0));
        break;
      case "price-desc":
        arr.sort((a, b) => (b.product?.price ?? 0) - (a.product?.price ?? 0));
        break;
      case "rating":
        arr.sort((a, b) => (b.product?.rating ?? 0) - (a.product?.rating ?? 0));
        break;
      case "newest":
      default:
        arr.sort((a, b) => b.item.addedAt - a.item.addedAt);
    }
    return arr;
  }, [enriched, sort]);

  const totalValue = enriched.reduce((sum, e) => sum + (e.product?.price ?? 0), 0);
  const totalAvailable = enriched.filter((e) => (e.product?.stock ?? 0) > 0).length;

  const handleShare = async () => {
    if (typeof navigator === "undefined" || !navigator.share) {
      // Fallback: copy URL to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast.success("تم نسخ رابط المفضلة 📋");
      } catch {
        toast.error("تعذر نسخ الرابط");
      }
      return;
    }
    try {
      await navigator.share({
        title: "المفضلة — اليسر ميديكال",
        text: `قائمة المنتجات المفضلة لدي (${count} منتج)`,
        url: window.location.href,
      });
    } catch {
      // user cancelled
    }
  };

  const handleAddAllToCart = () => {
    if (totalAvailable === 0) {
      toast.error("لا توجد منتجات متاحة للإضافة");
      return;
    }
    let added = 0;
    enriched.forEach(({ product }) => {
      if (product && product.stock > 0) {
        addToCart(product);
        added++;
      }
    });
    toast.success(`تمت إضافة ${added} منتج للسلة 🛒`);
  };

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      {/* ── Header ───────────────────────────────────────────── */}
      <div className="mb-8">
        <nav aria-label="مسار التنقل" className="mb-4">
          <ol className="flex w-fit max-w-full items-center gap-1.5 rounded-2xl border border-primary/10 bg-card/80 px-3 py-2 text-xs shadow-sm sm:text-sm">
            <li className="shrink-0">
              <Link
                to="/"
                className="font-bold text-muted-foreground transition-colors hover:text-primary"
              >
                الرئيسية
              </Link>
            </li>
            <li className="shrink-0 text-muted-foreground/60">/</li>
            <li className="min-w-0">
              <span className="block max-w-[210px] truncate font-black text-primary">المفضلة</span>
            </li>
          </ol>
        </nav>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-600">
              <Heart className="h-3.5 w-3.5 fill-current" />
              قائمتك الشخصية
            </div>
            <h1 className="text-3xl md:text-4xl font-black leading-tight tracking-tight">
              المفضلة
            </h1>
            <p className="mt-2 text-sm md:text-base text-muted-foreground">
              {count > 0
                ? `${count} منتج محفوظ${count === 1 ? "" : "ات"} · ${totalAvailable} متاح${totalAvailable === 1 ? "" : "ة"} للطلب`
                : "اضغط على أيقونة القلب ❤️ على أي بطاقة منتج لحفظه، وستظهر هنا."}
            </p>
          </div>

          {count > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center gap-1.5 rounded-2xl border bg-card px-3 py-2 text-xs font-bold shadow-sm transition-all hover:bg-accent"
                aria-label="مشاركة المفضلة"
              >
                <Share2 className="h-4 w-4" />
                مشاركة
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirm("متأكد من مسح كل المفضلة؟")) {
                    clear();
                    toast.success("تم مسح المفضلة");
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-2xl border bg-card px-3 py-2 text-xs font-bold text-muted-foreground shadow-sm transition-all hover:bg-destructive/10 hover:text-destructive"
                aria-label="مسح كل المفضلة"
              >
                <Trash2 className="h-4 w-4" />
                مسح الكل
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Empty state ───────────────────────────────────────── */}
      {count === 0 && (
        <div className="rounded-[2rem] border-2 border-dashed border-rose-200 bg-gradient-to-br from-rose-50/50 via-white to-amber-50/30 px-6 py-20 text-center">
          <div className="mx-auto mb-6 inline-flex h-24 w-24 items-center justify-center rounded-full bg-rose-100 text-rose-500 shadow-inner">
            <Heart className="h-12 w-12" />
          </div>
          <h2 className="mb-3 text-2xl md:text-3xl font-black">قائمة المفضلة فارغة</h2>
          <p className="mx-auto mb-8 max-w-lg text-sm leading-7 text-muted-foreground">
            اضغط على أيقونة <Heart className="inline h-4 w-4 text-rose-500" /> على أي بطاقة منتج
            لإضافته هنا. ستتمكن لاحقاً من مراجعة منتجاتك المفضلة وإكمال الطلب بنقرة واحدة.
          </p>

          <div className="mx-auto grid max-w-2xl gap-3 sm:grid-cols-3">
            <Link
              to="/products/men"
              className="group flex flex-col items-center gap-3 rounded-2xl border bg-card p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-primary hover:shadow-lg"
            >
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-2xl transition-colors group-hover:bg-primary group-hover:text-white">
                💪
              </span>
              <span className="text-sm font-black">منتجات الرجال</span>
              <span className="text-xs text-muted-foreground">56 منتج</span>
            </Link>
            <Link
              to="/products/women"
              className="group flex flex-col items-center gap-3 rounded-2xl border bg-card p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-primary hover:shadow-lg"
            >
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-2xl transition-colors group-hover:bg-primary group-hover:text-white">
                🌸
              </span>
              <span className="text-sm font-black">منتجات النساء</span>
              <span className="text-xs text-muted-foreground">24 منتج</span>
            </Link>
            <Link
              to="/products/devices"
              className="group flex flex-col items-center gap-3 rounded-2xl border bg-card p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-primary hover:shadow-lg"
            >
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-2xl transition-colors group-hover:bg-primary group-hover:text-white">
                ⚙️
              </span>
              <span className="text-sm font-black">الأجهزة</span>
              <span className="text-xs text-muted-foreground">7 أجهزة</span>
            </Link>
          </div>
        </div>
      )}

      {/* ── Toolbar (sort + summary) ──────────────────────────── */}
      {count > 0 && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-3 shadow-sm">
          <div className="flex items-center gap-3 text-sm">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 font-black text-rose-600">
              <Heart className="h-3.5 w-3.5 fill-current" />
              {count} منتج
            </div>
            <span className="text-muted-foreground">·</span>
            <div className="font-black text-primary">{formatPrice(totalValue)}</div>
          </div>

          <div className="flex items-center gap-2">
            <label className="hidden text-xs font-bold text-muted-foreground sm:block">
              ترتيب:
            </label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-xl border bg-background px-3 py-1.5 text-xs font-bold outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10"
            >
              <option value="newest">الأحدث إضافة</option>
              <option value="price-asc">السعر: من الأقل</option>
              <option value="price-desc">السعر: من الأعلى</option>
              <option value="rating">الأعلى تقييماً</option>
            </select>
          </div>
        </div>
      )}

      {/* ── Wishlist grid ────────────────────────────────────── */}
      {count > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 sm:gap-5">
          {sortedEnriched.map(({ item, product }) => {
            if (!product) return null;
            const inStock = product.stock > 0;
            return (
              <article
                key={item.id}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-black/5 bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                {/* Image */}
                <Link
                  to="/products/$slug"
                  params={{ slug: product.slug }}
                  className="relative block aspect-square overflow-hidden bg-gradient-soft"
                  aria-label={`عرض تفاصيل ${product.name}`}
                >
                  {product.image ? (
                    <img
                      src={thumbUrl(product.image, "thumbs")}
                      srcSet={`${thumbUrl(product.image, "thumbs-180")} 360w, ${thumbUrl(product.image, "thumbs")} 480w, ${assetUrl(product.image)} 800w`}
                      sizes="(max-width: 640px) 180px, 240px"
                      alt={product.name}
                      title={product.name}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      width={480}
                      height={480}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-7xl">
                      {product.emoji}
                    </div>
                  )}

                  {/* Out of stock overlay */}
                  {!inStock && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                      <span className="rounded-full bg-destructive px-4 py-1.5 text-xs font-black text-destructive-foreground shadow-lg">
                        نفد المخزون
                      </span>
                    </div>
                  )}

                  {/* Wishlist remove (bottom-right of image — matches card design) */}
                  <RemoveFromWishlistButton id={item.id} name={product.name} />
                </Link>

                {/* Body */}
                <div className="flex flex-1 flex-col gap-3 p-4">
                  <Link
                    to="/products/$slug"
                    params={{ slug: product.slug }}
                    className="line-clamp-2 font-bold leading-tight transition-colors hover:text-primary"
                  >
                    {product.name}
                  </Link>

                  {/* Meta row */}
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-black text-amber-700">
                      ⭐ {product.rating}
                    </span>
                    <span className="text-muted-foreground">({product.reviews})</span>
                    {inStock && product.stock <= 5 && (
                      <span className="rounded-full bg-orange-50 px-2 py-0.5 font-bold text-orange-700">
                        باقي {product.stock}
                      </span>
                    )}
                  </div>

                  {/* Price + add-to-cart */}
                  <div className="mt-auto flex items-end justify-between gap-2 border-t pt-3">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        السعر
                      </div>
                      <div className="text-xl font-black text-primary">
                        {formatPrice(product.price)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!inStock) {
                          toast.error("المنتج غير متوفر حالياً");
                          return;
                        }
                        addToCart(product);
                        toast.success(`أضيف ${product.name} للسلة ✅`);
                      }}
                      disabled={!inStock}
                      className={`inline-flex items-center gap-1.5 rounded-2xl px-4 py-2.5 text-xs font-black shadow-md transition-all active:scale-95 ${
                        inStock
                          ? "bg-gradient-brand text-primary-foreground hover:brightness-110"
                          : "cursor-not-allowed bg-muted text-muted-foreground"
                      }`}
                      aria-label={inStock ? `أضف ${product.name} للسلة` : "غير متوفر"}
                    >
                      <ShoppingCart className="h-4 w-4" />
                      {inStock ? "أضف للسلة" : "غير متوفر"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* ── Bottom action bar (sticky on mobile) ─────────────── */}
      {count > 0 && (
        <>
          {/* Mobile sticky bar */}
          <div className="sticky bottom-0 left-0 right-0 z-30 mt-8 -mx-4 border-t bg-background/95 px-4 py-3 shadow-2xl backdrop-blur-md md:hidden">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  الإجمالي
                </div>
                <div className="text-lg font-black text-primary">{formatPrice(totalValue)}</div>
              </div>
              {count >= 2 && (
                <button
                  type="button"
                  onClick={handleAddAllToCart}
                  disabled={totalAvailable === 0}
                  className="inline-flex items-center gap-2 rounded-2xl bg-gradient-brand px-5 py-3 text-sm font-black text-primary-foreground shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ShoppingCart className="h-4 w-4" />
                  أضف الكل للسلة
                </button>
              )}
            </div>
          </div>

          {/* Desktop action bar */}
          <div className="mt-8 hidden flex-wrap items-center justify-between gap-4 rounded-2xl border bg-gradient-soft p-5 shadow-sm md:flex">
            <div className="flex items-center gap-4">
              <Package className="h-8 w-8 text-primary" />
              <div>
                <div className="text-sm font-black">جاهز لإكمال الطلب؟</div>
                <div className="text-xs text-muted-foreground">
                  {totalAvailable} من {count} منتج متاح للطلب
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  القيمة الإجمالية
                </div>
                <div className="text-2xl font-black text-primary">{formatPrice(totalValue)}</div>
              </div>
              {count >= 2 && (
                <button
                  type="button"
                  onClick={handleAddAllToCart}
                  disabled={totalAvailable === 0}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-brand px-6 py-3 text-sm font-black text-primary-foreground shadow-elegant transition-all hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ShoppingCart className="h-4 w-4" />
                  أضف الكل للسلة
                </button>
              )}
              <Link
                to="/cart"
                className="inline-flex items-center gap-1.5 rounded-full border-2 border-primary bg-white px-5 py-3 text-sm font-black text-primary transition-colors hover:bg-primary/5"
              >
                عرض السلة
                <ChevronLeft className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Inline component (defined here to keep file self-contained)
function RemoveFromWishlistButton({ id, name }: { id: string; name: string }) {
  const { remove } = useWishlist();
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        remove(id);
        toast.success(`أزيل ${name} من المفضلة`, {
          icon: <Heart className="h-4 w-4 text-rose-500" />,
        });
      }}
      className="group/remove absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-rose-500 text-white shadow-lg shadow-rose-500/40 ring-2 ring-rose-200 transition-all duration-200 hover:scale-110 hover:bg-rose-600 active:scale-90"
      aria-label={`إزالة ${name} من المفضلة`}
      title="إزالة من المفضلة"
    >
      <Heart
        className="h-[18px] w-[18px] fill-current transition-transform group-hover/remove:scale-110"
        strokeWidth={2.25}
      />
    </button>
  );
}
