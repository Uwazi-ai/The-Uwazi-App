import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, MailX, CheckCircle2, AlertCircle } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export default function UnsubscribePage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, setState] = useState<"loading" | "valid" | "invalid" | "submitting" | "done" | "error">("loading");
  const [email, setEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) { setState("invalid"); return; }
    fetch(`${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`, {
      headers: { apikey: SUPABASE_ANON },
    })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok || data.valid === false) { setState("invalid"); return; }
        setEmail(data.email ?? null);
        setState("valid");
      })
      .catch(() => setState("invalid"));
  }, [token]);

  const confirm = async () => {
    setState("submitting");
    try {
      const r = await fetch(`${SUPABASE_URL}/functions/v1/handle-email-unsubscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` },
        body: JSON.stringify({ token }),
      });
      if (!r.ok) throw new Error(await r.text());
      setState("done");
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong");
      setState("error");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="max-w-md w-full p-8 space-y-4 text-center">
        {state === "loading" && <><Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" /><p className="text-sm text-muted-foreground">Verifying your link…</p></>}
        {state === "invalid" && <><AlertCircle className="h-10 w-10 mx-auto text-destructive" /><h1 className="text-xl font-semibold">Invalid or expired link</h1><p className="text-sm text-muted-foreground">This unsubscribe link is no longer valid.</p></>}
        {state === "valid" && (
          <>
            <MailX className="h-10 w-10 mx-auto text-primary" />
            <h1 className="text-xl font-semibold">Confirm unsubscribe</h1>
            <p className="text-sm text-muted-foreground">
              {email ? <>You're about to unsubscribe <strong>{email}</strong> from UWAZI emails.</> : "You're about to unsubscribe from UWAZI emails."}
            </p>
            <Button onClick={confirm} className="w-full">Confirm Unsubscribe</Button>
          </>
        )}
        {state === "submitting" && <><Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" /><p className="text-sm text-muted-foreground">Unsubscribing…</p></>}
        {state === "done" && <><CheckCircle2 className="h-10 w-10 mx-auto text-[#22C55E]" /><h1 className="text-xl font-semibold">You're unsubscribed</h1><p className="text-sm text-muted-foreground">You will no longer receive these emails.</p></>}
        {state === "error" && <><AlertCircle className="h-10 w-10 mx-auto text-destructive" /><h1 className="text-xl font-semibold">Something went wrong</h1><p className="text-sm text-muted-foreground">{error}</p></>}
      </Card>
    </div>
  );
}
