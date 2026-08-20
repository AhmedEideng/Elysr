import { Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState, type ComponentType } from "react";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import {
  ShoppingCart,
  Menu,
  Download,
  X,
  Home,
  User,
  UserRound,
  Stethoscope,
  BookOpen,
  Info,
  MessageCircle,
  ChevronRight,
  Search,
  Star,
  HelpCircle,
  Sparkles,
  Heart,
} from "lucide-react";
import logoMono from "@/assets/logo-mono.webp";
import logoSquare from "@/assets/logo-square.webp";
import { useCart } from "@/hooks/use-cart";
import { useWishlist } from "@/hooks/use-wishlist";
import { waLink } from "@/lib/whatsapp";

const SearchBar = lazy(() =>
  import("@/components/SearchBar").then((module) => ({ default: module.SearchBar })),
);

type Icon = ComponentType<{ className?: string }>;
type NavTone = "primary" | "secondary" | "promo" | "best";
type NavItem = {
  label: string;
  icon: Icon;
  tone?: NavTone;
  badge?: string;
} & ({ to: string; href?: never } | { href: string; to?: never });

const desktopLinks = [
  { to: "/", label: "الرئيسية", icon: Home },
  { to: "/products/men", label: "منتجات الرجال", icon: User },
  { to: "/products/women", label: "منتجات النساء", icon: UserRound },
  { to: "/products/devices", label: "الأجهزة الطبية", icon: Stethoscope },
  { to: "/education", label: "النصائح الطبية", icon: BookOpen },
  { to: "/contact", label: "تواصل معنا", icon: MessageCircle },
  { to: "/about", label: "من نحن", icon: Info },
] as const;

const shopLinks: NavItem[] = [
  { to: "/", label: "الرئيسية", icon: Home, tone: "secondary" },
  { to: "/products/men", label: "منتجات الرجال", icon: User, tone: "primary" },
  { to: "/products/women", label: "منتجات النساء", icon: UserRound, tone: "primary" },
  { to: "/products/devices", label: "الأجهزة الطبية", icon: Stethoscope, tone: "primary" },
  { href: "/#featured-products", label: "الأكثر مبيعًا", icon: Star, tone: "best" },
  { to: "/wishlist", label: "المفضلة", icon: Heart, tone: "promo" },
  { to: "/education", label: "النصائح الطبية", icon: BookOpen, tone: "secondary" },
];

const supportLinks: NavItem[] = [
  { to: "/contact", label: "تواصل معنا", icon: MessageCircle, tone: "secondary" },
  { to: "/about", label: "من نحن", icon: Info, tone: "secondary" },
  { href: "/products/men#faq", label: "الأسئلة الشائعة", icon: HelpCircle, tone: "secondary" },
];

function iconToneClass(tone: NavTone = "secondary") {
  switch (tone) {
    case "primary":
      return "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground";
    case "promo":
      return "bg-orange-50 text-orange-600 group-hover:bg-orange-500 group-hover:text-white";
    case "best":
      return "bg-amber-50 text-amber-600 group-hover:bg-amber-500 group-hover:text-white";
    case "secondary":
    default:
      return "bg-slate-100 text-slate-600 group-hover:bg-accent group-hover:text-primary";
  }
}

function linkToneClass(tone: NavTone = "secondary") {
  switch (tone) {
    case "promo":
      return "hover:border-orange-400 hover:bg-orange-50/80 hover:text-orange-700";
    case "best":
      return "hover:border-amber-400 hover:bg-amber-50/80 hover:text-amber-700";
    case "primary":
      return "hover:border-primary hover:bg-primary/5 hover:text-primary";
    case "secondary":
    default:
      return "hover:border-slate-300 hover:bg-accent/60 hover:text-primary";
  }
}

