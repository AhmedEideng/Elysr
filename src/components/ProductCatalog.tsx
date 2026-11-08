import { useEffect, useMemo, useState } from "react";
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
      <div className="mb-6 rounded-2xl border bg-card p-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <label className="text-sm font-bold">
            نوع المنتج
            <select
              aria-label="نوع المنتج"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="mt-2 w-full rounded-xl border bg-background p-2"
            >
              <option value="all">كل الأنواع</option>
              {types.map((t) => (
                <option key={t} value={t}>
                  {labels[t]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-bold">
            ترتيب المنتجات
            <select
              aria-label="ترتيب المنتجات"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="mt-2 w-full rounded-xl border bg-background p-2"
            >
              <option value="default">الترتيب الافتراضي</option>
              <option value="price-asc">السعر: الأقل أولًا</option>
              <option value="price-desc">السعر: الأعلى أولًا</option>
            </select>
          </label>
          <label className="text-sm font-bold">
            السعر من (ج.م)
            <input
              aria-label="السعر من"
              type="number"
              min="0"
              value={min}
              onChange={(e) => setMin(e.target.value)}
              className="mt-2 w-full rounded-xl border bg-background p-2"
            />
          </label>
          <label className="text-sm font-bold">
            السعر إلى (ج.م)
            <input
              aria-label="السعر إلى"
              type="number"
              min="0"
              value={max}
              onChange={(e) => setMax(e.target.value)}
              className="mt-2 w-full rounded-xl border bg-background p-2"
            />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
          <p role="status" aria-live="polite">
            عرض {visible.length} من {items.length} منتج
          </p>
          <button type="button" onClick={clear} className="text-primary underline">
            مسح الفلاتر
          </button>
          {guides.map(([slug, label]) => (
            <Link
              key={slug}
              to="/products/guides/$slug"
              params={{ slug }}
              className="text-primary underline"
            >
              {label}
            </Link>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          التصفية لتنظيم التصفح حسب الشكل والسعر، وليست توصية علاجية أو دليلًا على ملاءمة المنتج
          لحالتك.
        </p>
      </div>
      {!visible.length ? (
        <p className="py-8 text-center">
          لا توجد منتجات ضمن الفلاتر المختارة. وسّع نطاق السعر أو امسح الفلاتر.
        </p>
      ) : (
        <div className="grid gap-5 grid-cols-2 md:grid-cols-3 lg:grid-cols-4" data-catalog-results>
          {visible.map((p, index) => (
            <ProductCard key={p.id} product={p} priority={index < 4} listName={listName} />
          ))}
        </div>
      )}
    </section>
  );
}
