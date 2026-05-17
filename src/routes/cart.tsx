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
} from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { formatPrice } from "@/data/product-types";
import { waLink, buildOrderMessage } from "@/lib/whatsapp";
import { isValidEgyptianPhone, generateOrderId } from "@/lib/utils";
import { toast } from "sonner";

// ملاحظة: ضع رابط Google Apps Script الخاص بك هنا لاحقاً
const GOOGLE_SHEET_WEBHOOK = "YOUR_GOOGLE_SCRIPT_URL_HERE";

export const Route = createFileRoute("/cart")({
  head: () => ({ meta: [{ title: "السلة — اليسر ميديكال" }] }),
  component: CartPage,
});

type OrderMethod = "whatsapp" | "direct";

function CartPage() {
  const { items, total, setQty, remove, clear } = useCart();
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

    setSubmitting(true);
    const orderId = generateOrderId();

    if (method === "whatsapp") {
      const msg = buildOrderMessage(
        items.map((i) => ({ id: i.id, name: i.name, qty: i.qty, price: i.price })),
        customer,
        orderId,
      );
      window.open(waLink(msg), "_blank", "noopener,noreferrer");
      setSubmitting(false);
      setShowPrompt(true);
    } else {
      try {
        const orderData = {
          orderId,
          date: new Date().toLocaleString("ar-EG"),
          ...customer,
          items: items.map((i) => `${i.name} (${i.qty})`).join(" - "),
          total: `${total} ج.م`,
          method: "طلب مباشر من الموقع",
        };

        await fetch(GOOGLE_SHEET_WEBHOOK, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(orderData),
        });

        toast.success(`تم استلام طلبك بنجاح! رقم الطلب: ${orderId}`);
        clear();
        navigate({ to: "/thank-you" });
      } catch (err) {
        console.error(err);
        toast.error("حدثت مشكلة، يرجى المحاولة عبر واتساب");
      } finally {
        setSubmitting(false);
      }
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
          {items.map((it) => (
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
                  className="p-1.5 hover:bg-accent rounded-l-full"
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
          ))}
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

          <div className="space-y-4">
            <Inp
              label="الاسم *"
              placeholder="اكتب اسمك هنا"
              value={customer.name}
              onChange={(v) => setCustomer({ ...customer, name: v })}
            />
            <Inp
              label="رقم الهاتف *"
              placeholder="01xxxxxxxxx"
              value={customer.phone}
              onChange={(v) => setCustomer({ ...customer, phone: v })}
              type="tel"
            />
            <Inp
              label="العنوان *"
              placeholder="المحافظة، المدينة، الشارع"
              value={customer.address}
              onChange={(v) => setCustomer({ ...customer, address: v })}
            />
            <label className="block">
              <span className="text-sm font-semibold mb-1.5 block">ملاحظات</span>
              <textarea
                value={customer.notes}
                placeholder="أي تفاصيل أخرى..."
                onChange={(e) => setCustomer({ ...customer, notes: e.target.value })}
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
            disabled={submitting}
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold mb-1.5 block">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all"
      />
    </label>
  );
}
