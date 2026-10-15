import { thumbUrl, assetUrl } from "@/lib/cache";
import { useProductImageState } from "../hooks/use-product-image-state";

/**
 * 🖼️ Product Card Image — مكون منعزل لصورة بطاقة المنتج مع دعم الـ Responsive SrcSet.
 *
 * يستقبل product.image + product.emoji ويعرض الصورة مع skeleton loading.
 * يُستخدم مع key={product.id} من ProductCard لضمان إعادة إنشائه بالكامل
 * عند تغيير المنتج، مما يحل مشكلة تعليق حالة الصورة بين التنقلات في الـ SPA.
 *
 * التحديث الجديد: تم إدراج دمج للـ SrcSet المزدوج لدعم مقاس 180px على شاشات الموبايل
 * ومقاس 240px للشاشات الأكبر وشاشات الـ Retina عالية الكثافة لإرضاء فحص PageSpeed.
 */

export function ProductCardImage({
  image,
  emoji,
  alt,
  productId,
}: {
  image?: string;
  emoji: string;
  alt: string;
  productId: string;
}) {
  const { imgRef, loaded, failed, loadedOnce, handleLoad, handleError } = useProductImageState(
    productId,
    image,
  );

  if (!image || failed) {
    return (
      <div
        className="flex aspect-square w-full items-center justify-center bg-gradient-soft text-7xl transition-all duration-700"
        aria-label={alt}
      >
        {emoji}
      </div>
    );
  }

  const srcUrl = thumbUrl(image, "thumbs");
  // 240w (thumbs-120) للكروت الصغيرة — المتصفح بيختار حسب العرض الفعلي × DPR
  const srcSetUrl = `${thumbUrl(image, "thumbs-120")} 240w, ${thumbUrl(image, "thumbs-180")} 360w, ${thumbUrl(image, "thumbs")} 480w, ${assetUrl(image)} 800w`;

  return (
    <div className="relative aspect-square w-full overflow-hidden bg-gradient-to-br from-[#f0f9ff] via-white to-[#fef9c3]">
      {!loaded && !loadedOnce && <div className="absolute inset-0 skeleton" />}
      <img
        ref={imgRef}
        src={srcUrl}
        srcSet={srcSetUrl}
        sizes="(max-width: 640px) 180px, (max-width: 1024px) 240px, 300px"
        alt={alt}
        loading="lazy"
        decoding="async"
        width={480}
        height={480}
        className={`h-full w-full object-cover transition-all duration-700 ${loaded ? "scale-100 opacity-100" : "scale-105 opacity-0"}`}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
}
