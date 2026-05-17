import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Building2, Package, TrendingUp, Truck, Phone, CheckCircle2 } from "lucide-react";
import { waLink } from "@/lib/whatsapp";
import { isValidEgyptianPhone } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/wholesale")({
  head: () => ({
    meta: [
      { title: "الجملة والتجار — اليسر ميديكال" },
      {
        name: "description",
        content: "أسعار جملة حصرية لتجار التجزئة والصيدليات والمراكز الطبية.",
      },
    ],
  }),
  component: WholesalePage,
});

function WholesalePage() {
  const [form, setForm] = useState({ name: "", business: "", phone: "", city: "", message: "" });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone) {
      toast.error("الاسم ورقم الهاتف مطلوبان");
      return;
    }
    if (!isValidEgyptianPhone(form.phone)) {
      toast.error("برجاء إدخال رقم هاتف مصري صحيح (11 رقم يبدأ بـ 01)");
      return;
    }
    const msg = `🏢 *طلب جملة جديد*

👤 الاسم: ${form.name}
🏬 النشاط: ${form.business}
📞 الهاتف: ${form.phone}
📍 المدينة: ${form.city}
📝 ${form.message}`;
    window.open(waLink(msg), "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <section className="bg-foreground text-background relative overflow-hidden py-20">
        <div className="absolute inset-0 -z-10 opacity-30">
          <div className="absolute top-10 right-20 h-72 w-72 rounded-full bg-primary-glow blur-3xl" />
          <div className="absolute bottom-10 left-20 h-72 w-72 rounded-full bg-primary blur-3xl" />
        </div>
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <span className="inline-block rounded-full bg-primary-glow/20 px-4 py-1.5 text-xs font-bold text-primary-glow mb-4">
            قسم التجار
          </span>
          <h1 className="text-4xl md:text-6xl font-bold leading-tight">
            الجملة والتوزيع
            <br />
            <span className="text-gradient">شريكك للنجاح</span>
          </h1>
          <p className="mt-5 text-background/70 text-lg">
            انضم لشبكة موزعينا واحصل على أسعار وحوافز خاصة، تسهيلات في الدفع، ودعم لوجستي متكامل.
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-16">
          {[
            {
              icon: TrendingUp,
              t: "هامش ربح عالي",
              d: "حتى 30% هامش ربح على المنتجات الأكثر مبيعاً",
            },
            { icon: Package, t: "كميات مرنة", d: "ابدأ من 50 قطعة بدون التزام شهري" },
            { icon: Truck, t: "شحن للمحافظات", d: "شحن مجاني فوق 5000 ج.م لجميع المحافظات" },
            { icon: Building2, t: "مدير حساب VIP", d: "مدير مخصص لمتابعة طلباتك ودعمك" },
          ].map((f) => (
            <div key={f.t} className="rounded-2xl border bg-card p-6">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-brand text-primary-foreground mb-4">
                <f.icon className="h-6 w-6" />
              </span>
              <h3 className="font-bold mb-1">{f.t}</h3>
              <p className="text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-10 lg:grid-cols-2">
          <div className="space-y-4">
            <h2 className="text-3xl font-bold">من يستفيد من قسم الجملة؟</h2>
            <ul className="space-y-3">
              {[
                "الصيدليات والصيادلة",
                "المراكز الطبية والعيادات",
                "متاجر التجزئة الإلكترونية",
                "موزعو المنتجات الصحية",
                "صالات الجيم ومراكز اللياقة",
              ].map((x) => (
                <li key={x} className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  <span>{x}</span>
                </li>
              ))}
            </ul>
            <div className="rounded-2xl bg-gradient-soft border p-6">
              <h3 className="font-bold mb-2">📞 تواصل مباشر</h3>
              <p className="text-sm text-muted-foreground mb-3">
                تواصل مع فريق المبيعات للجملة عبر واتساب
              </p>
              <a
                href={waLink("مرحباً، أرغب في الاستفسار عن أسعار الجملة")}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-3 text-sm font-bold text-white"
              >
                <Phone className="h-4 w-4" /> واتساب المبيعات
              </a>
            </div>
          </div>

          <form onSubmit={submit} className="rounded-3xl border bg-card p-7 shadow-card space-y-4">
            <h2 className="text-2xl font-bold">طلب فتح حساب جملة</h2>
            <p className="text-sm text-muted-foreground">سنتواصل معك خلال 24 ساعة</p>
            <Input
              label="الاسم بالكامل *"
              value={form.name}
              onChange={(v) => setForm({ ...form, name: v })}
            />
            <Input
              label="اسم النشاط / الصيدلية"
              value={form.business}
              maxLength={50}
              onChange={(v) => setForm({ ...form, business: v })}
            />
            <Input
              label="رقم الهاتف *"
              value={form.phone}
              onChange={(v) => setForm({ ...form, phone: v })}
              type="tel"
            />
            <Input
              label="المدينة / المحافظة"
              value={form.city}
              onChange={(v) => setForm({ ...form, city: v })}
            />
            <label className="block">
              <span className="text-sm font-semibold mb-1.5 block">ملاحظات</span>
              <textarea
                value={form.message}
                maxLength={500}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                rows={3}
                className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
              />
            </label>
            <button
              type="submit"
              className="w-full rounded-full bg-gradient-brand px-6 py-3.5 font-bold text-primary-foreground shadow-elegant transition-smooth hover:scale-[1.02]"
            >
              إرسال الطلب
            </button>
          </form>
        </div>
      </section>
    </>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  maxLength,
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
        className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}
