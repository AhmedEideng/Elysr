import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

const productFAQs: FAQItem[] = [
  {
    question: "هل التغليف سري؟",
    answer:
      "نعم، نحن نولي أهمية قصوى للخصوصية. يتم شحن جميع الطلبات في تغليف سادة وغير شفاف تماماً، لا يحتوي على أي صور أو كلمات تدل على المحتوى، كما أن اسم المنتج لا يُكتب على بوليصة الشحن الخارجية لضمان سرية طلبك.",
  },
  {
    question: "كم يستغرق الشحن؟",
    answer:
      "يتم التوصيل داخل القاهرة والجيزة خلال 24-48 ساعة عمل. أما باقي محافظات الجمهورية فيستغرق الشحن من 2 إلى 4 أيام عمل كحد أقصى.",
  },
  {
    question: "كيف يمكنني الدفع؟",
    answer:
      "نوفر خدمة الدفع عند الاستلام لجميع محافظات مصر، وذلك لضمان أعلى درجات الثقة والأمان لعملائنا. يمكنك معاينة الشحنة من الخارج قبل الدفع للمندوب.",
  },
  {
    question: "هل المنتجات أصلية؟",
    answer:
      "بكل تأكيد. جميع منتجاتنا أصلية 100% ومستوردة من مصادرها الرسمية. نحن في اليسر ميديكال نضع جودة المنتج وصحة العميل كأولوية قصوى ولا نتعامل مع أي منتجات مجهولة المصدر.",
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="mt-16 border-t pt-12">
      <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">الأسئلة الشائعة</h2>
      <div className="max-w-2xl mx-auto space-y-4">
        {productFAQs.map((faq, index) => (
          <div key={index} className="rounded-2xl border bg-card overflow-hidden transition-smooth">
            <button
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
              className="w-full flex items-center justify-between p-5 text-right font-bold hover:bg-accent/50 transition-smooth"
            >
              <span className="text-base md:text-lg">{faq.question}</span>
              <ChevronDown
                className={`h-5 w-5 text-primary transition-transform duration-300 ${openIndex === index ? "rotate-180" : ""}`}
              />
            </button>
            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                openIndex === index ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              <div className="p-5 pt-0 text-muted-foreground leading-relaxed text-sm md:text-base">
                {faq.answer}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
