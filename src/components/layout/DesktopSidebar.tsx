import { Home, MessageCircle, Vote, Newspaper, BookmarkCheck, User, Settings, Shield } from "lucide-react";
import { NavLink } from "react-router-dom";
import uwaziIcon from "@/assets/uwazi-icon.png";

const mainNav = [
  { to: "/", icon: Home, label: "Dashboard" },
  { to: "/ask", icon: MessageCircle, label: "Ask UWAZI" },
  { to: "/vote", icon: Vote, label: "Voting Hub" },
  { to: "/news", icon: Newspaper, label: "News" },
  { to: "/saved", icon: BookmarkCheck, label: "Saved" },
];

const bottomNav = [
  { to: "/profile", icon: User, label: "Profile" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export function DesktopSidebar() {
  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card h-screen sticky top-0">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <img src={uwaziIcon} alt="UWAZI.AI" className="h-8 w-8" />
        <span className="text-lg font-bold text-foreground tracking-tight">UWAZI.AI</span>
      </div>

      <nav className="flex-1 flex flex-col px-3 py-2 gap-0.5">
        {mainNav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`
            }
          >
            <item.icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-3 border-t border-border flex flex-col gap-0.5">
        {bottomNav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`
            }
          >
            <item.icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
            {item.label}
          </NavLink>
        ))}
      </div>
    </aside>
  );
}
