import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/contexts/ProfileContext";
import { toast } from "sonner";
import uwaziLogo from "@/assets/uwazi-app-logo.png";
import {
  HomeIcon, CivicFeedIcon, AskUwaziIcon, LearnIcon,
  VotingHubIcon, LegislationIcon, ProgressIcon,
  SettingsIcon, SignOutIcon, AdminOverviewIcon,
  UsersIcon, AnalyticsIcon, IntelligenceIcon,
  LessonManagerIcon, CivicContentIcon, AlertsIcon,
  CRMIcon, SurveysIcon, PlatformSettingsIcon,
} from "@/components/icons/UwaziIcons";

const mainNav = [
  { to: "/", icon: HomeIcon, label: "Home" },
  { to: "/civic-feed", icon: CivicFeedIcon, label: "Civic Feed" },
  { to: "/ask", icon: AskUwaziIcon, label: "Ask Uwazi" },
  { to: "/learn", icon: LearnIcon, label: "Learn" },
  { to: "/vote", icon: VotingHubIcon, label: "Voting Hub" },
  { to: "/legislation", icon: LegislationIcon, label: "Legislation" },
  { to: "/progress", icon: ProgressIcon, label: "Progress" },
];

const adminNav = [
  { to: "/admin", icon: AdminOverviewIcon, label: "Admin Overview" },
  { to: "/admin/users", icon: UsersIcon, label: "Users" },
  { to: "/admin/analytics", icon: AnalyticsIcon, label: "Analytics" },
  { to: "/admin/intelligence", icon: IntelligenceIcon, label: "Intelligence" },
  { to: "/admin/lessons", icon: LessonManagerIcon, label: "Lesson Manager" },
  { to: "/admin/content", icon: CivicContentIcon, label: "Civic Content" },
  { to: "/admin/alerts", icon: AlertsIcon, label: "Alerts" },
  { to: "/admin/crm", icon: CRMIcon, label: "CRM" },
  { to: "/admin/surveys", icon: SurveysIcon, label: "Surveys" },
  { to: "/admin/platform", icon: PlatformSettingsIcon, label: "Platform Settings" },
];

const bottomNav = [
  { to: "/settings", icon: SettingsIcon, label: "Settings" },
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
    `nav-item flex items-center gap-[10px] px-[14px] py-[9px] rounded-lg mx-2 my-[1px] text-[13.5px] tracking-[-0.01em] cursor-pointer transition-all duration-150 ${
      isActive
        ? "active bg-primary/[0.12] text-primary font-medium border border-primary/[0.15]"
        : "text-muted-foreground hover:bg-muted hover:text-foreground font-[450] border border-transparent"
    }`;

  return (
    <aside className="hidden md:flex flex-col w-[192px] h-screen sticky top-0 glass-strong"
      style={{
        borderRight: "1px solid var(--border-subtle)",
        boxShadow: "1px 0 0 var(--border-subtle)",
        paddingTop: "max(0px, env(safe-area-inset-top))",
      }}>
      <div className="flex items-center gap-2.5 px-5 py-5">
        <img src={uwaziLogo} alt="UWAZI.APP" className="h-14" />
      </div>

      <nav className="flex-1 flex flex-col py-2 gap-0 overflow-y-auto">
        {mainNav.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === "/"} className={linkClass}>
            <div className="nav-icon-wrap">
              <item.icon size={18} />
            </div>
            {item.label}
          </NavLink>
        ))}

        {isAdmin && (
          <>
            <div className="mt-4 mb-2 px-[22px]">
              <p className="text-[10px] font-semibold tracking-[0.06em] uppercase text-muted-foreground">
                SUPER ADMIN
              </p>
            </div>
            {adminNav.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.to === "/admin"} className={linkClass}>
                <div className="nav-icon-wrap">
                  <item.icon size={18} />
                </div>
                {item.label}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      <div className="py-3 flex flex-col gap-0" style={{ borderTop: "1px solid var(--border-subtle)" }}>
        {bottomNav.map((item) => (
          <NavLink key={item.to} to={item.to} className={linkClass}>
            <div className="nav-icon-wrap">
              <item.icon size={18} />
            </div>
            {item.label}
          </NavLink>
        ))}
        <button
          onClick={handleSignOut}
          className="nav-item flex items-center gap-[10px] px-[14px] py-[9px] rounded-lg mx-2 my-[1px] text-[13.5px] font-[450] text-destructive hover:bg-destructive/10 transition-all duration-150 border border-transparent"
        >
          <div className="nav-icon-wrap">
            <SignOutIcon size={18} />
          </div>
          Sign Out
        </button>

        {/* User card */}
        <div className="flex items-center gap-[10px] mx-2 mt-2 p-3 rounded-card"
          style={{
            background: "var(--card-bg)",
            border: "1px solid var(--border-subtle)",
          }}>
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
