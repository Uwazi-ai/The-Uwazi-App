import { createContext, useCallback, useContext, useState, ReactNode } from "react";
import { InAppBrowser } from "@/components/InAppBrowser";
import { useLinkInterceptor } from "@/hooks/useLinkInterceptor";

interface InAppBrowserContextType {
  openInAppBrowser: (url: string) => void;
  closeInAppBrowser: () => void;
}

const InAppBrowserContext = createContext<InAppBrowserContextType | undefined>(undefined);

export function InAppBrowserProvider({ children }: { children: ReactNode }) {
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);

  const openInAppBrowser = useCallback((url: string) => setCurrentUrl(url), []);
  const closeInAppBrowser = useCallback(() => setCurrentUrl(null), []);

  return (
    <InAppBrowserContext.Provider value={{ openInAppBrowser, closeInAppBrowser }}>
      <LinkInterceptorMount openInAppBrowser={openInAppBrowser} />
      {children}
      <InAppBrowser url={currentUrl} onClose={closeInAppBrowser} />
    </InAppBrowserContext.Provider>
  );
}

function LinkInterceptorMount({ openInAppBrowser }: { openInAppBrowser: (url: string) => void }) {
  useLinkInterceptor(openInAppBrowser);
  return null;
}

export function useInAppBrowser() {
  const ctx = useContext(InAppBrowserContext);
  if (!ctx) throw new Error("useInAppBrowser must be used within InAppBrowserProvider");
  return ctx;
}
