import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Share, Plus } from "lucide-react";
import { toast } from "sonner";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Shared global deferred prompt so any component can use it
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;
const promptListeners = new Set<(p: BeforeInstallPromptEvent | null) => void>();

// Capture the event as early as possible (module load) so we never miss it.
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e: Event) => {
    e.preventDefault();
    globalDeferredPrompt = e as BeforeInstallPromptEvent;
    promptListeners.forEach((fn) => fn(globalDeferredPrompt));
  });
  window.addEventListener("appinstalled", () => {
    globalDeferredPrompt = null;
    promptListeners.forEach((fn) => fn(null));
  });
}

function detectPlatform() {
  if (typeof window === "undefined") {
    return { isIOS: false, isSafari: false, isAndroid: false, isDesktop: true, isStandalone: false, isFirefox: false };
  }
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|Chrome|Edg|OPR/.test(ua);
  const isAndroid = /Android/.test(ua);
  const isFirefox = /Firefox|FxiOS/.test(ua);
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true;
  const isDesktop = !isIOS && !isAndroid;
  return { isIOS, isSafari, isAndroid, isDesktop, isStandalone, isFirefox };
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(globalDeferredPrompt);
  const [isInstalled, setIsInstalled] = useState(false);
  const platform = detectPlatform();

  useEffect(() => {
    if (platform.isStandalone) {
      setIsInstalled(true);
      return;
    }
    const listener = (p: BeforeInstallPromptEvent | null) => {
      setDeferredPrompt(p);
      if (p === null) setIsInstalled(true);
    };
    promptListeners.add(listener);
    return () => {
      promptListeners.delete(listener);
    };
  }, [platform.isStandalone]);

  const install = useCallback(async () => {
    const prompt = deferredPrompt || globalDeferredPrompt;

    // iOS Safari: no programmatic install — guide the user
    if (platform.isIOS) {
      toast.info("Tap the Share button, then 'Add to Home Screen' to install UWAZI.", {
        duration: 6000,
      });
      return false;
    }

    // No native prompt available
    if (!prompt) {
      if (platform.isFirefox) {
        toast.info("Firefox doesn't support app install. Try Chrome, Edge, or Brave to install UWAZI.", {
          duration: 6000,
        });
      } else if (platform.isSafari && !platform.isIOS) {
        toast.info("To install on macOS Safari, use the File menu → Add to Dock.", {
          duration: 6000,
        });
      } else {
        toast.info(
          "Install isn't available right now. Look for the install icon (⊕) in your browser's address bar, or check your browser menu.",
          { duration: 7000 }
        );
      }
      return false;
    }

    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
        globalDeferredPrompt = null;
        setDeferredPrompt(null);
        toast.success("UWAZI installed! Find it on your home screen or app launcher.");
        return true;
      }
      return false;
    } catch (err) {
      console.error("[PWA] install failed", err);
      toast.error("Couldn't open the install prompt. Try your browser's menu instead.");
      return false;
    }
  }, [deferredPrompt, platform.isIOS, platform.isFirefox, platform.isSafari]);

  // Always supported as a UI action — install() will guide the user appropriately
  const isSupported = !platform.isStandalone;
  const canPromptNatively = !!deferredPrompt || platform.isIOS;

  return { deferredPrompt, isInstalled, install, isSupported, canPromptNatively, platform };
}

export function PWAInstallPrompt() {
  const { install, isInstalled, platform } = usePWAInstall();
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (isInstalled || platform.isStandalone) return;

    // 7-day dismiss cooldown
    const dismissedAt = localStorage.getItem("pwa-dismissed");
    if (dismissedAt) {
      const elapsed = Date.now() - parseInt(dismissedAt, 10);
      if (elapsed < 7 * 24 * 60 * 60 * 1000) return;
      localStorage.removeItem("pwa-dismissed");
    }

    // Track visits
    const visits = parseInt(localStorage.getItem("pwa-visits") || "0", 10) + 1;
    localStorage.setItem("pwa-visits", String(visits));

    // Show after 20s on first visit, 3s on 2nd+ visit
    const delay = visits >= 2 ? 3000 : 20000;
    const timer = setTimeout(() => setShowBanner(true), delay);
    return () => clearTimeout(timer);
  }, [isInstalled, platform.isStandalone]);

  const handleInstall = async () => {
    const accepted = await install();
    if (accepted) setShowBanner(false);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem("pwa-dismissed", String(Date.now()));
  };

  if (!showBanner || isInstalled || platform.isStandalone) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-20 md:bottom-6 left-4 right-4 z-[60] max-w-md mx-auto"
        style={{ marginBottom: "env(safe-area-inset-bottom)" }}
      >
        <div
          className="rounded-2xl p-4 flex items-start gap-3"
          style={{
            background: "rgba(22,22,22,0.95)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(155,211,75,0.25)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(155,211,75,0.1)",
          }}
        >
          <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
            <Download className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-foreground">Install UWAZI.AI</h3>
            {platform.isIOS && platform.isSafari ? (
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Tap <Share className="inline h-3 w-3 text-primary" /> below, then{" "}
                <strong>"Add to Home Screen"</strong> to install.
              </p>
            ) : platform.isIOS ? (
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Open this page in <strong>Safari</strong>, tap{" "}
                <Share className="inline h-3 w-3 text-primary" />, then{" "}
                <strong>"Add to Home Screen"</strong>.
              </p>
            ) : (
              <>
                <p className="text-xs text-muted-foreground mt-1">
                  Add to your home screen for quick civic access — works offline!
                </p>
                <button
                  onClick={handleInstall}
                  className="mt-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all hover:brightness-110 inline-flex items-center gap-1.5"
                  style={{ background: "#9bd34b", color: "#0A0A0A" }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Install App
                </button>
              </>
            )}
          </div>
          <button
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground shrink-0"
            aria-label="Dismiss install prompt"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
