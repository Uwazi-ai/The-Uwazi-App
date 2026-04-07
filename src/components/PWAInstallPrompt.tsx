import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Share } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Shared global deferred prompt so Settings page can also use it
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(globalDeferredPrompt);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }
    const handler = (e: Event) => {
      e.preventDefault();
      globalDeferredPrompt = e as BeforeInstallPromptEvent;
      setDeferredPrompt(globalDeferredPrompt);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const installed = () => setIsInstalled(true);
    window.addEventListener("appinstalled", installed);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  const install = useCallback(async () => {
    const prompt = deferredPrompt || globalDeferredPrompt;
    if (!prompt) return false;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
      globalDeferredPrompt = null;
      setDeferredPrompt(null);
      return true;
    }
    return false;
  }, [deferredPrompt]);

  const isSupported = typeof window !== "undefined" &&
    /Chrome|Edg/.test(navigator.userAgent) &&
    !/Firefox|OPR/.test(navigator.userAgent);

  return { deferredPrompt, isInstalled, install, isSupported };
}

export function PWAInstallPrompt() {
  const { install, isInstalled } = usePWAInstall();
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (isInstalled) return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    // Check 7-day dismiss cooldown
    const dismissedAt = localStorage.getItem("pwa-dismissed");
    if (dismissedAt) {
      const elapsed = Date.now() - parseInt(dismissedAt, 10);
      if (elapsed < 7 * 24 * 60 * 60 * 1000) return;
      localStorage.removeItem("pwa-dismissed");
    }

    // Track visits
    const visits = parseInt(localStorage.getItem("pwa-visits") || "0", 10) + 1;
    localStorage.setItem("pwa-visits", String(visits));

    // Detect iOS Safari
    const ua = navigator.userAgent;
    const isiOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|Chrome/.test(ua);
    if (isiOS && isSafari) {
      setIsIOS(true);
    }

    // Show after 30s OR on 2nd+ visit
    if (visits >= 2) {
      setTimeout(() => setShowBanner(true), 2000);
    } else {
      setTimeout(() => setShowBanner(true), 30000);
    }
  }, [isInstalled]);

  const handleInstall = async () => {
    const accepted = await install();
    if (accepted) setShowBanner(false);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem("pwa-dismissed", String(Date.now()));
  };

  if (!showBanner || isInstalled) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-20 md:bottom-6 left-4 right-4 z-[60] max-w-md mx-auto" style={{ marginBottom: "env(safe-area-inset-bottom)" }}
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
            {isIOS ? (
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Tap <Share className="inline h-3 w-3 text-primary" /> then <strong>"Add to Home Screen"</strong> to install UWAZI like an app.
              </p>
            ) : (
              <>
                <p className="text-xs text-muted-foreground mt-1">
                  Add to your home screen for quick civic access — works offline!
                </p>
                <button
                  onClick={handleInstall}
                  className="mt-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all hover:brightness-110"
                  style={{ background: "#9bd34b", color: "#0A0A0A" }}
                >
                  Install App
                </button>
              </>
            )}
          </div>
          <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
