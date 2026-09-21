import type { Product } from "@/data/product-types";

export type UseBadge = { label: string; className: string };

/**
 * The small use-case badge shown on every product card.
 * Kept in one module so the prerender shell and hydrated React card never
 * disagree about the visible badge text.
 */
export function getUseBadge(product: Product): UseBadge {
  const text = [
    product.name,
    product.nameEn,
    product.slug,
    product.description,
    product.ingredients ?? "",
    product.usage ?? "",
    ...(product.benefits ?? []),
  ]
    .join(" ")
    .toLowerCase();

  if (product.category === "devices") {
    return /(ved|vacuum|pump|مضخة|تفريغ|erection)/.test(text)
      ? { label: "VED للانتصاب", className: "bg-cyan-700 text-white" }
      : { label: "شد وتكبير", className: "bg-violet-700 text-white" };
  }

  if (product.category === "women") {
    if (/(filler|فيلر|تكبير الثدي|الخدود|paxtone|max filler)/.test(text))
      return { label: "تكبير وشد", className: "bg-violet-700 text-white" };
    if (/(tightening|تضييق|lovezone vaginal gel)/.test(text))
      return { label: "تضييق", className: "bg-fuchsia-700 text-white" };
    if (/(viagra for women|انخفاض الرغبة)/.test(text))
      return { label: "دعم الرغبة", className: "bg-rose-700 text-white" };
    if (/(aromal|argi.fem)/.test(text) && !/(honey|عسل|drops|قطرات|نقط)/.test(text))
      return { label: "ترطيب", className: "bg-sky-700 text-white" };
    return { label: "رغبة وإثارة", className: "bg-rose-700 text-white" };
  }

  if (product.id === "m-01") return { label: "انتصاب وتضخيم", className: "bg-teal-700 text-white" };

  if (
    /(dapoxetine|130\/60|170\/60|hard-on|ferrari 130\/60|porsche 130\/60|love extra|double shot|مفعول مزدوج)/.test(
      text,
    )
  )
    return { label: "انتصاب + تأخير", className: "bg-teal-700 text-white" };
  if (
    /(lidocaine|prilocaine|benzocaine|delay|تأخير|spray|بخاخ|emla|procomil|dooz|stallion|reman|toro duro)/.test(
      text,
    )
  )
    return { label: "تأخير", className: "bg-indigo-700 text-white" };
  if (/(cialis|levitra|viagra|sildenafil|tadalafil|vardenafil|vegal|pfizer|oral jelly)/.test(text))
    return { label: "انتصاب", className: "bg-emerald-700 text-white" };
  if (/(titan|mr\. big|mr big|big penis|leech|العلق)/.test(text))
    return { label: "تكبير", className: "bg-violet-700 text-white" };
  if (/(night.hunter|صياد الليل|نايت هانتر)/.test(text))
    return { label: "انتصاب وتأخير", className: "bg-teal-700 text-white" };
  if (/(sotara|merson|royal cream)/.test(text))
    return { label: "تحفيز موضعي", className: "bg-cyan-700 text-white" };

  return { label: "طاقة وحيوية", className: "bg-amber-400 text-amber-950" };
}
