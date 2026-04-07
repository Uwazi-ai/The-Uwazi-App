import { Outlet } from "react-router-dom";
import { MobileNav } from "./MobileNav";
import { DesktopSidebar } from "./DesktopSidebar";
import { TopBar } from "./TopBar";
import { ProfileProvider } from "@/contexts/ProfileContext";

export function AppLayout() {
  return (
    <ProfileProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DesktopSidebar />
        <div className="flex-1 flex flex-col min-h-screen">
          <TopBar />
          <main className="flex-1 pb-20 md:pb-0">
            <Outlet />
          </main>
        </div>
        <MobileNav />
      </div>
    </ProfileProvider>
  );
}
