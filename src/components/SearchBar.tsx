import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Search, X } from "lucide-react";
import { formatPrice, type Product } from "@/data/product-types";
import { rankProductSearch, suggestProductSearch } from "@/lib/product-search";
import { thumbUrl } from "@/lib/cache";

/**
 * بحث فوري بنفس محرك صفحة النتائج، مع اقتراحات إملائية منفصلة.
 * - يتعامل مع الأخطاء الإملائية.
 * - فتح بـ Ctrl/Cmd+K
 * - يدعم لوحة المفاتيح (↑ ↓ Enter Esc)
 */
export function SearchBar({ onClose }: { onClose?: () => void }) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  // 🚀 تحميل كسول للمنتجات: لا نحمّل كل الكتالوج (254KB) عند فتح الصفحة،
  // بل نحمّله فقط عندما يبدأ المستخدم بالكتابة في البحث. هذا يقلل حمولة
  // المسار الحرج (LCP) ويحسّن سرعة تحميل الصفحة الرئيسية بشكل كبير.
  const [products, setProducts] = useState<Product[] | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // عند أول حرف يكتبه المستخدم → حمّل الكتالوج (مرة واحدة فقط)
  useEffect(() => {
    if (!products && q.trim().length > 0) {
      import("@/data/products").then(({ products }) => setProducts(products));
    }
  }, [q, products]);

  const allResults = useMemo(
    () => (products && q.trim() ? rankProductSearch(products, q) : []),
    [products, q],
  );
  const suggestions = useMemo(
    () => (products && q.trim() && !allResults.length ? suggestProductSearch(products, q) : []),
    [products, q, allResults.length],
  );

  // أعلى 8 اقتراحات في الـ dropdown؛ بقية النتائج في صفحة /search?q=
  const results = allResults.slice(0, 8);

  const go = (slug: string) => {
    navigate({ to: "/products/$slug", params: { slug } });
    onClose?.();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[activeIdx]) {
      e.preventDefault();
      go(results[activeIdx].slug);
    } else if (e.key === "Escape") {
      onClose?.();
    }
  };

  return (
    <div className="w-full">
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setActiveIdx(0);
          }}
          onKeyDown={onKey}
          placeholder="ابحث عن منتج (مثلاً: هامر أوف ثور)…"
          className="w-full rounded-full border bg-background pr-10 pl-10 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
          aria-label="بحث في المنتجات"
        />
        {q && (
          <button
            onClick={() => {
              setQ("");
              setActiveIdx(0);
            }}
            className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full inline-flex items-center justify-center hover:bg-accent"
            aria-label="مسح"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {q.trim() && (
        <div className="mt-2 max-h-80 overflow-y-auto rounded-2xl border bg-card shadow-2xl">
          {results.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              لا توجد نتائج للبحث «{q}»
              {suggestions.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p>هل تقصد أحد هذه الأسماء؟</p>
                  {suggestions.map((p) => (
                    <button
                      type="button"
                      key={p.id}
                      className="block w-full text-primary underline"
                      onClick={() => setQ(p.name)}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <ul role="listbox">
              {results.map((p, i) => (
                <li key={p.id}>
                  <button
                    onClick={() => go(p.slug)}
                    onMouseEnter={() => setActiveIdx(i)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-right transition ${
                      i === activeIdx ? "bg-accent" : "hover:bg-accent/60"
                    }`}
                  >
                    {p.image ? (
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border bg-gradient-soft">
                        <img
                          src={thumbUrl(p.image, "thumbs-120")}
                          alt={p.name}
                          width={40}
                          height={40}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <span className="text-3xl shrink-0 h-10 w-10 flex items-center justify-center bg-gradient-soft rounded-md border">
                        {p.emoji}
                      </span>
                    )}
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold truncate">{p.name}</span>
                      <span className="block text-xs text-muted-foreground truncate">
                        {p.nameEn}
                      </span>
                    </span>
                    <span className="text-sm font-bold text-primary shrink-0">
                      {formatPrice(p.price)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* بقية النتائج في صفحة /search?q= — لينك قابل للمشاركة؛ صفحة النتائج noindex */}
          {allResults.length > 0 && (
            <button
              onClick={() => {
                navigate({ to: "/search", search: { q: q.trim() } });
                onClose?.();
              }}
              className="w-full flex items-center justify-between gap-2 border-t px-3 py-2.5 text-sm font-bold text-primary transition hover:bg-accent"
            >
              <span>عرض كل النتائج في صفحة البحث ({allResults.length})</span>
              <ArrowLeft className="h-4 w-4 shrink-0" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
