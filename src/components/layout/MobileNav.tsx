import { Home, MessageCircle, Vote, BookOpen, BarChart3 } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useProfile } from "@/contexts/ProfileContext";

const navItems = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/ask", icon: MessageCircle, label: "Ask" },
  { to: "/vote", icon: Vote, label: "Vote" },
  { to: "/learn", icon: BookOpen, label: "Learn" },
  { to: "/progress", icon: BarChart3, label: "Progress" },
];

export function MobileNav() {
  const { displayName, avatarUrl } = useProfile();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-lg md:hidden">
      <div className="flex items-center justify-around px-2 py-1.5">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-card text-xs font-medium transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`
            }
          >
            <item.icon className="h-5 w-5" strokeWidth={1.8} />
            <span>{item.label}</span>
          </NavLink>
        ))}
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-card text-xs font-medium transition-colors ${
              isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`
          }
        >
          <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
            ) : (
              <span className="text-[9px] font-bold text-primary">{displayName[0]?.toUpperCase()}</span>
            )}
          </div>
          <span>Me</span>
        </NavLink>
      </div>
    </nav>
  );
}
