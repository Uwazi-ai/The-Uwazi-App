import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { AlertTriangle, CheckCircle2, Gift, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { clearPendingPromo, readPendingPromo, savePendingPromo } from "@/lib/pendingPromo";

const SUPPORT_EMAIL = "support@uwazi.ai";

type ResultState =
  | { kind: "success"; grantedUntil: string }
  | { kind: "not_found" }
  | { kind: "already_redeemed" }
  | { kind: "expired"; redeemBy?: string }
  | { kind: "already_claimed_by_user" }
  | { kind: "unknown" };

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

export default function PromoRedeemPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const pending = useMemo(() => readPendingPromo(), []);
  const urlCode = (params.get("code") || "").trim().toUpperCase();
  const campaign = params.get("c") || pending?.campaign || "";

  const [code, setCode] = useState(urlCode || pending?.code || "");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ResultState | null>(null);

  // Keep the code alive across the auth hop — this is the main failure mode.
  useEffect(() => {
    if (code) savePendingPromo({ code, campaign: campaign || undefined });
  }, [code, campaign]);

  const goAuth = (path: string) => {
    savePendingPromo({ code: code.trim().toUpperCase(), campaign: campaign || undefined });
    const qs = new URLSearchParams({ code: code.trim().toUpperCase() });
    if (campaign) qs.set("c", campaign);
    navigate(`${path}?${qs.toString()}`);
  };

  const claim = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    if (!user) {
      goAuth("/signup");
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("redeem-promo", {
        body: { code: trimmed, campaign },
      });
      if (error && !data) throw error;
      const res = data as { ok: boolean; error?: string; granted_until?: string; redeem_by?: string };
      if (res?.ok && res.granted_until) {
        clearPendingPromo();
        setResult({ kind: "success", grantedUntil: res.granted_until });
      } else if (res?.error === "not_found") setResult({ kind: "not_found" });
      else if (res?.error === "already_redeemed") setResult({ kind: "already_redeemed" });
      else if (res?.error === "expired") setResult({ kind: "expired", redeemBy: res.redeem_by });
      else if (res?.error === "already_claimed_by_user") setResult({ kind: "already_claimed_by_user" });
      else if (res?.error === "not_signed_in") goAuth("/login");
      else setResult({ kind: "unknown" });
    } catch {
      setResult({ kind: "unknown" });
    } finally {
      setBusy(false);
    }
  };

  const card = "bg-card border border-border rounded-2xl p-6";

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-10">
      <Helmet>
        <title>Claim your free year of UWAZI+</title>
        <meta
          name="description"
          content="Redeem your Operation Backpack KC promo card for one free year of UWAZI+ civic tools."
        />
      </Helmet>

      <div className="max-w-md mx-auto space-y-6">
        <div className={card}>
          <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center mb-4">
            <Gift size={28} className="text-primary" />
          </div>

          {result?.kind === "success" ? (
            <div className="space-y-4">
              <CheckCircle2 size={32} className="text-primary" />
              <h1 className="text-2xl font-black">
                You're in. UWAZI+ is active through {formatDate(result.grantedUntil)}.
              </h1>
              <button
                onClick={() => navigate("/app")}
                className="w-full py-3 rounded-xl font-bold text-sm bg-primary text-primary-foreground"
              >
                Open UWAZI+
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <h1 className="text-2xl font-black mb-2">One year of UWAZI+, free</h1>
                <p className="text-sm text-muted-foreground">
                  You're claiming a full year of UWAZI+ — unlimited Ask UWAZI, every episode, full
                  legislation tracking and My Ballot. No card required.
                </p>
              </div>

              <div>
                <label htmlFor="promo-code" className="block text-xs font-semibold text-muted-foreground mb-2">
                  Code on your card
                </label>
                <input
                  id="promo-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="OBKC-20K-XXXX"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  disabled={busy || result?.kind === "expired" || result?.kind === "already_redeemed"}
                  className="w-full px-4 py-3 rounded-xl bg-muted text-center text-lg font-bold tracking-widest border border-border focus:outline-none focus:border-primary disabled:opacity-60"
                />
              </div>

              {result && (
                <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm space-y-3">
                  <div className="flex gap-2">
                    <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-foreground">
                      {result.kind === "not_found" &&
                        "We don't recognize that code. Check the code printed on your card and try again."}
                      {result.kind === "already_redeemed" && (
                        <>
                          This code has already been claimed. If that wasn't you, contact us at{" "}
                          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary underline">
                            {SUPPORT_EMAIL}
                          </a>
                          .
                        </>
                      )}
                      {result.kind === "expired" &&
                        `This code expired on ${
                          result.redeemBy ? formatDate(result.redeemBy) : "September 15, 2026"
                        }.`}
                      {result.kind === "already_claimed_by_user" &&
                        "Your account already has a free year from this event."}
                      {result.kind === "unknown" &&
                        `We couldn't reach the server. Your code is ${code} — try again in a moment.`}
                    </p>
                  </div>
                  {result.kind === "unknown" && (
                    <button
                      onClick={claim}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted text-sm font-semibold"
                    >
                      <RefreshCw size={14} /> Retry
                    </button>
                  )}
                </div>
              )}

              {result?.kind !== "expired" && result?.kind !== "already_redeemed" && (
                <button
                  onClick={claim}
                  disabled={busy || authLoading || !code.trim()}
                  className="w-full py-3 rounded-xl font-bold text-sm bg-primary text-primary-foreground disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                  {busy && <Loader2 size={16} className="animate-spin" />}
                  Claim my free year
                </button>
              )}

              {!user && !authLoading && (
                <p className="text-xs text-muted-foreground text-center">
                  You'll create a free account first — your code is saved and applied when you get back.{" "}
                  <button onClick={() => goAuth("/login")} className="text-primary underline">
                    Already have an account?
                  </button>
                </p>
              )}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          <Link to="/backpack-rules" className="underline">
            Offer rules
          </Link>
        </p>
      </div>
    </div>
  );
}
