import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Trash2, Plus, Minus, ShoppingBag } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { formatPrice } from "@/data/product-types";
import { waLink, buildOrderMessage } from "@/lib/whatsapp";
import { isValidEgyptianPhone } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/cart")({
  head: () => ({ meta: [{ title: "السلة — اليسر ميديكال" }] }),
  component: CartPage,
});

function CartPage() {
  const { items, total, setQty, remove, clear } = useCart();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState({ name: "", phone: "", address: "", notes: "" });
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

  const checkout = () => {
    if (items.length === 0) {
      toast.error("السلة فارغة");
      return;
    }
    if (!customer.name || !customer.phone) {
      toast.error("الاسم ورقم الهاتف مطلوبان");
      return;
    }
    if (!isValidEgyptianPhone(customer.phone)) {
      toast.error("برجاء إدخال رقم هاتف مصري صحيح (11 رقم يبدأ بـ 01)");
      return;
    }

    setSubmitting(true);

    // تأخير بسيط لإظهار حالة التحميل للعميل (Visual Feedback)
    setTimeout(() => {
      const msg = buildOrderMessage(
        items.map((i) => ({ name: i.name, qty: i.qty, price: i.price })),
        customer,
      );
      // فتح واتساب في تبويب جديد
      window.open(waLink(msg), "_blank", "noopener,noreferrer");
      toast.success("تم تحويلك للواتساب لإتمام الطلب");

      // إظهار نافذة التأكيد وإلغاء حالة التحميل
      setSubmitting(false);
      setShowPrompt(true);
    }, 600);
  };

  const confirmOrderSent = () => {
    clear();
    setShowPrompt(false);
    navigate({ to: "/thank-you", state: { fromCheckout: true } });
  };

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <div className="inline-flex h-24 w-24 items-center justify-center rounded-full bg-accent text-primary mb-4 mx-auto">
          <ShoppingBag className="h-12 w-12" />
        </div>
        <h1 className="text-3xl font-bold">سلتك فارغة</h1>
        <p className="text-muted-foreground mt-2">ابدأ التسوق واكتشف منتجاتنا المميزة</p>
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
      {/* نافذة التأكيد المنبثقة */}
      {showPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-300">
            <h3 className="text-xl font-bold mb-3">هل قمت بإرسال رسالة الطلب؟</h3>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              لقد قمنا بتحويلك إلى تطبيق واتساب. للتأكيد وإنهاء الطلب وتفريغ سلتك، يرجى النقر على
              "نعم، أرسلت الطلب".
            </p>
            <div className="flex gap-3">
              <button
                onClick={confirmOrderSent}
                className="flex-1 rounded-full bg-gradient-brand py-3 text-sm font-bold text-primary-foreground shadow-elegant hover:scale-[1.02] transition-smooth"
              >
                نعم، أرسلت الطلب
              </button>
              <button
                onClick={() => setShowPrompt(false)}
                className="flex-1 rounded-full border-2 border-primary py-3 text-sm font-bold text-primary hover:bg-accent transition-smooth"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
      <h1 className="text-3xl md:text-4xl font-bold mb-8">سلة التسوق</h1>
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3">
          {items.map((it) => {
            const image = it.image ?? imageById[it.id];

            return (
              <div key={it.id} className="flex items-center gap-4 rounded-2xl border bg-card p-4">
                {image ? (
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border bg-gradient-soft sm:h-24 sm:w-24">
                    <img
                      src={image}
                      alt={it.name}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border bg-gradient-soft text-5xl sm:h-24 sm:w-24">
                    {it.emoji}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold line-clamp-1">{it.name}</div>
                  <div className="text-primary font-bold mt-1">{formatPrice(it.price)}</div>
                </div>
                <div className="flex items-center rounded-full border">
                  <button
                    onClick={() => setQty(it.id, it.qty - 1)}
                    className="h-8 w-8 inline-flex items-center justify-center hover:bg-accent rounded-r-full"
                    aria-label="تقليل"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-8 text-center text-sm font-bold">{it.qty}</span>
                  <button
                    onClick={() => setQty(it.id, it.qty + 1)}
                    className="h-8 w-8 inline-flex items-center justify-center hover:bg-accent rounded-l-full"
                    aria-label="زيادة"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
                <button
                  onClick={() => remove(it.id)}
                  className="text-destructive hover:bg-destructive/10 h-9 w-9 inline-flex items-center justify-center rounded-full"
                  aria-label="حذف"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
          <button onClick={clear} className="text-sm text-muted-foreground hover:text-destructive">
            تفريغ السلة
          </button>
        </div>

        <aside className="rounded-3xl border bg-card p-6 h-fit shadow-card space-y-4 lg:sticky lg:top-24">
          <h2 className="text-xl font-bold">إتمام الطلب عبر واتساب</h2>
          <Inp
            label="الاسم *"
            value={customer.name}
            onChange={(v) => setCustomer({ ...customer, name: v })}
          />
          <Inp
            label="رقم الهاتف *"
            value={customer.phone}
            onChange={(v) => setCustomer({ ...customer, phone: v })}
            type="tel"
          />
          <Inp
            label="العنوان"
            value={customer.address}
            maxLength={150}
            onChange={(v) => setCustomer({ ...customer, address: v })}
          />
          <label className="block">
            <span className="text-sm font-semibold mb-1.5 block">ملاحظات</span>
            <textarea
              value={customer.notes}
              maxLength={300}
              onChange={(e) => setCustomer({ ...customer, notes: e.target.value })}
              rows={2}
              className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>
          <div className="flex justify-between border-t pt-4 text-lg font-bold">
            <span>الإجمالي</span>
            <span className="text-primary">{formatPrice(total)}</span>
          </div>
          <button
            onClick={checkout}
            disabled={submitting}
            className="w-full rounded-full bg-[#25D366] px-6 py-3.5 font-bold text-white shadow-elegant transition-smooth hover:scale-[1.02] disabled:opacity-60 disabled:cursor-wait"
          >
            {submitting ? "جاري التحويل…" : "تأكيد الطلب عبر واتساب"}
          </button>
          <p className="text-xs text-muted-foreground text-center">
            سنتواصل معك خلال دقائق لتأكيد الطلب وترتيب التوصيل
          </p>
        </aside>
      </div>
    </div>
  );
}
function Inp({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  maxLength?: number;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold mb-1.5 block">{label}</span>
      <input
        type={type}
        value={value}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}
