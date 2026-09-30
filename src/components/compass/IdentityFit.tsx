import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { topSlugs } from "@/lib/compassDims";
import { PERSONA_ICONS, personaColor, usePersonas } from "@/lib/personas";
import { toast } from "sonner";

const db = supabase as any;

export interface FitResult { label: string; persona: string | null; streak: string | null; evidence: string | null }

/** "Does this fit you?" check under the persona. Not really offers the personas for the top three issues. */
export function IdentityFit({ sessionId, onChange }: { sessionId: string | null; onChange: (r: FitResult) => void }) {
  const [mode, setMode] = useState<"ask" | "pick" | "done">("ask");
  const [top, setTop] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const { byDim } = usePersonas();

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
    onChange({ label: data.label, persona: data.persona ?? null, streak: data.streak ?? null, evidence: data.evidence ?? null });
    setMode("done");
  };

  if (mode === "done") return <p className="text-sm text-muted-foreground" data-testid="fit-done">Thanks. Your persona now fits you better.</p>;
  if (mode === "pick") return (
    <div className="space-y-2" data-testid="fit-pick">
      <p className="text-sm text-foreground">Which one sounds most like you?</p>
      <div className="flex flex-wrap justify-center gap-2">
        {top.map((s) => {
          const p = byDim(s);
          if (!p) return null;
          const Icon = PERSONA_ICONS[p.icon_key] ?? PERSONA_ICONS.compass;
          return (
            <Button key={s} size="sm" variant="outline" disabled={busy} onClick={() => pick(s)}>
              <Icon className="h-4 w-4 mr-1" style={{ color: personaColor(p.color) }} /> {p.name}
            </Button>
          );
        })}
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
