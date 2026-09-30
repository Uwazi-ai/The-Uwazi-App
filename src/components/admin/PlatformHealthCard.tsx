import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;
type Health = {
  last_backup: string | null; last_heartbeat: string | null; last_heartbeat_status: string | null; last_office_check: string | null;
  geocode_census?: number; geocode_fallback?: number; geocode_none?: number;
};

const hoursSince = (iso: string | null) => (iso ? (Date.now() - new Date(iso).getTime()) / 3_600_000 : Infinity);
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : "Never");

/** Super admin card: backup, heartbeat, and office checker, each green or red. */
export function PlatformHealthCard() {
  const [h, setH] = useState<Health | null>(null);
  useEffect(() => { db.rpc("platform_health").then(({ data, error }: any) => setH(error ? null : data)); }, []);
  if (!h) return null;
  const rows = [
    { label: "Last backup", at: h.last_backup, ok: hoursSince(h.last_backup) <= 30, rule: "Should run every night" },
    { label: "Last heartbeat", at: h.last_heartbeat, ok: hoursSince(h.last_heartbeat) <= 7 && h.last_heartbeat_status === "All good", rule: h.last_heartbeat_status ?? "Runs every 6 hours" },
    { label: "Last office check", at: h.last_office_check, ok: hoursSince(h.last_office_check) <= 24, rule: "Should run every day" },
  ];
  return (
    <Card className="bg-card border-border p-5 space-y-3" data-testid="platform-health">
      <div className="flex items-center gap-2">
        <Activity className="h-4 w-4 text-primary" />
        <h2 className="font-semibold text-foreground">Platform health</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {rows.map((r) => (
          <div key={r.label} className="rounded-xl border border-border p-3 flex gap-3" data-state={r.ok ? "green" : "red"}>
            <span className={`mt-1.5 h-2.5 w-2.5 rounded-full shrink-0 ${r.ok ? "bg-primary" : "bg-destructive"}`} aria-label={r.ok ? "Good" : "Needs a look"} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{r.label}</p>
              <p className="text-sm text-foreground">{when(r.at)}</p>
              <p className="text-xs text-muted-foreground truncate">{r.ok ? r.rule : "Needs a look"}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
