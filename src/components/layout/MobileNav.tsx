import { useState } from "react";
import { NavLink } from "react-router-dom";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ChevronRight } from "lucide-react";
import {
  HomeIcon, LearnIcon, WatchIcon, AskUwaziIcon, VotingHubIcon,
  LegislationIcon, ProgressIcon,
  SavedIcon, SettingsIcon, MoreIcon,
} from "@/components/icons/UwaziIcons";

const navItems = [
  { to: "/app", icon: HomeIcon, label: "Home" },
  { to: "/app/learn", icon: LearnIcon, label: "Learn" },
  { to: "/app/watch", icon: WatchIcon, label: "Watch" },
  { to: "/app/ask", icon: AskUwaziIcon, label: "Ask" },
  { to: "/app/vote", icon: VotingHubIcon, label: "Vote" },
];

const moreItems = [
  { to: "/app/legislation", icon: LegislationIcon, label: "Legislation" },
  { to: "/app/progress", icon: ProgressIcon, label: "Progress" },
  { to: "/app/saved", icon: SavedIcon, label: "Saved" },
  { to: "/app/settings", icon: SettingsIcon, label: "Settings" },
];

export function MobileNav() {
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden bottom-nav-safe"
      style={{
        background: "var(--sidebar-bg)",
        backdropFilter: "blur(30px) saturate(200%)",
        WebkitBackdropFilter: "blur(30px) saturate(200%)",
        borderTop: "1px solid var(--border-subtle)",
        paddingBottom: "max(8px, env(safe-area-inset-bottom))",
      }}
    >
      <div className="flex items-center justify-around px-2 h-16">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/app"}
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

        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className={`bottom-nav-item flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-medium tracking-[0.02em] transition-all duration-150 ${
                moreOpen ? "active text-primary" : "text-muted-foreground"
              }`}
              aria-label="More navigation"
            >
              <div className={`p-1 rounded-lg transition-colors ${moreOpen ? "bg-primary/[0.12]" : ""}`}>
                <MoreIcon size={22} />
              </div>
              <span>More</span>
            </button>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="rounded-t-2xl border-t border-border bg-background p-5 md:hidden"
          >
            <SheetHeader className="mb-3">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mx-auto mb-2" />
              <SheetTitle className="text-base font-semibold text-foreground text-left">More</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-1">
              {moreItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMoreOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-150 ${
                      isActive
                        ? "bg-primary/[0.12] text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`
                  }
                >
                  <item.icon size={22} />
                  <span className="flex-1 text-sm font-medium">{item.label}</span>
                  <ChevronRight className="w-4 h-4 opacity-50" />
                </NavLink>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
