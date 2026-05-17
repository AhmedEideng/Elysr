import { createFileRoute } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { waLink } from "@/lib/whatsapp";

export const Route = createFileRoute("/contact")({
  head: () => ({ meta: [{ title: "تواصل معنا — اليسر ميديكال" }] }),
  component: () => (
    <div className="container mx-auto px-4 py-16 max-w-3xl">
      <h1 className="text-4xl md:text-5xl font-bold text-center">تواصل معنا</h1>
      <p className="mt-3 text-center text-muted-foreground">
        التواصل متاح عبر واتساب فقط لضمان سرعة الرد والمتابعة
      </p>
      <div className="mt-10 flex justify-center">
        <a
          href={waLink("مرحباً، أرغب في التواصل مع اليسر ميديكال")}
          target="_blank"
          rel="noreferrer"
          className="group flex w-full max-w-md flex-col items-center rounded-3xl border bg-card p-8 text-center shadow-card transition-smooth hover:-translate-y-1 hover:shadow-elegant"
        >
          <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-[#25D366] text-white transition-smooth group-hover:scale-110">
            <MessageCircle className="h-8 w-8" />
          </span>
          <span className="mt-4 text-xl font-bold">تواصل عبر واتساب</span>
          <span className="mt-2 text-sm text-muted-foreground">اضغط هنا لفتح المحادثة مباشرة</span>
        </a>
      </div>
    </div>
  ),
});
