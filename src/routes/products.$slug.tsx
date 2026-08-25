import { useScrollTracking } from "@/hooks/use-scroll-tracking";
import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import {
  Star,
  ShoppingCart,
  ShieldCheck,
  Truck,
  Lock,
  Plus,
  Minus,
  AlertCircle,
  MessageCircle,
  X,
  BookOpen,
} from "lucide-react";
import { useFocusTrap } from "@/components/Accessibility";
import { formatPrice } from "@/data/product-types";
import { isPromoActive, PROMO_MIN_THRESHOLD, getPromoTier } from "@/lib/promo";
import { useCart } from "@/hooks/use-cart";
import { useRecentlyViewed } from "@/hooks/use-recently-viewed";
import { RecentlyViewed } from "@/components/sections/RecentlyViewed";
import { toast } from "sonner";
import {
  injectJsonLd,
  clearJsonLd,
  clearPrerenderJsonLd,
  productSchema,
  breadcrumbSchema,
  makeProductMetaDescription,
} from "@/lib/seo";
import { ProductCard } from "@/components/ProductCard";
import { CrossSellBundle } from "@/components/sections/CrossSellBundle";
import { FAQ } from "@/components/FAQ";
import { ProductReviews } from "@/features/product/components/ProductReviews";
import { ProductImage } from "@/features/product/components/ProductImage";
import { buildOrderMessage, waLink } from "@/lib/whatsapp";
import { getProductBySlug, getProductsByCategory, getCrossSellsForProduct } from "@/data/products";
import { GOOGLE_SHOPPING_BLOCKED } from "@/lib/product-compliance";

interface LinkedArticle {
  slug: string;
  title: string;
  emoji: string;
  readMin: number;
  image?: string;
}

import {
  generateOrderId,
  isValidEgyptianPhone,
  sanitizeInput,
  normalizeEgyptianPhone,
} from "@/lib/utils";
import { EGYPT_GOVERNORATES, getShippingCost, submitToGoogleSheets } from "@/lib/governorates";

export const Route = createFileRoute("/products/$slug")({
  component: ProductPage,
  notFoundComponent: () => (
    <div className="container mx-auto px-4 py-20 text-center">
      <h1 className="text-3xl font-bold">المنتج غير موجود</h1>
      <Link to="/" className="mt-4 inline-block text-primary">
        العودة للرئيسية
      </Link>
    </div>
  ),
  loader: ({ params }) => {
    const product = getProductBySlug(params.slug);
    if (!product) throw notFound();

    const crossSells = getCrossSellsForProduct(product);

    const related = getProductsByCategory(product.category)
      .filter((p) => p.id !== product.id && !crossSells.find((c) => c.id === p.id))
      .sort((a, b) => {
        if (b.rating !== a.rating) return b.rating - a.rating;
        return a.id.localeCompare(b.id);
      })
      .slice(0, 4);

    return { product, related, crossSells };
  },
  head: ({ loaderData }) => {
    const SITE_URL = "https://elysrmedical.store";
    const absImg = loaderData?.product.image
      ? loaderData.product.image.startsWith("http")
        ? loaderData.product.image
        : `${SITE_URL}${loaderData.product.image}`
      : `${SITE_URL}/og-default.webp`;
    return {
      meta: [
        { title: loaderData?.product.name },
        {
          name: "description",
          content: loaderData?.product ? makeProductMetaDescription(loaderData.product) : "",
        },
        ...(loaderData?.product && GOOGLE_SHOPPING_BLOCKED.has(loaderData.product.id)
          ? [{ name: "robots", content: "noindex,follow,noarchive,nosnippet,noimageindex" }]
          : []),
        { property: "og:type", content: "product" },
        { property: "og:image", content: absImg },
        { name: "twitter:image", content: absImg },
      ],
    };
  },
});

