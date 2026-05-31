import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getStripeEnvironment } from "@/lib/stripe";

export interface SubscriptionRow {
  id: string;
  status: string;
  product_id: string;
  price_id: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  stripe_subscription_id: string;
}

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    const env = getStripeEnvironment();
    const [subRes, profileRes] = await Promise.all([
      (supabase as any)
        .from("subscriptions")
        .select("id, status, product_id, price_id, current_period_end, cancel_at_period_end, stripe_subscription_id")
        .eq("user_id", user.id)
        .eq("environment", env)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("profiles")
        .select("is_admin")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);
    setSubscription((subRes.data as SubscriptionRow | null) ?? null);
    setIsAdmin(Boolean((profileRes.data as { is_admin?: boolean } | null)?.is_admin));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`subscriptions-changes-${user.id}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subscriptions", filter: `user_id=eq.${user.id}` },
        () => refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refresh]);

  const isPremium = (() => {
    // Admins always have full Uwazi+ access
    if (isAdmin) return true;
    if (!subscription) return false;
    const periodOk = !subscription.current_period_end || new Date(subscription.current_period_end) > new Date();
    if (["active", "trialing"].includes(subscription.status) && periodOk) return true;
    if (subscription.status === "canceled" && periodOk) return true;
    return false;
  })();

  return { subscription, isPremium, loading, refresh };
}
