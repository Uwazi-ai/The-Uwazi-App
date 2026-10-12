import { useQuery } from "@tanstack/react-query";
import { Flag } from "lucide-react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;
type Row = { id: string; email: string | null; office: string | null; note: string | null; points: number; created_at: string };

/** Super admin spot check list of the last 100 self reported civic actions. */
export function UnverifiedActionsPanel() {
  const { data: rows = [], isLoading, isError } = useQuery<Row[]>({
    queryKey: ["admin-unverified-actions"],
    queryFn: async () => { const { data, error } = await db.rpc("admin_unverified_actions"); if (error) throw error; return data ?? []; },
  });
  if (isLoading) return <p role="status" className="text-sm text-muted-foreground">Loading self reported actions.</p>;
  if (isError) return <p role="alert" className="text-sm text-destructive">We could not load these actions. Use Refresh to try again.</p>;
  return (
    <Card className="rounded-lg bg-card border-border p-5 space-y-3" data-testid="unverified-actions">
      <div className="flex flex-wrap items-center gap-2">
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
