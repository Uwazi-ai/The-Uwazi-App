import { useSearchParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowLeft, Lock, Check } from "lucide-react";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";

const PRICE_OPTIONS = {
  beta_monthly: { id: "uwazi_plus_beta_monthly", label: "Beta · Monthly", price: "$4.99", suffix: "/mo", strike: "$19.99", note: "Beta rate — locked through beta" },
  beta_yearly: { id: "uwazi_plus_beta_yearly", label: "Beta · Annual", price: "$39", suffix: "/yr", strike: "$119", note: "Just $3.25/mo billed annually" },
  monthly: { id: "uwazi_plus_monthly", label: "Monthly", price: "$19.99", suffix: "/mo", strike: null, note: "Billed monthly" },
  yearly: { id: "uwazi_plus_yearly", label: "Annual", price: "$119", suffix: "/yr", strike: null, note: "Billed annually" },
} as const;

type Tier = keyof typeof PRICE_OPTIONS;

export default function UpgradePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPremium, loading } = useSubscription();
  const initial = (params.get("plan") as Tier) || "beta_monthly";
  const [tier, setTier] = useState<Tier>(initial);
  const [showCheckout, setShowCheckout] = useState(false);

  useEffect(() => {
    if (!loading && isPremium) navigate("/app/settings/subscription", { replace: true });
  }, [isPremium, loading, navigate]);

  const opt = PRICE_OPTIONS[tier];
  const returnUrl = `${window.location.origin}/app/checkout/return?session_id={CHECKOUT_SESSION_ID}`;

  return (
    <div className="min-h-screen bg-background">
      <PaymentTestModeBanner />
      <div className="max-w-3xl mx-auto px-4 py-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 text-sm">
          <ArrowLeft size={18} /> Back
        </button>

        {!showCheckout ? (
          <div className="space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 mb-3">
                <span className="text-[10px] font-bold text-amber-400 tracking-wider">🚀 BETA PRICE</span>
              </div>
              <div className="w-14 h-14 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-3">
                <Lock size={28} className="text-yellow-400" />
              </div>
              <h1 className="text-3xl font-black text-foreground mb-2">Upgrade to Uwazi+</h1>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                Unlimited videos, full legislation tracking, and unlimited AI questions.
              </p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6">
              <div className="grid grid-cols-2 gap-2 mb-6">
                {(Object.keys(PRICE_OPTIONS) as Tier[]).map((key) => {
                  const o = PRICE_OPTIONS[key];
                  const selected = tier === key;
                  const isBeta = key.startsWith("beta_");
                  return (
                    <button
                      key={key}
                      onClick={() => setTier(key)}
                      className={`text-left p-4 rounded-xl border-2 transition-all ${selected ? "border-primary bg-primary/5" : "border-border hover:border-border/80"}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-foreground">{o.label}</span>
                        {isBeta && <span className="text-[9px] font-bold text-amber-400">BETA</span>}
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-black text-foreground">{o.price}</span>
                        <span className="text-xs text-muted-foreground">{o.suffix}</span>
                      </div>
                      {o.strike && <span className="text-[11px] text-muted-foreground line-through">{o.strike}</span>}
                    </button>
                  );
                })}
              </div>

              <ul className="space-y-2 mb-6">
                {["Unlimited Watch episodes", "Unlimited Ask UWAZI questions", "Full legislation tracking", "No ads, no contracts"].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                    <Check size={16} className="text-primary" /> {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => setShowCheckout(true)}
                className="w-full py-3 rounded-xl font-bold text-black text-sm"
                style={{ background: "linear-gradient(135deg, #facc15, #eab308)" }}
              >
                Continue to checkout · {opt.price}{opt.suffix}
              </button>
              <p className="text-muted-foreground text-[11px] text-center mt-3">{opt.note} · No contracts · Cancel anytime</p>
            </div>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold text-foreground">{opt.label}</h2>
                <p className="text-sm text-muted-foreground">{opt.price}{opt.suffix}</p>
              </div>
              <button onClick={() => setShowCheckout(false)} className="text-sm text-muted-foreground hover:text-foreground">Change plan</button>
            </div>
            <StripeEmbeddedCheckout
              priceId={opt.id}
              customerEmail={user?.email}
              userId={user?.id}
              returnUrl={returnUrl}
            />
          </div>
        )}
      </div>
    </div>
  );
}
