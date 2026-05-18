import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Star, ShoppingCart } from "lucide-react";
import type { Product } from "@/data/product-types";
import { formatPrice } from "@/data/product-types";
import { useCart } from "@/hooks/use-cart";
import { toast } from "sonner";

export function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(product.image && !imageFailed);

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-[2rem] border border-black/5 bg-card transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)]">
      {product.badge && (
        <span className="absolute top-4 right-4 z-10 rounded-full bg-gradient-brand px-3.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-primary-foreground shadow-lg backdrop-blur-md">
          {product.badge}
        </span>
      )}
      {product.oldPrice && (
        <span className="absolute top-4 left-4 z-10 rounded-full bg-destructive px-2.5 py-1 text-[10px] font-bold text-destructive-foreground shadow-sm">
          -{Math.round((1 - product.price / product.oldPrice) * 100)}%
        </span>
      )}
      {/* 🔧 عرض حالة المخزون */}
      {product.stock <= 5 && product.stock > 0 && (
        <span className="absolute bottom-4 left-4 z-10 rounded-full bg-amber-100 px-2.5 py-1 text-[9px] font-bold text-amber-700">
          باقي {product.stock}
        </span>
      )}
      {product.stock <= 0 && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70 backdrop-blur-[2px] rounded-[2rem]">
          <span className="rounded-full bg-destructive px-4 py-1.5 text-xs font-bold text-destructive-foreground">
            نفد المخزون
          </span>
        </div>
      )}
      <Link to="/products/$id" params={{ id: product.id }} className="block">
        {showImage ? (
          <div className="aspect-square w-full overflow-hidden bg-gradient-soft relative">
            {!imageLoaded && <div className="absolute inset-0 skeleton" />}
            <img
              src={product.image}
              alt={product.name}
              loading="lazy"
              decoding="async"
              width={400}
              height={400}
              className={`h-full w-full object-cover transition-all duration-700 group-hover:scale-110 ${imageLoaded ? "opacity-100 scale-100" : "opacity-0 scale-105"}`}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageFailed(true)}
            />
          </div>
        ) : (
          <div
            className="aspect-square w-full bg-gradient-soft flex items-center justify-center text-7xl transition-all duration-700 group-hover:scale-110"
            aria-label={product.name}
          >
            {product.emoji}
          </div>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <Link
          to="/products/$id"
          params={{ id: product.id }}
          className="line-clamp-2 font-bold text-foreground/90 hover:text-primary transition-colors duration-300 leading-snug"
        >
          {product.name}
        </Link>
        <div className="flex items-center gap-1 text-[11px]">
          <div className="flex items-center bg-yellow-400/10 text-yellow-600 px-2 py-0.5 rounded-full font-black">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 mr-1" />
            {product.rating}
          </div>
          <span className="text-muted-foreground font-medium">({product.reviews} تقييم)</span>
        </div>
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <div className="flex flex-col">
            {product.oldPrice && (
              <span className="text-[10px] text-muted-foreground/60 line-through font-bold">
                {formatPrice(product.oldPrice)}
              </span>
            )}
            <span className="text-xl font-black text-primary tracking-tight">
              {formatPrice(product.price)}
            </span>
          </div>
          {/* 🔧 تعطيل زر الإضافة إذا نفد المخزون */}
          <button
            onClick={() => {
              if (product.stock <= 0) return;
              add(product);
              toast.success("تمت الإضافة للسلة", {
                icon: <ShoppingCart className="h-4 w-4 text-primary" />,
                className: "rounded-2xl font-bold",
              });
            }}
            disabled={product.stock <= 0}
            className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl text-primary-foreground transition-all duration-300 shadow-lg active:scale-95 ${
              product.stock <= 0
                ? "bg-muted text-muted-foreground cursor-not-allowed shadow-none"
                : "bg-gradient-brand hover:scale-110 hover:rotate-3"
            }`}
            aria-label={product.stock <= 0 ? "نفد المخزون" : "أضف للسلة"}
          >
            <ShoppingCart className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
