import { Car } from "lucide-react";
import { ridesAreLive } from "@/lib/ridesLive";
import { useState } from "react";
import { NavLink } from "react-router-dom";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Building2, ChevronRight, Compass, LogIn, Menu, User } from "lucide-react";
import { useProfile } from "@/contexts/ProfileContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { openMyCityUnlockModal } from "@/components/my-city/MyCityUnlockModal";
import {
  HomeIcon, LearnIcon, WatchIcon, AskUwaziIcon, VotingHubIcon,
  ProgressIcon,
  SavedIcon, SettingsIcon,
} from "@/components/icons/UwaziIcons";

const navItems = [
  { to: "/app", icon: HomeIcon, label: "Home" },
  { to: "/app/vote", icon: VotingHubIcon, label: "Voting hub" },
  { get to() { return ridesAreLive() ? "/rides" : "/rides/waitlist"; }, icon: Car, get label() { return ridesAreLive() ? "Now booking" : "Free Rides"; } },
  { to: "/app/ask", icon: AskUwaziIcon, label: "Ask Uwazi" },
  { to: "/app/compass", icon: Compass, label: "Compass" },
  { to: "/app/progress", icon: ProgressIcon, label: "Progress" },
];

const drawerItems = [
  { to: "/app/learn", icon: LearnIcon, label: "Learn" },
  { to: "/app/watch", icon: WatchIcon, label: "Watch" },
  { to: "/app/my-city", icon: Building2, label: "My City", premium: true },
  { to: "/app/settings", icon: User, label: "You" },
  { to: "/app/saved", icon: SavedIcon, label: "Saved" },
  { to: "/app/settings", icon: SettingsIcon, label: "Settings" },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { displayName, avatarUrl } = useProfile();
  const { isPremium } = useSubscription();
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
      <div className="grid grid-cols-7 items-center px-2 h-16">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            aria-label={item.label}
            title={item.label}
            end={item.to === "/app"}
            className={({ isActive }) =>
              `bottom-nav-item flex min-w-0 h-11 justify-center flex-col items-center gap-1 px-1 py-1.5 rounded-xl text-[10px] font-medium tracking-[0.02em] transition-all duration-150 ${
                isActive ? "active text-primary" : "text-muted-foreground"
              }`
            }
          >
            {({ isActive }) => (
              <div className={`relative p-1 rounded-lg transition-colors ${isActive ? "bg-primary/[0.12]" : ""}`}>
                <item.icon size={22} />
              </div>
            )}
          </NavLink>
        ))}

        {/* Menu — opens drawer with My City + secondary nav */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              aria-label="Open navigation menu"
              title="Menu"
              className={`bottom-nav-item flex min-w-0 h-11 justify-center flex-col items-center gap-1 px-1 py-1.5 rounded-xl text-[10px] font-medium tracking-[0.02em] transition-all duration-150 ${
                open ? "active text-primary" : "text-muted-foreground"
              }`}
            >
              <div className={`relative p-1 rounded-lg transition-colors ${open ? "bg-primary/[0.12]" : ""}`}>
                <Menu className="size-[22px]" />
              </div>
            </Button>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="rounded-t-2xl border-t border-border bg-background p-5 md:hidden"
          >
            <SheetHeader className="mb-4">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mx-auto mb-3" />
              {user ? (
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
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full border border-border bg-primary/10 flex items-center justify-center text-primary">
                    <LogIn className="w-5 h-5" />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <SheetTitle className="text-base font-semibold text-foreground truncate">Sign in</SheetTitle>
                    <p className="text-xs text-muted-foreground">Open the full UWAZI app</p>
                  </div>
                </div>
              )}
            </SheetHeader>
            <div className="flex flex-col gap-1">
              {drawerItems.map((item) => (
                <NavLink
                  key={item.label}
                  to={item.to}
                  onClick={(event) => {
                    setOpen(false);
                    if (item.premium && !isPremium) {
                      event.preventDefault();
                      openMyCityUnlockModal();
                    }
                  }}
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
                  {item.premium && !isPremium && (
                    <span className="text-[10px] font-bold text-primary" aria-label="Premium feature">
                      UWAZI+
                    </span>
                  )}
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
