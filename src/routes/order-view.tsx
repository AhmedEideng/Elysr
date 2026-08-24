import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck, Lock, AlertTriangle, Package } from "lucide-react";

export const Route = createFileRoute("/order-view")({
  head: () => ({
    meta: [
      { title: "عرض الطلب المشفر - اليسر ميديكال" },
      { name: "robots", content: "noindex,nofollow,noarchive,nosnippet,noimageindex" },
    ],
  }),
  component: OrderViewPage,
  validateSearch: (search: Record<string, unknown>) => ({
    d: (search.d as string) || "",
  }),
});

interface DecryptedOrder {
  orderId: string;
  customerName: string;
  customerPhone: string;
  governorate: string;
  address: string;
  notes: string;
  items: { id: string; name: string; qty: number; price: number }[];
  total: number;
  timestamp: string;
}

function OrderViewPage() {
  const { d } = Route.useSearch();
  const [data, setData] = useState<DecryptedOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!d) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError("رابط غير صالح");
      setLoading(false);
      return;
    }

    const decrypt = async () => {
      try {
        const res = await fetch("/api/decrypt-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ blob: d }),
        });
        const result = await res.json();
        if (!res.ok || !result.data) {
          throw new Error(result.error || "فشل فك التشفير");
        }
        setData(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "خطأ في فك التشفير");
      } finally {
        setLoading(false);
      }
    };

    void decrypt();
  }, [d]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <p className="mt-4 text-muted-foreground">جاري فك تشفير بيانات الطلب بأمان...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto px-4 py-20 text-center max-w-lg">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-4">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold">رابط غير صالح أو منتهي</h1>
        <p className="mt-2 text-muted-foreground">{error || "تعذر عرض البيانات"}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          الروابط المشفرة تنتهي بعد 24 ساعة لحماية خصوصية العملاء.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex rounded-full bg-primary px-6 py-3 text-white font-bold"
        >
          العودة للرئيسية
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-4 mb-6 flex items-start gap-3">
        <ShieldCheck className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
        <div className="text-sm leading-6">
          <p className="font-bold text-emerald-900">تم فك التشفير بنجاح - اتصال آمن</p>
          <p className="text-emerald-800/80 text-xs">
            هذه البيانات مشفرة بـ AES-256-GCM ومحمية بـ 24 ساعة انتهاء. لا تشارك هذا الرابط.
          </p>
        </div>
      </div>

      <div className="rounded-[2rem] border bg-card p-6 shadow-card space-y-5">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-black">تفاصيل الطلب {data.orderId}</h1>
        </div>

        <div className="grid gap-4">
          <div className="rounded-2xl bg-muted/50 p-4 space-y-2">
            <h3 className="font-bold flex items-center gap-2">
              <Lock className="h-4 w-4" /> بيانات العميل (مشفرة في الرابط)
            </h3>
            <div className="text-sm space-y-1">
              <div>
                <span className="text-muted-foreground">الاسم:</span>{" "}
                <span className="font-bold">{data.customerName}</span>
              </div>
              <div>
                <span className="text-muted-foreground">الهاتف:</span>{" "}
                <span className="font-bold" dir="ltr">
                  {data.customerPhone}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">المحافظة:</span>{" "}
                <span className="font-bold">{data.governorate}</span>
              </div>
              <div>
                <span className="text-muted-foreground">العنوان:</span>{" "}
                <span className="font-bold">{data.address}</span>
              </div>
              {data.notes && (
                <div>
                  <span className="text-muted-foreground">ملاحظات:</span> {data.notes}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-muted/50 p-4">
            <h3 className="font-bold mb-2">المنتجات</h3>
            <ul className="space-y-2 text-sm">
              {data.items?.map((it, i) => (
                <li key={i} className="flex justify-between">
                  <span>
                    {it.name} × {it.qty}
                  </span>
                  <span className="font-bold">{it.price * it.qty} ج.م</span>
                </li>
              ))}
            </ul>
            <div className="border-t mt-3 pt-3 flex justify-between font-black text-primary">
              <span>الإجمالي</span>
              <span>{data.total} ج.م</span>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-center text-muted-foreground">
          تم إنشاء هذا الرابط المشفر في {new Date(data.timestamp).toLocaleString("ar-EG")} وينتهي
          بعد 24 ساعة.
        </p>
      </div>
    </div>
  );
}
