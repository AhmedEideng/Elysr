import { Link } from "@tanstack/react-router";
import { Star, ShoppingCart, Heart } from "lucide-react";
import type { Product } from "@/data/product-types";
import { formatPrice } from "@/data/product-types";
import { useCart } from "@/hooks/use-cart";
import { useWishlist } from "@/hooks/use-wishlist";
import { toast } from "sonner";
import { isPromoActive } from "@/lib/promo";
import { ProductCardImage } from "@/features/product/components/ProductCardImage";
import { GOOGLE_SHOPPING_BLOCKED } from "@/lib/product-compliance";

type UseBadge = { label: string; className: string };

function getUseBadge(product: Product): UseBadge {
  const text = [
    product.name,
    product.nameEn,
    product.slug,
    product.description,
    product.ingredients ?? "",
    product.usage ?? "",
    ...(product.benefits ?? []),
  ]
    .join(" ")
    .toLowerCase();

  if (product.category === "devices") {
    return /(ved|vacuum|pump|مضخة|تفريغ|erection)/.test(text)
      ? { label: "VED للانتصاب", className: "bg-cyan-700 text-white" }
      : { label: "شد وتكبير", className: "bg-violet-700 text-white" };
  }

  if (product.category === "women") {
    if (/(filler|فيلر|تكبير الثدي|الخدود|paxtone|max filler)/.test(text))
      return { label: "تكبير وشد", className: "bg-violet-700 text-white" };
    if (/(tightening|تضييق|lovezone vaginal gel)/.test(text))
      return { label: "تضييق", className: "bg-fuchsia-700 text-white" };
    if (/(viagra for women|انخفاض الرغبة)/.test(text))
      return { label: "دعم الرغبة", className: "bg-rose-700 text-white" };
    if (/(aromal|argi.fem)/.test(text) && !/(honey|عسل|drops|قطرات|نقط)/.test(text))
      return { label: "ترطيب", className: "bg-sky-700 text-white" };
    return { label: "رغبة وإثارة", className: "bg-rose-700 text-white" };
  }

  if (
    /(dapoxetine|130\/60|170\/60|hard-on|ferrari 130\/60|porsche 130\/60|love extra|double shot|مفعول مزدوج)/.test(
      text,
    )
  )
    return { label: "انتصاب + تأخير", className: "bg-teal-700 text-white" };
  if (
    /(lidocaine|prilocaine|benzocaine|delay|تأخير|spray|بخاخ|emla|procomil|dooz|stallion|reman|toro duro)/.test(
      text,
    )
  )
    return { label: "تأخير", className: "bg-indigo-700 text-white" };
  if (/(cialis|levitra|viagra|sildenafil|tadalafil|vardenafil|vegal|pfizer|oral jelly)/.test(text))
    return { label: "انتصاب", className: "bg-emerald-700 text-white" };
  if (/(titan|mr\. big|mr big|big penis|leech|العلق)/.test(text))
    return { label: "تكبير", className: "bg-violet-700 text-white" };
  if (/(night.hunter|صياد الليل|نايت هانتر)/.test(text))
    return { label: "انتصاب وتأخير", className: "bg-teal-700 text-white" };
  if (/(sotara|merson|royal cream)/.test(text))
    return { label: "تحفيز موضعي", className: "bg-cyan-700 text-white" };

  return { label: "طاقة وحيوية", className: "bg-amber-400 text-amber-950" };
}