function ProductPage() {
  const { product, related, crossSells } = Route.useLoaderData();
  const [linkedArticles, setLinkedArticles] = useState<LinkedArticle[]>([]);

  useEffect(() => {
    // Defer loading heavy articles to prevent blocking route transition & page paint
    let cancelled = false;
    Promise.all([import("@/lib/internal-links"), import("@/data/articles")]).then(
      ([{ getArticlesForProduct }, { articles: allArticles }]) => {
        if (cancelled) return;
        const articleSlugs = getArticlesForProduct(product);
        const matches = allArticles
          .filter((a) => articleSlugs.includes(a.slug))
          .map((a) => ({
            slug: a.slug,
            title: a.title,
            emoji: a.emoji,
            readMin: a.readMin,
            image: a.image,
          }));
        setLinkedArticles(matches);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [product]);

  const { add } = useCart();
  const { track: trackRecentlyViewed } = useRecentlyViewed();
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);
  const [prevProductId, setPrevProductId] = useState(product.id);

  if (product.id !== prevProductId) {
    setPrevProductId(product.id);
    setQty(1);
  }

  useScrollTracking(`Product_${product.slug}`);
  const [isOrdering, setIsOrdering] = useState(false);
  const [quickOrderOpen, setQuickOrderOpen] = useState(false);
  const [quickCustomer, setQuickCustomer] = useState({
    name: "",
    phone: "",
    governorate: "",
    address: "",
  });

  // ♿ Focus trap — يحبس Tab داخل النموذج ويعيد الفوكس عند الإغلاق
  const focusTrapRef = useFocusTrap<HTMLFormElement>(quickOrderOpen);

  useEffect(() => {
    trackRecentlyViewed(product);
  }, [product.id, trackRecentlyViewed, product]);

  useEffect(() => {
    // أزل نسخ الـ prerender أولاً حتى لا يتكرر أي schema بعد الـ hydration
    clearPrerenderJsonLd();
    if (!GOOGLE_SHOPPING_BLOCKED.has(product.id)) {
      injectJsonLd("product", productSchema(product));
    }
    injectJsonLd(
      "breadcrumb",
      breadcrumbSchema([
        { name: "الرئيسية", url: "/" },
        {
          name:
            product.category === "men"
              ? "منتجات الصحة الزوجية للرجال"
              : product.category === "women"
                ? "منتجات الصحة الزوجية للنساء"
                : "الأجهزة والمستلزمات الطبية",
          url:
            product.category === "men"
              ? "/products/men"
              : product.category === "women"
                ? "/products/women"
                : "/products/devices",
        },
        { name: product.name, url: `/products/${product.slug}` },
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
      duration: 2000,
      action: {
        label: "إتمام الطلب",
        onClick: () => navigate({ to: "/cart" }),
      },
    });
  };

  const handleWhatsAppOrder = () => {
    if (product.stock <= 0) {
      toast.error("المنتج غير متوفر حالياً");
      return;
    }
    setQuickOrderOpen(true);
  };

  const submitQuickWhatsAppOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isOrdering) return;

    if (!quickCustomer.name || !quickCustomer.phone || !quickCustomer.governorate) {
      toast.error("اكتب الاسم ورقم الهاتف والمحافظة أولاً");
      return;
    }

    if (!isValidEgyptianPhone(quickCustomer.phone)) {
      toast.error("برجاء إدخال رقم هاتف صحيح، مصري أو دولي بصيغة +رمز الدولة");
      return;
    }

    setIsOrdering(true);

    try {
      const sc = {
        name: sanitizeInput(quickCustomer.name, 100),
        phone: normalizeEgyptianPhone(quickCustomer.phone),
        governorate: sanitizeInput(quickCustomer.governorate, 50),
        address: quickCustomer.address ? sanitizeInput(quickCustomer.address, 200) : "",
      };

      const orderId = generateOrderId();
      const subtotal = product.price * qty;
      const tier = isPromoActive() ? getPromoTier(subtotal) : null;
      const discount = tier ? Math.round(subtotal * tier.discount) : 0;
      const subtotalAfterDiscount = subtotal - discount;
      const shipping = getShippingCost(sc.governorate, subtotal);
      const grandTotal = subtotalAfterDiscount + shipping;
      const orderItems = [
        {
          id: product.id,
          slug: product.slug,
          name: product.name,
          qty,
          price: product.price,
          originalPrice: product.price,
        },
      ];

      const payload = {
        orderId,
        orderType: "شراء فوري",
        paymentMethod: "واتساب",
        customerName: sc.name,
        customerPhone: sc.phone,
        governorate: sc.governorate,
        address: sc.address || "سيتم التأكيد على واتساب",
        notes: "طلب سريع من صفحة المنتج مباشرة",
        items: orderItems,
        subtotalBeforeDiscount: subtotal,
        discount,
        subtotal: subtotalAfterDiscount,
        shipping,
        total: grandTotal,
        promoApplied: discount > 0,
      };

      // 🔒 Run Google Sheets submission as a non-blocking background fetch so the redirect is instant!
      void submitToGoogleSheets(payload);

      const msg = buildOrderMessage(orderItems, sc, orderId, shipping, shipping === 0);
      const url = waLink(msg);

      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      a.remove();

      setQuickOrderOpen(false);
      toast.success("تم تجهيز رسالة واتساب ببياناتك");
    } catch (err) {
      console.error("Quick WhatsApp order error:", err);
      toast.error("حدث خطأ أثناء تجهيز الطلب، حاول مرة أخرى");
    } finally {
      setIsOrdering(false);
    }
  };

  const maxStock = product.stock ?? 10;
  const atStockLimit = qty >= maxStock;
  const categoryName =
    product.category === "men"
      ? "منتجات الصحة الزوجية للرجال"
      : product.category === "women"
        ? "منتجات الصحة الزوجية للنساء"
        : "الأجهزة والمستلزمات الطبية";
  const categoryHref =
    product.category === "men"
      ? "/products/men"
      : product.category === "women"
        ? "/products/women"
        : "/products/devices";
  const topBenefits = product.benefits?.slice(0, 4) ?? [];
  const safetyNotice = getProductSafetyNotice(product);

  return (
    <div className="container mx-auto px-4 py-8 pb-16 md:py-10 md:pb-10">
      <nav aria-label="مسار التنقل" className="mb-5">
        <ol className="flex w-fit max-w-full items-center gap-1.5 rounded-2xl border border-primary/10 bg-card/80 px-3 py-2 text-xs shadow-sm sm:text-sm">
          <li className="shrink-0">
            <Link
              to="/"
              className="font-bold text-muted-foreground transition-colors hover:text-primary"
            >
              الرئيسية
            </Link>
          </li>
          <li className="shrink-0 text-muted-foreground/60">/</li>
          <li className="min-w-0">
            <Link
              to={categoryHref}
              className="block max-w-[210px] truncate font-bold text-muted-foreground transition-colors hover:text-primary sm:max-w-none"
            >
              {categoryName}
            </Link>
          </li>
          <li className="hidden shrink-0 text-muted-foreground/60 sm:block">/</li>
          <li className="hidden min-w-0 sm:block">
            <span className="block max-w-[360px] truncate font-black text-primary">
              {product.name}
            </span>
          </li>
        </ol>
      </nav>

      <section className="grid gap-6 lg:grid-cols-2 items-start">
        <div className="rounded-[2rem] border border-primary/10 bg-card p-3 shadow-card">
          <ProductImage key={product.id} product={product} categoryName={categoryName} />

          <div className="mt-3 grid grid-cols-3 gap-2">
            <MiniFeature title="العبوة" value="بيانات واضحة" />
            <MiniFeature title="الشحن" value="سري وسريع" />
            <MiniFeature title="الطلب" value="دفع عند الاستلام" />
          </div>
        </div>

        <div className="rounded-[2rem] border border-primary/10 bg-card p-5 md:p-7 shadow-card">
          <div className="flex flex-wrap items-center gap-2">
            {product.badge && (
              <span className="rounded-full bg-gradient-brand px-3 py-1 text-xs font-bold text-primary-foreground">
                {product.badge}
              </span>
            )}
            <span className="rounded-full border border-primary/10 bg-primary/6 px-3 py-1 text-xs font-bold text-primary">
              {categoryName}
            </span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                product.stock > 0
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-destructive/10 text-destructive border border-destructive/20"
              }`}
            >
              {product.stock > 0 ? "متوفر الآن" : "غير متوفر"}
            </span>
          </div>

          <h1 className="mt-4 text-3xl md:text-4xl font-black leading-tight tracking-tight">
            {product.name}
          </h1>
          <p className="mt-2 text-sm md:text-base text-muted-foreground">{product.nameEn}</p>

          <div className="mt-4 flex flex-wrap gap-2 text-xs sm:text-sm">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 font-bold text-amber-700 border border-amber-200">
              <Star className="h-4 w-4 fill-current" />
              {product.rating} ({product.reviews} تقييم)
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1.5 font-bold text-sky-700 border border-sky-200">
              <Truck className="h-4 w-4" />
              شحن سري لكل المحافظات
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 font-bold text-emerald-700 border border-emerald-200">
              <ShieldCheck className="h-4 w-4" />
              إرشادات وتحذيرات واضحة
            </div>
          </div>

          <div className="mt-5 rounded-[1.5rem] border border-primary/10 bg-gradient-soft p-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">السعر الحالي</p>
                <div className="text-4xl md:text-5xl font-black text-primary tracking-tight">
                  {formatPrice(product.price)}
                </div>
              </div>
              <div className="text-left text-xs leading-6 text-muted-foreground">
                <div>✅ بيانات المنتج موضحة على العبوة</div>
                <div>✅ شحن سري وآمن</div>
                <div>✅ دعم مباشر عبر واتساب</div>
              </div>
            </div>

            {isPromoActive() && (
              <div className="mt-4 rounded-2xl border border-accent bg-accent/40 px-4 py-3 text-sm font-bold text-primary">
                💎 مبادرة الرعاية الماسية — خصومات تصل إلى 25% عند الطلب من{" "}
                {formatPrice(PROMO_MIN_THRESHOLD)} فأكثر
              </div>
            )}
          </div>

          {product.stock <= 5 && product.stock > 0 && (
            <div className="mt-4 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700 font-bold flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              باقي {product.stock} فقط — اطلب الآن قبل نفاد الكمية
            </div>
          )}
          {product.stock <= 0 && (
            <div className="mt-4 rounded-2xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive font-bold">
              هذا المنتج غير متوفر حالياً
            </div>
          )}

          <div className="mt-6 md:mt-8 p-5 rounded-2xl bg-secondary/30 border border-secondary">
            <p
              dir="auto"
              className="text-sm md:text-base leading-7 md:leading-8 text-muted-foreground whitespace-pre-line text-right"
            >
              {product.description}
            </p>
          </div>

          {topBenefits.length > 0 && (
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {topBenefits.map((benefit, index) => (
                <div
                  key={`${product.id}-benefit-${index}`}
                  className="rounded-2xl border border-primary/10 bg-background px-4 py-3 text-sm font-semibold text-foreground/85"
                >
                  <span className="ml-2 inline-block h-2 w-2 rounded-full bg-primary align-middle" />
                  {benefit}
                </div>
              ))}
            </div>
          )}

          <div className="mt-5 rounded-[1.5rem] border border-primary/10 bg-card p-4 shadow-sm">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-black">
              <ShieldCheck className="h-4 w-4 text-primary" />
              لماذا تطلب من اليسر؟
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                "منتجات أصلية مختارة بعناية",
                "شحن سري بدون اسم المنتج على العبوة",
                "الدفع عند الاستلام",
                "خصوصية كاملة لبيانات الطلب",
                "دعم سريع قبل وبعد الطلب",
                "تأكيد التفاصيل قبل الشحن",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl bg-accent/30 px-3 py-2 text-xs font-bold text-foreground/85"
                >
                  ✅ {item}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 rounded-2xl bg-accent/25 p-4 border border-primary/10">
            <h3 className="font-bold mb-2 flex items-center gap-2 text-sm">
              <AlertCircle className="h-4 w-4 text-primary" />
              {safetyNotice.title}
            </h3>
            <p className="text-xs leading-7 text-muted-foreground">{safetyNotice.body}</p>
          </div>

          <div className="mt-5 rounded-2xl border border-sky-100 bg-sky-50/70 p-4">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-black text-sky-800">
              <Lock className="h-4 w-4" />
              كيف يتم الشحن بسرية؟
            </h3>
            <ul className="space-y-2 text-xs leading-7 text-sky-900/80">
              <li>• يتم تغليف الطلب في عبوة محايدة بدون ذكر اسم المنتج.</li>
              <li>• لا تظهر طبيعة المنتج على الشحنة أو من الخارج.</li>
              <li>• يتم التواصل معك لتأكيد التفاصيل قبل الشحن.</li>
              <li>• بياناتك تُستخدم لإتمام الطلب والتوصيل فقط.</li>
            </ul>
          </div>

          {(product.ingredients || product.usage) && (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {product.ingredients && (
                <InfoBox title="المكونات / التركيبة" content={product.ingredients} />
              )}
              {product.usage && <InfoBox title="طريقة الاستخدام" content={product.usage} />}
            </div>
          )}

          {product.stock > 0 && (
            <div className="mt-6 border-t pt-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex items-center rounded-full border bg-muted/50 p-1 w-fit">
                  <button
                    onClick={() => setQty(Math.max(1, qty - 1))}
                    className="h-10 w-10 inline-flex items-center justify-center rounded-full transition-smooth hover:bg-accent"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-12 text-center font-black text-lg tabular-nums">{qty}</span>
                  <button
                    onClick={() => setQty(Math.min(qty + 1, maxStock))}
                    disabled={atStockLimit}
                    className={`h-10 w-10 inline-flex items-center justify-center rounded-full transition-smooth ${
                      atStockLimit ? "opacity-30 cursor-not-allowed" : "hover:bg-accent"
                    }`}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                <button
                  onClick={handleWhatsAppOrder}
                  disabled={isOrdering}
                  className={`flex-1 inline-flex items-center justify-center gap-2 rounded-full px-6 py-4 text-base font-black text-white shadow-elegant transition-smooth ${isOrdering ? "bg-muted-foreground cursor-wait" : "bg-[#25D366] hover:scale-[1.01] hover:bg-[#1ebd57]"}`}
                >
                  <MessageCircle className="h-5 w-5" />
                  {isOrdering ? "جاري التحويل..." : "اطلب عبر واتساب"}
                </button>

                <button
                  onClick={handleAddToCart}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-brand px-6 py-4 text-base font-black text-primary-foreground shadow-elegant transition-smooth hover:scale-[1.01]"
                >
                  <ShoppingCart className="h-5 w-5" />
                  إضافة للسلة
                </button>
              </div>

              <p className="mt-3 rounded-2xl bg-accent/30 px-4 py-3 text-center text-xs font-bold leading-6 text-muted-foreground">
                لطلب أكثر من منتج، استخدم إضافة للسلة ثم أتم الطلب مرة واحدة.
              </p>

              <div className="mt-4 grid grid-cols-3 gap-3">
                <Trust icon={<ShieldCheck className="h-5 w-5" />} label="عبوة موضحة البيانات" />
                <Trust icon={<Truck className="h-5 w-5" />} label="توصيل سريع" />
                <Trust icon={<Lock className="h-5 w-5" />} label="سرية تامة" />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 🚀 محرك البيع المتقاطع — Cross Sell Bundle */}
      {crossSells.length > 0 && (
        <CrossSellBundle mainProduct={product} suggestedProducts={crossSells} />
      )}

      {/* 🚀 تقييمات العملاء */}
      <ProductReviews
        rating={product.rating}
        reviewsCount={product.reviews}
        category={product.category}
        slug={product.slug}
      />

      {/* ── FAQ Section ── */}
      <FAQ />

      {related.length > 0 && (
        <section className="mt-12">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl md:text-3xl font-bold">منتجات قد تعجبك أيضاً</h2>
            <Link to={categoryHref} className="text-primary font-bold hover:underline">
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

      {/* 👀 شاهدتها مؤخراً — carousel من localStorage */}
      <RecentlyViewed currentSlug={product.slug} />

      {/* مقالات مرتبطة */}
      {linkedArticles && linkedArticles.length > 0 && (
        <section className="mt-6 mb-0 rounded-[2rem] border border-primary/10 bg-gradient-soft p-5 md:p-7">
          <h2 className="text-xl font-bold mb-4">📚 مقالات تهمك</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {linkedArticles.map((a) => (
              <Link
                key={a.slug}
                to="/education/$slug"
                params={{ slug: a.slug }}
                className="flex flex-col rounded-2xl border bg-card hover:border-primary/30 transition-all group overflow-hidden shadow-sm hover:shadow-md"
              >
                {a.image ? (
                  <div className="h-32 w-full overflow-hidden bg-muted relative">
                    <img
                      src={a.image}
                      alt={a.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <span className="absolute bottom-3 right-3 text-2xl drop-shadow-md">
                      {a.emoji}
                    </span>
                  </div>
                ) : (
                  <div className="flex h-32 w-full items-center justify-center bg-muted/50 text-5xl">
                    {a.emoji}
                  </div>
                )}
                <div className="flex flex-col flex-1 p-4">
                  <h3 className="font-bold text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2">
                    {a.title}
                  </h3>
                  <p className="text-[11px] font-medium text-muted-foreground mt-auto pt-3 flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5" />
                    {a.readMin} دقائق قراءة
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {quickOrderOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="طلب سريع عبر واتساب"
          onClick={() => {
            if (!isOrdering) setQuickOrderOpen(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape" && !isOrdering) setQuickOrderOpen(false);
          }}
        >
          <form
            ref={focusTrapRef}
            onSubmit={submitQuickWhatsAppOrder}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-[2rem] border bg-card p-5 shadow-2xl animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <div className="inline-flex rounded-full bg-[#25D366]/10 px-3 py-1 text-[11px] font-black text-[#128C3A]">
                  طلب سريع عبر واتساب
                </div>
                <h2 className="mt-3 text-xl font-black">اكتب بيانات التواصل</h2>
                <p className="mt-1 text-xs leading-6 text-muted-foreground">
                  سنسجل الطلب أولاً ثم نفتح واتساب برسالة جاهزة لتأكيد التفاصيل.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setQuickOrderOpen(false)}
                disabled={isOrdering}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-smooth hover:bg-accent disabled:opacity-50"
                aria-label="إغلاق"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-2xl border border-primary/10 bg-accent/20 p-3 text-xs font-bold leading-6 text-foreground/80">
              {product.name} × {qty} — {formatPrice(product.price * qty)} قبل الشحن/الخصم
            </div>

            <div className="mt-4 space-y-3">
              <QuickInput
                label="الاسم *"
                value={quickCustomer.name}
                onChange={(value) => setQuickCustomer((current) => ({ ...current, name: value }))}
                placeholder="اكتب اسمك"
                autoComplete="name"
              />
              <QuickInput
                label="رقم الهاتف *"
                value={quickCustomer.phone}
                onChange={(value) => {
                  setQuickCustomer((current) => ({ ...current, phone: value }));
                }}
                placeholder="01xxxxxxxxx"
                type="tel"
                maxLength={16}
                autoComplete="tel"
              />
              <label className="block">
                <span className="mb-1.5 block text-sm font-bold">المحافظة *</span>
                <select
                  value={quickCustomer.governorate}
                  onChange={(event) =>
                    setQuickCustomer((current) => ({ ...current, governorate: event.target.value }))
                  }
                  className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/5"
                  required
                >
                  <option value="" disabled>
                    اختر المحافظة...
                  </option>
                  {EGYPT_GOVERNORATES.map((governorate) => (
                    <option key={governorate} value={governorate}>
                      {governorate}
                    </option>
                  ))}
                </select>
              </label>

              <QuickInput
                label="العنوان"
                value={quickCustomer.address}
                onChange={(value) =>
                  setQuickCustomer((current) => ({ ...current, address: value }))
                }
                placeholder="اكتب عنوانك بالتفصيل (اختياري)"
                autoComplete="street-address"
                required={false}
              />
            </div>

            <button
              type="submit"
              disabled={isOrdering}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 py-3.5 text-sm font-black text-white shadow-lg transition-smooth hover:bg-[#1ebd57] disabled:cursor-wait disabled:opacity-70"
            >
              <MessageCircle className="h-5 w-5" />
              {isOrdering ? "جاري تسجيل الطلب..." : "تسجيل وفتح واتساب"}
            </button>
            <p className="mt-2 text-center text-[11px] font-bold text-muted-foreground">
              بياناتك تستخدم لتأكيد الطلب والتوصيل فقط.
            </p>
          </form>
        </div>
      )}

      {product.stock > 0 && (
        <div className="md:hidden fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 px-3 py-3 shadow-2xl backdrop-blur supports-[padding:max(0px)]:pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto flex max-w-xl items-center gap-3">
            <div className="min-w-[104px] rounded-2xl border border-primary/10 bg-accent px-3 py-2 text-center shadow-sm">
              <div className="text-[10px] font-bold text-muted-foreground">السعر</div>
              <div className="text-base font-black text-primary">{formatPrice(product.price)}</div>
            </div>
            <button
              onClick={handleAddToCart}
              className="flex-1 rounded-2xl bg-gradient-brand px-4 py-3.5 text-sm font-black text-primary-foreground shadow-lg active:scale-[0.98]"
            >
              <span className="inline-flex items-center justify-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                أضف للسلة لطلب أكثر من منتج
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function getProductSafetyNotice(product: {
  name: string;
  nameEn: string;
  slug: string;
  description: string;
  ingredients?: string;
  usage?: string;
  benefits?: string[];
}) {
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

  const hasPrescriptionActive =
    /(sildenafil|tadalafil|dapoxetine|vardenafil|viagra|cialis|levitra|130\s*[-/]\s*60|170\s*[-/]\s*60)/i.test(
      text,
    );

  if (hasPrescriptionActive) {
    return {
      title: "تنبيه طبي مهم قبل الاستخدام",
      body: "هذا المنتج قد يحتوي على مواد فعالة دوائية أو مكونات عالية الحساسية. لا تستخدمه من تلقاء نفسك ولا تجمعه مع منتجات مشابهة. استشر طبيباً أو صيدلياً قبل الاستخدام، خصوصاً إذا كنت تعاني من أمراض القلب أو الضغط أو الكبد أو الكلى أو تستخدم أدوية النترات أو أدوية مزمنة. توقف فوراً عند أي أعراض غير معتادة.",
    };
  }

  if (/(lidocaine|prilocaine|benzocaine|emla|procomil|spray|delay|تأخير|بخاخ|مناديل)/i.test(text)) {
    return {
      title: "تنبيه استخدام موضعي",
      body: "هذا المنتج للاستخدام الموضعي أو الداعم وفق التعليمات فقط. اختبر كمية صغيرة أولاً، ولا تستخدمه على جلد متهيج أو مجروح. توقف عند ظهور حرقان شديد أو طفح أو تنميل زائد، واستشر الطبيب إذا استمرت المشكلة أو كانت لديك حساسية معروفة.",
    };
  }

  return {
    title: "تنبيه مهم قبل الاستخدام",
    body: "هذا المنتج منتج دعم أو عناية أو مكمل ولا يُعد بديلاً عن التشخيص أو العلاج الطبي. النتائج تختلف من شخص لآخر حسب الحالة الصحية والعمر وطريقة الاستخدام. استشر الطبيب إذا كنت تعاني من أمراض مزمنة أو تتناول أدوية أخرى.",
  };
}

function QuickInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  maxLength = 100,
  autoComplete,
  required = true,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  maxLength?: number;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/5"
        required={required}
      />
    </label>
  );
}

function MiniFeature({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-background px-3 py-3 text-center shadow-sm">
      <div className="text-[10px] font-bold text-muted-foreground">{title}</div>
      <div className="mt-1 text-xs font-black text-foreground">{value}</div>
    </div>
  );
}

function InfoBox({ title, content }: { title: string; content: string }) {
  return (
    <div className="rounded-2xl border border-primary/10 bg-card p-4 shadow-sm">
      <h3 className="mb-2 text-sm font-bold text-foreground">{title}</h3>
      <p className="text-xs leading-relaxed text-muted-foreground">{content}</p>
    </div>
  );
}

function Trust({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-2xl border bg-background p-3 text-center">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent text-primary">
        {icon}
      </span>
      <span className="text-[10px] md:text-xs font-bold">{label}</span>
    </div>
  );
}
