import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Update meta theme-color for PWA / Android address bar
  useEffect(() => {
    if (!mounted) return;
    const themeColor = resolvedTheme === "dark" ? "#080808" : "#f5f5f7";
    // Update ALL theme-color metas (Android Chrome picks the media-matching one first)
    document.querySelectorAll('meta[name="theme-color"]').forEach((el) => {
      el.setAttribute("content", themeColor);
      // Strip any media attribute so our chosen color is always used
      if (el.hasAttribute("media")) el.removeAttribute("media");
    });
    // Hint native UI (scrollbars, form controls) to follow the active theme
    document.documentElement.style.colorScheme = resolvedTheme === "dark" ? "dark" : "light";
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
