import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const db = supabase as any;
type Kind = "dates" | "sites";
const TABLE: Record<Kind, string> = { dates: "voter_guide_dates", sites: "voter_guide_sites" };

export default function AdminVoterGuidePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [kind, setKind] = useState<Kind>("dates");
  const [status, setStatus] = useState("unverified");
  const [search, setSearch] = useState("");

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-voter-guide", kind, status],
    queryFn: async () => {
      const { data, error } = await db.from(TABLE[kind]).select("*").eq("verification_status", status).order(kind === "dates" ? "starts_on" : "name").limit(1000);
      if (error) throw error;
      return data as any[];
    },
  });

  const setRow = useMutation({
    mutationFn: async ({ ids, to }: { ids: string[]; to: string }) => {
      const { error } = await db.from(TABLE[kind]).update({ verification_status: to, verified_by: to === "verified" ? user?.id : null, verified_at: to === "verified" ? new Date().toISOString() : null }).in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-voter-guide"] }); toast.success("Saved"); },
    onError: () => toast.error("Could not save. Try again."),
  });

  const rows = data.filter((r) => !search || JSON.stringify(r).toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      <header>
        <h1 className="font-heading text-2xl text-foreground">Voter guide data</h1>
        <p className="text-sm text-muted-foreground mt-1">Voters only see dates and places you approve. Check each one against its source.</p>
      </header>
      <div className="flex flex-wrap gap-3 items-center">
        <Tabs value={kind} onValueChange={(v) => setKind(v as Kind)}><TabsList><TabsTrigger value="dates">Dates</TabsTrigger><TabsTrigger value="sites">Places</TabsTrigger></TabsList></Tabs>
        <Tabs value={status} onValueChange={setStatus}><TabsList><TabsTrigger value="unverified">To review</TabsTrigger><TabsTrigger value="verified">Live</TabsTrigger><TabsTrigger value="flagged">Hidden</TabsTrigger></TabsList></Tabs>
        <Input placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        {status !== "verified" && rows.length > 0 && (
          <Button size="sm" onClick={() => setRow.mutate({ ids: rows.map((r) => r.id), to: "verified" })}>Approve all {rows.length} shown</Button>
        )}
      </div>
      {isLoading ? <div className="h-32 animate-pulse rounded-xl bg-muted" /> : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing here.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id} className="rounded-xl border border-border bg-card p-4 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2"><Badge variant="outline">{r.state}{r.county_fips ? ` ${r.county_fips}` : " statewide"}</Badge>{kind === "sites" && <Badge variant="secondary">{r.site_type}{r.precinct_key ? ` ${r.precinct_key}` : ""}</Badge>}</div>
                <p className="font-medium text-foreground mt-1">{kind === "dates" ? `${r.label}: ${r.starts_on}${r.ends_on ? ` to ${r.ends_on}` : ""}` : r.name}</p>
                <p className="text-xs text-muted-foreground">{kind === "dates" ? r.note : `${r.address}${r.hours ? `. ${r.hours}` : ""}`}</p>
                {r.source_url && <a href={r.source_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">{r.source_name || r.source_url}</a>}
              </div>
              <div className="flex gap-2">
                {status !== "verified" && <Button size="sm" onClick={() => setRow.mutate({ ids: [r.id], to: "verified" })}>Approve</Button>}
                {status !== "flagged" && <Button size="sm" variant="outline" onClick={() => setRow.mutate({ ids: [r.id], to: "flagged" })}>Hide</Button>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
