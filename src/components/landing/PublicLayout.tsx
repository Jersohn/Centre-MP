import { ReactNode, useEffect } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { MobileBottomNav } from "./MobileBottomNav";
import { InstallBanner } from "./InstallBanner";
import { PublicSiteChatbot } from "../ai/PublicSiteChatbot";
import { loadContent } from "../../services/contentService";

type PublicLayoutProps = {
  children: ReactNode;
};

export function PublicLayout({ children }: PublicLayoutProps) {
  useEffect(() => {
    loadContent();
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <Header />
      <main className="page-content safe-pb pt-20">{children}</main>
      <Footer />
      <InstallBanner />
      <MobileBottomNav />
      <PublicSiteChatbot />
    </div>
  );
}
