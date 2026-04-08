import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Update meta theme-color for PWA
  useEffect(() => {
    if (!mounted) return;
    const themeColor = resolvedTheme === "dark" ? "#080808" : "#f5f5f7";
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", themeColor);
  }, [resolvedTheme, mounted]);

  if (!mounted) return <div className="w-[44px] h-[24px]" />;

  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="theme-toggle"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
    >
      <div className="theme-toggle-track">
        <div
          className="theme-toggle-thumb"
          style={{
            left: isDark ? 2 : 22,
            background: isDark ? "#333" : "#fff",
            color: isDark ? "#9bd34b" : "#5a9e1e",
          }}
        >
          {isDark ? (
            <Moon className="h-3 w-3" />
          ) : (
            <Sun className="h-3 w-3" />
          )}
        </div>
      </div>
    </button>
  );
}
