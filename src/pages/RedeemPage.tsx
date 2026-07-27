import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Gift } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";

export default function RedeemPage() {
  const navigate = useNavigate();
  const { refresh } = useSubscription();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setBusy(true);
    try {
      const { data, error } = await (supabase as any).rpc("redeem_code", { p_code: trimmed });
      if (error) throw error;
      const result = data as { ok: boolean; message: string; access_until?: string };
      if (!result.ok) {
        toast.error(result.message || "Could not redeem code");
      } else {
        toast.success(result.message || "You are in. Enjoy UWAZI+.");
        await refresh();
        setTimeout(() => navigate("/app/settings/subscription"), 800);
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto px-4 py-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 text-sm">
          <ArrowLeft size={18} /> Back
        </button>

        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center mb-4">
            <Gift size={28} className="text-primary" />
          </div>
          <h1 className="text-2xl font-black text-foreground mb-2">Redeem a code</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Enter the code from your card to unlock UWAZI+.
          </p>

          <form onSubmit={handleRedeem} className="space-y-4">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ENTER CODE"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              className="w-full px-4 py-3 rounded-xl bg-muted text-foreground text-center text-lg font-bold tracking-widest border border-border focus:outline-none focus:border-primary"
              disabled={busy}
            />
            <button
              type="submit"
              disabled={busy || !code.trim()}
              className="w-full py-3 rounded-xl font-bold text-sm bg-primary text-primary-foreground disabled:opacity-50"
            >
              {busy ? "Redeeming…" : "Redeem"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
