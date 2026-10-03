import { useEffect, useSyncExternalStore, useCallback } from "react";
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

type Plan = "free" | "plus" | "plus_student";
type State = {
  userId: string | null;
  subscription: SubscriptionRow | null;
  isAdmin: boolean;
  plan: Plan;
  loading: boolean;
};

// One shared store so every screen reads the plan from a single fetch and a
// single realtime channel, instead of each component querying on its own.
let state: State = { userId: null, subscription: null, isAdmin: false, plan: "free", loading: true };
const listeners = new Set<() => void>();
let inflight: Promise<void> | null = null;
let channel: ReturnType<typeof supabase.channel> | null = null;
let channelUser: string | null = null;
let refCount = 0;

function setState(next: Partial<State>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

async function load(userId: string | null, force = false) {
  if (!userId) {
    setState({ userId: null, subscription: null, isAdmin: false, plan: "free", loading: false });
    return;
  }
  if (!force && state.userId === userId && !state.loading) return;
  if (!force && inflight && state.userId === userId) return inflight;
  if (state.userId !== userId) setState({ userId, subscription: null, isAdmin: false, plan: "free", loading: true });
  const env = getStripeEnvironment();
  inflight = (async () => {
    try {
      const [subRes, profileRes] = await Promise.all([
        (supabase as any)
          .from("subscriptions")
          .select("id, status, product_id, price_id, current_period_end, cancel_at_period_end, stripe_subscription_id")
          .eq("user_id", userId)
          .eq("environment", env)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.from("profiles").select("is_admin, plan").eq("user_id", userId).maybeSingle(),
      ]);
      if (state.userId !== userId) return;
      setState({
        subscription: (subRes.data as SubscriptionRow | null) ?? null,
        isAdmin: Boolean((profileRes.data as { is_admin?: boolean } | null)?.is_admin),
        plan: (((profileRes.data as any)?.plan ?? "free") as Plan),
        loading: false,
      });
    } catch {
      if (state.userId === userId) setState({ loading: false });
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

function ensureChannel(userId: string) {
  if (channel && channelUser === userId) return;
  if (channel) supabase.removeChannel(channel);
  channelUser = userId;
  channel = supabase
    .channel(`subscriptions-changes-${userId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "subscriptions", filter: `user_id=eq.${userId}` },
      () => load(userId, true),
    )
    .subscribe();
}

function releaseChannel() {
  if (refCount > 0 || !channel) return;
  supabase.removeChannel(channel);
  channel = null;
  channelUser = null;
}

export function useSubscription() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const snap = useSyncExternalStore(subscribe, () => state, () => state);

  useEffect(() => {
    load(userId);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    refCount++;
    ensureChannel(userId);
    return () => {
      refCount--;
      // Wait a tick so route changes do not tear down and rebuild the channel.
      setTimeout(releaseChannel, 0);
    };
  }, [userId]);

  const refresh = useCallback(() => load(userId, true), [userId]);

  const current = snap.userId === userId ? snap : { ...snap, subscription: null, isAdmin: false, plan: "free" as Plan, loading: Boolean(userId) };
  const { subscription, isAdmin, plan } = current;
  const loading = userId ? current.loading : false;

  const isPremium = (() => {
    // Admins always have full Uwazi+ access
    if (isAdmin) return true;
    if (plan === "plus" || plan === "plus_student") return true;
    if (!subscription) return false;
    const periodOk = !subscription.current_period_end || new Date(subscription.current_period_end) > new Date();
    if (["active", "trialing"].includes(subscription.status) && periodOk) return true;
    if (subscription.status === "canceled" && periodOk) return true;
    return false;
  })();

  return { subscription, isPremium, plan, loading, refresh };
}
