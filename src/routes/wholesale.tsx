import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Building2,
  Package,
  TrendingUp,
  Truck,
  Phone,
  CheckCircle2,
  ChevronDown,
  MapPin,
  MessageCircle,
  Loader2,
} from "lucide-react";
import { waLink } from "@/lib/whatsapp";
import { isValidEgyptianPhone, sanitizeInput } from "@/lib/utils";
import { EGYPT_GOVERNORATES } from "@/lib/governorates";
import { submitToGoogleSheets, logOrderLocally } from "@/lib/governorates";
import { toast } from "sonner";

export const Route = createFileRoute("/wholesale")({
  head: () => ({
    meta: [
      { title: "الجملة والتجار — اليسر ميديكال" },
      { name: "description", content: "أسعار جملة حصرية لتجار التجزئة والصيدليات والمراكز الطبية." },
    ],
  }),
  component: WholesalePage,
});

type WholesaleMethod = "whatsapp" | "direct";

function WholesalePage() {
  const [form, setForm] = useState({ name: "", business: "", phone: "", governorate: "", city: "", message: "" });
  const [method, setMethod] = useState<WholesaleMethod>("whatsapp");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.governorate) {
      toast.error("الاسم ورقم الهاتف والمحافظة مطلوبون");
      return;
    }
    if (!isValidEgyptianPhone(form.phone)) {
      toast.error("برجاء إدخال رقم هاتف مصري صحيح (11 رقم يبدأ بـ 01)");
      return;
    }
    setSubmitting(true);
    const sn = sanitizeInput(form.name, 100);
    const sb = sanitizeInput(form.business, 100);
    const sp = sanitizeInput(form.phone, 15);
    const sg = sanitizeInput(form.governorate, 50);
    const sc = sanitizeInput(form.city, 100);
    const sm = sanitizeInput(form.message, 500);
    const orderId = `#EL-WS-${Date.now().toString(36).toUpperCase()}`;

    const sheetResult = await submitToGoogleSheets({
      orderId, customerName: sn, customerPhone: sp, governorate: sg, address: sc,
      notes: `النشاط: ${sb}\n${sm}`,
      items: [], total: 0, orderType: "wholesale",
      paymentMethod: method === "whatsapp" ? "واتساب" : "طلب مباشر",
    });
    if (!sheetResult.success) {
      logOrderLocally({ orderId, type: "wholesale", name: sn, business: sb, phone: sp, governorate: sg, city: sc, message: sm });
    }
    if (method === "whatsapp") {
      const msg = `🏢 *طلب جملة جديد*\n
👤 الاسم: ${sn}
🏬 النشاط: ${sb}
📞 الهاتف: ${sp}
🗺️ المحافظة: ${sg}
📍 المدينة: ${sc}
📝 ${sm}`;
      window.open(waLink(msg), "_blank", "noopener,noreferrer");
      toast.success("تم فتح واتساب ✅ — أرسل الرسالة لإتمام الطلب");
    } else {
      toast.success("✅ تم استلام طلبك بنجاح! سنتواصل معك خلال 24 ساعة.", {
        duration: 5000, icon: <CheckCircle2 className="h-5 w-5 text-success" />,
      });
    }
    setSubmitting(false);
    if (method === "direct") setForm({ name: "", business: "", phone: "", governorate: "", city: "", message: "" });
  };

  return (<>
    <section className="bg-foreground text-background relative overflow-hidden py-16 md:py-20">
      <div className="absolute inset-0 -z-10 opacity-30">
        <div className="absolute top-10 right-20 h-72 w-72 rounded-full bg-primary-glow blur-3xl" />
        <div className="absolute bottom-10 left-20 h-72 w-72 rounded-full bg-primary blur-3xl" />
      </div>
      <div className="container mx-auto px-4 text-center max-w-3xl">
        <span className="inline-block rounded-full bg-primary-glow/20 px-4 py-1.5 text-xs font-bold text-primary-glow mb-4">قسم التجار</span>
        <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold leading-tight">الجملة والتوزيع<br /><span className="text-gradient">شريكك للنجاح</span></h1>
        <p className="mt-5 text-background/70 text-base md:text-lg">انضم لشبكة موزعينا واحصل على أسعار وحوافز خاصة، تسهيلات في الدفع، ودعم لوجستي متكامل.</p>
      </div>
    </section>

    <section className="container mx-auto px-4 py-12 md:py-16">
      <div className="grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-4 mb-12 md:mb-16">
        {[
          { icon: TrendingUp, t: "هامش ربح عالي", d: "حتى 30% هامش ربح على المنتجات الأكثر مبيعاً" },
          { icon: Package, t: "كميات مرنة", d: "ابدأ من 50 قطعة بدون التزام شهري" },
          { icon: Truck, t: "شحن للمحافظات", d: "شحن مجاني فوق 5000 ج.م لجميع المحافظات" },
          { icon: Building2, t: "مدير حساب VIP", d: "مدير مخصص لمتابعة طلباتك ودعمك" },
        ].map((f) => (
          <div key={f.t} className="rounded-2xl border bg-card p-4 sm:p-6">
            <span className="inline-flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-gradient-brand text-primary-foreground mb-3 sm:mb-4"><f.icon className="h-5 w-5 sm:h-6 sm:w-6" /></span>
            <h3 className="font-bold mb-1 text-sm sm:text-base">{f.t}</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">{f.d}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-10 lg:grid-cols-2">
        <div className="space-y-4">
          <h2 className="text-2xl sm:text-3xl font-bold">من يستفيد من قسم الجملة؟</h2>
          <ul className="space-y-3">
            {["الصيدليات والصيادلة","المراكز الطبية والعيادات","متاجر التجزئة الإلكترونية","موزعو المنتجات الصحية","صالات الجيم ومراكز اللياقة"].map((x) => (
              <li key={x} className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-success shrink-0" /><span className="text-sm sm:text-base">{x}</span></li>
            ))}
          </ul>
          <div className="rounded-2xl bg-gradient-soft border p-5 sm:p-6">
            <h3 className="font-bold mb-2">📞 تواصل مباشر</h3>
            <p className="text-sm text-muted-foreground mb-3">تواصل مع فريق المبيعات للجملة عبر واتساب</p>
            <a href={waLink("مرحباً، أرغب في الاستفسار عن أسعار الجملة")} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-3 text-sm font-bold text-white"><Phone className="h-4 w-4" /> واتساب المبيعات</a>
          </div>
        </div>

        <form onSubmit={submit} className="rounded-3xl border bg-card p-5 sm:p-7 shadow-card space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold">طلب فتح حساب جملة</h2>
          <p className="text-sm text-muted-foreground">سنتواصل معك خلال 24 ساعة</p>
          <div className="grid grid-cols-2 gap-2 p-1.5 bg-muted rounded-2xl">
            <button type="button" onClick={() => setMethod("whatsapp")} className={`flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all duration-300 ${method === "whatsapp" ? "bg-background shadow-md text-[#25D366] scale-105" : "text-muted-foreground hover:bg-background/50"}`}><MessageCircle className="h-4 w-4" /> واتساب</button>
            <button type="button" onClick={() => setMethod("direct")} className={`flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all duration-300 ${method === "direct" ? "bg-background shadow-md text-primary scale-105" : "text-muted-foreground hover:bg-background/50"}`}><Package className="h-4 w-4" /> طلب مباشر</button>
          </div>
          <Input label="الاسم بالكامل *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <Input label="اسم النشاط / الصيدلية" value={form.business} maxLength={50} onChange={(v) => setForm({ ...form, business: v })} />
          <Input label="رقم الهاتف *" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} type="tel" />
          <label className="block">
            <span className="text-sm font-semibold mb-1.5 block"><MapPin className="h-3.5 w-3.5 inline-block mr-1" />المحافظة *</span>
            <div className="relative">
              <select value={form.governorate} onChange={(e) => setForm({ ...form, governorate: e.target.value })} className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all appearance-none cursor-pointer" required>
                <option value="" disabled>اختر المحافظة...</option>
                {EGYPT_GOVERNORATES.map((gov) => (<option key={gov} value={gov}>{gov}</option>))}
              </select>
              <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
          </label>
          <Input label="المدينة / المنطقة" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
          <label className="block">
            <span className="text-sm font-semibold mb-1.5 block">ملاحظات</span>
            <textarea value={form.message} maxLength={500} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={3} className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary resize-none" />
          </label>
          <button type="submit" disabled={submitting} className={`w-full rounded-full px-6 py-3.5 font-bold text-white shadow-elegant transition-smooth hover:scale-[1.02] disabled:opacity-60 flex items-center justify-center gap-2 ${method === "whatsapp" ? "bg-[#25D366] hover:bg-[#1ebd57]" : "bg-gradient-brand"}`}>
            {submitting ? (<><Loader2 className="h-5 w-5 animate-spin" />جاري الإرسال...</>) : method === "whatsapp" ? (<><MessageCircle className="h-5 w-5" />إرسال عبر واتساب</>) : (<><CheckCircle2 className="h-5 w-5" />إرسال الطلب مباشرة</>)}
          </button>
        </form>
      </div>
    </section>
  </>);
}

function Input({ label, value, onChange, type = "text", maxLength }: { label: string; value: string; onChange: (v: string) => void; type?: string; maxLength?: number }) {
  return (<label className="block"><span className="text-sm font-semibold mb-1.5 block">{label}</span><input type={type} value={value} maxLength={maxLength} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all" /></label>);
}
