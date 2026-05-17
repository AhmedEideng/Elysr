import { Link } from "@tanstack/react-router";
import { waLink } from "@/lib/whatsapp";

export function WholesaleBanner() {
  return (
    <section className="relative overflow-hidden py-8 md:py-12 bg-gradient-brand text-primary-foreground">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center space-y-5">
          <h2 className="text-4xl md:text-6xl font-extrabold leading-tight">
            للتجار وطلبات الجملة
          </h2>
          <p className="text-lg md:text-xl leading-relaxed text-primary-foreground/90">
            هل أنت صاحب صيدلية أو متجر؟ احصل على أفضل أسعار الجملة مع دعم تسويقي كامل ودعم مستمر.
          </p>
          <div className="flex flex-col gap-3 max-w-md mx-auto pt-2">
            <Link
              to="/wholesale"
              className="inline-flex items-center justify-center rounded-2xl bg-primary-foreground/20 backdrop-blur border border-primary-foreground/30 px-7 py-4 text-base font-bold text-primary-foreground transition-smooth hover:bg-primary-foreground/30"
            >
              اعرف المزيد
            </Link>
            <a
              href={waLink("مرحباً، أرغب في الاستفسار عن أسعار الجملة لتجار اليسر ميديكال")}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-2xl border-2 border-primary-foreground/80 px-7 py-4 text-base font-bold text-primary-foreground transition-smooth hover:bg-primary-foreground/10"
            >
              تواصل معنا الآن
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
