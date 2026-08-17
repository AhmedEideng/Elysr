import { useEffect, useRef, useState } from "react";
import type { Product } from "@/data/product-types";

/**
 * 🖼️ Product Image — مكون منعزل لصورة المنتج مع skeleton loading.
 *
 * يُستخدم مع key={product.id} من المكون الأب لضمان إعادة إنشائه
 * بالكامل عند تغيير المنتج؛ هذا يحل مشكلة أن حالة imageLoaded/ imageFailed
 * كانت تبقى عالقة بين التنقلات في الـ SPA.
 */
export function ProductImage({
  product,
  categoryName,
}: {
  product: Product;
  categoryName: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // إعادة تعيين الحالات عند تغيير معرف المنتج لمنع تداخل الحالات بين المنتجات المختلفة في الـ SPA.
  // مع معالجة الصور المخزنة مؤقتاً (Cached) التي تكون محملة مسبقاً وتملك complete === true.
  useEffect(() => {
    if (imgRef.current && imgRef.current.complete) {
      setLoaded(true);
      setLoadedOnce(true);
      setFailed(false);
    } else {
      setLoaded(false);
      setFailed(false);
      setLoadedOnce(false);
    }
  }, [product.id, product.image]);

  if (!product.image || failed) {
    return (
      <div className="rounded-[1.5rem] border bg-gradient-soft flex aspect-square items-center justify-center text-[160px] md:text-[190px]">
        {product.emoji}
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-[1.5rem] border bg-gradient-soft aspect-square">
      {!loaded && !loadedOnce && <div className="absolute inset-0 skeleton" />}

      <div className="absolute right-3 top-3 z-10 flex flex-wrap gap-2">
        <span className="rounded-full bg-black/75 px-3 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
          {categoryName}
        </span>
        {product.badge && (
          <span className="rounded-full bg-gradient-brand px-3 py-1 text-[11px] font-bold text-primary-foreground shadow-md">
            {product.badge}
          </span>
        )}
      </div>

      <div className="absolute left-3 top-3 z-10 rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold text-amber-700 shadow-sm backdrop-blur-sm">
        ⭐ {product.rating} / 5
      </div>

      <img
        ref={imgRef}
        src={product.image.split("?")[0] + "?v=elysr_v28"}
        alt={product.name}
        width={800}
        height={800}
        loading="eager"
        decoding="async"
        onLoad={() => {
          setLoaded(true);
          setLoadedOnce(true);
        }}
        onError={() => setFailed(true)}
        className={`h-full w-full object-cover transition-smooth duration-500 ${loaded ? "opacity-100 scale-100" : "opacity-0 scale-105"}`}
      />
    </div>
  );
}
