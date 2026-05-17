import { Link } from "@tanstack/react-router";
import { waLink } from "@/lib/whatsapp";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-soft">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 right-10 h-72 w-72 rounded-full bg-primary-glow/30 blur-3xl" />
        <div className="absolute bottom-10 left-20 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
      </div>
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-3xl mx-auto text-center space-y-5">
          <div className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-2 text-sm font-bold text-primary-foreground shadow-elegant">
            النخبة في مصر
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold leading-[1.75]">
            رقم واحد في مجال
            <br />
            <span className="text-gradient inline-block py-[0.12em] leading-[1.75]">
              الصحة الزوجية
            </span>
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            اضمن الفاعلية والأمان مع مكملاتنا الطبية المستوردة. جودة تفوق التوقعات، أسعار المصنع
            المباشرة، شحن سريع وخاص جداً. ثقتك هي غايتنا.
          </p>
          <div className="flex flex-col gap-3 max-w-md mx-auto pt-2">
            <Link
              to="/products/men"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-brand px-7 py-4 text-base font-bold text-primary-foreground shadow-elegant transition-smooth hover:scale-[1.02] hover:shadow-glow"
            >
              🛒 تسوّق بخصوصية تامة <span>←</span>
            </Link>
            <a
              href={waLink("مرحباً، أرغب في الاستفسار عن منتجاتكم")}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-2xl border-2 border-primary bg-background px-7 py-4 text-base font-bold text-primary transition-smooth hover:bg-accent"
            >
              تواصل عبر واتساب
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
