import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useProfile } from "@/contexts/ProfileContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  HomeIcon, LearnIcon, AskUwaziIcon, VotingHubIcon,
  CivicFeedIcon, LegislationIcon, ProgressIcon,
  SavedIcon, SettingsIcon, MoreIcon,
} from "@/components/icons/UwaziIcons";

const navItems = [
  { to: "/", icon: HomeIcon, label: "Home" },
  { to: "/learn", icon: LearnIcon, label: "Learn" },
  { to: "/ask", icon: AskUwaziIcon, label: "Ask" },
  { to: "/vote", icon: VotingHubIcon, label: "Vote" },
];

const moreItems = [
  { to: "/civic-feed", icon: CivicFeedIcon, label: "Civic Feed" },
  { to: "/legislation", icon: LegislationIcon, label: "Legislation" },
  { to: "/progress", icon: ProgressIcon, label: "Progress" },
  { to: "/saved", icon: SavedIcon, label: "Saved" },
  { to: "/settings", icon: SettingsIcon, label: "Settings" },
];

export function MobileNav() {
  const { displayName, avatarUrl } = useProfile();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      {/* More drawer overlay */}
      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] md:hidden"
              onClick={() => setMoreOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed bottom-[64px] left-0 right-0 z-[61] md:hidden rounded-t-2xl p-4"
              style={{
                background: "var(--sidebar-bg)",
                backdropFilter: "blur(30px) saturate(200%)",
                WebkitBackdropFilter: "blur(30px) saturate(200%)",
                borderTop: "1px solid var(--border-subtle)",
                paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom))",
              }}
            >
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mx-auto mb-4" />
              <div className="grid grid-cols-3 gap-2">
                {moreItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMoreOpen(false)}
                    className={({ isActive }) =>
                      `flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl text-xs font-medium transition-all duration-150 ${
                        isActive ? "bg-primary/[0.12] text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`
                    }
                  >
                    <item.icon size={22} />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom nav bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
        style={{
          background: "var(--sidebar-bg)",
          backdropFilter: "blur(30px) saturate(200%)",
          WebkitBackdropFilter: "blur(30px) saturate(200%)",
          borderTop: "1px solid var(--border-subtle)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}>
        <div className="flex items-center justify-around px-2 h-16">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `bottom-nav-item flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-medium tracking-[0.02em] transition-all duration-150 ${
                  isActive ? "active text-primary" : "text-muted-foreground"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`p-1 rounded-lg transition-colors ${isActive ? "bg-primary/[0.12]" : ""}`}>
                    <item.icon size={22} />
                  </div>
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
          <button
            onClick={() => setMoreOpen(!moreOpen)}
            className={`bottom-nav-item flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-medium tracking-[0.02em] transition-all duration-150 ${
              moreOpen ? "active text-primary" : "text-muted-foreground"
            }`}
          >
            <div className={`p-1 rounded-lg transition-colors ${moreOpen ? "bg-primary/[0.12]" : ""}`}>
              <MoreIcon size={22} />
            </div>
            <span>More</span>
          </button>
        </div>
      </nav>
    </>
  );
}
