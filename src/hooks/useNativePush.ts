import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";

/**
 * Registers the device for push notifications on native iOS/Android builds.
 * No-op on web (PWA push is handled separately via the service worker).
 */
export function useNativePush() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let mounted = true;

    (async () => {
      try {
        const { PushNotifications } = await import("@capacitor/push-notifications");

        const perm = await PushNotifications.checkPermissions();
        let status = perm.receive;
        if (status === "prompt" || status === "prompt-with-rationale") {
          const req = await PushNotifications.requestPermissions();
          status = req.receive;
        }
        if (status !== "granted") return;

        await PushNotifications.register();

        PushNotifications.addListener("registration", async (token) => {
          if (!mounted) return;
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;
          await supabase.from("push_tokens" as never).upsert(
            {
              user_id: user.id,
              token: token.value,
              platform: Capacitor.getPlatform(),
            } as never,
            { onConflict: "token" },
          );
        });

        PushNotifications.addListener("registrationError", (err) => {
          console.error("[push] registration error", err);
        });

        PushNotifications.addListener("pushNotificationReceived", (n) => {
          console.log("[push] received", n);
        });

        PushNotifications.addListener("pushNotificationActionPerformed", (a) => {
          const url = (a.notification.data as { url?: string })?.url;
          if (url) window.location.href = url;
        });
      } catch (err) {
        console.error("[push] init failed", err);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);
}
