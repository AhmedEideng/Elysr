import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { MessageCircle, Mail, MapPin, Sparkles } from "lucide-react";
import logo from "@/assets/logo-mono.webp";
import { COMPANY, waLink } from "@/lib/whatsapp";

// ── أقسام الشركة الأساسية ──
const shopLinks = [
  { to: "/products/men", label: "منتجات الرجال", emoji: "💪" },
  { to: "/products/women", label: "منتجات النساء", emoji: "🌸" },
  { to: "/products/devices", label: "الأجهزة الطبية", emoji: "⚙️" },
] as const;

// ── الروابط القانونية والدعم ──
const supportLinks = [
  { to: "/shipping", label: "سياسة الشحن" },
  { to: "/returns", label: "الاستبدال والاسترجاع" },
  { to: "/privacy", label: "سياسة الخصوصية" },
  { to: "/terms", label: "الشروط والأحكام" },
  { to: "/contact", label: "تواصل معنا" },
] as const;

export function Footer() {
  return (
    <footer className="mt-0 bg-gradient-to-br from-[#0a4f7a] via-[#0e5e8c] to-[#126DBF] text-white">
      {/* ── الشريط العلوي التحفيزي (أكثر كوكبة ونعومة) ── */}
      <div className="border-b border-white/10 bg-white/5 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col items-center gap-3 md:flex-row md:justify-between md:gap-6">
            <div className="flex items-center gap-2.5 text-center md:text-right">
              <Sparkles className="h-5 w-5 text-amber-200 shrink-0" />
              <div>
                <div className="text-sm font-black md:text-base">
                  💎 احصل على مبادرة الرعاية الماسية — خصم حتى 25%
                </div>
              </div>
            </div>
            <a
              href={waLink("مرحباً، أرغب في الحصول على مبادرة الرعاية الماسية 💎")}
              target="_blank"
              rel="noreferrer"
              className="group inline-flex items-center gap-1.5 rounded-full bg-white px-5 py-2 text-xs font-black text-[#0f7330] shadow-md transition-all hover:scale-105 hover:bg-green-50 active:scale-95"
            >
              <MessageCircle className="h-4 w-4" />
              احصل على العرض الآن
            </a>
          </div>
        </div>
      </div>

      {/* ── محتوى الفوتر الأساسي - 3 أعمدة منسقة (بدلاً من 5 لتجنب الإطالة المفرطة) ── */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-8 grid-cols-1 md:grid-cols-3 items-start">
          {/* العمود الأول: الشعار والتعريف والشبكات */}
          <div className="space-y-3">
            <Link to="/" className="inline-flex items-center gap-2.5">
              <img
                src={logo}
                alt="اليسر"
                width={48}
                height={48}
                loading="lazy"
                decoding="async"
                className="h-12 w-14 shrink-0 object-contain brightness-0 invert"
              />
              <div>
                <div className="text-lg font-black">{COMPANY.name}</div>
                <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-primary-glow">
                  {COMPANY.nameEn}
                </div>
              </div>
            </Link>
            <p className="text-xs leading-relaxed text-white/75 max-w-sm">
              المجموعة الرائدة في تقديم الحلول الطبية والصحة الزوجية في مصر. منتجات أصلية 100% مع
              شحن سري وتغليف محايد لكافة المحافظات.
            </p>
            {/* أيقونات التواصل الاجتماعي */}
            <div className="flex gap-2 pt-1">
              <SocialLink
                icon={
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                  </svg>
                }
                href="https://www.facebook.com/ElysrMedical"
                label="فيسبوك"
              />
              <SocialLink
                icon={<MessageCircle className="h-4 w-4" aria-hidden />}
                href={waLink("مرحباً")}
                label="واتساب"
              />
            </div>
          </div>

          {/* العمود الثاني: الأقسام والروابط المفيدة */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="mb-3 flex items-center gap-1.5 text-sm font-black">
                <span className="h-4 w-1 rounded-full bg-primary-glow" />
                أقسام المنتجات
              </h3>
              <ul className="space-y-2">
                {shopLinks.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="group flex items-center gap-1.5 text-xs text-white/85 transition-all hover:text-white hover:translate-x-1"
                    >
                      <span className="text-sm">{link.emoji}</span>
                      <span>{link.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="mb-3 flex items-center gap-1.5 text-sm font-black">
                <span className="h-4 w-1 rounded-full bg-primary-glow" />
                الدعم القانوني
              </h3>
              <ul className="space-y-2">
                {supportLinks.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="group flex items-center gap-1.5 text-xs text-white/85 transition-all hover:text-white hover:translate-x-1"
                    >
                      <span>•</span>
                      <span>{link.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* العمود الثالث: بيانات التواصل والموثوقية */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-1.5 text-sm font-black">
              <span className="h-4 w-1 rounded-full bg-primary-glow" />
              معلومات الاتصال
            </h3>
            <ul className="space-y-2 text-xs">
              <ContactItem icon={<Mail className="h-3.5 w-3.5" />} text={COMPANY.email} />
              <ContactItem icon={<MapPin className="h-3.5 w-3.5" />} text={COMPANY.address} />
            </ul>

            <div className="text-xs bg-white/5 border border-white/10 rounded-xl p-3 text-white/95 leading-normal">
              ✅ <strong>شحن سري وآمن:</strong> يتم الشحن في عبوة مغلقة تماماً بدون اسم للمنتجات
              الخصوصية للحفاظ على السرية.
            </div>
          </div>
        </div>
      </div>

      {/* ── شريط الحقوق السفلي المدمج ── */}
      <div className="border-t border-white/10 bg-[#063f68]/90">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col gap-2 text-center md:flex-row md:items-center md:justify-between md:text-right">
            <p className="text-[10px] text-white/60">
              © {new Date().getFullYear()} {COMPANY.name} · جميع الحقوق محفوظة
            </p>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[10px]">
              <Link
                to="/medical-review-board"
                className="text-white/60 hover:text-white transition-colors"
              >
                سياسة المراجعة الطبية والتحريرية
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ── المكونات الفرعية التكميلية للفوتر ──

function SocialLink({ icon, href, label }: { icon: ReactNode; href: string; label: string }) {
  return (
    <a
      href={href}
      aria-label={label}
      title={label}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel="noopener noreferrer"
      className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/5 text-white/80 transition-all hover:bg-white hover:text-[#126DBF]"
    >
      {icon}
    </a>
  );
}

function ContactItem({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <li className="flex items-center gap-2 text-white/80">
      <span className="text-primary-glow">{icon}</span>
      <span className="break-all leading-normal">{text}</span>
    </li>
  );
}
