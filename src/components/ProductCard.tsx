import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Star, ShoppingCart } from "lucide-react";
import type { Product } from "@/data/product-types";
import { formatPrice } from "@/data/product-types";
import { useCart } from "@/hooks/use-cart";
import { toast } from "sonner";

export function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(product.image && !imageFailed);

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border bg-card transition-smooth hover:-translate-y-1 hover:shadow-elegant">
      {product.badge && (
        <span className="absolute top-3 right-3 z-10 rounded-full bg-gradient-brand px-3 py-1 text-[11px] font-bold text-primary-foreground shadow-md">
          {product.badge}
        </span>
      )}
      {product.oldPrice && (
        <span className="absolute top-3 left-3 z-10 rounded-full bg-destructive px-2.5 py-1 text-[11px] font-bold text-destructive-foreground">
          خصم {Math.round((1 - product.price / product.oldPrice) * 100)}%
        </span>
      )}
      <Link to="/products/$id" params={{ id: product.id }} className="block">
        {showImage ? (
          <div className="aspect-square w-full overflow-hidden bg-gradient-soft">
            <img
              src={product.image}
              alt={product.name}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover group-hover:scale-105 transition-smooth"
              onError={() => setImageFailed(true)}
            />
          </div>
        ) : (
          <div
            className="aspect-square w-full bg-gradient-soft flex items-center justify-center text-7xl group-hover:scale-105 transition-smooth"
            aria-label={product.name}
          >
            {product.emoji}
          </div>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <Link
          to="/products/$id"
          params={{ id: product.id }}
          className="line-clamp-2 font-semibold text-foreground hover:text-primary transition-smooth"
        >
          {product.name}
        </Link>
        <div className="flex items-center gap-1 text-xs">
          <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
          <span className="font-semibold">{product.rating}</span>
          <span className="text-muted-foreground">({product.reviews})</span>
        </div>
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div className="flex flex-col">
            {product.oldPrice && (
              <span className="text-xs text-muted-foreground line-through">
                {formatPrice(product.oldPrice)}
              </span>
            )}
            <span className="text-lg font-bold text-primary">{formatPrice(product.price)}</span>
          </div>
          <button
            onClick={() => {
              add(product);
              toast.success("تمت الإضافة للسلة");
            }}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-brand text-primary-foreground transition-smooth hover:scale-110 shadow-md"
            aria-label="أضف للسلة"
          >
            <ShoppingCart className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
