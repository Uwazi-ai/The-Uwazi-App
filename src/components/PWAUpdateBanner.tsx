import { usePWAUpdate } from "@/hooks/usePWAUpdate";
import { Button } from "@/components/ui/button";
import { RefreshCw, X } from "lucide-react";

/**
 * Floating update notification — shown when a new service worker version
 * has been downloaded and is ready to take control.
 *
 * Sits above the mobile bottom nav and respects safe-area-inset-bottom.
 */
export function PWAUpdateBanner() {
  const { updateAvailable, applyUpdate, dismiss } = usePWAUpdate();

  if (!updateAvailable) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 z-[100] flex justify-center px-4 pointer-events-none"
      style={{
        // Sit above the 64px mobile bottom nav + safe area
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)",
      }}
    >
      <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-primary/30 bg-card/90 px-4 py-3 shadow-2xl backdrop-blur-xl max-w-md w-full">
        <RefreshCw className="h-5 w-5 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground leading-tight">
            New version available
          </p>
          <p className="text-xs text-muted-foreground leading-tight mt-0.5">
            Refresh to get the latest UWAZI.
          </p>
        </div>
        <Button
          size="sm"
          onClick={applyUpdate}
          className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
        >
          Update
        </Button>
        <button
          onClick={dismiss}
          aria-label="Dismiss update notification"
          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
