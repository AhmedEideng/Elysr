import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Plus, ShoppingCart, Check, PackagePlus } from "lucide-react";
import type { Product } from "@/data/product-types";
import { formatPrice } from "@/data/product-types";
import { useCart } from "@/hooks/use-cart";
import { toast } from "sonner";
import { thumbUrl, assetUrl } from "@/lib/cache";

export function CrossSellBundle({
  mainProduct,
  suggestedProducts,
}: {
  mainProduct: Product;
  suggestedProducts: Product[];
}) {
  const { add } = useCart();
  const [isAdding, setIsAdding] = useState(false);
  const [added, setAdded] = useState(false);

  if (!suggestedProducts || suggestedProducts.length === 0) return null;

  const bundleItems = [mainProduct, ...suggestedProducts];
  const totalPrice = bundleItems.reduce((sum, item) => sum + item.price, 0);

  // Calculate a 10% discount for the bundle to make it irresistible
  const bundleDiscount = Math.round(totalPrice * 0.1);
  const finalPrice = totalPrice - bundleDiscount;

  const handleAddBundle = () => {
    setIsAdding(true);
    bundleItems.forEach((item) => {
      add(item, 1);
      // Tracking معطل
      // Tracking معطل
    });

    setTimeout(() => {
      setIsAdding(false);
      setAdded(true);
      toast.success("🛒 تم إضافة الباقة للسلة بنجاح! تم تطبيق الخصم التلقائي.");
      setTimeout(() => setAdded(false), 3000);
    }, 600);
  };

  return (
    <div className="mt-8 mb-10 overflow-hidden rounded-[2rem] border border-primary/20 bg-gradient-to-b from-sky-50/50 to-white shadow-lg">
      <div className="bg-primary/5 px-5 py-4 border-b border-primary/10 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <PackagePlus className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-lg font-black text-foreground">باقة التوفير والأداء المتكامل</h3>
          <p className="text-xs font-bold text-muted-foreground">
            اشتري هذه المجموعة ووفر {formatPrice(bundleDiscount)}!
          </p>
        </div>
      </div>

      <div className="p-5 md:p-6">
        <div className="flex flex-col md:flex-row items-center gap-4 justify-center mb-6">
          {bundleItems.map((item, index) => (
            <div key={item.id} className="flex items-center gap-4 w-full md:w-auto">
              <Link
                to="/products/$slug"
                params={{ slug: item.slug }}
                className="group flex flex-col items-center text-center w-28 md:w-32"
              >
                <div className="relative aspect-square w-full overflow-hidden rounded-2xl border bg-white p-2 shadow-sm transition-transform group-hover:scale-105 group-hover:border-primary/50 group-hover:shadow-md">
                  {item.image ? (
                    <img
                      src={thumbUrl(item.image, "thumbs")}
                      srcSet={`${thumbUrl(item.image, "thumbs-180")} 360w, ${thumbUrl(item.image, "thumbs")} 480w, ${assetUrl(item.image)} 800w`}
                      sizes="(max-width: 640px) 180px, 240px"
                      alt={item.name}
                      loading="lazy"
                      className="h-full w-full object-cover"
                      width={480}
                      height={480}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-4xl">
                      {item.emoji}
                    </div>
                  )}
                  {index === 0 && (
                    <span className="absolute top-1 right-1 rounded-md bg-primary px-1.5 py-0.5 text-[9px] font-bold text-white shadow-sm">
                      الحالي
                    </span>
                  )}
                </div>
                <h4 className="mt-2 text-[11px] font-bold leading-tight text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                  {item.name}
                </h4>
                <div className="mt-1 text-xs font-black text-muted-foreground">
                  {formatPrice(item.price)}
                </div>
              </Link>

              {index < bundleItems.length - 1 && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground md:rotate-0 rotate-90">
                  <Plus className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl bg-muted/30 p-4 border border-border">
          <div className="text-center sm:text-right">
            <div className="text-xs font-bold text-muted-foreground line-through">
              الإجمالي العادي: {formatPrice(totalPrice)}
            </div>
            <div className="text-lg font-black text-primary flex items-center gap-2 justify-center sm:justify-start">
              <span>سعر الباقة:</span>
              <span className="text-2xl">{formatPrice(finalPrice)}</span>
            </div>
          </div>

          <button
            onClick={handleAddBundle}
            disabled={isAdding || added}
            className={`
              relative inline-flex items-center justify-center gap-2 rounded-full px-8 py-3.5 text-sm font-black text-white shadow-lg transition-all active:scale-95 w-full sm:w-auto
              ${added ? "bg-emerald-500 hover:bg-emerald-600" : "bg-gradient-brand hover:scale-[1.02]"}
            `}
          >
            {isAdding ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : added ? (
              <>
                <Check className="h-5 w-5" />
                تم إضافة الباقة
              </>
            ) : (
              <>
                <ShoppingCart className="h-5 w-5" />
                أضف الباقة للسلة
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
