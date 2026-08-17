import React, { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import type { Product } from "@/data/product-types";
import { ProductCard } from "@/components/ProductCard";

/**
 * محرك حقن المنتجات داخل المقالات (In-Content Product Injection / Money Pages)
 * يقوم بتقسيم محتوى المقال (النصوص الطويلة) إلى أجزاء، ويقوم بزرع بطاقة منتج
 * (أو اثنين) في منتصف المقال لتشجيع العميل على الشراء أثناء القراءة بنية البحث.
 */
export function ArticleContentWithAds({
  content,
  linkedProducts,
}: {
  content: string;
  linkedProducts: Product[];
}) {
  // تقسيم النص بناءً على المسافات المزدوجة (الفقرات)
  const paragraphs = useMemo(() => content.split(/\n{2,}/), [content]);

  // تحديد أماكن وضع الإعلانات
  const adPositions = useMemo(() => {
    const total = paragraphs.length;
    if (total < 4 || linkedProducts.length === 0) return [];

    if (linkedProducts.length === 1 || total < 8) {
      // إعلان واحد في المنتصف تقريباً
      return [{ index: Math.floor(total / 2), product: linkedProducts[0] }];
    }

    // إعلانان إذا كان المقال طويلاً وفيه منتجات
    return [
      { index: Math.floor(total / 3), product: linkedProducts[0] },
      { index: Math.floor((total * 2) / 3), product: linkedProducts[1] },
    ];
  }, [paragraphs.length, linkedProducts]);

  return (
    <div className="prose prose-lg max-w-none text-foreground">
      <div className="leading-loose whitespace-pre-line text-base md:text-lg">
        {paragraphs.map((p, i) => {
          const ad = adPositions.find((pos) => pos.index === i);

          return (
            <React.Fragment key={i}>
              <p className="mb-4">{p}</p>

              {/* Product Injection */}
              {ad && (
                <div className="my-8 rounded-3xl bg-primary/5 p-4 sm:p-6 border border-primary/10 shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 right-0 bg-primary text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl z-10">
                    الحل المقترح
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <div className="w-full sm:w-1/3 max-w-[220px]">
                      <ProductCard product={ad.product} />
                    </div>
                    <div className="w-full sm:w-2/3 space-y-3 text-center sm:text-right">
                      <h3 className="text-xl font-black text-primary !mb-0 !mt-0">
                        {ad.product.name}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-3 !mt-2">
                        {ad.product.description}
                      </p>
                      <Link
                        to="/products/$slug"
                        params={{ slug: ad.product.slug }}
                        className="inline-flex w-full sm:w-auto justify-center rounded-full bg-gradient-brand px-6 py-3 font-black text-white shadow-md transition-transform hover:scale-105"
                      >
                        عرض المنتج والشراء
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
