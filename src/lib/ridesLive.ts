// Rides open at midnight Central on Oct 20, 2026. Checked at runtime in the browser.
export const RIDES_OPEN_AT = Date.parse("2026-10-20T00:00:00-05:00");
const KEY = "uwazi-rides-live-test";

export function ridesAreLive({ allowTestFlag = true, now = Date.now() }: { allowTestFlag?: boolean; now?: number } = {}) {
  if (import.meta.env.VITE_POLL_RIDES_LIVE === "true") return true;
  if (now >= RIDES_OPEN_AT) return true;
  if (!allowTestFlag || typeof window === "undefined") return false;
  try {
    if (new URLSearchParams(window.location.search).get("live") === "1") sessionStorage.setItem(KEY, "1");
    return sessionStorage.getItem(KEY) === "1";
  } catch { return false; }
}
