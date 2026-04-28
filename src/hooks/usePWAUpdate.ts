import { useEffect, useState } from "react";

/**
 * Detects when a new service worker has been installed and is waiting,
 * or when the active SW broadcasts a SW_UPDATED message.
 *
 * Skips entirely in iframes and on Lovable preview hosts so the editor
 * preview never gets intercepted by a stale SW.
 */
export function usePWAUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] =
    useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    // Don't run inside iframes or Lovable preview hosts
    let isInIframe = false;
    try {
      isInIframe = window.self !== window.top;
    } catch {
      isInIframe = true;
    }
    const isPreview =
      window.location.hostname.includes("id-preview--") ||
      window.location.hostname.includes("lovableproject.com");
    if (isInIframe || isPreview) return;

    let interval: ReturnType<typeof setInterval> | undefined;
    let cancelled = false;

    navigator.serviceWorker
      .getRegistration()
      .then((reg) => reg ?? navigator.serviceWorker.register("/sw.js"))
      .then((reg) => {
        if (cancelled || !reg) return;
        setRegistration(reg);

        // If a worker is already waiting on first load, surface it.
        if (reg.waiting && navigator.serviceWorker.controller) {
          setUpdateAvailable(true);
        }

        // Poll for updates every 60s while the app is open
        interval = setInterval(() => {
          reg.update().catch(() => {});
        }, 60 * 1000);

        // New worker found → watch its state
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              setUpdateAvailable(true);
            }
          });
        });
      })
      .catch((err) => console.warn("SW registration failed:", err));

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "SW_UPDATED") {
        setUpdateAvailable(true);
      }
    };
    navigator.serviceWorker.addEventListener("message", onMessage);

    // Auto-reload once the new SW takes control
    let reloaded = false;
    const onControllerChange = () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      onControllerChange,
    );

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
      navigator.serviceWorker.removeEventListener("message", onMessage);
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange,
      );
    };
  }, []);

  const applyUpdate = () => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
      // controllerchange listener above will reload automatically
    } else {
      window.location.reload();
    }
  };

  const dismiss = () => setUpdateAvailable(false);

  return { updateAvailable, applyUpdate, dismiss };
}
