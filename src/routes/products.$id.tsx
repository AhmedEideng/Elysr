import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Star, ShoppingCart, ShieldCheck, Truck, Lock, Plus, Minus } from "lucide-react";
import { formatPrice } from "@/data/product-types";
import { useCart } from "@/hooks/use-cart";
import { toast } from "sonner";
import { waLink, buildOrderMessage } from "@/lib/whatsapp";
import { injectJsonLd, clearJsonLd, productSchema, breadcrumbSchema } from "@/lib/seo";

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
    const { getProductById } = await import("@/data/products");
    const product = getProductById(params.id);
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.product.name} — اليسر ميديكال` },
      { name: "description", content: loaderData?.product.description },
    ],
  }),
});

function ProductPage() {
  const { product } = Route.useLoaderData();
  const { add } = useCart();
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);

  // حقن Schema.org Product + BreadcrumbList
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
    add(product, qty);
    toast.success("تمت الإضافة للسلة بنجاح!", {
      action: {
        label: "إتمام الطلب",
        onClick: () => navigate({ to: "/cart" }),
      },
    });
  };

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="grid gap-10 md:grid-cols-2">
        {/* ✅ نفس منطق ProductCard: صورة إن وُجدت، وإلا إيموجي */}
        {product.image ? (
          <div className="rounded-3xl bg-gradient-soft border overflow-hidden aspect-square">
            <img
              src={product.image}
              alt={product.name}
              loading="eager"
              decoding="async"
              className="h-full w-full object-cover"
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
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
            <span className="font-bold">{product.rating}</span>
            <span className="text-muted-foreground">({product.reviews} تقييم)</span>
          </div>
          <div className="flex items-end gap-3">
            <span className="text-4xl font-bold text-primary">{formatPrice(product.price)}</span>
            {product.oldPrice && (
              <span className="text-xl text-muted-foreground line-through">
                {formatPrice(product.oldPrice)}
              </span>
            )}
          </div>
          <p className="text-muted-foreground leading-relaxed">{product.description}</p>

          {product.benefits.length > 0 && (
            <div>
              <h3 className="font-bold mb-2">المميزات:</h3>
              <ul className="space-y-1.5">
                {product.benefits.map((b: string) => (
                  <li key={b} className="flex items-center gap-2 text-sm">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {product.usage && (
            <p className="text-sm">
              <strong>طريقة الاستخدام: </strong>
              {product.usage}
            </p>
          )}
          {product.ingredients && (
            <p className="text-sm">
              <strong>المكونات: </strong>
              {product.ingredients}
            </p>
          )}

          <div className="flex items-center gap-3 pt-2">
            <div className="flex items-center rounded-full border">
              <button
                onClick={() => setQty(Math.max(1, qty - 1))}
                className="h-10 w-10 inline-flex items-center justify-center hover:bg-accent rounded-r-full"
                aria-label="تقليل"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-10 text-center font-bold" aria-live="polite">
                {qty}
              </span>
              <button
                onClick={() => setQty(qty + 1)}
                className="h-10 w-10 inline-flex items-center justify-center hover:bg-accent rounded-l-full"
                aria-label="زيادة"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <button
              onClick={() => {
                add(product, qty);
                toast.success("تمت الإضافة للسلة");
              }}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-full border-2 border-primary bg-background px-6 py-3 font-bold text-primary transition-smooth hover:bg-accent"
            >
              <ShoppingCart className="h-4 w-4" /> أضف للسلة
            </button>
          </div>
          <button
            onClick={handleAddToCart}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-gradient-brand px-6 py-4 font-bold text-primary-foreground shadow-elegant transition-smooth hover:scale-[1.02]"
          >
            إضافة إلى السلة
          </button>

          <div className="grid grid-cols-3 gap-3 pt-4 border-t">
            <Trust icon={<ShieldCheck className="h-5 w-5" />} label="منتج أصلي" />
            <Trust icon={<Truck className="h-5 w-5" />} label="شحن سريع" />
            <Trust icon={<Lock className="h-5 w-5" />} label="تغليف سري" />
          </div>
        </div>
      </div>
    </div>
  );
}
function Trust({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent text-primary">
        {icon}
      </span>
      <span className="text-xs font-semibold">{label}</span>
    </div>
  );
}
