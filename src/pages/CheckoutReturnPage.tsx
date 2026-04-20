import { useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";

export default function CheckoutReturnPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = params.get("session_id");
  const { refresh } = useSubscription();

  useEffect(() => {
    const t = setInterval(refresh, 1500);
    const stop = setTimeout(() => clearInterval(t), 15000);
    return () => { clearInterval(t); clearTimeout(stop); };
  }, [refresh]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center mx-auto">
          <CheckCircle2 size={36} className="text-primary" />
        </div>
        <h1 className="text-2xl font-black text-foreground">You're in! Welcome to Uwazi+</h1>
        <p className="text-muted-foreground">
          Your subscription is being activated. You now have unlimited access to videos, AI questions, and full legislation tracking.
        </p>
        {sessionId && <p className="text-xs text-muted-foreground/60">Order: {sessionId.slice(0, 24)}…</p>}
        <div className="flex gap-2 justify-center pt-2">
          <button onClick={() => navigate("/app/watch")} className="px-5 py-2.5 rounded-xl font-bold text-black text-sm" style={{ background: "linear-gradient(135deg, #facc15, #eab308)" }}>
            Start Watching
          </button>
          <Link to="/app/settings/subscription" className="px-5 py-2.5 rounded-xl font-semibold text-foreground text-sm bg-muted">
            Manage
          </Link>
        </div>
      </div>
    </div>
  );
}
