import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

const LS_KEY = "uwazi_referred_org";

/**
 * Captures ?org=SLUG from the URL and stores it in localStorage.
 * Call on any route to ensure org tracking works everywhere.
 */
export function useOrgTracking() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const orgSlug = searchParams.get("org");
    if (orgSlug) {
      localStorage.setItem(LS_KEY, orgSlug.toLowerCase().trim());
    }
  }, [searchParams]);
}

/** Get stored org slug */
export function getStoredOrgSlug(): string | null {
  return localStorage.getItem(LS_KEY);
}

/** Clear stored org slug after writing to profile */
export function clearStoredOrgSlug() {
  localStorage.removeItem(LS_KEY);
}
