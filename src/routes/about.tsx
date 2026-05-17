import { createFileRoute } from "@tanstack/react-router";
import { Award, Globe, Heart, Users } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({ meta: [{ title: "من نحن — اليسر ميديكال" }] }),
  component: () => (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <h1 className="text-4xl md:text-5xl font-bold text-center">من نحن</h1>
      <p className="mt-6 text-lg text-muted-foreground leading-loose text-center">
        مجموعة اليسر ميديكال (Elysr Medical Group) شركة رائدة في استيراد وتوزيع المنتجات الطبية
        والصحية في مصر والشرق الأوسط. نؤمن بأن الصحة حق للجميع، ونعمل على تقديم أفضل المنتجات
        العالمية بأسعار الاستيراد المباشر.
      </p>
      <div className="grid gap-6 md:grid-cols-2 mt-12">
        {[
          { icon: Award, t: "خبرة تتجاوز 10 سنوات", d: "في مجال المنتجات الطبية والصحية" },
          { icon: Globe, t: "شراكات عالمية", d: "مع كبار الموردين في أوروبا وآسيا" },
          { icon: Heart, t: "أكثر من 50,000 عميل", d: "يثقون بنا حول الجمهورية" },
          { icon: Users, t: "فريق طبي مدرّب", d: "لخدمتك على مدار الساعة" },
        ].map((x) => (
          <div key={x.t} className="rounded-2xl border bg-card p-6 flex items-start gap-4">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-brand text-primary-foreground">
              <x.icon className="h-6 w-6" />
            </span>
            <div>
              <h3 className="font-bold mb-1">{x.t}</h3>
              <p className="text-sm text-muted-foreground">{x.d}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  ),
});
