import {
  Home, Newspaper, MessageCircle, BookOpen, Vote, FileText,
  BarChart3, Settings, LogOut, Shield, Users, TrendingUp,
  Brain, GraduationCap, Megaphone, Cog, Contact, ClipboardList,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/contexts/ProfileContext";
import { toast } from "sonner";
import uwaziLogo from "@/assets/uwazi-app-logo.png";

const mainNav = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/civic-feed", icon: Newspaper, label: "Civic Feed" },
  { to: "/ask", icon: MessageCircle, label: "Ask Uwazi" },
  { to: "/learn", icon: BookOpen, label: "Learn" },
  { to: "/vote", icon: Vote, label: "Voting Hub" },
  { to: "/legislation", icon: FileText, label: "Legislation" },
  { to: "/progress", icon: BarChart3, label: "Progress" },
];

const adminNav = [
  { to: "/admin", icon: Shield, label: "Admin Overview" },
  { to: "/admin/users", icon: Users, label: "Users" },
  { to: "/admin/analytics", icon: TrendingUp, label: "Analytics" },
  { to: "/admin/intelligence", icon: Brain, label: "Intelligence" },
  { to: "/admin/lessons", icon: GraduationCap, label: "Lesson Manager" },
  { to: "/admin/content", icon: FileText, label: "Civic Content" },
  { to: "/admin/alerts", icon: Megaphone, label: "Alerts" },
  { to: "/admin/crm", icon: Contact, label: "CRM" },
  { to: "/admin/surveys", icon: ClipboardList, label: "Surveys" },
  { to: "/admin/platform", icon: Cog, label: "Platform Settings" },
];

const bottomNav = [
  { to: "/settings", icon: Settings, label: "Settings" },
];

export function DesktopSidebar() {
  const { user, signOut } = useAuth();
  const { displayName, avatarUrl, isAdmin } = useProfile();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    navigate("/login");
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-[10px] px-[14px] py-[9px] rounded-lg mx-2 my-[1px] text-[13.5px] tracking-[-0.01em] cursor-pointer transition-all duration-150 ${
      isActive
        ? "bg-primary/[0.12] text-primary font-medium border border-primary/[0.15]"
        : "text-muted-foreground hover:bg-[rgba(255,255,255,0.05)] hover:text-foreground font-[450] border border-transparent"
    }`;

  return (
    <aside className="hidden md:flex flex-col w-[192px] h-screen sticky top-0 glass-strong"
      style={{
        borderRight: "1px solid rgba(255,255,255,0.06)",
        boxShadow: "1px 0 0 rgba(255,255,255,0.03)",
      }}>
      <div className="flex items-center gap-2.5 px-5 py-5">
        <img src={uwaziLogo} alt="UWAZI.APP" className="h-14" />
      </div>

      <nav className="flex-1 flex flex-col py-2 gap-0 overflow-y-auto">
        {mainNav.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === "/"} className={linkClass}>
            <item.icon className="h-4 w-4 opacity-70 shrink-0" strokeWidth={1.8} />
            {item.label}
          </NavLink>
        ))}

        {isAdmin && (
          <>
            <div className="mt-4 mb-2 px-[22px]">
              <p className="text-[10px] font-semibold tracking-[0.06em] uppercase" style={{ color: "hsl(var(--text-tertiary))" }}>
                SUPER ADMIN
              </p>
            </div>
            {adminNav.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.to === "/admin"} className={linkClass}>
                <item.icon className="h-4 w-4 opacity-70 shrink-0" strokeWidth={1.8} />
                {item.label}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      <div className="py-3 flex flex-col gap-0" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        {bottomNav.map((item) => (
          <NavLink key={item.to} to={item.to} className={linkClass}>
            <item.icon className="h-4 w-4 opacity-70 shrink-0" strokeWidth={1.8} />
            {item.label}
          </NavLink>
        ))}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-[10px] px-[14px] py-[9px] rounded-lg mx-2 my-[1px] text-[13.5px] font-[450] text-destructive hover:bg-destructive/10 transition-all duration-150 border border-transparent"
        >
          <LogOut className="h-4 w-4 opacity-70 shrink-0" strokeWidth={1.8} />
          Sign Out
        </button>

        {/* User card */}
        <div className="flex items-center gap-[10px] mx-2 mt-2 p-3 rounded-card border border-[rgba(255,255,255,0.06)]"
          style={{ background: "rgba(255,255,255,0.03)" }}>
          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold shrink-0 overflow-hidden">
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
            ) : (
              displayName[0]?.toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium text-foreground truncate">{displayName}</p>
            <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