export function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  const nofollow = GOOGLE_SHOPPING_BLOCKED.has(product.id) ? "nofollow" : undefined;
  const { has: hasInWishlist, toggle: toggleWishlist } = useWishlist();
  const promoOn = isPromoActive();
  const useBadge = getUseBadge(product);
  const wishlisted = hasInWishlist(product.id);
  const showImage = Boolean(product.image);

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-[2rem] border border-primary/10 bg-gradient-to-br from-white via-[#f0f9ff] to-[#fefce8] shadow-sm transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_-10px_rgba(0,109,166,0.2)] hover:border-primary/30">
      <span
        className={`absolute left-4 top-4 z-20 rounded-full px-3 py-1 text-[10px] font-black tracking-wide shadow-lg ${useBadge.className}`}
      >
        {useBadge.label}
      </span>

      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          const wasAdded = !wishlisted;
          toggleWishlist(product);
          if (wasAdded)
            toast.success(wasAdded ? "أضيف للمفضلة ❤️" : "أزيل من المفضلة", {
              duration: 1500,
              className: "rounded-2xl font-bold",
            });
        }}
        className={`group/heart absolute right-4 top-4 z-30 inline-flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300 ease-out hover:scale-110 active:scale-90 ${
          wishlisted
            ? "bg-rose-500 text-white shadow-lg shadow-rose-500/40 ring-2 ring-rose-200"
            : "bg-white/85 text-foreground/70 backdrop-blur-md shadow-md hover:bg-white hover:text-rose-500 ring-1 ring-black/5"
        }`}
        aria-label={wishlisted ? "إزالة من المفضلة" : "إضافة للمفضلة"}
        aria-pressed={wishlisted}
      >
        <Heart
          className={`h-[18px] w-[18px] transition-all duration-300 ${wishlisted ? "fill-current scale-110" : "scale-100 group-hover/heart:scale-105"}`}
          strokeWidth={wishlisted ? 2.25 : 1.75}
        />
      </button>

      {product.stock <= 5 && product.stock > 0 && (
        <span className="absolute bottom-4 left-4 z-20 rounded-full bg-amber-100 px-2.5 py-1 text-[9px] font-bold text-amber-700">
          باقي {product.stock}
        </span>
      )}
      {product.stock <= 0 && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[2rem] bg-background/70 backdrop-blur-[2px]">
          <span className="rounded-full bg-destructive px-4 py-1.5 text-xs font-bold text-destructive-foreground">
            نفد المخزون
          </span>
        </div>
      )}

      <Link
        to="/products/$slug"
        params={{ slug: product.slug }}
        rel={nofollow}
        className="block"
        aria-label={`عرض تفاصيل ${product.name}`}
      >
        {showImage ? (
          <ProductCardImage
            key={product.id}
            image={product.image}
            emoji={product.emoji}
            alt={product.name}
            productId={product.id}
          />
        ) : (
          <div
            className="flex aspect-square w-full items-center justify-center bg-gradient-soft text-7xl transition-all duration-700"
            aria-label={product.name}
          >
            {product.emoji}
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-5">
        <Link
          to="/products/$slug"
          params={{ slug: product.slug }}
          rel={nofollow}
          className="line-clamp-2 font-bold text-foreground/90 hover:text-primary transition-colors duration-300 leading-snug"
        >
          {product.name}
        </Link>
        <div className="flex items-center gap-1 text-[11px]">
          <div className="flex items-center rounded-full bg-yellow-400/10 px-2 py-0.5 font-black text-amber-700">
            <Star className="mr-1 h-3 w-3 fill-yellow-400 text-yellow-400" /> {product.rating}
          </div>
          <span className="font-medium text-muted-foreground">({product.reviews} تقييم)</span>
        </div>
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <span className="text-xl font-black tracking-tight text-primary">
            {formatPrice(product.price)}
          </span>
          <button
            onClick={() => {
              if (product.stock <= 0) return;
              add(product);
              toast.success(promoOn ? "تمت الإضافة للسلة ☀️" : "تمت الإضافة للسلة", {
                duration: 1500,
                icon: <ShoppingCart className="h-4 w-4 text-primary" />,
                className: "rounded-2xl font-bold",
              });
            }}
            disabled={product.stock <= 0}
            className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl text-primary-foreground transition-all duration-300 shadow-lg active:scale-95 ${
              product.stock <= 0
                ? "bg-muted text-muted-foreground cursor-not-allowed shadow-none"
                : "bg-gradient-brand hover:brightness-110"
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
