import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { dimMeta, topSlugs } from "@/lib/compassDims";
import { toast } from "sonner";

const db = supabase as any;

/** "Does this fit you?" check under the identity label. */
export function IdentityFit({ sessionId, onLabel }: { sessionId: string | null; onLabel: (label: string) => void }) {
  const [mode, setMode] = useState<"ask" | "pick" | "done">("ask");
  const [top, setTop] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const notReally = async () => {
    const { data } = await db.rpc("get_my_journey");
    setTop(topSlugs(data?.dimension_scores, 3));
    setMode("pick");
  };

  const pick = async (slug: string) => {
    setBusy(true);
    const { data, error } = await db.rpc("choose_identity_dimension", { _slug: slug, _session_id: sessionId });
    setBusy(false);
    if (error) return toast.error("We could not save that. Try again.");
    onLabel(data.label);
    setMode("done");
  };

  if (mode === "done") return <p className="text-sm text-muted-foreground" data-testid="fit-done">Thanks. Your label now fits you better.</p>;
  if (mode === "pick") return (
    <div className="space-y-2" data-testid="fit-pick">
      <p className="text-sm text-foreground">Which one fits you best?</p>
      <div className="flex flex-wrap justify-center gap-2">
        {top.map((s) => { const m = dimMeta(s); return (
          <Button key={s} size="sm" variant="outline" disabled={busy} onClick={() => pick(s)}>
            <m.Icon className="h-4 w-4 mr-1" style={{ color: m.color }} /> {m.short}
          </Button>); })}
      </div>
    </div>
  );
  return (
    <div className="flex items-center justify-center gap-2 text-sm" data-testid="fit-ask">
      <span className="text-muted-foreground">Does this fit you?</span>
      <Button size="sm" variant="ghost" onClick={() => { setMode("done"); }}>Yes</Button>
      <Button size="sm" variant="ghost" onClick={notReally}>Not really</Button>
    </div>
  );
}
