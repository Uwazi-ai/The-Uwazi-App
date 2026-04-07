import { Outlet, useLocation } from "react-router-dom";
import { MobileNav } from "./MobileNav";
import { DesktopSidebar } from "./DesktopSidebar";
import { TopBar } from "./TopBar";
import { ScrollToTop } from "./ScrollToTop";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { ProfileProvider } from "@/contexts/ProfileContext";

export function AppLayout() {
  const location = useLocation();
  const isAskPage = location.pathname === "/ask";

  return (
    <ProfileProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DesktopSidebar />
        <div className="flex-1 flex flex-col min-h-screen">
          {!isAskPage && <TopBar />}
          <main className={`flex-1 ${isAskPage ? "" : "pb-20 md:pb-0"}`}>
            <Outlet />
          </main>
        </div>
        {!isAskPage && <MobileNav />}
        {!isAskPage && <ScrollToTop />}
      </div>
    </ProfileProvider>
  );
}
