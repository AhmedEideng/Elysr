import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { products } from "@/data/products";
import { formatPrice } from "@/data/product-types";
import Fuse from "fuse.js";

/**
 * بحث فوري ومرن (Fuzzy Search) في المنتجات مع dropdown للنتائج.
 * - يتعامل مع الأخطاء الإملائية.
 * - فتح بـ Ctrl/Cmd+K
 * - يدعم لوحة المفاتيح (↑ ↓ Enter Esc)
 */
export function SearchBar({ onClose }: { onClose?: () => void }) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // إعداد Fuse.js مرة واحدة
  const fuse = useMemo(() => {
    return new Fuse(products, {
      keys: [
        { name: "name", weight: 2 },
        { name: "nameEn", weight: 1 },
        { name: "description", weight: 0.5 },
      ],
      threshold: 0.4, // قيمة التسامح مع الأخطاء الإملائية (0 دقيق جداً، 1 غير دقيق)
      ignoreLocation: true,
    });
  }, []);

  const results = useMemo(() => {
    const term = q.trim();
    if (!term) return [];
    // Fuse يُرجع مصفوفة من الكائنات بالشكل { item, refIndex }
    return fuse
      .search(term)
      .map((result) => result.item)
      .slice(0, 8);
  }, [q, fuse]);

  useEffect(() => setActiveIdx(0), [q]);

  const go = (id: string) => {
    navigate({ to: "/products/$id", params: { id } });
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
      go(results[activeIdx].id);
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
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKey}
          placeholder="ابحث عن منتج (مثلاً: تستو ماكس)…"
          className="w-full rounded-full border bg-background pr-10 pl-10 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
          aria-label="بحث في المنتجات"
        />
        {q && (
          <button
            onClick={() => setQ("")}
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
            </div>
          ) : (
            <ul role="listbox">
              {results.map((p, i) => (
                <li key={p.id}>
                  <button
                    onClick={() => go(p.id)}
                    onMouseEnter={() => setActiveIdx(i)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-right transition ${
                      i === activeIdx ? "bg-accent" : "hover:bg-accent/60"
                    }`}
                  >
                    {p.image ? (
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border bg-gradient-soft">
                        <img
                          src={p.image}
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
        </div>
      )}
    </div>
  );
}
