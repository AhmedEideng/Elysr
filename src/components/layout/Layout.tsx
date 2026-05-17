import { Header } from "./Header";
import { Footer } from "./Footer";
import { FloatingActions } from "@/components/FloatingActions";
import { BackToTop } from "@/components/BackToTop";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <FloatingActions />
      <BackToTop />
    </div>
  );
}
