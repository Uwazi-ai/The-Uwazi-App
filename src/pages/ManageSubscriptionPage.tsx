import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Crown, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";

const PRICE_LABELS: Record<string, string> = {
  uwazi_plus_beta_monthly: "Uwazi+ Beta · Monthly · $4.99/mo",
  uwazi_plus_beta_yearly: "Uwazi+ Beta · Annual · $39/yr",
  uwazi_plus_monthly: "Uwazi+ · Monthly · $19.99/mo",
  uwazi_plus_yearly: "Uwazi+ · Annual · $119/yr",
};

export default function ManageSubscriptionPage() {
  const navigate = useNavigate();
  const { subscription, isPremium, loading, refresh } = useSubscription();
  const [busy, setBusy] = useState(false);

  const handleCancel = async (resume = false) => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("cancel-subscription", {
        body: { environment: getStripeEnvironment(), resume },
      });
      if (error) throw error;
      toast.success(resume ? "Subscription resumed" : "Subscription will end at period close");
      await refresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to update subscription");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 text-sm">
          <ArrowLeft size={18} /> Back
        </button>

        <h1 className="text-2xl font-black text-foreground mb-6">Subscription</h1>

        {!isPremium || !subscription ? (
          <div className="bg-card border border-border rounded-2xl p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-3">
              <Crown size={24} className="text-yellow-400" />
            </div>
            <h2 className="font-bold text-foreground mb-1">No active subscription</h2>
            <p className="text-sm text-muted-foreground mb-4">Upgrade to Uwazi+ to unlock everything.</p>
            <Link to="/app/upgrade" className="inline-block px-5 py-2.5 rounded-xl font-bold text-black text-sm" style={{ background: "linear-gradient(135deg, #facc15, #eab308)" }}>
              See Plans
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-2">
                <Crown size={20} className="text-yellow-400" />
                <span className="font-bold text-foreground">Uwazi+ Active</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">{PRICE_LABELS[subscription.price_id] || subscription.price_id}</p>

              <div className="text-xs space-y-1 text-muted-foreground">
                <div>Status: <span className="text-foreground capitalize">{subscription.status}</span></div>
                {subscription.current_period_end && (
                  <div>
                    {subscription.cancel_at_period_end ? "Access ends" : "Renews"}:{" "}
                    <span className="text-foreground">{new Date(subscription.current_period_end).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>

            {subscription.cancel_at_period_end ? (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5">
                <div className="flex gap-3 mb-3">
                  <AlertCircle className="text-amber-400 flex-shrink-0" size={20} />
                  <p className="text-sm text-foreground">
                    Your subscription is set to cancel. You'll keep access until {subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : "period end"}.
                  </p>
                </div>
                <button
                  onClick={() => handleCancel(true)}
                  disabled={busy}
                  className="w-full py-2.5 rounded-xl font-semibold text-sm bg-primary text-primary-foreground disabled:opacity-50"
                >
                  {busy ? "Working…" : "Resume subscription"}
                </button>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-2xl p-5">
                <h3 className="font-bold text-foreground mb-1 text-sm">Change or cancel</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  To switch plans, cancel here then choose a new plan. Cancellations keep access until your current period ends.
                </p>
                <div className="flex gap-2">
                  <Link to="/app/upgrade" className="flex-1 py-2.5 rounded-xl font-semibold text-sm bg-muted text-foreground text-center">
                    Change Plan
                  </Link>
                  <button
                    onClick={() => {
                      if (confirm("Cancel your Uwazi+ subscription? You'll keep access until the end of your current period.")) {
                        handleCancel(false);
                      }
                    }}
                    disabled={busy}
                    className="flex-1 py-2.5 rounded-xl font-semibold text-sm bg-destructive/10 text-destructive border border-destructive/30 disabled:opacity-50"
                  >
                    {busy ? "Working…" : "Cancel"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
