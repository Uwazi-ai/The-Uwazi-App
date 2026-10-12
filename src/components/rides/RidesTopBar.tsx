import { Link } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ProfileProvider, useProfile } from "@/contexts/ProfileContext";
import { useAuth } from "@/contexts/AuthContext";
import uwaziLogo from "@/assets/uwazi-logo.png";

function ProfileButton() {
  const { user } = useAuth();
  const { displayName, avatarUrl } = useProfile();
  const initial = (displayName?.[0] || "U").toUpperCase();

  if (!user) {
    return (
      <Link
        to="/login"
        className="rounded-lg border border-border px-3 py-[6px] text-[13px] font-medium text-foreground hover:bg-muted transition-colors"
      >
        Sign in
      </Link>
    );
  }

  return (
    <Link
      to="/app/settings"
      aria-label="Your profile"
      title={displayName}
      className="w-9 h-9 shrink-0 rounded-full overflow-hidden border border-border bg-muted flex items-center justify-center hover:opacity-90 transition-opacity"
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
      ) : (
        <span className="text-sm font-bold text-foreground">{initial}</span>
      )}
    </Link>
  );
}

export function RidesTopBar() {
  const { user } = useAuth();
  return (
    <header
      className="flex items-center justify-between gap-4 px-4 md:px-6 sticky top-0 z-10 topbar-safe"
      style={{
        background: "var(--topbar-bg)",
        backdropFilter: "blur(30px) saturate(180%)",
        WebkitBackdropFilter: "blur(30px) saturate(180%)",
        borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      <Link to={user ? "/app" : "/welcome"} aria-label="UWAZI home" className="flex items-center">
        <img src={uwaziLogo} alt="UWAZI.AI" className="h-7" />
      </Link>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <ProfileProvider>
          <ProfileButton />
        </ProfileProvider>
      </div>
    </header>
  );
}
