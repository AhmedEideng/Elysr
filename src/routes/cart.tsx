import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  MessageCircle,
  Package,
  CheckCircle,
  Loader2,
  ChevronDown,
  MapPin,
} from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { formatPrice } from "@/data/product-types";
import { waLink, buildOrderMessage } from "@/lib/whatsapp";
import {
  generateOrderId,
  isValidEgyptianPhone,
  sanitizeInput,
  normalizeEgyptianPhone,
} from "@/lib/utils";
import {
  EGYPT_GOVERNORATES,
  submitToGoogleSheets,
  getShippingCost,
  getShippingLabel,
  FREE_SHIPPING_THRESHOLD,
  qualifiesForFreeShipping,
} from "@/lib/governorates";
import { toast } from "sonner";
import { getNextTier, PROMO_TAGLINE, isPromoActive } from "@/lib/promo";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [{ title: "سلة التسوق — اليسر ميديكال" }, { name: "robots", content: "noindex,follow" }],
  }),
  component: CartPage,
});

type OrderMethod = "whatsapp" | "direct";

function CartPage() {
  const {
    items,
    total,
    subtotalBeforeDiscount,
    discount,
    tier,
    setQty,
    remove,
    clear,
    isStockLimitReached,
    syncCatalog,
  } = useCart();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState({
    name: "",
    phone: "",
    governorate: "",
    address: "",
    notes: "",
  });
  const [method, setMethod] = useState<OrderMethod>("whatsapp");
  const [submitting, setSubmitting] = useState(false);

  // 🚚 حساب مصاريف الشحن حسب المحافظة المختارة مع دعم الشحن المجاني
  const freeShippingApplied = qualifiesForFreeShipping(subtotalBeforeDiscount);
  const shipping = customer.governorate
    ? getShippingCost(customer.governorate, subtotalBeforeDiscount)
    : 0;
  const grandTotal = total + shipping;

  // ☀️ شريحة الخصم التالية لتحفيز العميل على زيادة المشتريات
  const nextTier = getNextTier(subtotalBeforeDiscount);
  const amountToNext = nextTier ? nextTier.threshold - subtotalBeforeDiscount : 0;
  const amountToFreeShipping = Math.max(FREE_SHIPPING_THRESHOLD - subtotalBeforeDiscount, 0);
  const promoLive = isPromoActive();

  useEffect(() => {
    if (!items.length) return;
    let cancelled = false;
    void import("@/data/products").then(({ products }) => {
      if (!cancelled) syncCatalog(products);
    });
    return () => {
      cancelled = true;
    };
  }, [items.length, syncCatalog]);

  const checkout = async () => {
    if (items.length === 0) {
      toast.error("السلة فارغة");
      return;
    }
    const addressRequired = method === "direct";
    if (
      !customer.name ||
      !customer.phone ||
      !customer.governorate ||
      (addressRequired && !customer.address)
    ) {
      toast.error(
        method === "whatsapp"
          ? "يرجى كتابة الاسم ورقم الهاتف والمحافظة"
          : "يرجى ملء جميع الحقول المطلوبة (*)",
      );
      return;
    }
    if (!isValidEgyptianPhone(customer.phone)) {
      toast.error("برجاء إدخال رقم هاتف صحيح، مصري أو دولي بصيغة +رمز الدولة");
      return;
    }
    const overStock = items.find((i) => i.qty > (i.stock ?? 10));
    if (overStock) {
      toast.error(`الكمية المطلوبة لـ "${overStock.name}" تتجاوز المخزون`);
      return;
    }

    setSubmitting(true);
    const sc = {
      name: sanitizeInput(customer.name, 100),
      phone: normalizeEgyptianPhone(customer.phone),
      governorate: sanitizeInput(customer.governorate, 50),
      address: sanitizeInput(customer.address, 200),
      notes: customer.notes ? sanitizeInput(customer.notes, 300) : "",
    };

    // Split name for better Meta matching (first + last)

    const orderId = generateOrderId();
    const orderItems = items.map((i) => ({
      id: i.id,
      slug: i.slug,
      name: i.name,
      qty: i.qty,
      price: i.price,
      originalPrice: i.originalPrice,
    }));
    const payload = {
      orderId,
      orderType: "cart",
      paymentMethod: method === "whatsapp" ? "واتساب" : "طلب مباشر",
      customerName: sc.name,
      customerPhone: sc.phone,
      governorate: sc.governorate,
      address: sc.address || "سيتم تأكيده على واتساب",
      notes: sc.notes,
      items: orderItems,
      subtotalBeforeDiscount,
      discount,
      subtotal: total,
      shipping,
      total: grandTotal,
      promoApplied: discount > 0,
    };

    if (method === "whatsapp") {
      const msg = buildOrderMessage(orderItems, sc, orderId, shipping, freeShippingApplied);
      const url = waLink(msg);

      // واتساب هو قناة التأكيد الأساسية. نسجل الطلب فوراً بدون مطالبة العميل بالعودة للموقع.
      void submitToGoogleSheets(payload);

      try {
        sessionStorage.setItem("elysr_last_whatsapp_url", url);
      } catch {
        // Ignore storage failures.
      }

      // 🔧 فتح موثوق للواتساب
      // سنعود للطريقة البسيطة القديمة التي لا تستفز المتصفح
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      a.remove();

      clear();
      setSubmitting(false);
      navigate({ to: "/thank-you" });
    } else {
      try {
        const result = await submitToGoogleSheets(payload);
        if (!result.success) throw new Error(result.error || "تعذر إرسال الطلب");
        toast.success("✅ تم استلام طلبك بنجاح!", { duration: 4000 });
        clear();
        navigate({ to: "/order-confirmed" });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        toast.error(`تعذر إرسال الطلب المباشر: ${errorMsg}`);
        console.error("Direct order error:", err);
      } finally {
        setSubmitting(false);
      }
    }
  };

  if (items.length === 0)
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <div className="inline-flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-full bg-accent text-primary mb-4 mx-auto">
          <ShoppingBag className="h-10 w-10 sm:h-12 sm:w-12" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold">سلتك فارغة</h1>
        <Link
          to="/products/men"
          className="mt-6 inline-flex rounded-full bg-gradient-brand px-7 py-3 font-bold text-primary-foreground"
        >
          تسوق الآن
        </Link>
      </div>
    );

  return (
    <div className="container mx-auto px-4 py-6 md:py-10 overflow-x-hidden max-w-full">
      <h1 className="text-2xl sm:text-3xl font-black mb-6 md:mb-8 text-gradient">سلة التسوق</h1>

      <div className="flex flex-col lg:flex-row gap-6 w-full max-w-full">
        <div className="flex-1 lg:w-2/3 space-y-3 w-full max-w-full">
          {items.map((it) => {
            const atLimit = isStockLimitReached(it.id);
            return (
              <div
                key={it.id}
                className="w-full rounded-2xl border bg-card p-2.5 sm:p-4 transition-smooth"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <div className="h-12 w-12 sm:h-16 sm:w-16 shrink-0 overflow-hidden rounded-xl border bg-muted">
                      {it.image ? (
                        <img
                          src={it.image}
                          alt={it.name}
                          className="h-full w-full object-cover"
                          width={48}
                          height={48}
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-2xl">
                          {it.emoji}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate max-w-full">{it.name}</div>
                      <div className="text-primary font-bold text-sm">{formatPrice(it.price)}</div>
                      {atLimit && (
                        <span className="text-[10px] text-amber-600 font-bold">
                          الحد الأقصى المتاح
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-2.5 shrink-0">
                    <div className="flex items-center rounded-full border bg-background">
                      <button
                        onClick={() => setQty(it.id, it.qty - 1)}
                        aria-label={`تقليل كمية ${it.name}`}
                        className="p-1.5 hover:bg-accent rounded-r-full"
                      >
                        <Minus className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                      </button>
                      <span className="w-7 sm:w-6 text-center text-xs font-bold tabular-nums">
                        {it.qty}
                      </span>
                      <button
                        onClick={() => setQty(it.id, it.qty + 1)}
                        aria-label={`زيادة كمية ${it.name}`}
                        disabled={atLimit}
                        className={`p-1.5 rounded-l-full ${atLimit ? "opacity-30 cursor-not-allowed" : "hover:bg-accent"}`}
                      >
                        <Plus className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                      </button>
                    </div>
                    <button
                      onClick={() => remove(it.id)}
                      className="text-destructive p-2 hover:bg-destructive/10 rounded-full"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* 📦 بطاقة ضمان الخصوصية والتغليف الآمن بصفحة السلة — تبديد مخاوف الاستلام */}
          <div className="rounded-2xl border border-violet-100 bg-violet-50/30 p-4 sm:p-5 text-right shadow-sm mt-4">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700 animate-float-slow text-2xl">
                📦
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-violet-950 mb-1 flex items-center gap-1.5">
                  تغليف سري ومحكم 100%
                </h3>
                <p className="text-xs text-violet-900/70 leading-6">
                  يتم شحن جميع الطلبات داخل{" "}
                  <strong>صناديق كرتونية بنية أو أكياس معتمة محكمة الغلق تماماً</strong> بدون كتابة
                  اسم المنتجات من الخارج. يظهر اسم المرسل على البوليصة بصيغة عامة (شركة اليسر)
                  لخصوصية تامة مع مندوب التوصيل والآخرين.
                </p>
              </div>
            </div>
          </div>
        </div>

        <aside className="w-full lg:w-1/3 rounded-3xl border bg-card p-4 sm:p-6 h-fit shadow-card space-y-5 lg:sticky lg:top-24 border-primary/10 flex flex-col max-w-full">
          {/* Order Summary (Moved to top as requested for better UX) */}
          <div className="order-1 space-y-2 border-b pb-5 mb-1">
            <h2 className="text-lg sm:text-xl font-bold mb-4">ملخص الطلب</h2>

            {/* ☀️ محفّز الترقية للشريحة التالية */}
            {promoLive && nextTier && amountToNext > 0 && (
              <div className="rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/70 p-3 text-center mb-4">
                <p className="text-xs sm:text-sm text-amber-900 font-bold">
                  {nextTier.icon} أضف{" "}
                  <span className="text-amber-700 text-base">{formatPrice(amountToNext)}</span> فقط
                  لتحصل على خصم <span className="text-amber-700 text-base">{nextTier.label}</span>
                </p>
                <p className="text-[10px] sm:text-xs text-amber-700/80 mt-1">{PROMO_TAGLINE}</p>
              </div>
            )}

            {customer.governorate && !freeShippingApplied && amountToFreeShipping > 0 && (
              <div className="rounded-xl border border-sky-200 bg-sky-50/80 p-3 text-center mb-4">
                <p className="text-xs sm:text-sm text-sky-900 font-bold">
                  🚚 أضف{" "}
                  <span className="text-sky-700 text-base">
                    {formatPrice(amountToFreeShipping)}
                  </span>{" "}
                  فقط لتحصل على شحن مجاني
                </p>
                <p className="text-[10px] sm:text-xs text-sky-700/80 mt-1">
                  الشحن المجاني يُطبَّق تلقائياً من {formatPrice(FREE_SHIPPING_THRESHOLD)} فأكثر
                </p>
              </div>
            )}

            <div className="text-sm flex justify-between">
              <span className="text-muted-foreground">المجموع الفرعي</span>
              <span
                className={discount > 0 ? "line-through text-muted-foreground" : "font-semibold"}
              >
                {formatPrice(subtotalBeforeDiscount) || "0 ج.م"}
              </span>
            </div>
            {discount > 0 && tier && (
              <>
                <div
                  className={`text-sm flex justify-between font-bold text-white rounded-lg px-3 py-2 bg-gradient-to-r ${tier.color}`}
                >
                  <span>
                    {tier.icon} {tier.name} (خصم {tier.label})
                  </span>
                  <span>-{formatPrice(discount) || "0 ج.م"}</span>
                </div>
                <div className="text-sm flex justify-between font-bold">
                  <span>المجموع بعد الخصم</span>
                  <span className="text-emerald-700">{formatPrice(total) || "0 ج.م"}</span>
                </div>
              </>
            )}
            {customer.governorate && (
              <div className="text-sm flex justify-between">
                <span className="text-muted-foreground">
                  🚚 شحن — {getShippingLabel(customer.governorate)}
                </span>
                <span className={freeShippingApplied ? "font-bold text-emerald-700" : ""}>
                  {freeShippingApplied ? "مجاني" : formatPrice(shipping) || "0 ج.م"}
                </span>
              </div>
            )}
            <div className="text-base sm:text-lg font-bold flex justify-between pt-2 border-t mt-2">
              <span>الإجمالي</span>
              <span className="text-primary">{formatPrice(grandTotal) || "0 ج.م"}</span>
            </div>
          </div>

          {/* Form & Method Section */}
          <div className="order-2 space-y-5">
            <h2 className="text-lg sm:text-xl font-bold">بيانات التوصيل</h2>
            <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-muted rounded-2xl">
              <button
                onClick={() => setMethod("whatsapp")}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all duration-300 ${method === "whatsapp" ? "bg-background shadow-md text-[#25D366]" : "text-muted-foreground hover:bg-background/50"}`}
              >
                <MessageCircle className="h-4 w-4" /> واتساب
              </button>
              <button
                onClick={() => setMethod("direct")}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all duration-300 ${method === "direct" ? "bg-background shadow-md text-primary" : "text-muted-foreground hover:bg-background/50"}`}
              >
                <Package className="h-4 w-4" /> طلب مباشر
              </button>
            </div>
            <div className="rounded-xl bg-muted/50 p-3 text-[11px] text-muted-foreground">
              {method === "whatsapp"
                ? "سيُفتح واتساب برسالة جاهزة. أرسلها فقط لتأكيد الطلب."
                : "سيُرسل طلبك مباشرة. سنتواصل معك لتأكيد التفاصيل."}
            </div>
            <div className="space-y-3">
              <Inp
                label="الاسم *"
                placeholder="اكتب اسمك هنا"
                value={customer.name}
                onChange={(v) => setCustomer({ ...customer, name: v })}
                maxLength={100}
              />
              <Inp
                label="رقم الهاتف *"
                placeholder="01xxxxxxxxx"
                value={customer.phone}
                onChange={(v) => {
                  setCustomer({ ...customer, phone: v });
                }}
                type="tel"
                maxLength={16}
              />
              <label className="block">
                <span className="text-sm font-semibold mb-1.5 block">
                  <MapPin className="h-3.5 w-3.5 inline-block mr-1" />
                  المحافظة *
                </span>
                <div className="relative">
                  <select
                    value={customer.governorate}
                    onChange={(e) => setCustomer({ ...customer, governorate: e.target.value })}
                    className="w-full box-border rounded-xl border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all appearance-none cursor-pointer"
                    required
                  >
                    <option value="" disabled>
                      اختر المحافظة...
                    </option>
                    {EGYPT_GOVERNORATES.map((gov) => (
                      <option key={gov} value={gov}>
                        {gov}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
              </label>
              <Inp
                label={method === "whatsapp" ? "العنوان (اختياري)" : "العنوان *"}
                placeholder={
                  method === "whatsapp"
                    ? "اختياري — يمكن تأكيده على واتساب"
                    : "المدينة، الشارع، رقم العمارة"
                }
                value={customer.address}
                onChange={(v) => setCustomer({ ...customer, address: v })}
                maxLength={200}
              />
              <label className="block">
                <span className="text-sm font-semibold mb-1.5 block">ملاحظات</span>
                <textarea
                  value={customer.notes}
                  placeholder="أي تفاصيل أخرى..."
                  onChange={(e) => setCustomer({ ...customer, notes: e.target.value })}
                  maxLength={300}
                  rows={2}
                  className="w-full box-border rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all resize-none"
                />
              </label>
            </div>

            <button
              onClick={checkout}
              disabled={submitting}
              className={`w-full mt-6 rounded-full px-4 sm:px-6 py-3 sm:py-4 font-bold text-white shadow-elegant transition-all duration-300 active:scale-[0.98] disabled:opacity-60 disabled:cursor-wait flex items-center justify-center gap-2 text-sm sm:text-base ${method === "whatsapp" ? "bg-[#25D366] hover:bg-[#1ebd57] shadow-[#25d366]/20" : "bg-gradient-brand shadow-primary/20"}`}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  جاري الإرسال...
                </>
              ) : method === "whatsapp" ? (
                <>
                  <MessageCircle className="h-5 w-5" />
                  تأكيد عبر واتساب
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5" />
                  تأكيد الطلب المباشر
                </>
              )}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Inp({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  maxLength = 200,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  maxLength?: number;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold mb-1.5 block">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        className="w-full box-border rounded-xl border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all"
      />
    </label>
  );
}
