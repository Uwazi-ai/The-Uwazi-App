import { useState } from "react";
import { Gift, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  initial?: string;
  onDone: () => void;
  loading?: boolean;
}

export default function RedemptionCodeStep({ initial = "", onDone, loading }: Props) {
  const [code, setCode] = useState(initial.toUpperCase());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    try {
      const { data, error: rpcError } = await (supabase as any).rpc("redeem_code", { p_code: trimmed });
      if (rpcError) throw rpcError;
      const result = data as { ok: boolean; message: string };
      if (!result.ok) {
        setError(result.message || "That code isn't valid.");
      } else {
        toast.success(result.message || "You're in. Enjoy UWAZI+.");
        onDone();
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const disabled = busy || loading;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-3">
          <Gift size={26} className="text-primary" />
        </div>
        <h2
          className="text-2xl mb-1"
          style={{ fontFamily: "'Axis', sans-serif", color: "#fff" }}
        >
          Have a code?
        </h2>
        <p style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14, color: "#aaa" }}>
          Partner or promo codes unlock UWAZI+ for free.
        </p>
      </div>

      <form onSubmit={handleRedeem} className="space-y-3">
        <input
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setError(null);
          }}
          placeholder="ENTER CODE"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          disabled={disabled}
          className="w-full px-4 py-3 rounded-xl text-center text-lg font-bold tracking-widest focus:outline-none"
          style={{
            background: "#0a0a0a",
            border: `1px solid ${error ? "#ef4444" : "rgba(255,255,255,0.1)"}`,
            color: "#fff",
          }}
        />
        {error && (
          <p className="text-sm text-center" style={{ color: "#ef4444" }}>
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={disabled || !code.trim()}
          className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
          style={{ background: "#9BD34B", color: "#080808" }}
        >
          {busy ? "Redeeming…" : (<>Redeem code <ArrowRight size={16} /></>)}
        </button>
      </form>

      <button
        type="button"
        onClick={onDone}
        disabled={disabled}
        className="w-full text-center text-sm hover:underline"
        style={{ color: "#888", fontFamily: "'IBM Plex Sans', sans-serif" }}
      >
        I don't have a code — skip
      </button>
    </div>
  );
}
