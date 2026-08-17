import { Link } from "@tanstack/react-router";
import { ShieldCheck, Truck, Lock, CreditCard } from "lucide-react";

const stats = [
  { value: "50,000+", label: "عميل يثق بنا" },
  { value: "27", label: "محافظة نغطيها" },
  { value: "87", label: "منتج أصلي" },
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

        {/* 📦 بطاقة الأمان وسرية التغليف — تبديد مخاوف الاستلام */}
        <div className="mt-6 mb-6 rounded-2xl border border-violet-100 bg-violet-50/40 p-5 md:p-6 text-right shadow-sm">
          <div className="flex flex-col md:flex-row items-center gap-5">
            <div className="flex-1">
              <h3 className="text-lg md:text-xl font-black text-violet-950 mb-2 flex items-center gap-2">
                <Lock className="h-5 w-5 text-violet-600 shrink-0" />
                كيف نضمن لك سرية وخصوصية الاستلام تماماً؟
              </h3>
              <ul className="space-y-2.5 text-xs md:text-sm leading-6 text-violet-900/80">
                <li className="flex items-start gap-1.5">
                  <span className="text-violet-600 font-bold">✓</span>
                  <span>
                    <strong>كرتونة بنية مغلقة تماماً:</strong> يتم تغليف طلبك بالكامل داخل صندوق
                    كرتوني بني سادة أو كيس بولي أسود متين ومحكم الغلق.
                  </span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-violet-600 font-bold">✓</span>
                  <span>
                    <strong>بدون أي اسم للمنتج:</strong> لا يكتب اسم المنتج إطلاقاً على الطرد من
                    الخارج ولا يتم الإفصاح عن طبيعته بوليصة الشحن.
                  </span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-violet-600 font-bold">✓</span>
                  <span>
                    <strong>اسم المرسل "شركة اليسر":</strong> اسم المرسل على البوليصة يكون عاماً
                    (شركة اليسر) لضمان الخصوصية التامة مع المندوب.
                  </span>
                </li>
              </ul>
            </div>

            {/* تمثيل بصري للطرد السري */}
            <div className="w-full md:w-56 shrink-0 flex flex-col items-center justify-center rounded-xl border border-violet-100 bg-white p-4 text-center">
              <div className="relative mb-2 flex h-20 w-20 items-center justify-center rounded-full bg-violet-50 text-violet-700 animate-float-slow">
                <span className="text-4xl">📦</span>
                <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-800 text-white text-[10px] font-black shadow-sm">
                  100%
                </div>
              </div>
              <div className="text-xs font-black text-violet-950">شكل الطرد عند الاستلام</div>
              <div className="mt-1 text-[10px] font-medium text-muted-foreground leading-snug">
                صندوق سادة مغلق تماماً بدون أي علامات تشير لمحتواه
              </div>
            </div>
          </div>
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
