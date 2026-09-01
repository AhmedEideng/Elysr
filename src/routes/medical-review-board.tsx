import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CalendarCheck,
  FileText,
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Eye,
  Layers,
  PenTool,
  Scale,
} from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { useEffect } from "react";
import { applySeo } from "@/lib/seo";

export const Route = createFileRoute("/medical-review-board")({
  head: () => ({
    meta: [
      {
        title: "سياسة المراجعة الطبية والتحريرية — اليسر ميديكال",
      },
      {
        name: "description",
        content:
          "تعرف على منهج اليسر ميديكال في كتابة ومراجعة المحتوى الصحي: من يكتب، من يراجع، ما المصادر، وكيف نضمن دقة التحذيرات والمعلومات.",
      },
    ],
  }),
  component: MedicalReviewBoardPage,
});

function MedicalReviewBoardPage() {
  useEffect(() => {
    applySeo({
      title: "سياسة المراجعة الطبية والتحريرية — اليسر ميديكال",
      description:
        "تعرف على منهج اليسر ميديكال في كتابة ومراجعة المحتوى الصحي: من يكتب، من يراجع، ما المصادر، وكيف نضمن دقة التحذيرات والمعلومات.",
    });
  }, []);

  return (
    <div className="container mx-auto max-w-5xl px-4 py-10 md:py-14">
      <PageHero
        eyebrow="المراجعة الطبية والتحريرية"
        title="سياسة مراجعة المحتوى والسلامة"
        description="نلتزم بتقديم محتوى صحي دقيق ومسؤول. هذه الصفحة توضح بالتفصيل كيف نكتب ونراجع وننشر المحتوى، وما المصادر التي نعتمد عليها، وأين تقع حدود مسؤوليتنا."
      />

      {/* ─── العملية التحريرية ─── */}
      <section className="mt-10 rounded-[2rem] border bg-card p-6 shadow-card md:p-8">
        <h2 className="text-2xl font-black text-center mb-2">
          العملية التحريرية — من الفكرة للنشر
        </h2>
        <p className="text-center text-sm text-muted-foreground mb-6 max-w-2xl mx-auto">
          كل محتوى ننشره يمر بـ 5 مراحل قبل أن يصل إليك
        </p>

        <div className="grid gap-4 md:grid-cols-5">
          {[
            {
              step: "1",
              icon: PenTool,
              t: "البحث والكتابة",
              d: "يجمع فريق المحتوى المعلومات من مصادر طبية موثوقة ويكتب المسودة الأولى",
            },
            {
              step: "2",
              icon: Eye,
              t: "مراجعة الدقة",
              d: "فحص كل ادعاء صحي والتأكد من وجود مصدر علمي يدعمه",
            },
            {
              step: "3",
              icon: ShieldCheck,
              t: "مراجعة السلامة",
              d: "إضافة التحذيرات الطبية وحذف أي وعود علاجية أو مبالغات",
            },
            {
              step: "4",
              icon: Scale,
              t: "فحص الامتثال",
              d: "تصنيف المنتجات (أخضر/أصفر/أحمر) وضبط مستوى الترويج",
            },
            {
              step: "5",
              icon: CalendarCheck,
              t: "النشر والتحديث",
              d: "النشر مع تاريخ واضح ومراجعة دورية كل 3-6 أشهر",
            },
          ].map((s) => (
            <div key={s.step} className="rounded-2xl border bg-background p-4 text-center">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-black text-sm mb-2">
                {s.step}
              </div>
              <s.icon className="h-5 w-5 mx-auto text-primary mb-2" />
              <h3 className="font-bold text-sm">{s.t}</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-5">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── من يكتب ومن يراجع ─── */}
      <section className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="rounded-[2rem] border bg-card p-6 shadow-sm">
          <FileText className="h-8 w-8 text-primary mb-3" />
          <h2 className="text-xl font-black mb-3">من يكتب المحتوى؟</h2>
          <div className="space-y-3 text-sm leading-7 text-muted-foreground">
            <p>
              <strong className="text-foreground">فريق المحتوى الصحي — اليسر ميديكال</strong>
            </p>
            <p>
              فريق متخصص في تبسيط المعلومات الصحية والزوجية باللغة العربية. يعتمد على بيانات
              المنتجات الأصلية ومصادر طبية عامة موثوقة (WHO, Mayo Clinic, Cleveland Clinic,
              MedlinePlus) مع صياغة واضحة تناسب القارئ العربي.
            </p>
            <p>كل مقالة تحمل اسم الكاتب/الفريق وتاريخ النشر وآخر تحديث.</p>
          </div>
        </div>
        <div className="rounded-[2rem] border bg-card p-6 shadow-sm">
          <ShieldCheck className="h-8 w-8 text-primary mb-3" />
          <h2 className="text-xl font-black mb-3">من يراجع المحتوى؟</h2>
          <div className="space-y-3 text-sm leading-7 text-muted-foreground">
            <p>
              <strong className="text-foreground">فريق المراجعة الداخلية — اليسر ميديكال</strong>
            </p>
            <p>
              مسؤول عن مراجعة السلامة والتحذيرات وطريقة عرض المعلومات. يتأكد من عدم وجود وعود علاجية
              مبالغة، ومن وضوح التحذيرات الخاصة بالأمراض المزمنة وتداخلات الأدوية والحمل والرضاعة.
            </p>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
              <strong>ملاحظة شفافية:</strong> إذا تم تعيين مراجع طبي أو صيدلي مرخّص باسم واضح ورقم
              ترخيص، سيتم عرض بياناته هنا وعلى صفحات المقالات. حتى ذلك الوقت، المراجعة داخلية تركز
              على السلامة والتحذيرات.
            </div>
          </div>
        </div>
      </section>

      {/* ─── المصادر العلمية ─── */}
      <section className="mt-8 rounded-[2rem] border bg-card p-6 shadow-card md:p-8">
        <h2 className="text-2xl font-black text-center mb-2">المصادر العلمية المعتمدة</h2>
        <p className="text-center text-sm text-muted-foreground mb-6">
          نعتمد على مصادر طبية عالمية موثوقة ومحكّمة
        </p>

        <div className="grid gap-3 md:grid-cols-2">
          {[
            {
              name: "World Health Organization (WHO)",
              url: "https://www.who.int/health-topics/sexual-health",
              desc: "تعريفات ومعايير الصحة الجنسية العالمية",
            },
            {
              name: "Mayo Clinic",
              url: "https://www.mayoclinic.org",
              desc: "أدلة الأمراض والعلاجات المبنية على الأدلة",
            },
            {
              name: "Cleveland Clinic",
              url: "https://my.clevelandclinic.org",
              desc: "معلومات صحية موثوقة للمرضى والمهنيين",
            },
            {
              name: "MedlinePlus (U.S. NLM)",
              url: "https://medlineplus.gov",
              desc: "المكتبة الوطنية الأمريكية للطب — معلومات للمرضى",
            },
            {
              name: "NIH Office of Dietary Supplements",
              url: "https://ods.od.nih.gov",
              desc: "معلومات علمية عن المكملات الغذائية",
            },
            {
              name: "CDC (Centers for Disease Control)",
              url: "https://www.cdc.gov",
              desc: "الوقاية والأمراض المنقولة جنسياً",
            },
          ].map((s) => (
            <a
              key={s.name}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border bg-background p-4 flex items-start gap-3 hover:border-primary/30 transition-all group"
            >
              <ExternalLink className="h-4 w-4 mt-1 text-primary shrink-0 group-hover:scale-110 transition-transform" />
              <div>
                <h3 className="font-bold text-sm">{s.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
              </div>
            </a>
          ))}
        </div>

        <p className="mt-4 text-xs text-muted-foreground text-center leading-6">
          كل مقالة تحتوي على قسم "المصادر" في نهايتها مع روابط مباشرة للمصادر المستخدمة. نراجع
          صلاحية الروابط دورياً ونحدثها عند التغيير.
        </p>
      </section>

      {/* ─── سياسة التحرير ─── */}
      <section className="mt-8 rounded-[2rem] border bg-card p-6 shadow-card md:p-8">
        <h2 className="text-2xl font-black text-center mb-6">سياسة التحرير والمحتوى</h2>

        <div className="space-y-6">
          {[
            {
              icon: CheckCircle,
              title: "ما نلتزم به",
              items: [
                "دقة المعلومات الصحية العامة مع ذكر المصادر",
                "وضوح التحذيرات الطبية في كل صفحة منتج",
                "التمييز بين المعلومات التوعوية والادعاءات التسويقية",
                "تحديث المحتوى عند ظهور معلومات جديدة",
                "عرض تاريخ النشر وآخر تحديث على كل مقالة",
                "تصنيف المنتجات بنظام الامتثال (أخضر/أصفر/أحمر)",
              ],
            },
            {
              icon: AlertTriangle,
              title: "ما لا نفعله",
              items: [
                "لا نقدم تشخيصاً طبياً أو وصفة علاجية",
                "لا نعد بنتائج مضمونة أو شفاء أكيد",
                "لا نشجع على استخدام المنتجات بدون قراءة التعليمات",
                "لا نخفي الآثار الجانبية أو التحذيرات",
                "لا ننسب محتوى لأطباء وهميين أو شهادات مزيفة",
                "لا نروّج لمنتجات RED (عالية الحساسية) في الإعلانات",
              ],
            },
          ].map((section) => (
            <div key={section.title}>
              <h3 className="font-black text-lg flex items-center gap-2 mb-3">
                <section.icon className="h-5 w-5 text-primary" /> {section.title}
              </h3>
              <ul className="grid gap-2 md:grid-cols-2">
                {section.items.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-sm text-muted-foreground leading-7"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ─── إبلاغ عن خطأ ─── */}
      <section className="mt-8 rounded-[2rem] border border-primary/10 bg-gradient-soft p-6 text-center shadow-sm md:p-8">
        <Layers className="h-8 w-8 mx-auto text-primary mb-3" />
        <h2 className="text-xl font-black">وجدت خطأ أو معلومة غير دقيقة؟</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-muted-foreground">
          نرحب بملاحظاتك. إذا وجدت معلومة طبية غير دقيقة أو تحذيراً ناقصاً أو رابط مصدر معطّل، تواصل
          معنا فوراً وسنراجع ونحدّث المحتوى خلال 48 ساعة.
        </p>
        <a
          href="https://wa.me/201098088206?text=%D9%85%D9%84%D8%A7%D8%AD%D8%B8%D8%A9%20%D8%B9%D9%84%D9%89%20%D8%A7%D9%84%D9%85%D8%AD%D8%AA%D9%88%D9%89"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex rounded-full bg-gradient-brand px-6 py-3 text-sm font-black text-primary-foreground"
        >
          إبلاغ عبر واتساب
        </a>
      </section>

      {/* ─── روابط ─── */}
      <section className="mt-8 grid gap-4 md:grid-cols-2">
        <Link
          to="/about"
          className="rounded-2xl border bg-card p-5 text-center hover:border-primary/30 transition-all"
        >
          <h3 className="font-bold">← من نحن</h3>
          <p className="text-xs text-muted-foreground mt-1">تعرف على اليسر ميديكال</p>
        </Link>
        <Link
          to="/education"
          className="rounded-2xl border bg-card p-5 text-center hover:border-primary/30 transition-all"
        >
          <h3 className="font-bold">المقالات التعليمية →</h3>
          <p className="text-xs text-muted-foreground mt-1">51 مقالة توعوية بمصادر موثوقة</p>
        </Link>
      </section>
    </div>
  );
}
