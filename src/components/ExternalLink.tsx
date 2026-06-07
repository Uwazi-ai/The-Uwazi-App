import { ReactNode } from "react";
import { useInAppBrowser } from "@/contexts/InAppBrowserContext";

interface ExternalLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
}

export function ExternalLink({ href, children, className }: ExternalLinkProps) {
  const { openInAppBrowser } = useInAppBrowser();
  return (
    <button type="button" className={className} onClick={() => openInAppBrowser(href)}>
      {children}
    </button>
  );
}
