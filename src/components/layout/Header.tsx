import { Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import {
  ShoppingCart,
  Menu,
  X,
  Home,
  User,
  UserRound,
  Stethoscope,
  BookOpen,
  Store,
  Info,
  MessageCircle,
  ChevronRight,
  Search,
} from "lucide-react";
import logo from "@/assets/logo.webp";
import { useCart } from "@/hooks/use-cart";
import { waLink } from "@/lib/whatsapp";

const SearchBar = lazy(() =>
  import("@/components/SearchBar").then((module) => ({ default: module.SearchBar })),
);

const links = [
  { to: "/", label: "الرئيسية", icon: Home },
  { to: "/products/men", label: "منتجات الرجال", icon: User },
  { to: "/products/women", label: "منتجات النساء", icon: UserRound },
  { to: "/products/devices", label: "أجهزة وأدوات", icon: Stethoscope },
  { to: "/education", label: "التوعية الجنسية", icon: BookOpen },
  { to: "/wholesale", label: "الجملة والتجار", icon: Store },
  { to: "/about", label: "من نحن", icon: Info },
  { to: "/contact", label: "تواصل", icon: MessageCircle },
] as const;

export function Header() {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { count } = useCart();

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
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
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

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background shadow-sm">
      <div className="container mx-auto flex h-14 md:h-16 items-center justify-between gap-4 px-4">
        <Link to="/" className="flex items-center">
          <img
            src={logo}
            alt="اليسر ميديكال — Elysr Medical Group"
            className="h-11 md:h-12 w-auto object-contain"
          />
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="px-3 py-2 text-sm font-medium text-foreground/80 rounded-md transition-smooth hover:text-primary hover:bg-accent/50"
              activeProps={{ className: "text-primary bg-accent/60" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {/* زر البحث */}
          <button
            onClick={() => setSearchOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-foreground/80 hover:bg-accent hover:text-primary transition-smooth"
            aria-label="بحث (Ctrl+K)"
            title="بحث (Ctrl+K)"
          >
            <Search className="h-5 w-5" />
          </button>

          <Link
            to="/cart"
            className="relative inline-flex h-10 w-10 items-center justify-center text-primary transition-smooth hover:text-primary/80"
            aria-label="السلة"
          >
            <ShoppingCart className="h-6 w-6" />
            {count > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                {count}
              </span>
            )}
          </Link>

          <button
            className="lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-accent"
            onClick={() => setOpen((o) => !o)}
            aria-label="القائمة"
            aria-expanded={open}
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Drawer للقائمة المنسدلة - جهة اليسار */}
      {open && (
        <>
          <div
            className="lg:hidden fixed inset-0 top-14 md:top-16 z-40 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setOpen(false)}
          />
          <div
            className="lg:hidden fixed top-14 md:top-16 left-0 bottom-0 z-50 w-80 max-w-[85vw] bg-background border-r border-border shadow-2xl overflow-y-auto animate-in slide-in-from-left duration-300"
            role="dialog"
            aria-label="القائمة الرئيسية"
          >
            <div className="bg-gradient-brand px-5 py-4 text-primary-foreground">
              <div className="text-sm opacity-90">مرحباً بك في</div>
              <div className="text-lg font-bold">اليسر ميديكال</div>
            </div>
            <nav className="flex flex-col p-3">
              {links.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setOpen(false)}
                  className="group flex items-center justify-between gap-3 rounded-xl px-3 py-3 text-sm font-medium text-foreground/80 transition-smooth hover:bg-accent hover:text-primary"
                  activeProps={{ className: "bg-accent text-primary" }}
                >
                  <span className="flex items-center gap-3">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-accent/60 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-smooth">
                      <l.icon className="h-4 w-4" />
                    </span>
                    {l.label}
                  </span>
                  <ChevronRight className="h-4 w-4 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-smooth" />
                </Link>
              ))}
              <div className="my-3 h-px bg-border" />
              <a
                href={waLink("مرحباً، أرغب في التواصل مع اليسر ميديكال")}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3 text-sm font-semibold text-white shadow-elegant transition-smooth hover:shadow-glow"
              >
                <MessageCircle className="h-4 w-4" /> تواصل عبر واتساب
              </a>
            </nav>
          </div>
        </>
      )}

      {/* Modal البحث */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 pt-[10vh] animate-in fade-in duration-200"
          onClick={() => setSearchOpen(false)}
        >
          <div
            className="w-full max-w-xl animate-in slide-in-from-top-4 duration-300"
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
    </header>
  );
}
