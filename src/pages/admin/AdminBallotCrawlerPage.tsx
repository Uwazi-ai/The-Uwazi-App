import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Check, ExternalLink, Play, X, ShieldCheck } from "lucide-react";

const db = supabase as any;

type Finding = {
  id: string; finding_type: string; summary: string; contest_id: string | null; proposed: any; safe: boolean;
  status: "pending" | "approved" | "rejected" | "failed"; reviewed_at: string | null; reviewed_by: string | null; last_seen_at: string;
};

const TYPE_LABEL: Record<string, string> = {
  duplicate_contest: "Duplicate contests",
  incumbent_conflict: "Incumbent flags disagree",
  empty_title: "Empty titles",
  secondary_source: "Only from news or secondary sites",
  missing_yes_no: "Missing official yes and no statements",
  yes_no_differs: "Yes and no differ from official text",
  missing_contest: "On the official ballot, missing in the app",
  candidate_missing: "Candidate missing",
  party_differs: "Party label differs",
  neutrality_review: "Wording to check for neutrality",
};
const TYPE_ORDER = Object.keys(TYPE_LABEL);

function proposalText(f: Finding): string {
  const p = f.proposed ?? {};
  switch (p.action) {
    case "hide_contest": return "Hide this duplicate. The official entry stays. Nothing is deleted.";
    case "set_title": return `Set the title to "${p.title}".`;
    case "set_yes_no": return `Set yes: "${p.yes}" No: "${p.no}"`;
    case "set_party": return `Change party from "${p.old_party ?? "none"}" to "${p.party}".`;
    case "add_candidate": return `Add ${p.name}${p.party ? ` (${p.party})` : ""} to this contest.`;
    case "insert_contest": return `Add "${p.title}" as Needs review. Voters will not see it until it is checked and verified.`;
    default: return "No automatic change. A person should check this. Approve marks it reviewed.";
  }
}
const when = (d: string | null) => (d ? new Date(d).toLocaleString() : "Never");

