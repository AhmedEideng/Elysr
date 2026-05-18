import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Star,
  ShoppingCart,
  ShieldCheck,
  Truck,
  Lock,
  Plus,
  Minus,
  AlertCircle,
} from "lucide-react";
import { formatPrice } from "@/data/product-types";
import { useCart } from "@/hooks/use-cart";
import { toast } from "sonner";
import { injectJsonLd, clearJsonLd, productSchema, breadcrumbSchema } from "@/lib/seo";
import { ProductCard } from "@/components/ProductCard";
import { FAQ } from "@/components/FAQ";

export const Route = createFileRoute("/products/$id")({
  component: ProductPage,
  notFoundComponent: () => (
    <div className="container mx-auto px-4 py-20 text-center">
      <h1 className="text-3xl font-bold">المنتج غير موجود</h1>
      <Link to="/" className="mt-4 inline-block text-primary">
        العودة للرئيسية
      </Link>
    </div>
  ),
  loader: async ({ params }) => {
    const { getProductById, getProductsByCategory } = await import("@/data/products");
    const product = getProductById(params.id);
    if (!product) throw notFound();

    // 🔧 ترتيب حتمي (deterministic) بدلاً من Math.random()
    // يعتمد على ID لضمان نفس النتائج دائماً
    const related = getProductsByCategory(product.category)
      .filter((p) => p.id !== product.id)
      .sort((a, b) => {
        // ترتيب حسب التقييم ثم الاسم لضمان الاستقرار
        if (b.rating !== a.rating) return b.rating - a.rating;
        return a.id.localeCompare(b.id);
      })
      .slice(0, 4);

    return { product, related };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.product.name} — اليسر ميديكال` },
      { name: "description", content: loaderData?.product.description },
    ],
  }),
});

function ProductPage() {
  const { product, related } = Route.useLoaderData();
  const { add, isStockLimitReached } = useCart();
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setQty(1);
    setImageLoaded(false);
    setImageFailed(false);
    window.scrollTo(0, 0);
  }, [product.id]);

  useEffect(() => {
    injectJsonLd("product", productSchema(product));
    injectJsonLd(
      "breadcrumb",
      breadcrumbSchema([
        { name: "الرئيسية", url: "/" },
        {
          name:
            product.category === "men"
              ? "منتجات الرجال"
              : product.category === "women"
                ? "منتجات النساء"
                : "أجهزة وأدوات",
          url: `/products/${product.category}`,
        },
        { name: product.name, url: `/products/${product.id}` },
      ]),
    );
    return () => {
      clearJsonLd("product");
      clearJsonLd("breadcrumb");
    };
  }, [product]);

  const handleAddToCart = () => {
    if (product.stock <= 0) {
      toast.error("المنتج غير متوفر حالياً");
      return;
    }
    add(product, qty);
    toast.success("تمت الإضافة للسلة بنجاح!", {
      action: {
        label: "إتمام الطلب",
        onClick: () => navigate({ to: "/cart" }),
      },
    });
  };

  const maxStock = product.stock ?? 10;
  const atStockLimit = qty >= maxStock;

  return (
    <div className="container mx-auto px-4 py-10">
      {/* Breadcrumb UI — 🔧 إضافة مسار التنقل المرئي */}
      <nav
        aria-label="مسار التنقل"
        className="mb-6 flex items-center gap-2 text-sm text-muted-foreground"
      >
        <Link to="/" className="hover:text-primary transition-colors">
          الرئيسية
        </Link>
        <span>/</span>
        <Link
          to={
            product.category === "men"
              ? "/products/men"
              : product.category === "women"
                ? "/products/women"
                : "/products/devices"
          }
          className="hover:text-primary transition-colors"
        >
          {product.category === "men"
            ? "منتجات الرجال"
            : product.category === "women"
              ? "منتجات النساء"
              : "أجهزة وأدوات"}
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium truncate max-w-[200px]">{product.name}</span>
      </nav>

      <div className="grid gap-10 md:grid-cols-2">
        {product.image && !imageFailed ? (
          <div className="rounded-3xl bg-gradient-soft border overflow-hidden aspect-square relative shadow-sm">
            {!imageLoaded && <div className="absolute inset-0 skeleton" />}
            <img
              src={product.image}
              alt={product.name}
              loading="eager"
              decoding="async"
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageFailed(true)}
              className={`h-full w-full object-cover transition-smooth duration-500 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
            />
          </div>
        ) : (
          <div className="rounded-3xl bg-gradient-soft border flex items-center justify-center aspect-square text-[180px]">
            {product.emoji}
          </div>
        )}
        <div className="space-y-5">
          {product.badge && (
            <span className="inline-block rounded-full bg-gradient-brand px-3 py-1 text-xs font-bold text-primary-foreground">
              {product.badge}
            </span>
          )}
          <h1 className="text-3xl md:text-4xl font-bold">{product.name}</h1>
          <div className="text-sm text-muted-foreground">{product.nameEn}</div>

          <div className="flex items-end gap-3 pt-2">
            <span className="text-4xl font-bold text-primary">{formatPrice(product.price)}</span>
            {product.oldPrice && (
              <span className="text-xl text-muted-foreground line-through">
                {formatPrice(product.oldPrice)}
              </span>
            )}
          </div>

          {/* 🔧 عرض حالة المخزون */}
          {product.stock <= 5 && product.stock > 0 && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5 text-xs text-amber-700 font-bold flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              باقي {product.stock} فقط — اطلب الآن!
            </div>
          )}
          {product.stock <= 0 && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-2.5 text-xs text-destructive font-bold">
              هذا المنتج غير متوفر حالياً
            </div>
          )}

          <div className="bg-accent/30 p-4 rounded-2xl border border-primary/10">
            <h3 className="font-bold mb-2 flex items-center gap-2 text-sm">
              <AlertCircle className="h-4 w-4 text-primary" />
              إخلاء مسؤولية طبي
            </h3>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              هذا المنتج هو مكمل غذائي/صحي وليس دواءً لعلاج الأمراض. النتائج قد تختلف من شخص لآخر
              بناءً على الحالة الصحية والعمر. يرجى استشارة الطبيب قبل الاستخدام إذا كنت تعاني من
              أمراض مزمنة أو تتناول أدوية أخرى.
            </p>
          </div>

          <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
            {product.description}
          </p>

          {/* 🔧 عرض الفوائد كقائمة */}
          {product.benefits && product.benefits.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold">المميزات:</h3>
              <ul className="grid grid-cols-2 gap-1.5">
                {product.benefits.map((b, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {product.stock > 0 && (
            <div className="flex items-center gap-3 pt-4 border-t">
              <div className="flex items-center rounded-full border bg-muted/50 p-1">
                <button
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  className="h-9 w-9 inline-flex items-center justify-center hover:bg-accent rounded-full transition-smooth"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-10 text-center font-bold">{qty}</span>
                <button
                  onClick={() => setQty(Math.min(qty + 1, maxStock))}
                  disabled={atStockLimit}
                  className={`h-9 w-9 inline-flex items-center justify-center rounded-full transition-smooth ${
                    atStockLimit ? "opacity-30 cursor-not-allowed" : "hover:bg-accent"
                  }`}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <button
                onClick={handleAddToCart}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-brand px-6 py-4 font-bold text-primary-foreground shadow-elegant transition-smooth hover:scale-[1.02]"
              >
                <ShoppingCart className="h-5 w-5" /> إضافة للسلة
              </button>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 pt-6">
            <Trust icon={<ShieldCheck className="h-5 w-5" />} label="أصلي 100%" />
            <Trust icon={<Truck className="h-5 w-5" />} label="توصيل سريع" />
            <Trust icon={<Lock className="h-5 w-5" />} label="سرية تامة" />
          </div>
        </div>
      </div>

      <FAQ />

      {related.length > 0 && (
        <section className="mt-20">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl md:text-3xl font-bold">منتجات قد تعجبك أيضاً</h2>
            <Link
              to={
                product.category === "men"
                  ? "/products/men"
                  : product.category === "women"
                    ? "/products/women"
                    : "/products/devices"
              }
              className="text-primary font-bold hover:underline"
            >
              عرض الكل
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
function Trust({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 text-center p-3 rounded-2xl border bg-card">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent text-primary">
        {icon}
      </span>
      <span className="text-[10px] md:text-xs font-bold">{label}</span>
    </div>
  );
}
