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
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }
    const env = getStripeEnvironment();
    const { data } = await supabase
      .from("subscriptions")
      .select("id, status, product_id, price_id, current_period_end, cancel_at_period_end, stripe_subscription_id")
      .eq("user_id", user.id)
      .eq("environment", env)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setSubscription(data as SubscriptionRow | null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("subscriptions-changes")
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
    if (!subscription) return false;
    const periodOk = !subscription.current_period_end || new Date(subscription.current_period_end) > new Date();
    if (["active", "trialing"].includes(subscription.status) && periodOk) return true;
    if (subscription.status === "canceled" && periodOk) return true;
    return false;
  })();

  return { subscription, isPremium, loading, refresh };
}
