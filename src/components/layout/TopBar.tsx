import { Search, Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { useProfile } from "@/contexts/ProfileContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import uwaziLogo from "@/assets/uwazi-logo.png";

export function TopBar() {
  const { displayName, avatarUrl } = useProfile();

  return (
    <header className="flex items-center justify-between gap-4 px-4 md:px-6 h-[52px] sticky top-0 z-10"
      style={{
        background: "var(--topbar-bg)",
        backdropFilter: "blur(30px) saturate(180%)",
        WebkitBackdropFilter: "blur(30px) saturate(180%)",
        borderBottom: "1px solid var(--border-subtle)",
      }}>
      {/* Mobile: logo left */}
      <div className="md:hidden flex items-center">
        <img src={uwaziLogo} alt="UWAZI.AI" className="h-7" />
      </div>

      {/* Desktop: spacer left */}
      <div className="hidden md:block" />

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Mobile search icon */}
        <button className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors">
          <Search className="h-5 w-5 text-muted-foreground" />
        </button>

        {/* Desktop search bar */}
        <div className="hidden md:flex items-center gap-2 rounded-lg px-[14px] py-[7px] w-[220px] transition-all duration-200 focus-within:w-[280px]"
          style={{
            background: "var(--input-bg)",
            border: "1px solid var(--border-subtle)",
          }}>
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search..."
            className="bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground outline-none flex-1"
          />
        </div>

        <ThemeToggle />

        <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
          <Bell className="h-5 w-5 text-muted-foreground" />
        </button>

        <Link to="/settings" className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold overflow-hidden shrink-0">
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
          ) : (
            displayName[0]?.toUpperCase()
          )}
        </Link>
      </div>
    </header>
  );
}
