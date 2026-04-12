import { Link, Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MobileNav } from "./MobileNav";
import { DesktopSidebar } from "./DesktopSidebar";
import { TopBar } from "./TopBar";
import { ScrollToTop } from "./ScrollToTop";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { ProfileProvider } from "@/contexts/ProfileContext";

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] },
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: { duration: 0.15 },
  },
};

export function AppLayout() {
  const location = useLocation();
  const isAskPage = location.pathname === "/app/ask";

  return (
    <ProfileProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DesktopSidebar />
        <div className="flex-1 flex flex-col min-h-screen">
          {!isAskPage && <TopBar />}
          <main className={`flex-1 ${isAskPage ? "" : "pb-20 md:pb-0"}`}>
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="h-full"
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </main>
          {!isAskPage && (
            <footer className="py-4 px-4 text-center text-xs text-muted-foreground border-t border-border mb-16 md:mb-0">
              <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
              <span className="mx-2">·</span>
              <Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
            </footer>
          )}
        </div>
        {!isAskPage && <MobileNav />}
        {!isAskPage && <ScrollToTop />}
        <PWAInstallPrompt />
      </div>
    </ProfileProvider>
  );
}
