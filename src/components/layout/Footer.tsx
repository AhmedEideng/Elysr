import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  MessageCircle,
  Instagram,
  Facebook,
  Twitter,
  BookOpen,
  Mail,
  MapPin,
} from "lucide-react";
import logo from "@/assets/logo.webp";
import { COMPANY, waLink } from "@/lib/whatsapp";

const shopLinks = [
  { to: "/products/men", label: "منتجات الرجال" },
  { to: "/products/women", label: "منتجات النساء" },
  { to: "/products/devices", label: "أجهزة وأدوات طبية" },
  { to: "/wholesale", label: "قسم الجملة والتجار" },
] as const;

const libraryLinks = [
  {
    to: "/education/$slug",
    params: { slug: "sexual-health-basics" },
    label: "أساسيات الصحة العامة",
  },
  { to: "/education/$slug", params: { slug: "nutrition-libido" }, label: "أطعمة تعزز الأداء" },
  { to: "/education/$slug", params: { slug: "kegel-exercises" }, label: "دليل تمارين كيغل" },
  {
    to: "/education/$slug",
    params: { slug: "erectile-dysfunction" },
    label: "ضعف الانتصاب والحلول",
  },
] as const;

const supportLinks = [
  { to: "/shipping", label: "سياسة الشحن والتوصيل" },
  { to: "/returns", label: "الاستبدال والاسترجاع" },
  { to: "/privacy", label: "سياسة الخصوصية" },
  { to: "/terms", label: "الشروط والأحكام" },
  { to: "/contact", label: "اتصل بنا" },
] as const;

export function Footer() {
  return (
    <footer className="mt-20 bg-foreground text-background">
      <div className="container mx-auto px-4 py-16">
        <div className="grid gap-12 lg:grid-cols-4 md:grid-cols-2">
          {/* العمود الأول: البراند */}
          <div className="space-y-6">
            <Link to="/" className="inline-flex items-center gap-3">
              <img
                src={logo}
                alt="Elysr"
                className="h-14 w-14 shrink-0 object-contain brightness-0 invert"
              />
              <div>
                <div className="text-xl font-black">{COMPANY.name}</div>
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary-glow">
                  {COMPANY.nameEn}
                </div>
              </div>
            </Link>
            <p className="text-sm leading-relaxed text-background/60">
              المجموعة الرائدة في تقديم الحلول الطبية والصحية المتطورة في مصر. نجمع بين الخبرة
              العلمية وأفضل المنتجات العالمية بخصوصية تامة.
            </p>
            <div className="flex gap-4 pt-2">
              <SocialLink icon={<Facebook className="h-5 w-5" />} href="#" />
              <SocialLink icon={<Instagram className="h-5 w-5" />} href="#" />
              <SocialLink icon={<Twitter className="h-5 w-5" />} href="#" />
            </div>
          </div>

          {/* العمود الثاني: الأقسام */}
          <div>
            <h3 className="mb-6 flex items-center gap-2 text-lg font-bold">
              <span className="h-6 w-1 rounded-full bg-primary-glow" />
              أقسام المتجر
            </h3>
            <ul className="space-y-4">
              {shopLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm text-background/60 transition-smooth hover:text-primary-glow hover:translate-x-1 inline-block"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* العمود الثالث: المكتبة العلمية */}
          <div>
            <h3 className="mb-6 flex items-center gap-2 text-lg font-bold">
              <span className="h-6 w-1 rounded-full bg-primary-glow" />
              المكتبة العلمية
            </h3>
            <ul className="space-y-4">
              {libraryLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    params={link.params}
                    className="flex items-center gap-2 text-sm text-background/60 transition-smooth hover:text-primary-glow"
                  >
                    <BookOpen className="h-3.5 w-3.5 opacity-50" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* العمود الرابع: معلومات التواصل */}
          <div>
            <h3 className="mb-6 flex items-center gap-2 text-lg font-bold">
              <span className="h-6 w-1 rounded-full bg-primary-glow" />
              تواصل معنا
            </h3>
            <ul className="space-y-4">
              <ContactItem icon={<Mail className="h-4 w-4" />} text={COMPANY.email} />
              <ContactItem icon={<MapPin className="h-4 w-4" />} text={COMPANY.address} />

              <li className="pt-2">
                <a
                  href={waLink("مرحباً، أرغب في الاستفسار")}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary-glow px-4 py-3 font-bold text-foreground transition-smooth hover:shadow-glow"
                >
                  <MessageCircle className="h-5 w-5" /> واتساب المبيعات
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* الشريط السفلي: الحقوق وطرق الدفع */}
      <div className="border-t border-primary-glow/20 py-8 bg-foreground">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-right">
            <p className="text-xs text-background/40">
              © {new Date().getFullYear()} {COMPANY.name}. جميع الحقوق محفوظة لـ {COMPANY.nameEn}
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-3 opacity-30 grayscale hover:opacity-100 hover:grayscale-0 transition-smooth">
            <div className="bg-primary-glow/15 px-2 py-1 rounded-md text-[10px] font-bold">VISA</div>
            <div className="bg-primary-glow/15 px-2 py-1 rounded-md text-[10px] font-bold">
              MASTERCARD
            </div>
            <div className="bg-primary-glow/15 px-2 py-1 rounded-md text-[10px] font-bold">MEEZA</div>
            <div className="bg-primary-glow/15 px-2 py-1 rounded-md text-[10px] font-bold">VALU</div>
            <div className="bg-primary-glow/15 px-2 py-1 rounded-md text-[10px] font-bold">COD</div>
          </div>

          <div className="flex gap-6">
            {supportLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-[10px] font-bold uppercase tracking-widest text-background/40 hover:text-primary-glow"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

function SocialLink({ icon, href }: { icon: ReactNode; href: string }) {
  return (
    <a
      href={href}
      className="h-10 w-10 rounded-full border border-primary-glow/20 flex items-center justify-center hover:bg-primary-glow hover:text-foreground transition-smooth"
    >
      {icon}
    </a>
  );
}

function ContactItem({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <li className="flex items-center gap-3 text-sm text-background/60">
      <span className="text-primary-glow">{icon}</span>
      {text}
    </li>
  );
}
