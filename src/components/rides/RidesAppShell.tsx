import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { MyCityUnlockModal } from "@/components/my-city/MyCityUnlockModal";
import { PaywallHost } from "@/components/plus/Paywall";
import { ProfileProvider } from "@/contexts/ProfileContext";
import { RidesTopBar } from "./RidesTopBar";

// Frames a public ride page with the same navigation the app uses:
// the left sidebar on desktop, the bottom bar on mobile, and the top bar
// with the logo, theme toggle and profile photo.
export function RidesAppShell({ children }: { children: ReactNode }) {
  return (
    <ProfileProvider>
      <div className="min-h-dvh flex w-full bg-background overflow-x-hidden">
        <DesktopSidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
          <RidesTopBar />
          <main className="flex-1 min-w-0">{children}</main>
          <footer className="py-4 px-4 text-center text-xs text-muted-foreground border-t border-border mb-20 md:mb-0">
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <span className="mx-2">·</span>
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
          </footer>
        </div>
        <MobileNav />
        <MyCityUnlockModal />
        <PaywallHost />
      </div>
    </ProfileProvider>
  );
}
