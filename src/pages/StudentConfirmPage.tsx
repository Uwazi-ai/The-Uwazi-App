import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LoadingScreen } from "@/components/LoadingScreen";

export default function StudentConfirmPage() {
  const [params] = useSearchParams();
  const [state, setState] = useState<"working" | "ok" | "error">("working");
  const [msg, setMsg] = useState("");
  useEffect(() => {
    const token = params.get("token");
    if (!token) { setState("error"); setMsg("That link is missing a code."); return; }
    supabase.functions.invoke("student-verify", { body: { action: "confirm", token } }).then(async ({ data, error }) => {
      if (error || !data?.verified) {
        let m = "That link did not work. Ask for a new one.";
        try { m = (await (error as any)?.context?.json())?.error ?? m; } catch { /* keep */ }
        setMsg(m); setState("error");
      } else setState("ok");
    });
  }, [params]);
  if (state === "working") return <LoadingScreen fullScreen={false} label="Checking your link" />;
  return (
    <div className="mx-auto max-w-md space-y-4 px-4 py-12 text-center">
      <h1 className="font-heading text-2xl">{state === "ok" ? "You are confirmed as a student" : "We could not confirm that"}</h1>
      <p className="text-sm text-muted-foreground">{state === "ok" ? "You can now get all of UWAZI Plus for $7.99 a month." : msg}</p>
      <Button asChild size="lg"><Link to="/app/upgrade#student">{state === "ok" ? "Get Plus Student" : "Back to Plus"}</Link></Button>
    </div>
  );
}
