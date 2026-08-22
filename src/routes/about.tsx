import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Award,
  Globe,
  Heart,
  Users,
  BookOpenCheck,
  ShieldCheck,
  Truck,
  Lock,
  MapPin,
  Clock,
  CheckCircle,
  Star,
  Package,
  Headphones,
} from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { useEffect } from "react";
import { applySeo } from "@/lib/seo";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "من نحن — اليسر ميديكال | Elysr Medical Group" },
      {
        name: "description",
        content:
          "تعرف على مجموعة اليسر ميديكال: قصتنا، مهمتنا، فريقنا، وكيف أصبحنا الخيار الأول لمنتجات الصحة الزوجية الأصلية في مصر مع شحن سري لـ 27 محافظة.",
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  useEffect(() => {
    applySeo({
      title: "من نحن — اليسر ميديكال | Elysr Medical Group",
      description:
        "تعرف على مجموعة اليسر ميديكال: قصتنا، مهمتنا، فريقنا، وكيف أصبحنا الخيار الأول لمنتجات الصحة الزوجية الأصلية في مصر مع شحن سري لـ 27 محافظة.",
    });
  }, []);

  return (
    <div className="container mx-auto px-4 py-10 md:py-14 max-w-5xl">
      <PageHero
        eyebrow="من نحن"
        title="اليسر ميديكال — Elysr Medical Group"
        description="مجموعة اليسر ميديكال شركة مصرية متخصصة في استيراد وتوزيع منتجات الصحة الزوجية الأصلية. نعمل منذ أكثر من 10 سنوات على توفير منتجات موثوقة بأسعار عادلة مع ضمان الخصوصية التامة لكل عميل."
      />

      {/* ─── القصة ─── */}
      <section className="mt-10 rounded-[2rem] border bg-card p-6 shadow-card md:p-8">
        <h2 className="text-2xl font-black mb-4">قصتنا</h2>
        <div className="space-y-4 text-sm leading-8 text-muted-foreground">
          <p>
            بدأت اليسر ميديكال كمبادرة صغيرة لحل مشكلة حقيقية: صعوبة حصول المصريين على منتجات صحة
            زوجية أصلية بأسعار معقولة وبخصوصية تامة. كان السوق مليئاً بالمنتجات المقلدة والأسعار
            المبالغة والتجارب المحرجة عند الشراء.
          </p>
          <p>
            قررنا أن نغيّر ذلك. أسسنا علاقات مباشرة مع الموردين الأصليين في أوروبا وآسيا، وبنينا
            نظام شحن سري يحترم خصوصية كل عميل، وطوّرنا منصة إلكترونية تجعل تجربة الشراء بسيطة ومريحة
            وآمنة.
          </p>
          <p>
            اليوم، <strong className="text-foreground">أكثر من 50,000 عميل</strong> يثقون بنا عبر كل
            محافظات مصر، ونقدم <strong className="text-foreground">87 منتج أصلي</strong> مع توصيل
            سري لـ <strong className="text-foreground">27 محافظة</strong> والدفع عند الاستلام.
          </p>
        </div>
      </section>

      {/* ─── الأرقام ─── */}
      <section className="mt-8 grid gap-4 grid-cols-2 md:grid-cols-4">
        {[
          { n: "+50,000", label: "عميل يثق بنا", icon: Users },
          { n: "87", label: "منتج أصلي", icon: Package },
          { n: "27", label: "محافظة نغطيها", icon: MapPin },
          { n: "10+", label: "سنوات خبرة", icon: Clock },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border bg-card p-5 text-center shadow-sm">
            <s.icon className="h-6 w-6 mx-auto text-primary mb-2" />
            <div className="text-2xl font-black text-primary">{s.n}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
          </div>
        ))}
      </section>

      {/* ─── المهمة والرؤية ─── */}
      <section className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="rounded-[2rem] border bg-card p-6 shadow-sm">
          <h2 className="text-xl font-black mb-3 flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" /> مهمتنا
          </h2>
          <p className="text-sm leading-8 text-muted-foreground">
            توفير منتجات صحة زوجية أصلية وموثوقة لكل مصري، بأسعار عادلة وشحن سري، مع محتوى تعليمي
            مسؤول يساعد على اتخاذ قرارات مستنيرة. نؤمن بأن الصحة الزوجية جزء أساسي من جودة الحياة
            ولا يجب أن تكون مصدر حرج أو قلق.
          </p>
        </div>
        <div className="rounded-[2rem] border bg-card p-6 shadow-sm">
          <h2 className="text-xl font-black mb-3 flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" /> رؤيتنا
          </h2>
          <p className="text-sm leading-8 text-muted-foreground">
            أن نكون المرجع الأول في العالم العربي لمنتجات الصحة الزوجية الأصلية، بمنصة تجمع بين
            الجودة والمصداقية والخصوصية والمحتوى التعليمي العلمي — حيث يجد كل زوجين ما يحتاجونه بثقة
            واحترام.
          </p>
        </div>
      </section>

      {/* ─── لماذا اليسر ─── */}
      <section className="mt-8 rounded-[2rem] border bg-card p-6 shadow-card md:p-8">
        <h2 className="text-2xl font-black text-center mb-6">لماذا يختارنا أكثر من 50,000 عميل؟</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {[
            {
              icon: CheckCircle,
              t: "100% أصلي ومستورد",
              d: "كل منتج مستورد مباشرة من المصنع الأصلي. لا نتعامل مع وسطاء أو مصادر مجهولة. نوفر صور العبوة الأصلية وكود التحقق عند توفره.",
            },
            {
              icon: Lock,
              t: "خصوصية مطلقة",
              d: "تغليف محايد 100% لا يدل على المحتوى. لا يُكتب اسم المنتج على بوليصة الشحن. المندوب لا يعرف طبيعة الشحنة. بياناتك لا تُشارك مع أي طرف.",
            },
            {
              icon: Truck,
              t: "توصيل لكل مصر",
              d: "القاهرة والجيزة خلال 24-48 ساعة. الإسكندرية 2-3 أيام. باقي المحافظات 3-5 أيام. الدفع عند الاستلام — لا نطلب بيانات دفع إلكتروني.",
            },
            {
              icon: Headphones,
              t: "دعم واتساب فوري",
              d: "فريق دعم متاح على واتساب للإجابة على أسئلتك ومساعدتك في اختيار المنتج المناسب بسرية تامة. تواصل معنا قبل أو بعد الطلب.",
            },
            {
              icon: BookOpenCheck,
              t: "محتوى تعليمي مسؤول",
              d: "51 مقالة توعوية + 108 دليل SEO — كلها مكتوبة بمسؤولية مع مصادر طبية موثوقة وتحذيرات واضحة. لا نقدم وعوداً علاجية ولا نستبدل الطبيب.",
            },
            {
              icon: ShieldCheck,
              t: "نظام امتثال صارم",
              d: "كل منتج مصنّف (أخضر/أصفر/أحمر) بناءً على مكوناته. المنتجات عالية الحساسية تحمل تحذيرات واضحة. لا نروّج لمنتجات بادعاءات طبية مبالغة.",
            },
          ].map((x) => (
            <div key={x.t} className="rounded-2xl border bg-background p-5 flex items-start gap-4">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent text-primary">
                <x.icon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-bold mb-1">{x.t}</h3>
                <p className="text-sm text-muted-foreground leading-7">{x.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── الفريق ─── */}
      <section className="mt-8 rounded-[2rem] border bg-card p-6 shadow-card md:p-8">
        <h2 className="text-2xl font-black text-center mb-2">فريق العمل</h2>
        <p className="text-center text-sm text-muted-foreground mb-6 max-w-2xl mx-auto">
          يعمل خلف اليسر ميديكال فريق متكامل يضمن جودة كل خطوة من الاستيراد للتوصيل
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              icon: Globe,
              title: "فريق الاستيراد والجودة",
              desc: "مسؤول عن العلاقات مع الموردين الأصليين في أوروبا وآسيا، فحص جودة الشحنات، والتأكد من أصالة كل منتج قبل عرضه.",
            },
            {
              icon: BookOpenCheck,
              title: "فريق المحتوى والمراجعة",
              desc: "يكتب المحتوى التعليمي ووصف المنتجات مع مراجعة التحذيرات الطبية والمصادر. يلتزم بسياسة عدم تقديم وعود علاجية.",
            },
            {
              icon: Headphones,
              title: "فريق خدمة العملاء",
              desc: "متاح على واتساب للإجابة عن الاستفسارات، المساعدة في اختيار المنتج، ومتابعة الطلبات والشحنات بسرية تامة.",
            },
          ].map((t) => (
            <div key={t.title} className="rounded-2xl border bg-background p-5 text-center">
              <t.icon className="h-8 w-8 mx-auto text-primary mb-3" />
              <h3 className="font-bold mb-2">{t.title}</h3>
              <p className="text-sm text-muted-foreground leading-7">{t.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── E-E-A-T ─── */}
      <section className="mt-8 rounded-[2rem] border border-primary/10 bg-gradient-soft p-6 shadow-sm md:p-8">
        <div className="mb-5 text-center">
          <span className="rounded-full bg-accent px-4 py-1.5 text-xs font-bold text-primary">
            E-E-A-T
          </span>
          <h2 className="mt-3 text-2xl font-black">بيانات الثقة والمصداقية</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
            نلتزم بمعايير Google E-E-A-T (الخبرة — التخصص — السلطة — الثقة) في كل محتوى ننشره
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {[
            {
              icon: Award,
              t: "الخبرة (Experience)",
              d: "أكثر من 10 سنوات في سوق منتجات الصحة الزوجية. تعاملنا مع آلاف الحالات والاستفسارات مما أعطانا فهماً عميقاً لاحتياجات العملاء.",
            },
            {
              icon: BookOpenCheck,
              t: "التخصص (Expertise)",
              d: "فريق متخصص في تبسيط المعلومات الصحية. 51 مقالة توعوية بمصادر من WHO وMayo Clinic وCleveland Clinic. نظام تصنيف منتجات (أخضر/أصفر/أحمر).",
            },
            {
              icon: Globe,
              t: "السلطة (Authoritativeness)",
              d: "شراكات مباشرة مع الموردين الأصليين. سجل تجاري مصري. أكثر من 50,000 عميل. حضور رقمي موثوق مع مراجعات حقيقية من عملاء سابقين.",
            },
            {
              icon: ShieldCheck,
              t: "الثقة (Trustworthiness)",
              d: "شحن سري 100%. دفع عند الاستلام (صفر مخاطر). ضمان استرجاع 14 يوماً. شفافية في التحذيرات الطبية. لا وعود علاجية.",
            },
          ].map((x) => (
            <div key={x.t} className="rounded-2xl border bg-card p-5">
              <span className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-accent text-primary">
                <x.icon className="h-5 w-5" />
              </span>
              <h3 className="font-black">{x.t}</h3>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">{x.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── روابط ─── */}
      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <Link
          to="/medical-review-board"
          className="rounded-2xl border bg-card p-5 text-center hover:border-primary/30 transition-all group"
        >
          <ShieldCheck className="h-8 w-8 mx-auto text-primary mb-2 group-hover:scale-110 transition-transform" />
          <h3 className="font-bold">سياسة المراجعة الطبية</h3>
          <p className="text-xs text-muted-foreground mt-1">كيف نراجع المحتوى والتحذيرات</p>
        </Link>
        <Link
          to="/education"
          className="rounded-2xl border bg-card p-5 text-center hover:border-primary/30 transition-all group"
        >
          <BookOpenCheck className="h-8 w-8 mx-auto text-primary mb-2 group-hover:scale-110 transition-transform" />
          <h3 className="font-bold">المقالات التعليمية</h3>
          <p className="text-xs text-muted-foreground mt-1">51 مقالة توعوية بمصادر موثوقة</p>
        </Link>
        <Link
          to="/contact"
          className="rounded-2xl border bg-card p-5 text-center hover:border-primary/30 transition-all group"
        >
          <Headphones className="h-8 w-8 mx-auto text-primary mb-2 group-hover:scale-110 transition-transform" />
          <h3 className="font-bold">تواصل معنا</h3>
          <p className="text-xs text-muted-foreground mt-1">واتساب + بريد إلكتروني</p>
        </Link>
      </section>
    </div>
  );
}
