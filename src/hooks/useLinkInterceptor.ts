import { useEffect } from "react";

const ALLOW_LIST = ["uwaziapp.uwazi.ai", "uwazi.ai", "visios.uwazi.ai", "localhost"];

function isInternalHost(host: string): boolean {
  const h = host.toLowerCase();
  return ALLOW_LIST.some((d) => h === d || h.endsWith("." + d)) || h.endsWith(".lovable.app");
}

export function useLinkInterceptor(openInAppBrowser: (url: string) => void) {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      // Ignore modified clicks (let user do cmd+click)
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const anchor = target.closest("a") as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      // Skip mailto / tel / anchor links / non-http schemes
      if (
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("sms:")
      ) {
        return;
      }

      if (!/^https?:\/\//i.test(href)) return;

      try {
        const url = new URL(href);
        if (isInternalHost(url.hostname)) return;
        e.preventDefault();
        openInAppBrowser(href);
      } catch {
        // invalid URL, ignore
      }
    };

    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, [openInAppBrowser]);
}
