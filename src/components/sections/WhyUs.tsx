import { Link } from "@tanstack/react-router";
import { ShieldCheck, Truck, Lock, CreditCard } from "lucide-react";
import { products } from "@/data/products";

// العدد ديناميكي من الكتالوج حتى لا يبتعد عن الحقيقة عند إضافة/حذف منتجات
// (كان "87" hardcoded بينما الكتالوج 82 — أرقام قديمة كانت تظهر في الهوم)
const stats = [
  { value: "50,000+", label: "عميل يثق بنا" },
  { value: "27", label: "محافظة نغطيها" },
  { value: String(products.length), label: "منتج أصلي" },
  { value: "10+", label: "سنوات خبرة" },
];

const features = [
  {
    icon: ShieldCheck,
    title: "أصلي 100%",
    desc: "مستورد من المصنع مباشرة",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    icon: Truck,
    title: "شحن سري",
    desc: "تغليف محايد لكل المحافظات",
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    icon: Lock,
    title: "خصوصية كاملة",
    desc: "محدش يعرف المحتوى غيرك",
    color: "text-violet-600",
    bg: "bg-violet-50",
  },
  {
    icon: CreditCard,
    title: "دفع عند الاستلام",
    desc: "ادفع كاش — صفر مخاطر",
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
];

export function WhyUs() {
  return (
    <section className="py-5 md:py-6">
      <div className="container mx-auto px-4">
        {/* Stats Bar — أرقام ملفتة */}
        <div className="grid grid-cols-4 gap-2 sm:gap-4 rounded-2xl bg-gradient-brand p-4 sm:p-5 text-primary-foreground mb-6">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-xl sm:text-3xl font-black leading-none">{s.value}</div>
              <div className="text-[10px] sm:text-xs font-medium opacity-80 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Features — 4 أيقونات مدمجة في صف واحد */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mb-5">
          {features.map((f) => (
            <div
              key={f.title}
              className="flex items-center gap-3 rounded-xl border bg-white p-3 sm:p-3.5 transition-all hover:shadow-sm hover:border-primary/20"
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${f.bg}`}
              >
                <f.icon className={`h-5 w-5 ${f.color}`} />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold leading-tight">{f.title}</div>
                <div className="text-[11px] text-muted-foreground leading-snug">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA مدمج */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 text-center">
          <Link
            to="/products/men"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground transition hover:bg-primary/90 hover:scale-[1.02]"
          >
            تسوّق الآن
          </Link>
          <a
            href="https://wa.me/201098088206?text=%D8%A3%D8%B1%D9%8A%D8%AF%20%D8%A7%D9%84%D8%A7%D8%B3%D8%AA%D9%81%D8%B3%D8%A7%D8%B1"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-green-600 px-6 py-2.5 text-sm font-bold text-green-700 transition hover:bg-green-50 hover:scale-[1.02]"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.79 23.444l4.553-1.46A11.93 11.93 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75c-2.15 0-4.148-.675-5.79-1.823l-.415-.268-2.694.864.84-2.607-.29-.435A9.723 9.723 0 012.25 12c0-5.385 4.365-9.75 9.75-9.75S21.75 6.615 21.75 12s-4.365 9.75-9.75 9.75z" />
            </svg>
            تواصل معانا
          </a>
        </div>
      </div>
    </section>
  );
}
