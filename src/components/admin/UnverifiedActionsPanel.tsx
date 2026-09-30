import { useEffect, useState } from "react";
import { Flag } from "lucide-react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;
type Row = { id: string; email: string | null; office: string | null; note: string | null; points: number; created_at: string };

/** Super admin spot check list of the last 100 self reported civic actions. */
export function UnverifiedActionsPanel() {
  const [rows, setRows] = useState<Row[] | null>(null);
  useEffect(() => {
    db.rpc("admin_unverified_actions").then(({ data, error }: any) => setRows(error ? null : data ?? []));
  }, []);
  if (rows === null) return null;
  return (
    <Card className="bg-card border-border p-5 space-y-3" data-testid="unverified-actions">
      <div className="flex items-center gap-2">
        <Flag className="h-4 w-4 text-primary" />
        <h2 className="font-semibold text-foreground">Self reported actions to spot check</h2>
        <span className="text-xs text-muted-foreground">Last {rows.length}</span>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No self reported actions yet.</p>
      ) : (
        <div className="max-h-96 overflow-y-auto divide-y divide-border">
          {rows.map((r) => (
            <div key={r.id} className="py-2 text-sm flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
              <span className="text-muted-foreground w-24 shrink-0">{new Date(r.created_at).toLocaleDateString()}</span>
              <span className="text-foreground truncate sm:w-56">{r.email ?? "Unknown"}</span>
              <span className="text-muted-foreground truncate sm:w-48">{r.office ?? "No office picked"}</span>
              <span className="text-foreground flex-1 break-words">{r.note || <em className="text-muted-foreground">No note</em>}</span>
              <span className="text-primary font-semibold">+{r.points}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
