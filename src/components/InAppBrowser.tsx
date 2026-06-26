import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, ExternalLink as ExternalLinkIcon, Globe } from "lucide-react";
import { toast } from "sonner";

interface InAppBrowserProps {
  url: string | null;
  onClose: () => void;
}

// Domains known to block iframe embedding via X-Frame-Options / CSP.
// For these we skip the iframe attempt entirely and show the "Open in Browser" card.
const ALWAYS_EXTERNAL_HOSTS = [
  "vote.org",
  "vote.gov",
  "usa.gov",
  "irs.gov",
  "ssa.gov",
  "congress.gov",
  "google.com",
  "accounts.google.com",
];

function isAlwaysExternal(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    return ALWAYS_EXTERNAL_HOSTS.some((h) => host === h || host.endsWith("." + h)) || host.endsWith(".gov");
  } catch {
    return false;
  }
}

export function InAppBrowser({ url, onClose }: InAppBrowserProps) {
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const forceExternal = useMemo(() => (url ? isAlwaysExternal(url) : false), [url]);

  useEffect(() => {
    if (!url) return;
    console.info("[InAppBrowser] open", { url, forceExternal });
    setLoading(!forceExternal);
    setErrored(forceExternal);

    // Scroll lock only — no history manipulation (history hacks were popping
    // the parent route during onboarding and stranding users).
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // ESC to close
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);

    // 4s loading timeout → error state with "Open in Browser" CTA
    if (!forceExternal) {
      timeoutRef.current = window.setTimeout(() => {
        setLoading((l) => {
          if (l) {
            console.info("[InAppBrowser] timeout → error");
            setErrored(true);
          }
          return l;
        });
      }, 4000);
    }

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      console.info("[InAppBrowser] close");
    };
  }, [url, onClose, forceExternal]);

  const hostname = (() => {
    if (!url) return "";
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return url;
    }
  })();

  const handleCopy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      toast("Link copied");
    } catch {
      toast("Could not copy link");
    }
  };

  const openExternal = () => {
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <AnimatePresence>
      {url && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50"
            style={{ zIndex: 9999 }}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 mx-auto flex flex-col bg-[#080808] md:max-w-[480px] md:left-1/2 md:-translate-x-1/2"
            style={{ zIndex: 9999, height: "100dvh" }}
          >
            {/* Header */}
            <div
              className="flex h-12 shrink-0 items-center justify-between px-3 bg-[#111111]"
              style={{ borderBottom: "1px solid rgba(155, 211, 75, 0.15)" }}
            >
              <button
                onClick={onClose}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-md text-white/80 hover:bg-white/5"
              >
                <X size={18} />
              </button>
              <button
                onClick={handleCopy}
                className="mx-2 flex-1 truncate text-center"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 12,
                  color: "#9BD34B",
                }}
                title={url}
              >
                {hostname}
              </button>
              <button
                onClick={openExternal}
                aria-label="Open in browser"
                className="flex h-8 w-8 items-center justify-center rounded-md text-white/80 hover:bg-white/5"
              >
                <ExternalLinkIcon size={18} />
              </button>
            </div>

            {/* Loading bar */}
            <div className="relative h-0.5 w-full overflow-hidden bg-transparent">
              {loading && !errored && (
                <motion.div
                  initial={{ x: "-100%" }}
                  animate={{ x: "100%" }}
                  transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
                  className="absolute inset-y-0 w-1/3"
                  style={{ background: "#9BD34B" }}
                />
              )}
            </div>

            {/* Iframe / error */}
            <div className="relative flex-1 bg-[#080808]">
              {!errored && (
                <iframe
                  src={url}
                  title="In-app browser"
                  className="h-full w-full"
                  style={{ border: "none" }}
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                  onLoad={() => setLoading(false)}
                  onError={() => {
                    console.info("[InAppBrowser] iframe error");
                    setLoading(false);
                    setErrored(true);
                  }}
                />
              )}
              {errored && (
                <div className="absolute inset-0 flex items-center justify-center p-6">
                  <div className="w-full max-w-sm rounded-2xl bg-[#1a1a1a] p-8 text-center">
                    <Globe size={48} color="#9BD34B" className="mx-auto" />
                    <p
                      className="mt-4 text-white"
                      style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 16 }}
                    >
                      {forceExternal
                        ? "This site opens best in your browser"
                        : "This site can't be displayed in-app"}
                    </p>
                    <p
                      className="mt-2"
                      style={{
                        fontFamily: "'IBM Plex Sans', sans-serif",
                        fontSize: 13,
                        color: "#888",
                      }}
                    >
                      We'll open {hostname} in a new tab. Come back here when you're done.
                    </p>
                    <button
                      onClick={() => {
                        openExternal();
                        onClose();
                      }}
                      className="mt-6 w-full rounded-lg py-3 font-medium"
                      style={{ background: "#9BD34B", color: "#080808" }}
                    >
                      Open in Browser
                    </button>
                    <button
                      onClick={onClose}
                      className="mt-3 w-full rounded-lg py-3 font-medium"
                      style={{
                        background: "transparent",
                        border: "1px solid rgba(255,255,255,0.15)",
                        color: "#fff",
                      }}
                    >
                      Back to UWAZI
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
