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
    <section className="relative overflow-hidden rounded-2xl border border-primary/10 bg-gradient-to-b from-primary/5 to-transparent mb-6 md:mb-8">
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-brand" aria-hidden />

      <div className={`px-5 py-5 md:px-8 md:py-7 ${centered ? "text-center" : "text-right"}`}>
        {eyebrow && (
          <span className="inline-flex items-center rounded-full bg-accent/80 px-3 py-1 text-[11px] font-black text-primary mb-2">
            {eyebrow}
          </span>
        )}

        <h1 className="text-2xl md:text-3xl font-black tracking-tight leading-tight text-foreground">
          {title}
        </h1>

        {description && (
          <p
            className={`mt-2 text-sm md:text-base leading-7 text-muted-foreground ${centered ? "mx-auto max-w-2xl" : "max-w-2xl"}`}
          >
            {description}
          </p>
        )}

        {children && <div className={`mt-3 ${centered ? "mx-auto" : ""}`}>{children}</div>}
      </div>
    </section>
  );
}
