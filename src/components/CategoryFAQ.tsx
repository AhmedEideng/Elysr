export interface CategoryFAQItem {
  question: string;
  answer: string;
}

export function CategoryFAQ({
  items,
  title = "أسئلة شائعة",
  description = "إجابات مختصرة تساعدك على اختيار المنتج المناسب بأمان وخصوصية.",
}: {
  items: CategoryFAQItem[];
  title?: string;
  description?: string;
}) {
  return (
    <section
      id="faq"
      className="mt-14 scroll-mt-20 rounded-[2rem] border border-primary/10 bg-card p-5 shadow-card md:p-8"
    >
      <div className="mx-auto mb-6 max-w-2xl text-center">
        <span className="mb-3 inline-flex rounded-full bg-accent px-4 py-1.5 text-xs font-bold text-primary">
          FAQ
        </span>
        <h2 className="text-2xl font-black md:text-3xl">{title}</h2>
        <p className="mt-3 text-sm leading-7 text-muted-foreground md:text-base">{description}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {items.map((item) => (
          <details
            key={item.question}
            className="group rounded-2xl border border-primary/10 bg-background p-4 transition-smooth open:border-primary/30 open:bg-accent/20"
          >
            <summary className="cursor-pointer list-none text-sm font-bold leading-7 text-foreground marker:hidden">
              <span className="inline-flex w-[calc(100%-2rem)] align-top">{item.question}</span>
              <span className="float-left inline-flex h-7 w-7 items-center justify-center rounded-full bg-accent text-primary transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
