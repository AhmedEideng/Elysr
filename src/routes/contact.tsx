import { createFileRoute } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { waLink } from "@/lib/whatsapp";

export const Route = createFileRoute("/contact")({
  head: () => ({ meta: [{ title: "تواصل معنا — اليسر ميديكال" }] }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <div className="container mx-auto px-4 py-10 md:py-12 max-w-4xl">
      <PageHero
        eyebrow="خدمة العملاء"
        title="تواصل معنا"
        description="التواصل متاح عبر واتساب فقط لضمان سرعة الرد، الخصوصية، والمتابعة المباشرة مع فريق اليسر ميديكال."
      />

      <div className="mt-8 flex justify-center">
        <a
          href={waLink("مرحباً، أرغب في التواصل مع اليسر ميديكال")}
          target="_blank"
          rel="noreferrer"
          className="group flex w-full max-w-md flex-col items-center rounded-[2rem] border bg-card p-8 text-center shadow-card transition-smooth hover:-translate-y-1 hover:shadow-elegant"
        >
          <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-[#25D366] text-white transition-smooth group-hover:scale-110">
            <MessageCircle className="h-8 w-8" />
          </span>
          <span className="mt-4 text-xl font-bold">تواصل عبر واتساب</span>
          <span className="mt-2 text-sm text-muted-foreground">اضغط هنا لفتح المحادثة مباشرة</span>
        </a>
      </div>
    </div>
  );
}
