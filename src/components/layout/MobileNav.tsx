import { useState } from "react";
import { NavLink } from "react-router-dom";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Building2, ChevronRight, User } from "lucide-react";
import { useProfile } from "@/contexts/ProfileContext";
import { useSubscription } from "@/hooks/useSubscription";
import {
  HomeIcon, LearnIcon, WatchIcon, AskUwaziIcon, VotingHubIcon,
  LegislationIcon, ProgressIcon,
  SavedIcon, SettingsIcon,
} from "@/components/icons/UwaziIcons";

const navItems = [
  { to: "/app", icon: HomeIcon, label: "Home" },
  { to: "/app/learn", icon: LearnIcon, label: "Learn" },
  { to: "/app/ask", icon: AskUwaziIcon, label: "Ask" },
  { to: "/app/vote", icon: VotingHubIcon, label: "Vote" },
  { to: "/app/my-city", icon: Building2, label: "My City", premium: true },
];

const drawerItems = [
  { to: "/app/settings", icon: User, label: "You" },
  { to: "/app/legislation", icon: LegislationIcon, label: "Legislation" },
  { to: "/app/progress", icon: ProgressIcon, label: "Progress" },
  { to: "/app/saved", icon: SavedIcon, label: "Saved" },
  { to: "/app/settings", icon: SettingsIcon, label: "Settings" },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const { displayName, avatarUrl } = useProfile();
  const initial = (displayName?.[0] || "U").toUpperCase();

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

        {/* Profile avatar — opens drawer with profile + secondary nav */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              aria-label="Open profile and more"
              className={`bottom-nav-item flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-medium tracking-[0.02em] transition-all duration-150 ${
                open ? "active text-primary" : "text-muted-foreground"
              }`}
            >
              <div
                className={`relative w-7 h-7 rounded-full overflow-hidden border-2 transition-colors ${
                  open ? "border-primary" : "border-border"
                } bg-muted flex items-center justify-center`}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[11px] font-bold text-foreground">{initial}</span>
                )}
              </div>
              <span>You</span>
            </button>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="rounded-t-2xl border-t border-border bg-background p-5 md:hidden"
          >
            <SheetHeader className="mb-4">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mx-auto mb-3" />
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden border border-border bg-muted flex items-center justify-center">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-base font-bold text-foreground">{initial}</span>
                  )}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <SheetTitle className="text-base font-semibold text-foreground truncate">
                    {displayName}
                  </SheetTitle>
                  <p className="text-xs text-muted-foreground">View profile & more</p>
                </div>
              </div>
            </SheetHeader>
            <div className="flex flex-col gap-1">
              {drawerItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
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
