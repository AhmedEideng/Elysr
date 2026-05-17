import { Link } from "@tanstack/react-router";
import { MessageCircle, Heart, ShieldCheck, Truck } from "lucide-react";
import logo from "@/assets/logo.webp";
import { COMPANY, waLink } from "@/lib/whatsapp";

const shopLinks = [
  { to: "/products/men", label: "منتجات الرجال" },
  { to: "/products/women", label: "منتجات النساء" },
  { to: "/products/devices", label: "أجهزة وأدوات" },
  { to: "/wholesale", label: "الجملة والتجار" },
] as const;

const aboutLinks = [
  { to: "/about", label: "من نحن" },
  { to: "/education", label: "مكتبة التوعية" },
  { to: "/contact", label: "تواصل معنا" },
] as const;

const policyLinks = [
  { to: "/shipping", label: "الشحن والتوصيل" },
  { to: "/returns", label: "الاستبدال والاسترجاع" },
  { to: "/privacy", label: "سياسة الخصوصية" },
  { to: "/terms", label: "الشروط والأحكام" },
] as const;

export function Footer() {
  return (
    <footer className="mt-12 border-t bg-background">
      <div className="container mx-auto px-4 py-10 md:py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {/* العمود الأول: الشعار والنبذة */}
          <div className="space-y-5 lg:col-span-1">
            <Link to="/" className="flex items-center gap-3">
              <img src={logo} alt="Elysr" className="h-12 w-12 shrink-0 object-contain" />
              <div>
                <div className="font-bold text-lg leading-none">{COMPANY.name}</div>
                <div className="text-xs font-semibold tracking-wider text-primary mt-1">
                  {COMPANY.nameEn}
                </div>
              </div>
            </Link>
            <p className="text-sm leading-relaxed text-muted-foreground pr-1">
              متجرك الموثوق للمنتجات الطبية والصحية في مصر. منتجات مستوردة أصلية بأسعار تنافسية.
            </p>
            <a
              href={waLink("مرحباً، أرغب في التواصل مع اليسر ميديكال")}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-accent/50 px-4 py-2 text-sm font-semibold text-foreground transition-smooth hover:bg-[#25D366] hover:text-white"
            >
              <MessageCircle className="h-4 w-4" /> الدعم الفني (واتساب)
            </a>
          </div>

          {/* العمود الثاني: التسوق */}
          <div>
            <h3 className="mb-5 font-bold text-base">التسوق</h3>
            <ul className="space-y-3">
              {shopLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm text-muted-foreground transition-smooth hover:text-primary hover:underline underline-offset-4"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* العمود الثالث: الشركة */}
          <div>
            <h3 className="mb-5 font-bold text-base">الشركة</h3>
            <ul className="space-y-3">
              {aboutLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm text-muted-foreground transition-smooth hover:text-primary hover:underline underline-offset-4"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* العمود الرابع: السياسات والضمانات */}
          <div>
            <h3 className="mb-5 font-bold text-base">خدمة العملاء</h3>
            <ul className="space-y-3 mb-6">
              {policyLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm text-muted-foreground transition-smooth hover:text-primary hover:underline underline-offset-4"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>

            {/* شارات الضمان أسفل الروابط */}
            <div className="flex gap-4">
              <div className="flex flex-col items-center justify-center text-muted-foreground">
                <Truck className="h-5 w-5 mb-1" />
                <span className="text-[10px]">شحن لجميع المحافظات</span>
              </div>
              <div className="flex flex-col items-center justify-center text-muted-foreground">
                <ShieldCheck className="h-5 w-5 mb-1" />
                <span className="text-[10px]">سرية تامة</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t bg-muted/30">
        <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <p>
            © {new Date().getFullYear()} {COMPANY.nameEn}. جميع الحقوق محفوظة.
          </p>
        </div>
      </div>
    </footer>
  );
}
