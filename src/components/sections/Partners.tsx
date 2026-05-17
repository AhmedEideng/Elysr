const insurances = ["MetLife", "AXA", "Bupa", "GIG Insurance", "Allianz"];
const payments = ["Mastercard", "Visa", "InstaPay", "Orange Money", "Vodafone Cash"];

export function Partners() {
  return (
    <section className="py-8 md:py-10 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-muted-foreground">
            شركاؤنا الموثوقون
          </h2>
        </div>

        <div className="max-w-4xl mx-auto mb-6">
          <h3 className="text-center text-base font-semibold text-foreground/70 mb-5">
            التأمين الصحي
          </h3>
          <div className="flex flex-wrap justify-center gap-4">
            {insurances.map((n) => (
              <span
                key={n}
                className="rounded-2xl bg-card border shadow-card px-7 py-4 text-base font-bold transition-smooth hover:border-primary hover:text-primary hover:-translate-y-0.5"
              >
                {n}
              </span>
            ))}
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          <h3 className="text-center text-base font-semibold text-foreground/70 mb-5">
            وسائل الدفع
          </h3>
          <div className="flex flex-wrap justify-center gap-4">
            {payments.map((n) => (
              <span
                key={n}
                className="rounded-2xl bg-card border shadow-card px-7 py-4 text-base font-bold transition-smooth hover:border-primary hover:text-primary hover:-translate-y-0.5"
              >
                {n}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
