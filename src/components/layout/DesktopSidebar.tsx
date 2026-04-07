import {
  Home, Newspaper, MessageCircle, BookOpen, Vote, FileText,
  BarChart3, Settings, LogOut,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/contexts/ProfileContext";
import { toast } from "sonner";
import uwaziLogo from "@/assets/uwazi-logo.png";

const mainNav = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/news", icon: Newspaper, label: "Civic Feed" },
  { to: "/ask", icon: MessageCircle, label: "Ask Uwazi" },
  { to: "/learn", icon: BookOpen, label: "Learn" },
  { to: "/vote", icon: Vote, label: "Voting Hub" },
  { to: "/legislation", icon: FileText, label: "Legislation" },
  { to: "/progress", icon: BarChart3, label: "Progress" },
];

const bottomNav = [
  { to: "/settings", icon: Settings, label: "Settings" },
];

export function DesktopSidebar() {
  const { user, signOut } = useAuth();
  const { displayName, avatarUrl } = useProfile();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    navigate("/login");
  };

  return (
    <aside className="hidden md:flex flex-col w-[230px] border-r border-border bg-sidebar h-screen sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5">
        <img src={uwaziLogo} alt="UWAZI.AI" className="h-8" />
      </div>

      {/* Main Nav */}
      <nav className="flex-1 flex flex-col px-3 py-2 gap-0.5 overflow-y-auto">
        {mainNav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-card text-sm font-medium transition-all ${
                isActive
                  ? "bg-primary/15 text-primary border-l-2 border-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground border-l-2 border-transparent"
              }`
            }
          >
            <item.icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-3 border-t border-border flex flex-col gap-0.5">
        {bottomNav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-card text-sm font-medium transition-all ${
                isActive
                  ? "bg-primary/15 text-primary border-l-2 border-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground border-l-2 border-transparent"
              }`
            }
          >
            <item.icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
            {item.label}
          </NavLink>
        ))}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-card text-sm font-medium text-destructive hover:bg-destructive/10 transition-all border-l-2 border-transparent"
        >
          <LogOut className="h-[18px] w-[18px]" strokeWidth={1.8} />
          Sign Out
        </button>

        {/* User info */}
        <div className="flex items-center gap-3 px-3 py-3 mt-1 border-t border-border">
          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold shrink-0 overflow-hidden">
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
            ) : (
              displayName[0]?.toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
            <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
