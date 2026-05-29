import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "uwazi_last_active_ping";
const THROTTLE_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Updates profiles.last_active for the current user once per ~5 min
 * so DAU/WAU/MAU analytics actually reflect engagement.
 */
export function useTrackActivity() {
  useEffect(() => {
    let cancelled = false;

    const ping = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled || !user) return;

      const last = Number(localStorage.getItem(STORAGE_KEY) || 0);
      if (Date.now() - last < THROTTLE_MS) return;

      const { error } = await supabase
        .from("profiles")
        .update({ last_active: new Date().toISOString() })
        .eq("user_id", user.id);

      if (!error) localStorage.setItem(STORAGE_KEY, String(Date.now()));
    };

    ping();
    const interval = setInterval(ping, THROTTLE_MS);
    const onVisible = () => { if (document.visibilityState === "visible") ping(); };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
}
