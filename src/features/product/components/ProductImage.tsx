import type { Product } from "@/data/product-types";
import { assetUrl } from "@/lib/cache";
import { useProductImageState } from "../hooks/use-product-image-state";

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
  const { imgRef, loaded, failed, loadedOnce, handleLoad, handleError } = useProductImageState(
    product.id,
    product.image,
  );

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

      <img
        ref={imgRef}
        src={assetUrl(product.image)}
        alt={product.name}
        title={product.name}
        width={800}
        height={800}
        loading="eager"
        fetchPriority="high"
        decoding="async"
        onLoad={handleLoad}
        onError={handleError}
        className={`h-full w-full object-cover transition-smooth duration-500 ${loaded ? "opacity-100 scale-100" : "opacity-0 scale-105"}`}
      />
    </div>
  );
}