export function Header() {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const { count } = useCart();
  const { count: wishlistCount } = useWishlist();
  const { isInstallable, install } = usePwaInstall();

  useEffect(() => {
    let lastScrollPosition = window.scrollY;

    const handleScroll = () => {
      // Don't hide/show header while drawer or search is open
      if (open || searchOpen) return;

      const currentScrollY = window.scrollY;

      // Handle top bounce
      if (currentScrollY <= 0) {
        setIsVisible(true);
        lastScrollPosition = 0;
        return;
      }

      // Scrolling down
      if (currentScrollY > lastScrollPosition && currentScrollY > 60) {
        setIsVisible(false);
      }
      // Scrolling up
      else if (currentScrollY < lastScrollPosition) {
        setIsVisible(true);
      }

      lastScrollPosition = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [open, searchOpen]);

  // Esc + lock body scroll عند فتح القائمة
  useEffect(() => {
    if (!open && !searchOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    // Lock body scroll without layout shift (scrollbar compensation)
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    document.body.style.paddingRight = `${scrollbarWidth}px`;
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    };
  }, [open, searchOpen]);

  // Ctrl/Cmd+K لفتح البحث
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const closeMenu = () => setOpen(false);

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-40 w-full border-b border-border/60 bg-background/95 shadow-sm backdrop-blur-md transition-transform duration-300 ease-in-out ${isVisible ? "translate-y-0" : "-translate-y-full"}`}
      >
        <div className="container mx-auto flex h-14 items-center justify-between gap-4 px-4 md:h-16">
          <Link to="/" className="flex items-center">
            <img
              src={logoMono}
              alt="اليسر ميديكال — Elysr Medical Group"
              className="h-11 w-auto object-contain md:h-12"
              width={250}
              height={94}
              fetchPriority="high"
              decoding="async"
            />
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="القائمة الرئيسية">
            {desktopLinks.map((l, i) => (
              <Link
                key={l.to}
                to={l.to}
                className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 transition-smooth hover:bg-accent/50 hover:text-primary"
                activeProps={{ className: "text-primary bg-accent/60" }}
              >
                {l.label}
                {i < desktopLinks.length - 1 && <span className="sr-only"> · </span>}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {/* زر البحث */}
            <button
              onClick={() => setSearchOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md text-foreground/80 transition-smooth hover:bg-accent hover:text-primary"
              aria-label="بحث (Ctrl+K)"
              title="بحث (Ctrl+K)"
            >
              <Search className="h-5 w-5" />
            </button>

            {/* ❤️ المفضلة */}
            <Link
              to="/wishlist"
              className="relative inline-flex h-10 w-10 items-center justify-center text-rose-500 transition-smooth hover:text-rose-600"
              aria-label={`المفضلة${wishlistCount > 0 ? ` (${wishlistCount})` : ""}`}
              title="المفضلة"
            >
              <Heart className="h-6 w-6" />
              {wishlistCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                  {wishlistCount}
                </span>
              )}
            </Link>

            <Link
              to="/cart"
              className="relative inline-flex h-10 w-10 items-center justify-center text-primary transition-smooth hover:text-primary/80"
              aria-label={`السلة${count > 0 ? ` (${count})` : ""}`}
            >
              <ShoppingCart className="h-6 w-6" />
              {count > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                  {count}
                </span>
              )}
            </Link>

            <button
              className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-accent lg:hidden"
              onClick={() => {
                setOpen((o) => !o);
                setIsVisible(true);
              }}
              aria-label="القائمة"
              aria-expanded={open}
            >
              {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* Spacer لمنع اختفاء المحتوى تحت الهيدر الثابت */}
      <div className="h-14 w-full shrink-0 md:h-16" aria-hidden="true" />

      {/* Drawer للقائمة المنسدلة - جهة اليسار (مستقلة عن الهيدر) */}
      {open && (
        <div className="relative z-[100]">
          <div
            className="fixed inset-0 animate-in bg-black/50 backdrop-blur-sm duration-200 fade-in lg:hidden"
            onClick={closeMenu}
          />
          <div
            className="fixed inset-y-0 left-0 flex w-80 max-w-[88vw] animate-in flex-col overflow-y-auto overscroll-contain border-r border-border bg-background shadow-2xl duration-300 slide-in-from-left lg:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="القائمة الرئيسية"
          >
            <div className="relative shrink-0 overflow-hidden bg-[#063f68] px-4 py-3 text-white shadow-lg">
              <div
                aria-hidden
                className="pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full bg-sky-300/25 blur-2xl"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -bottom-14 left-6 h-24 w-24 rounded-full bg-primary/35 blur-2xl"
              />

              <div className="relative flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white overflow-hidden shadow-md ring-1 ring-white/50">
                    <img
                      src={logoSquare}
                      alt="اليسر ميديكال"
                      width={256}
                      height={256}
                      className="h-8 w-8 object-contain"
                      decoding="async"
                    />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-col text-[10px] font-black text-amber-100 leading-normal">
                      <span className="flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-amber-200 shrink-0" />
                        موثوق
                      </span>
                      <span className="text-[9px] opacity-85 mt-0.5">للصحة الزوجية</span>
                    </div>
                    <div className="mt-1.5 truncate text-base font-black leading-tight">
                      اليسر ميديكال
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isInstallable && (
                    <button
                      onClick={install}
                      className="inline-flex h-8 px-2.5 items-center justify-center gap-1 rounded-full bg-white/15 text-white text-[10px] font-black ring-1 ring-white/20 transition-smooth hover:bg-white/25 active:scale-95"
                      title="تثبيت التطبيق"
                    >
                      <Download className="h-3 w-3" />
                      تثبيت
                    </button>
                  )}
                  <button
                    onClick={closeMenu}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/20 transition-smooth hover:bg-white/25"
                    aria-label="إغلاق القائمة"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <nav className="flex flex-col p-3" aria-label="روابط القائمة المختصرة">
              {shopLinks.map((item) => (
                <DrawerNavLink key={item.to ?? item.href} item={item} onNavigate={closeMenu} />
              ))}

              {/* تتبع طلبك */}
              <a
                href={waLink(
                  "مرحباً فريق اليسر ميديكال 👋\nأريد الاستفسار عن حالة طلبي.\nشكراً لكم 🙏",
                )}
                target="_blank"
                rel="noreferrer"
                onClick={closeMenu}
                className="group flex items-center gap-3 rounded-xl border border-transparent border-l-4 px-3 py-2.5 text-sm font-bold text-foreground/80 transition-smooth hover:border-green-400 hover:bg-green-50/80 hover:text-green-700"
              >
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-600 transition-smooth group-hover:bg-green-500 group-hover:text-white">
                  <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.79 23.444l4.553-1.46A11.93 11.93 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75c-2.15 0-4.148-.675-5.79-1.823l-.415-.268-2.694.864.84-2.607-.29-.435A9.723 9.723 0 012.25 12c0-5.385 4.365-9.75 9.75-9.75S21.75 6.615 21.75 12s-4.365 9.75-9.75 9.75z" />
                  </svg>
                </span>
                <span className="truncate">📦 تتبع طلبك</span>
                <ChevronRight className="h-4 w-4 shrink-0 opacity-35 transition-smooth group-hover:translate-x-0.5 group-hover:opacity-100" />
              </a>

              <div className="my-2 h-px bg-border" />
              <div className="mb-2 px-2 text-[11px] font-black text-muted-foreground">
                الدعم والمعلومات
              </div>
              {supportLinks.map((item) => (
                <DrawerNavLink key={item.to ?? item.href} item={item} onNavigate={closeMenu} />
              ))}

              <a
                href={waLink("مرحباً، أريد استشارة مجانية من اليسر ميديكال")}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3 text-sm font-black text-white shadow-elegant transition-smooth hover:shadow-glow"
              >
                <MessageCircle className="h-4 w-4" />
                💬 استشارة مجانية عبر واتساب
              </a>
              <p className="mt-1.5 text-center text-[11px] font-bold text-muted-foreground">
                رد خلال دقائق ⚡
              </p>
            </nav>
          </div>
        </div>
      )}

      {/* Modal البحث */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-[60] flex animate-in items-start justify-center bg-black/60 p-4 pt-[10vh] backdrop-blur-sm duration-200 fade-in"
          onClick={() => setSearchOpen(false)}
        >
          <div
            className="w-full max-w-xl animate-in duration-300 slide-in-from-top-4"
            onClick={(e) => e.stopPropagation()}
          >
            <Suspense
              fallback={
                <div className="rounded-2xl border bg-card p-6 text-center text-sm text-muted-foreground shadow-2xl">
                  جاري تحميل البحث…
                </div>
              }
            >
              <SearchBar onClose={() => setSearchOpen(false)} />
            </Suspense>
          </div>
        </div>
      )}
    </>
  );
}

function DrawerNavLink({ item, onNavigate }: { item: NavItem; onNavigate: () => void }) {
  const IconComponent = item.icon;
  const baseClass = `group flex items-center justify-between gap-3 rounded-xl border border-transparent border-l-4 px-3 py-2.5 text-sm font-bold text-foreground/80 transition-smooth ${linkToneClass(item.tone)}`;
  const content = (
    <>
      <span className="flex min-w-0 items-center gap-3">
        <span
          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-smooth ${iconToneClass(item.tone)}`}
        >
          <IconComponent className="h-[18px] w-[18px]" />
        </span>
        <span className="truncate">{item.label}</span>
        {item.badge && (
          <span className="rounded-full bg-destructive px-2 py-0.5 text-[9px] font-black text-destructive-foreground">
            {item.badge}
          </span>
        )}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 opacity-35 transition-smooth group-hover:translate-x-0.5 group-hover:opacity-100" />
    </>
  );

  if (item.href) {
    return (
      <a href={item.href} onClick={onNavigate} className={baseClass}>
        {content}
      </a>
    );
  }

  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      className={baseClass}
      activeProps={{ className: "border-l-primary bg-primary/10 text-primary" }}
    >
      {content}
    </Link>
  );
}
