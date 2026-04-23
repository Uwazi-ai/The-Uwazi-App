import { ThemeToggle } from "@/components/ThemeToggle";
import { SearchIcon, NotificationIcon } from "@/components/icons/UwaziIcons";
import uwaziLogo from "@/assets/uwazi-logo.png";

export function TopBar() {

  return (
    <header className="flex items-center justify-between gap-4 px-4 md:px-6 h-[52px] sticky top-0 z-10 topbar-safe"
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
          <SearchIcon size={20} className="text-muted-foreground" />
        </button>

        {/* Desktop search bar */}
        <div className="hidden md:flex items-center gap-2 rounded-lg px-[14px] py-[7px] w-[220px] transition-all duration-200 focus-within:w-[280px]"
          style={{
            background: "var(--input-bg)",
            border: "1px solid var(--border-subtle)",
          }}>
          <SearchIcon size={16} className="text-muted-foreground" />
          <input
            type="text"
            placeholder="Search..."
            className="bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground outline-none flex-1"
          />
        </div>

        <ThemeToggle />

        <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
          <NotificationIcon size={20} className="text-muted-foreground" />
        </button>

      </div>
    </header>
  );
}
