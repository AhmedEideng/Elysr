import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { PageHero } from "@/components/PageHero";
import {
  applyHreflang,
  breadcrumbSchema,
  clearJsonLd,
  clearPrerenderJsonLd,
  injectJsonLd,
} from "@/lib/seo";
import { alternatesFor, enCategories, enHome } from "@/data/en-pages";

export const Route = createFileRoute("/en/")({
  head: () => ({
    meta: [
      { title: enHome.title },
      { name: "description", content: enHome.description },
      { name: "robots", content: "index, follow" },
    ],
  }),
  component: EnHubPage,
});

/**
 * (2026-10-11) مركز النسخة الإنجليزية: ترجمة أمينة لادعاءات الرئيسية العربية
 * + روابط الفئات الثلاث الإنجليزية. الـ JSON-LD مطابق لنسخة الـ prerender.
 */
function EnHubPage() {
  useEffect(() => {
    clearPrerenderJsonLd();
    injectJsonLd("breadcrumb", breadcrumbSchema([{ name: "Home", url: "/en" }]));
    applyHreflang(alternatesFor("/en"));
    return () => {
      clearJsonLd("breadcrumb");
    };
  }, []);

  return (
    <div className="container mx-auto px-4 py-10 md:py-12">
      <PageHero eyebrow="Elysr Medical" title={enHome.h1} description={enHome.intro} />
      <p className="mb-6 text-sm font-bold">
        <Link to="/" className="text-primary hover:underline">
          {enHome.switchLabel}
        </Link>
      </p>
      <h2 className="mb-4 text-2xl font-extrabold">{enHome.browseLabel}</h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {enCategories.map((c) => (
          <li key={c.path} className="rounded-2xl border border-primary/15 bg-white p-4 shadow-sm">
            <Link to={c.path} className="font-bold text-primary hover:underline">
              {c.heroTitle}
            </Link>
            <p className="mt-1 text-sm text-gray-600">{c.heroDescription}</p>
          </li>
        ))}
      </ul>
      <p className="mt-8 text-sm text-gray-600">
        {enHome.noteLabel}{" "}
        <Link to="/" className="font-bold text-primary hover:underline">
          النسخة العربية
        </Link>
      </p>
    </div>
  );
}
