import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ArrowLeft, ChevronDown, SlidersHorizontal, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { Product } from "@/data/product-types";
import { getBundleProductType } from "@/data/products";
import { ProductCard } from "@/components/ProductCard";
import { trackViewItemList } from "@/lib/analytics";
import { injectJsonLd, itemListSchema } from "@/lib/seo";

const labels: Record<string, string> = {
  tablet: "أقراص",
  capsule: "كبسولات",
  gel: "جل",
  cream: "كريم",
  honey: "عسل",
  chocolate: "شوكولاتة",
  spray: "بخاخ",
  drops: "قطرات",
  gum: "لبان",
  wipes: "مناديل",
  sachet: "أكياس",
  coffee: "قهوة",
  "digital-pump": "مضخات رقمية",
  "electric-pump": "مضخات كهربائية",
  "manual-pump": "مضخات يدوية",
  "vacuum-kit": "حقائب تفريغ",
  "breast-kit": "أجهزة للصدر",
  "traction-device": "أجهزة شد",
  other: "أخرى",
};
export function filterCatalog(
  items: Product[],
  type: string,
  min: string,
  max: string,
  sort: string,
) {
  const filtered = items.filter(
    (p) =>
      (type === "all" || getBundleProductType(p) === type) &&
      (!min || p.price >= Number(min)) &&
      (!max || p.price <= Number(max)),
  );
  if (sort === "price-asc") filtered.sort((a, b) => a.price - b.price);
  if (sort === "price-desc") filtered.sort((a, b) => b.price - a.price);
  return filtered;
}
/** Local UI state only: no crawlable faceted URLs or new indexable pages. */
export function ProductCatalog({
  items,
  category,
  listName,
}: {
  items: Product[];
  category: "men" | "women" | "devices";
  listName: string;
}) {
  const [priceOpen, setPriceOpen] = useState(false);
  const priceRef = useRef<HTMLDivElement>(null);
  const priceButtonRef = useRef<HTMLButtonElement>(null);
  const pricePanelId = useId();
  useEffect(() => {
    if (!priceOpen) return;
    const dismiss = (event: PointerEvent) => {
      if (!priceRef.current?.contains(event.target as Node)) setPriceOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [priceOpen]);
  const [type, setType] = useState("all");
  const [sort, setSort] = useState("default");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const types = useMemo(() => [...new Set(items.map(getBundleProductType))], [items]);
  const visible = useMemo(
    () => filterCatalog(items, type, min, max, sort),
    [items, type, min, max, sort],
  );
  useEffect(() => {
    injectJsonLd("itemlist", itemListSchema(visible, "منتجات القسم"));
    trackViewItemList(
      listName,
      visible.map((p) => ({ id: p.id, name: p.name, price: p.price, qty: 1 })),
    );
  }, [visible, listName]);
  const clear = () => {
    setPriceOpen(false);
    setType("all");
    setSort("default");
    setMin("");
    setMax("");
  };
  const guides =
    category === "men"
      ? [
          ["men-products-prices-egypt", "كل الأسعار"],
          ["delay-products-comparison", "مقارنة منتجات التأخير"],
        ]
      : category === "women"
        ? [
            ["women-products-prices-egypt", "كل الأسعار"],
            ["women-intimacy-guide-beginners", "دليل الاختيار"],
          ]
        : [
            ["manual-vs-electric-vacuum-pump", "مقارنة اليدوية والكهربائية"],
            ["intimacy-devices", "دليل الأجهزة"],
          ];
  return (
    <section aria-label="تصفية منتجات القسم">
      <div
        data-catalog-toolbar
        className="relative z-10 mb-5 rounded-2xl border border-border/70 bg-card p-3 shadow-sm sm:p-4"
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto] items-center gap-2 md:w-auto md:grid-cols-[160px_190px_auto]">
            <div className="relative min-w-0">
              <select
                aria-label="نوع المنتج"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="h-11 w-full appearance-none rounded-xl border border-border/60 bg-background pe-7 ps-3 text-xs font-semibold transition-colors hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:text-sm"
              >
                <option value="all">كل الأنواع</option>
                {types.map((t) => (
                  <option key={t} value={t}>
                    {labels[t]}
                  </option>
                ))}
              </select>
              <ChevronDown
                aria-hidden="true"
                className="pointer-events-none absolute end-2 top-4 size-3.5 text-muted-foreground"
              />
            </div>
            <div className="relative min-w-0">
              <select
                aria-label="ترتيب المنتجات"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="h-11 w-full appearance-none rounded-xl border border-border/60 bg-background pe-7 ps-3 text-xs font-semibold transition-colors hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:text-sm"
              >
                <option value="default">ترتيب العرض</option>
                <option value="price-asc">الأقل سعرًا</option>
                <option value="price-desc">الأعلى سعرًا</option>
              </select>
              <ChevronDown
                aria-hidden="true"
                className="pointer-events-none absolute end-2 top-4 size-3.5 text-muted-foreground"
              />
            </div>
            <div
              ref={priceRef}
              className="md:relative"
              onKeyDown={(event) => {
                if (event.key === "Escape" && priceOpen) {
                  setPriceOpen(false);
                  priceButtonRef.current?.focus();
                }
              }}
            >
              <button
                ref={priceButtonRef}
                type="button"
                aria-label="تحديد السعر"
                aria-expanded={priceOpen}
                aria-controls={pricePanelId}
                onClick={() => setPriceOpen(!priceOpen)}
                className={`flex h-11 items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:gap-2 sm:text-sm ${
                  min || max || priceOpen
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border/60 bg-background hover:border-primary/40 hover:text-primary"
                }`}
              >
                <SlidersHorizontal aria-hidden="true" className="size-3.5 sm:size-4" />
                السعر
                {(min || max) && (
                  <span aria-hidden="true" className="size-1.5 rounded-full bg-primary" />
                )}
              </button>
              {priceOpen && (
                <div
                  id={pricePanelId}
                  role="group"
                  aria-label="نطاق السعر"
                  className="absolute inset-x-3 top-full z-20 -mt-1 rounded-2xl border border-border bg-card p-4 shadow-xl sm:inset-x-auto sm:start-3 sm:w-80 md:start-auto md:end-0 md:top-[calc(100%+0.75rem)]"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-sm font-bold">
                      حدد ميزانيتك <span className="font-normal text-muted-foreground">(ج.م)</span>
                    </span>
                    <button
                      type="button"
                      aria-label="إغلاق تحديد السعر"
                      onClick={() => {
                        setPriceOpen(false);
                        priceButtonRef.current?.focus();
                      }}
                      className="-m-2 rounded-lg p-3 text-muted-foreground hover:text-foreground"
                    >
                      <X aria-hidden="true" className="size-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="text-xs text-muted-foreground">
                      من
                      <input
                        aria-label="السعر من"
                        type="number"
                        inputMode="numeric"
                        min="0"
                        placeholder="بدون حد"
                        value={min}
                        onChange={(e) => setMin(e.target.value)}
                        className="mt-1.5 h-11 w-full rounded-xl border bg-background px-3 text-sm text-foreground focus-visible:outline-primary"
                      />
                    </label>
                    <label className="text-xs text-muted-foreground">
                      إلى
                      <input
                        aria-label="السعر إلى"
                        type="number"
                        inputMode="numeric"
                        min="0"
                        placeholder="بدون حد"
                        value={max}
                        onChange={(e) => setMax(e.target.value)}
                        className="mt-1.5 h-11 w-full rounded-xl border bg-background px-3 text-sm text-foreground focus-visible:outline-primary"
                      />
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPriceOpen(false);
                      priceButtonRef.current?.focus();
                    }}
                    className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    عرض {visible.length} منتج <ArrowLeft aria-hidden="true" className="size-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="flex min-h-5 items-center justify-between gap-4 px-1 text-xs md:justify-end sm:text-sm">
            <p
              role="status"
              aria-live="polite"
              aria-atomic="true"
              className="text-muted-foreground"
            >
              <span className="font-bold text-foreground">{visible.length}</span>
              {visible.length !== items.length ? ` من ${items.length}` : ""} منتج
            </p>
            {(type !== "all" || sort !== "default" || min || max) && (
              <button
                type="button"
                onClick={clear}
                className="-my-2 flex min-h-9 items-center gap-1 text-primary hover:underline"
              >
                <X aria-hidden="true" className="size-3.5" /> مسح الفلاتر
              </button>
            )}
          </div>
        </div>
      </div>
      {!visible.length ? (
        <div className="rounded-2xl bg-muted/40 px-4 py-12 text-center">
          <p className="font-semibold">لا توجد منتجات ضمن الفلاتر المختارة.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            جرّب نوعًا آخر أو وسّع نطاق السعر لعرض المزيد.
          </p>
          <button
            type="button"
            onClick={clear}
            className="mt-5 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground hover:opacity-90"
          >
            عرض كل المنتجات
          </button>
        </div>
      ) : (
        <div className="grid gap-5 grid-cols-2 md:grid-cols-3 lg:grid-cols-4" data-catalog-results>
          {visible.map((p, index) => (
            <ProductCard key={p.id} product={p} priority={index < 4} listName={listName} />
          ))}
        </div>
      )}
      <nav
        aria-label="أدلة اختيار المنتجات"
        className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground"
      >
        {guides.map(([slug, label]) => (
          <Link
            key={slug}
            to="/products/guides/$slug"
            params={{ slug }}
            className="inline-flex min-h-9 items-center gap-1 hover:text-primary hover:underline"
          >
            {label} <ArrowLeft aria-hidden="true" className="size-3" />
          </Link>
        ))}
      </nav>
    </section>
  );
}