export default function AdminBallotCrawlerPage() {
  const qc = useQueryClient();
  const [bulkOpen, setBulkOpen] = useState(false);
  const [show, setShow] = useState<"pending" | "done">("pending");

  const runs = useQuery({
    queryKey: ["ballot-crawl-runs"],
    queryFn: async () => {
      const { data, error } = await db.from("ballot_crawl_runs").select("*").order("started_at", { ascending: false }).limit(15);
      if (error) throw error;
      return data as any[];
    },
    refetchInterval: (q) => ((q.state.data as any[] | undefined)?.some((r) => r.status === "running") ? 5000 : false),
  });
  const sources = useQuery({
    queryKey: ["ballot-crawl-sources", runs.data?.[0]?.status],
    queryFn: async () => {
      const { data, error } = await db.from("ballot_crawl_sources").select("*").order("created_at");
      if (error) throw error;
      return data as any[];
    },
  });
  const findings = useQuery({
    queryKey: ["ballot-crawl-findings", runs.data?.[0]?.status],
    queryFn: async () => {
      const { data, error } = await db.from("ballot_crawl_findings").select("*").order("created_at");
      if (error) throw error;
      return data as Finding[];
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["ballot-crawl-runs"] }).then(() => {
    qc.invalidateQueries({ queryKey: ["ballot-crawl-findings"] });
    qc.invalidateQueries({ queryKey: ["ballot-crawl-sources"] });
  });

  const runNow = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("ballot-crawler", { body: {} });
      if (error) throw new Error(error instanceof FunctionsHttpError ? await error.context.text() : error.message);
      return data;
    },
    onSuccess: (d: any) => { toast.success(d?.already_running ? "A run is already going." : "Run started. This takes a few minutes."); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const review = useMutation({
    mutationFn: async ({ id, approve }: { id: string; approve: boolean }) => {
      const { data, error } = await db.rpc("review_ballot_finding", { _id: id, _approve: approve });
      if (error) throw error;
      return data;
    },
    onSuccess: (r: string) => {
      if (r === "needs_district") toast.error("Not added. A contest with this title is already waiting with no district. Set its district in Ballot Review, then approve again.");
      else toast.success(r === "approved" ? "Approved and applied." : r === "rejected" ? "Rejected." : `Not changed: ${r}`);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const bulk = useMutation({
    mutationFn: async () => {
      const { data, error } = await db.rpc("apply_official_source_fixes");
      if (error) throw error;
      return data as number;
    },
    onSuccess: (n) => { toast.success(`Applied ${n} official source fixes.`); setBulkOpen(false); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const list = (findings.data ?? []).filter((f) => (show === "pending" ? f.status === "pending" : f.status !== "pending"));
  const grouped = useMemo(() => {
    const m = new Map<string, Finding[]>();
    for (const f of list) m.set(f.finding_type, [...(m.get(f.finding_type) ?? []), f]);
    return [...m.entries()].sort(([a], [b]) => TYPE_ORDER.indexOf(a) - TYPE_ORDER.indexOf(b));
  }, [list]);
  const safeCount = (findings.data ?? []).filter((f) => f.status === "pending" && f.safe).length;
  const latest = runs.data?.[0];

  return (
    <div className="container max-w-5xl py-6 px-4 space-y-6 overflow-x-hidden">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">Ballot crawler review</h1>
        <p className="text-sm text-muted-foreground">
          We read official election authority ballots and compare them with the app. Nothing changes until you approve it.
          Only official sources can propose changes. Supporters and opponents text is never written from a crawl.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => runNow.mutate()} disabled={runNow.isPending || latest?.status === "running"}>
            <Play className="w-4 h-4 mr-2" /> {latest?.status === "running" ? "Running…" : "Run now"}
          </Button>
          <Button variant="secondary" onClick={() => setBulkOpen(true)} disabled={!safeCount}>
            <ShieldCheck className="w-4 h-4 mr-2" /> Apply official source fixes ({safeCount})
          </Button>
          <Button variant="outline" asChild><Link to="/app/admin/ballot-review">Ballot Review</Link></Button>
        </div>
      </header>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Sources</h2>
        <div className="grid gap-2">
          {(sources.data ?? []).map((s) => (
            <Card key={s.id} className="p-3 text-sm space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{s.label}</span>
                <Badge variant={s.last_status === "failed" ? "destructive" : s.last_status === "parsed" || s.last_status === "read" ? "default" : "secondary"}>
                  {s.last_status ?? "Not read yet"}
                </Badge>
                {s.discovered && <Badge variant="outline">Found by search</Badge>}
              </div>
              <a href={s.url} target="_blank" rel="noreferrer" className="text-primary break-all inline-flex items-center gap-1">
                {s.url} <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
              <div className="text-muted-foreground">
                {s.authority}. Last read {when(s.last_fetched_at)}.{s.last_contest_count != null && ` ${s.last_contest_count} contests.`}
                {s.last_changed_at && ` Changed ${when(s.last_changed_at)}.`}
              </div>
              {s.last_hash && <div className="text-xs text-muted-foreground break-all">Hash {s.last_hash.slice(0, 16)}…</div>}
              {s.last_error && <div className="text-xs text-destructive">{s.last_error}</div>}
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold mr-auto">Findings</h2>
          <Button size="sm" variant={show === "pending" ? "default" : "outline"} onClick={() => setShow("pending")}>To review</Button>
          <Button size="sm" variant={show === "done" ? "default" : "outline"} onClick={() => setShow("done")}>Reviewed</Button>
        </div>
        {grouped.length === 0 && <Card className="p-4 text-sm text-muted-foreground">Nothing here.</Card>}
        {grouped.map(([type, items]) => (
          <div key={type} className="space-y-2">
            <h3 className="font-medium">{TYPE_LABEL[type] ?? type} <span className="text-muted-foreground">({items.length})</span></h3>
            {items.map((f) => (
              <Card key={f.id} className="p-3 text-sm space-y-2">
                <p className="break-words">{f.summary}</p>
                <p className="text-muted-foreground break-words"><span className="font-medium text-foreground">Proposed: </span>{proposalText(f)}</p>
                <div className="flex flex-wrap items-center gap-2">
                  {f.safe && <Badge>Official source fix</Badge>}
                  {f.status === "pending" ? (
                    <>
                      <Button size="sm" onClick={() => review.mutate({ id: f.id, approve: true })} disabled={review.isPending}>
                        <Check className="w-4 h-4 mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => review.mutate({ id: f.id, approve: false })} disabled={review.isPending}>
                        <X className="w-4 h-4 mr-1" /> Reject
                      </Button>
                    </>
                  ) : (
                    <Badge variant={f.status === "approved" ? "default" : "secondary"}>{f.status} {when(f.reviewed_at)}</Badge>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ))}
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Run history</h2>
        {(runs.data ?? []).map((r) => (
          <Card key={r.id} className="p-3 text-sm flex flex-wrap gap-x-4 gap-y-1">
            <span>{when(r.started_at)}</span>
            <Badge variant={r.status === "failed" ? "destructive" : r.status === "done" ? "default" : "secondary"}>{r.status}</Badge>
            <span className="text-muted-foreground">{r.trigger === "cron" ? "Scheduled" : "Run now"}</span>
            {r.summary?.findings != null && <span>{r.summary.findings} findings</span>}
            {r.error && <span className="text-destructive">{r.error}</span>}
          </Card>
        ))}
      </section>

      <AlertDialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apply official source fixes?</AlertDialogTitle>
            <AlertDialogDescription>
              This applies {safeCount} safe changes only. It hides secondary duplicates when an official entry exists. It fills empty titles from the official ballot.
              It adds official yes and no statements where they are empty. Nothing is deleted. Everything else still needs your review.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); bulk.mutate(); }} disabled={bulk.isPending}>Apply</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
