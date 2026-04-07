import { Search, Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { useProfile } from "@/contexts/ProfileContext";

export function TopBar() {
  const { displayName, avatarUrl } = useProfile();

  return (
    <header className="flex items-center justify-end gap-4 px-4 md:px-6 py-3 border-b border-border bg-background sticky top-0 z-10">
      <div className="hidden md:flex items-center gap-2 bg-card border border-border rounded-card px-3 py-2 w-64">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search..."
          className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none flex-1"
        />
      </div>
      <button className="relative p-2 rounded-card hover:bg-card transition-colors">
        <Bell className="h-5 w-5 text-muted-foreground" />
      </button>
      <Link to="/settings" className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold overflow-hidden shrink-0">
        {avatarUrl ? (
          <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
        ) : (
          displayName[0]?.toUpperCase()
        )}
      </Link>
    </header>
  );
}
