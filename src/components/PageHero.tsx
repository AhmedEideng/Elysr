import type { ReactNode } from "react";

interface PageHeroProps {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
  align?: "center" | "right";
}

export function PageHero({
  eyebrow,
  title,
  description,
  children,
  align = "center",
}: PageHeroProps) {
  const centered = align === "center";

  return (
    <section
      data-page-hero
      className="relative mb-8 overflow-hidden rounded-[1.75rem] border border-primary/10 bg-gradient-to-br from-[#eef8fc] via-white to-[#e9f6fa] shadow-[0_12px_36px_-24px_rgba(0,74,112,0.28)] md:mb-10 md:rounded-[2rem]"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -end-20 -top-32 h-64 w-64 rounded-full border border-primary/10 bg-primary/[0.025] md:-end-10 md:h-80 md:w-80"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-36 -start-28 h-64 w-64 rounded-full border border-primary/10 md:-start-16 md:h-80 md:w-80"
      />
      <div
        className={`relative z-10 px-6 py-8 sm:px-10 md:px-12 md:py-12 ${centered ? "text-center" : "text-right"}`}
      >
        {eyebrow && (
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white/80 px-3.5 py-1.5 text-xs font-bold text-primary shadow-sm">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-primary" />
            {eyebrow}
          </span>
        )}

        <h1
          className={`text-[1.7rem] font-black leading-[1.4] tracking-tight text-foreground sm:text-4xl md:text-[2.6rem] ${centered ? "mx-auto max-w-4xl" : "max-w-4xl"}`}
        >
          {title}
        </h1>

        <span
          aria-hidden="true"
          className={`mt-4 block h-1 w-12 rounded-full bg-gradient-brand ${centered ? "mx-auto" : ""}`}
        />

        {description && (
          <p
            className={`mt-4 text-sm leading-7 text-muted-foreground sm:text-base sm:leading-8 ${centered ? "mx-auto max-w-2xl" : "max-w-2xl"}`}
          >
            {description}
          </p>
        )}

        {children && <div className={`mt-5 ${centered ? "mx-auto" : ""}`}>{children}</div>}
      </div>
    </section>
  );
}
