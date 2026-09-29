import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { ExternalLink, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const db = supabase as any;

const STATUS: Record<string, string> = {
  requested: "Waiting for search", discovering: "Searching now", proposed: "Ready for review",
  needs_human: "Needs a person", approved: "Approved", active: "Live", failed: "Search failed",
};

/** How many new cities wait for an admin. Used in the sidebar and on Office Data Health. */
export function useCitiesWaiting(enabled = true) {
  return useQuery({
    queryKey: ["cities-waiting"],
    enabled,
    queryFn: async () => {
      const { count } = await db.from("city_onboarding").select("id", { count: "exact", head: true }).in("status", ["proposed", "needs_human"]);
      return count ?? 0;
    },
    refetchInterval: 120000,
  });
}

export default function CitiesSection({ canRun }: { canRun: boolean }) {
  const qc = useQueryClient();
  const cities = useQuery({
    queryKey: ["city-onboarding"],
    queryFn: async () => {
      const { data, error } = await db.from("city_onboarding").select("*").order("first_requested_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
    refetchInterval: 20000,
  });
  const refresh = () => ["city-onboarding", "cities-waiting", "office-sources", "office-changes", "district-batches"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  const runNow = async () => {
    const { data, error } = await supabase.functions.invoke("city-discovery", { body: {} });
    if (error) {
      const d = error instanceof FunctionsHttpError ? await error.context.text() : error.message;
      return toast.error(`The search did not start. ${d}`);
    }
    toast.success(data?.message ?? "Search started.");
    refresh();
  };
  const again = async (id: string) => {
    const { error } = await db.rpc("city_search_again", { _id: id });
    if (error) return toast.error(error.message);
    toast.success("This city will be searched again. Click Run discovery now to start.");
    refresh();
  };

  const list = cities.data ?? [];
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-lg font-semibold text-foreground">Cities</h2>
        {canRun && <Button size="sm" onClick={runNow}><Search className="h-4 w-4 mr-1" />Run discovery now</Button>}
      </div>
      <p className="text-xs text-muted-foreground">When someone lives in a city we do not cover, we look for its official pages. Everything we find stays off until you turn it on.</p>
      {!list.length && <Card className="p-4 text-sm text-muted-foreground">No new cities yet.</Card>}
      {list.map((c) => (
        <Card key={c.id} className="p-4 space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="font-medium text-foreground">{c.place_name ?? c.place_geoid}{c.state ? `, ${c.state}` : ""}</div>
            <div className="flex gap-2 items-center">
              <Badge variant={c.status === "proposed" || c.status === "needs_human" ? "destructive" : "secondary"}>{STATUS[c.status] ?? c.status}</Badge>
              {canRun && !["discovering", "active", "requested"].includes(c.status) && (
                <Button size="sm" variant="outline" onClick={() => again(c.id)}>Search again</Button>
              )}
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            {c.requested_by_count} {c.requested_by_count === 1 ? "person asked" : "people asked"}. First asked {new Date(c.first_requested_at).toLocaleDateString()}.
          </div>
          {(c.proposed_sources ?? []).map((p: any, i: number) => (
            <div key={i} className="text-sm border-t border-border pt-2">
              <div className="font-medium text-foreground">{p.label}</div>
              <a href={p.url} target="_blank" rel="noreferrer" className="text-xs text-primary inline-flex items-center gap-1 break-all">{p.url} <ExternalLink className="h-3 w-3" /></a>
              {p.first_check && <div className="text-xs text-muted-foreground">First check: {p.first_check}</div>}
              {p.saved && <div className="text-xs text-muted-foreground">{p.saved} districts saved and turned off: {p.names?.join(", ")}</div>}
              {p.error && <div className="text-xs text-muted-foreground">{p.error}</div>}
            </div>
          ))}
          {c.last_error && <div className="text-xs text-destructive">{c.last_error}</div>}
          {c.notes && (
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer">Search notes</summary>
              <pre className="whitespace-pre-wrap mt-1">{c.notes}</pre>
            </details>
          )}
        </Card>
      ))}
      <p className="text-xs text-muted-foreground">Next step: check each found page against the live site, then turn on the source and the map below.</p>
    </section>
  );
}
