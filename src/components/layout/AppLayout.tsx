import { Outlet } from "react-router-dom";
import { MobileNav } from "./MobileNav";
import { DesktopSidebar } from "./DesktopSidebar";

export function AppLayout() {
  return (
    <div className="min-h-screen flex w-full bg-background">
      <DesktopSidebar />
      <main className="flex-1 min-h-screen pb-20 md:pb-0">
        <Outlet />
      </main>
      <MobileNav />
    </div>
  );
}
