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
  AlertTriangle,
} from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { formatPrice } from "@/data/product-types";
import { waLink, buildOrderMessage } from "@/lib/whatsapp";
import { isValidEgyptianPhone, generateOrderId, sanitizeInput } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/cart")({
  head: () => ({ meta: [{ title: "السلة — اليسر ميديكال" }] }),
  component: CartPage,
});

type OrderMethod = "whatsapp" | "direct";

function CartPage() {
  const { items, total, setQty, remove, clear, isStockLimitReached } = useCart();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState({ name: "", phone: "", address: "", notes: "" });
  const [method, setMethod] = useState<OrderMethod>("whatsapp");
  const [submitting, setSubmitting] = useState(false);
  const [imageById, setImageById] = useState<Record<string, string | undefined>>({});

  useEffect(() => {
    if (!items.some((item) => !item.image)) return;
    let cancelled = false;
    import("@/data/products").then(({ products }) => {
      if (cancelled) return;
      setImageById(
        Object.fromEntries(products.map((product) => [product.id, product.image])) as Record<
          string,
          string | undefined
        >,
      );
    });
    return () => {
      cancelled = true;
    };
  }, [items]);

  const [showPrompt, setShowPrompt] = useState(false);

  const checkout = async () => {
    if (items.length === 0) {
      toast.error("السلة فارغة");
      return;
    }
    if (!customer.name || !customer.phone || !customer.address) {
      toast.error("يرجى ملء جميع الحقول المطلوبة (*)");
      return;
    }
    if (!isValidEgyptianPhone(customer.phone)) {
      toast.error("برجاء إدخال رقم هاتف مصري صحيح");
      return;
    }

    // 🔧 التحقق من أن الكميات ضمن المخزون
    const overStock = items.find((i) => i.qty > (i.stock ?? 10));
    if (overStock) {
      toast.error(`الكمية المطلوبة لـ "${overStock.name}" تتجاوز المخزون المتاح`);
      return;
    }

    setSubmitting(true);
    const orderId = generateOrderId();

    // 🔧 تنظيف المدخلات قبل الإرسال
    const sanitizedCustomer = {
      name: sanitizeInput(customer.name, 100),
      phone: sanitizeInput(customer.phone, 15),
      address: sanitizeInput(customer.address, 200),
      notes: customer.notes ? sanitizeInput(customer.notes, 300) : undefined,
    };

    if (method === "whatsapp") {
      const msg = buildOrderMessage(
        items.map((i) => ({ id: i.id, name: i.name, qty: i.qty, price: i.price })),
        sanitizedCustomer,
        orderId,
      );
      window.open(waLink(msg), "_blank", "noopener,noreferrer");
      setSubmitting(false);
      setShowPrompt(true);
    } else {
      // 🔧 تنبيه واضح إذا لم يُضبط Webhook
      toast.error("الطلب المباشر غير متاح حالياً. يرجى استخدام واتساب.", {
        duration: 5000,
        icon: <AlertTriangle className="h-4 w-4 text-destructive" />,
      });
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <div className="inline-flex h-24 w-24 items-center justify-center rounded-full bg-accent text-primary mb-4 mx-auto">
          <ShoppingBag className="h-12 w-12" />
        </div>
        <h1 className="text-3xl font-bold">سلتك فارغة</h1>
        <Link
          to="/products/men"
          className="mt-6 inline-flex rounded-full bg-gradient-brand px-7 py-3 font-bold text-primary-foreground"
        >
          تسوق الآن
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10">
      {showPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-3xl bg-card p-6 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-xl font-bold mb-3">هل أرسلت الطلب عبر واتساب؟</h3>
            <p className="text-sm text-muted-foreground mb-6">
              لتأكيد طلبك وتفريغ السلة، انقر على الزر أدناه.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  clear();
                  navigate({ to: "/thank-you" });
                }}
                className="flex-1 rounded-full bg-gradient-brand py-3 text-sm font-bold text-primary-foreground"
              >
                أرسلت الطلب
              </button>
              <button
                onClick={() => setShowPrompt(false)}
                className="flex-1 rounded-full border-2 border-primary py-3 text-sm font-bold text-primary"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      <h1 className="text-3xl font-bold mb-8">سلة التسوق</h1>
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3">
          {items.map((it) => {
            const atLimit = isStockLimitReached(it.id);
            return (
              <div
                key={it.id}
                className="flex items-center gap-4 rounded-2xl border bg-card p-4 transition-smooth hover:shadow-md"
              >
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border bg-muted">
                  {it.image ? (
                    <img src={it.image} alt={it.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-2xl">
                      {it.emoji}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{it.name}</div>
                  <div className="text-primary font-bold">{formatPrice(it.price)}</div>
                  {/* 🔧 عرض حالة المخزون */}
                  {atLimit && (
                    <span className="text-[10px] text-amber-600 font-bold">الحد الأقصى المتاح</span>
                  )}
                </div>
                <div className="flex items-center rounded-full border bg-background">
                  <button
                    onClick={() => setQty(it.id, it.qty - 1)}
                    className="p-1.5 hover:bg-accent rounded-r-full"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-6 text-center text-xs font-bold">{it.qty}</span>
                  <button
                    onClick={() => setQty(it.id, it.qty + 1)}
                    disabled={atLimit}
                    className={`p-1.5 rounded-l-full transition-smooth ${
                      atLimit ? "opacity-30 cursor-not-allowed" : "hover:bg-accent"
                    }`}
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
                <button
                  onClick={() => remove(it.id)}
                  className="text-destructive p-2 hover:bg-destructive/10 rounded-full transition-smooth"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
          <button
            onClick={clear}
            className="text-xs text-muted-foreground hover:text-destructive px-2 transition-smooth"
          >
            تفريغ السلة
          </button>
        </div>

        <aside className="rounded-3xl border bg-card p-6 h-fit shadow-card space-y-5 lg:sticky lg:top-24 border-primary/10">
          <h2 className="text-xl font-bold">طريقة إتمام الطلب</h2>

          <div className="grid grid-cols-2 gap-2 p-1.5 bg-muted rounded-2xl">
            <button
              onClick={() => setMethod("whatsapp")}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all duration-300 ${method === "whatsapp" ? "bg-background shadow-md text-[#25D366] scale-105" : "text-muted-foreground hover:bg-background/50"}`}
            >
              <MessageCircle className="h-4 w-4" /> واتساب
            </button>
            <button
              onClick={() => setMethod("direct")}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all duration-300 ${method === "direct" ? "bg-background shadow-md text-primary scale-105" : "text-muted-foreground hover:bg-background/50"}`}
            >
              <Package className="h-4 w-4" /> طلب مباشر
            </button>
          </div>

          {/* 🔧 تنبيه عند اختيار طلب مباشر غير مفعّل */}
          {method === "direct" && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>الطلب المباشر غير متاح حالياً. يرجى استخدام واتساب لإتمام طلبك.</span>
            </div>
          )}

          <div className="space-y-4">
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
              onChange={(v) => setCustomer({ ...customer, phone: v })}
              type="tel"
              maxLength={11}
            />
            <Inp
              label="العنوان *"
              placeholder="المحافظة، المدينة، الشارع"
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
                className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all"
              />
            </label>
          </div>

          <div className="border-t pt-4 text-lg font-bold flex justify-between">
            <span>الإجمالي</span>
            <span className="text-primary">{formatPrice(total)}</span>
          </div>

          <button
            onClick={checkout}
            disabled={submitting || method === "direct"}
            className={`w-full rounded-full px-6 py-4 font-bold text-white shadow-elegant transition-all duration-300 hover:scale-[1.02] active:scale-95 disabled:opacity-60 disabled:cursor-wait flex items-center justify-center gap-2 ${method === "whatsapp" ? "bg-[#25D366] hover:bg-[#1ebd57] shadow-[#25d366]/20" : "bg-primary hover:bg-primary/90 shadow-primary/20"}`}
          >
            {submitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : method === "whatsapp" ? (
              <MessageCircle className="h-5 w-5" />
            ) : (
              <CheckCircle className="h-5 w-5" />
            )}
            {submitting
              ? "جاري الإرسال..."
              : method === "whatsapp"
                ? "تأكيد عبر واتساب"
                : "تأكيد الطلب المباشر"}
          </button>
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
        className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all"
      />
    </label>
  );
}
