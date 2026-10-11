import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const db = supabase as any;
type View = "booked" | "all";

const STAGES = ["Driver booked", "Driver on the way", "Driver is here", "Riding to vote", "At the voting place", "Ride home on the way", "Riding home", "Trip complete"];

function fmtDay(d?: string) {
  if (!d) return "No day";
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}
function fmtTime(t?: string) {
  if (!t) return "No time";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}${m ? ":" + String(m).padStart(2, "0") : ""} ${h < 12 ? "AM" : "PM"}`;
}

export default function AdminRidesPage() {
  const [view, setView] = useState<View>("booked");
  const [search, setSearch] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-rides"],
    refetchInterval: 30000,
    queryFn: async () => {
      const [rides, paused] = await Promise.all([
        db.from("ride_requests")
          .select("id,ride_code,first_name_last_initial,status,trip_stage,ride_day,pickup_time,round_trip,needs_destination,texts_ok,source,site:voter_guide_sites(name)")
          .order("ride_day", { ascending: true }).order("pickup_time", { ascending: true }).limit(1000),
        db.rpc("ride_paused_ids"),
      ]);
      if (rides.error) throw rides.error;
      const pausedSet = new Set<string>((paused.data ?? []).map((p: any) => (typeof p === "string" ? p : p.ride_paused_ids)));
      return (rides.data as any[]).map((r) => ({ ...r, paused: pausedSet.has(r.id) }));
    },
  });

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((r) =>
      (view === "all" || !["requested", "cancelled", "referred"].includes(r.status)) &&
      (!q || r.ride_code?.toLowerCase().includes(q) || r.first_name_last_initial?.toLowerCase().includes(q)),
    );
  }, [data, view, search]);

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl tracking-tight">Ride desk</h1>
          <p className="text-sm text-muted-foreground">Every ride with its status, pickup time and voting place. Open the full desk to take action.</p>
        </div>
        <Button asChild><Link to="/rides/desk">Open full ride desk</Link></Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={view} onValueChange={(v) => setView(v as View)}>
          <TabsList>
            <TabsTrigger value="booked">Booked rides</TabsTrigger>
            <TabsTrigger value="all">All requests</TabsTrigger>
          </TabsList>
        </Tabs>
        <Input className="max-w-xs" placeholder="Search code or name" value={search} onChange={(e) => setSearch(e.target.value)} />
        <span className="text-sm text-muted-foreground">{rows.length} rides</span>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading rides.</p>
      ) : error ? (
        <p className="text-sm text-destructive">Could not load rides. Try again.</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          No rides here yet. Check back once voters start booking.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr className="border-b border-border">
                <th className="p-3">Code</th><th className="p-3">Rider</th><th className="p-3">Status</th>
                <th className="p-3">Pickup</th><th className="p-3">Voting place</th><th className="p-3">Texts</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="p-3 font-mono">{r.ride_code}</td>
                  <td className="p-3">{r.first_name_last_initial}</td>
                  <td className="p-3">
                    <Badge variant="secondary" className="capitalize">{r.status}</Badge>
                    {r.status !== "requested" && r.trip_stage != null && STAGES[r.trip_stage] && (
                      <div className="mt-1 text-xs text-muted-foreground">{STAGES[r.trip_stage]}</div>
                    )}
                  </td>
                  <td className="p-3 whitespace-nowrap">{fmtDay(r.ride_day)} at {fmtTime(r.pickup_time)}{r.round_trip && <div className="text-xs text-muted-foreground">Round trip</div>}</td>
                  <td className="p-3">{r.site && !r.needs_destination ? r.site.name : <span className="text-amber-400">Needs voting place</span>}</td>
                  <td className="p-3">
                    {r.paused ? <Badge variant="destructive">Texts paused</Badge>
                      : r.texts_ok ? <span className="text-muted-foreground">On</span>
                      : <span className="text-muted-foreground">Off</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
