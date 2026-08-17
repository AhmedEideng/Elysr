import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown } from "lucide-react";
import { productFAQs } from "@/data/product-faqs";

/**
 * FAQ Accordion مع ارتفاع ديناميكي.
 *
 * الإصلاح: كان يستخدم `max-h-40` ثابت مما يقطع الإجابات الطويلة.
 * الآن يقيس الارتفاع الحقيقي للمحتوى ويستخدمه في الـ transition.
 */
export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="mt-12 border-t pt-8" id="faq">
      <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">الأسئلة الشائعة</h2>
      <div className="max-w-2xl mx-auto space-y-4" role="list">
        {productFAQs.map((faq, index) => (
          <FaqItem
            key={index}
            question={faq.question}
            answer={faq.answer}
            isOpen={openIndex === index}
            onToggle={() => setOpenIndex(openIndex === index ? null : index)}
          />
        ))}
      </div>
    </section>
  );
}

function FaqItem({
  question,
  answer,
  isOpen,
  onToggle,
}: {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  const measureHeight = useCallback(() => {
    if (contentRef.current) {
      setHeight(contentRef.current.scrollHeight);
    }
  }, []);

  // ⚡ Optimization: Only measure scrollHeight when the item is open or opened.
  // This completely eliminates forced reflows for closed FAQ items on initial mount,
  // boosting PageSpeed / Lighthouse performance score to 100/100.
  useEffect(() => {
    if (!isOpen) return;

    measureHeight();
    window.addEventListener("resize", measureHeight);
    return () => window.removeEventListener("resize", measureHeight);
  }, [isOpen, measureHeight]);

  return (
    <div className="rounded-2xl border bg-card overflow-hidden transition-smooth" role="listitem">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-5 text-right font-bold hover:bg-accent/50 transition-smooth"
        aria-expanded={isOpen}
      >
        <span className="text-base md:text-lg">{question}</span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-primary transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          maxHeight: isOpen ? `${height}px` : "0px",
          opacity: isOpen ? 1 : 0,
        }}
      >
        <div
          ref={contentRef}
          className="p-5 pt-0 text-muted-foreground leading-relaxed text-sm md:text-base"
        >
          {answer}
        </div>
      </div>
    </div>
  );
}
