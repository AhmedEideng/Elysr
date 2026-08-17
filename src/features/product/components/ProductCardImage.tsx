import { useEffect, useRef, useState } from "react";

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
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // إعادة تعيين الحالات عند تغيير معرف المنتج لمنع تداخل الحالات في الـ SPA.
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
  }, [productId, image]);

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

  const baseWebP = image.split("?")[0];
  const t180 = baseWebP.replace(/^\/images\//, "/images/thumbs-180/");
  const t480 = baseWebP.replace(/^\/images\//, "/images/thumbs/");

  const srcUrl = `${t480}?v=elysr_v28`;
  const srcSetUrl = `${t180}?v=elysr_v28 360w, ${t480}?v=elysr_v28 480w, ${baseWebP}?v=elysr_v28 800w`;

  return (
    <div className="relative aspect-square w-full overflow-hidden bg-gradient-to-br from-[#f0f9ff] via-white to-[#fef9c3]">
      {!loaded && !loadedOnce && <div className="absolute inset-0 skeleton" />}
      <img
        ref={imgRef}
        src={srcUrl}
        srcSet={srcSetUrl}
        sizes="(max-width: 640px) 180px, (max-width: 1024px) 240px, 300px"
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        width={480}
        height={480}
        className={`h-full w-full object-cover transition-all duration-700 ${loaded ? "scale-100 opacity-100" : "scale-105 opacity-0"}`}
        onLoad={() => {
          setLoaded(true);
          setLoadedOnce(true);
        }}
        onError={() => setFailed(true)}
      />
    </div>
  );
}
