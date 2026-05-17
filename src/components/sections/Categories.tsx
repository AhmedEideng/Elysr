import { Link } from "@tanstack/react-router";

const cats = [
  {
    to: "/products/men",
    title: "منتجات الرجال",
    desc: "تستوستيرون، تأخير، تكبير، فيتامينات",
    emoji: "👨",
    grad: "from-primary to-primary-glow",
  },
  {
    to: "/products/women",
    title: "منتجات النساء",
    desc: "إثارة، توازن هرموني، عناية، جمال",
    emoji: "👩",
    grad: "from-primary-glow to-primary",
  },
  {
    to: "/education",
    title: "التوعية الجنسية",
    desc: "مقالات علمية موثوقة بإشراف مختصين",
    emoji: "📚",
    grad: "from-primary to-primary-glow",
  },
] as const;

export function Categories() {
  return (
    <section className="py-16 md:py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold">تصفّح حسب الفئة</h2>
          <p className="text-muted-foreground mt-2">اختر القسم الأنسب لاحتياجك</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {cats.map((c) => (
            <Link
              key={c.to}
              to={c.to}
              className={`group relative overflow-hidden rounded-3xl bg-gradient-to-br ${c.grad} p-8 text-primary-foreground shadow-card transition-smooth hover:-translate-y-2 hover:shadow-elegant`}
            >
              <div className="text-7xl mb-4 transition-smooth group-hover:scale-110">{c.emoji}</div>
              <h3 className="text-2xl font-bold mb-2">{c.title}</h3>
              <p className="opacity-90 text-sm">{c.desc}</p>
              <div className="mt-4 inline-flex items-center gap-1 text-sm font-semibold">
                تسوق الآن <span className="transition-smooth group-hover:-translate-x-1">←</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
