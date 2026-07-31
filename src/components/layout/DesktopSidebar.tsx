import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/contexts/ProfileContext";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import uwaziLogo from "@/assets/uwazi-app-logo.png";
import {
  HomeIcon, AskUwaziIcon, LearnIcon, WatchIcon,
  VotingHubIcon, LegislationIcon, ProgressIcon,
  SettingsIcon, SignOutIcon, AdminOverviewIcon,
  UsersIcon, AnalyticsIcon, IntelligenceIcon,
  LessonManagerIcon, CivicContentIcon, AlertsIcon,
  CRMIcon, SurveysIcon, PlatformSettingsIcon,
  PartnerOrgsIcon,
} from "@/components/icons/UwaziIcons";
import { useSubscription } from "@/hooks/useSubscription";
import { openMyCityUnlockModal } from "@/components/my-city/MyCityUnlockModal";

import { Building2, Ticket, ShieldCheck } from "lucide-react";

const mainNav = [
  { to: "/app", icon: HomeIcon, label: "Home" },
  { to: "/app/ask", icon: AskUwaziIcon, label: "Ask Uwazi" },
  { to: "/app/learn", icon: LearnIcon, label: "Learn" },
  { to: "/app/watch", icon: WatchIcon, label: "Watch" },
  { to: "/app/vote", icon: VotingHubIcon, label: "Voting Hub" },
  { to: "/app/my-city", icon: Building2, label: "My City" },
  { to: "/app/legislation", icon: LegislationIcon, label: "Legislation" },
  { to: "/app/progress", icon: ProgressIcon, label: "Progress" },
];

type AdminNavItem = { to: string; icon: any; label: string; programAdmin?: boolean };

const adminNav: AdminNavItem[] = [
  { to: "/app/admin", icon: AdminOverviewIcon, label: "Admin Overview", programAdmin: true },
  { to: "/app/admin/users", icon: UsersIcon, label: "Users" },
  { to: "/app/admin/content", icon: WatchIcon, label: "Content", programAdmin: true },
  { to: "/app/admin/analytics", icon: AnalyticsIcon, label: "Analytics", programAdmin: true },
  { to: "/app/admin/intelligence", icon: IntelligenceIcon, label: "Intelligence", programAdmin: true },
  { to: "/app/admin/lessons", icon: LessonManagerIcon, label: "Lesson Manager", programAdmin: true },
  { to: "/app/admin/alerts", icon: AlertsIcon, label: "Alerts", programAdmin: true },
  { to: "/app/admin/crm", icon: CRMIcon, label: "CRM", programAdmin: true },
  { to: "/app/admin/surveys", icon: SurveysIcon, label: "Surveys", programAdmin: true },
  { to: "/app/admin/platform", icon: PlatformSettingsIcon, label: "Platform Settings" },
  { to: "/app/admin/ballot-review", icon: ShieldCheck, label: "Ballot Review" },
  { to: "/app/admin/partner-orgs", icon: PartnerOrgsIcon, label: "Partner Orgs" },
  { to: "/app/admin/codes", icon: Ticket, label: "Redemption Codes" },
  { to: "/app/admin/security", icon: Lock, label: "Security" },
];

const bottomNav = [
  { to: "/app/settings", icon: SettingsIcon, label: "Settings" },
];

export function DesktopSidebar() {
  const { user, signOut } = useAuth();
  const { displayName, avatarUrl, isAdmin, isProgramAdmin } = useProfile();
  const { isPremium } = useSubscription();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    navigate("/");
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
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/app"}
            className={linkClass}
            onClick={(e) => {
              if (item.to === "/app/my-city" && !isPremium) {
                e.preventDefault();
                openMyCityUnlockModal();
              }
            }}
          >
            <div className="nav-icon-wrap">
              <item.icon size={18} />
            </div>
            {item.label}
          </NavLink>
        ))}

        {isProgramAdmin && (
          <>
            <div className="mt-4 mb-2 px-[22px]">
              <p className="text-[10px] font-semibold tracking-[0.06em] uppercase text-muted-foreground">
                {isAdmin ? "SUPER ADMIN" : "PROGRAM ADMIN"}
              </p>
            </div>
            {adminNav
              .filter((item) => isAdmin || item.programAdmin)
              .map((item) => (
                <NavLink key={item.to} to={item.to} end={item.to === "/app/admin"} className={linkClass}>
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
