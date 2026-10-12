import { useQuery } from "@tanstack/react-query";
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
  const { data: h, isLoading, isError } = useQuery<Health | null>({
    queryKey: ["admin-platform-health"],
    queryFn: async () => { const { data, error } = await db.rpc("platform_health"); if (error) throw error; return data; },
  });
  if (isLoading) return <p role="status" className="text-sm text-muted-foreground">Loading platform health.</p>;
  if (isError || !h) return <p role="alert" className="text-sm text-destructive">We could not load platform health. Use Refresh to try again.</p>;
  const rows = [
    { label: "Last backup", at: h.last_backup, ok: hoursSince(h.last_backup) <= 30, rule: "Should run every night" },
    { label: "Last heartbeat", at: h.last_heartbeat, ok: hoursSince(h.last_heartbeat) <= 7 && h.last_heartbeat_status === "All good", rule: h.last_heartbeat_status ?? "Runs every 6 hours" },
    { label: "Last office check", at: h.last_office_check, ok: hoursSince(h.last_office_check) <= 24, rule: "Should run every day" },
  ];
  return (
    <Card className="rounded-lg bg-card border-border p-5 space-y-3" data-testid="platform-health">
      <div className="flex items-center gap-2">
        <Activity className="h-4 w-4 text-primary" />
        <h2 className="font-semibold text-foreground">Platform health</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {rows.map((r) => (
          <div key={r.label} className="border-l border-border pl-3 flex gap-3" data-state={r.ok ? "green" : "red"}>
            <span className={`mt-1.5 h-2.5 w-2.5 rounded-full shrink-0 ${r.ok ? "bg-primary" : "bg-destructive"}`} aria-label={r.ok ? "Good" : "Needs a look"} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{r.label}</p>
              <p className="text-sm text-foreground break-words">{when(r.at)}</p>
              <p className="text-xs text-muted-foreground truncate">{r.ok ? r.rule : "Needs a look"}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-border pt-3">
        <p className="text-sm font-semibold text-foreground">Address lookups, last 30 days</p>
        <p className="text-sm text-foreground">
          {h.geocode_census ?? 0} found by the free census geocoder. {h.geocode_fallback ?? 0} found by the backup. {h.geocode_none ?? 0} found nothing.
        </p>
      </div>
    </Card>
  );
}
