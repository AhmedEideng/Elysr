import { Link } from "@tanstack/react-router";
import { Zap, Clock, Activity, Heart, ShieldCheck } from "lucide-react";

const concerns = [
  {
    label: "علاجات التأخير",
    icon: Clock,
    color: "bg-blue-500",
    link: "/products/men", // يمكن تحسينها لاحقاً لفلترة البحث
  },
  {
    label: "طاقة وحيوية",
    icon: Zap,
    color: "bg-amber-500",
    link: "/products/men",
  },
  {
    label: "أجهزة طبية",
    icon: Activity,
    color: "bg-emerald-500",
    link: "/products/devices",
  },
  {
    label: "توازن هرموني",
    icon: Heart,
    color: "bg-rose-500",
    link: "/products/women",
  },
  {
    label: "صحة المفاصل",
    icon: ShieldCheck,
    color: "bg-indigo-500",
    link: "/products/devices",
  },
];

export function ShopByConcern() {
  return (
    <section className="py-12 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold">تسوق حسب الاحتياج</h2>
          <p className="text-muted-foreground mt-2">حلول مخصصة لأكثر المشاكل شيوعاً</p>
        </div>
        <div className="flex flex-wrap justify-center gap-6 md:gap-10">
          {concerns.map((item) => (
            <Link
              key={item.label}
              to={item.link}
              className="group flex flex-col items-center gap-3 transition-smooth"
            >
              <div
                className={`h-16 w-16 md:h-20 md:w-16 flex items-center justify-center rounded-2xl ${item.color} text-white shadow-lg transition-smooth group-hover:scale-110 group-hover:shadow-xl`}
              >
                <item.icon className="h-8 w-8" />
              </div>
              <span className="text-sm font-bold text-center group-hover:text-primary transition-colors">
                {item.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
