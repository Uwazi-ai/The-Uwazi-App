import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "uwazi_force_refresh_version";

/**
 * Listens for super-admin triggered "force refresh" events.
 * When the platform_settings.force_refresh_version value changes,
 * unregisters service workers, clears caches, and hard-reloads.
 */
export function useForceRefresh() {
  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "force_refresh_version")
        .maybeSingle();

      if (cancelled || !data?.value) return;
      const remote = String(data.value).replace(/"/g, "");
      const local = localStorage.getItem(STORAGE_KEY);

      if (local === null) {
        // First visit — record current version, do not reload
        localStorage.setItem(STORAGE_KEY, remote);
        return;
      }

      if (local !== remote) {
        localStorage.setItem(STORAGE_KEY, remote);
        await purgeAndReload();
      }
    };

    check();

    const channel = supabase
      .channel("force-refresh")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "platform_settings", filter: "key=eq.force_refresh_version" },
        () => check(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);
}

async function purgeAndReload() {
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
    }
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
  } catch (e) {
    console.warn("[force-refresh] purge failed", e);
  }
  // Hard reload bypassing cache
  window.location.reload();
}
