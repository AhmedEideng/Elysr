import { ShieldCheck, Truck, Headphones, Award, Lock, Globe } from "lucide-react";

const items = [
  {
    icon: ShieldCheck,
    title: "منتجات أصلية 100%",
    desc: "مستوردة مباشرة من المصانع العالمية بشهادات معتمدة.",
  },
  {
    icon: Truck,
    title: "شحن سريع وآمن",
    desc: "توصيل خلال 24-72 ساعة لجميع المحافظات بتغليف سري.",
  },
  {
    icon: Lock,
    title: "خصوصية تامة",
    desc: "تغليف محايد لا يكشف هوية المنتج، وحفاظ كامل على بياناتك.",
  },
  {
    icon: Headphones,
    title: "دعم 24/7",
    desc: "فريق طبي مدرّب جاهز للإجابة على استفساراتك في أي وقت.",
  },
  { icon: Award, title: "أسعار الاستيراد", desc: "أفضل الأسعار في السوق المصري بدون وسطاء." },
  { icon: Globe, title: "خبرة عالمية", desc: "شراكات مع كبار الموردين في أوروبا وآسيا وأمريكا." },
];

export function WhyUs() {
  return (
    <section className="py-8 md:py-10">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <span className="inline-block rounded-full bg-accent px-4 py-1 text-xs font-bold text-primary mb-3">
            لماذا نحن؟
          </span>
          <h2 className="text-3xl md:text-4xl font-bold">لماذا يختارنا النخبة</h2>
          <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
            نحن لا نبيع منتجات فقط، بل نقدم تجربة طبية متكاملة بمعايير عالمية
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => (
            <div
              key={it.title}
              className="group rounded-2xl border bg-card p-6 transition-smooth hover:-translate-y-1 hover:shadow-card hover:border-primary/30"
            >
              <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-brand text-primary-foreground transition-smooth group-hover:scale-110 group-hover:shadow-glow">
                <it.icon className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-bold mb-2">{it.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{it.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
