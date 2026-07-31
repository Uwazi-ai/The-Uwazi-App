import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { ShieldCheck, ShieldAlert, RotateCcw, History, ExternalLink } from "lucide-react";

type Status = "unverified" | "verified" | "flagged";

type Candidate = {
  id: string;
  name: string;
  party: string | null;
  is_incumbent: boolean | null;
};

type Contest = {
  id: string;
  state: string;
  election_date: string;
  contest_type: string;
  office_name: string | null;
  measure_title: string | null;
  plain_summary: string | null;
  measure_summary: string | null;
  party: string | null;
  district_type: string | null;
  district_id: string | null;
  vote_for: number | null;
  source_name: string | null;
  source_url: string | null;
  verification_status: string;
  verified_at: string | null;
  review_note: string | null;
  sort_order: number | null;
  ballot_candidates: Candidate[];
};

type LogRow = {
  id: string;
  contest_id: string;
  actor_id: string;
  old_status: string | null;
  new_status: string;
  note: string | null;
  created_at: string;
};

const STATUS_STYLES: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  verified: "default",
  unverified: "secondary",
  flagged: "destructive",
};

function contestLabel(c: Contest) {
  return c.office_name || c.measure_title || "Untitled contest";
}

export default function AdminBallotReviewPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<Status>("unverified");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<{ next: Status; ids: string[] } | null>(null);
  const [note, setNote] = useState("");
  const [historyFor, setHistoryFor] = useState<Contest | null>(null);

  const { data: contests, isLoading } = useQuery({
    queryKey: ["admin-ballot-review", status],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ballot_contests")
        .select(
          "id, state, election_date, contest_type, office_name, measure_title, plain_summary, measure_summary, party, district_type, district_id, vote_for, source_name, source_url, verification_status, verified_at, review_note, sort_order, ballot_candidates(id, name, party, is_incumbent)",
        )
        .eq("verification_status", status)
        .order("election_date", { ascending: true })
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Contest[];
    },
  });

  const { data: history } = useQuery({
    queryKey: ["ballot-verification-log", historyFor?.id],
    enabled: Boolean(historyFor),
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ballot_verification_log")
        .select("*")
        .eq("contest_id", historyFor!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as LogRow[];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contests ?? [];
    return (contests ?? []).filter((c) =>
      `${contestLabel(c)} ${c.district_id ?? ""} ${c.party ?? ""} ${c.state}`
        .toLowerCase()
        .includes(q),
    );
  }, [contests, search]);

  const apply = useMutation({
    mutationFn: async ({ ids, next, reviewNote }: { ids: string[]; next: Status; reviewNote: string }) => {
      const { data, error } = await (supabase as any).rpc("set_contest_verification", {
        _contest_ids: ids,
        _status: next,
        _note: reviewNote.trim() || null,
      });
      if (error) throw error;
      return (data ?? []) as unknown[];
    },
    onSuccess: (rows, vars) => {
      qc.invalidateQueries({ queryKey: ["admin-ballot-review"] });
      qc.invalidateQueries({ queryKey: ["ballot-verification-log"] });
      setSelected(new Set());
      setPending(null);
      setNote("");
      toast.success(`${(rows as unknown[]).length} contest(s) marked ${vars.next}`);
    },
    onError: (e: any) => toast.error(e.message ?? "Update failed"),
  });

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const allSelected = filtered.length > 0 && filtered.every((c) => selected.has(c.id));

  const openAction = (next: Status, ids: string[]) => {
    if (ids.length === 0) return;
    setNote("");
    setPending({ next, ids });
  };

  return (
    <div className="container max-w-5xl py-6 px-4 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">Ballot Review</h1>
        <p className="text-sm text-muted-foreground">
          Review contests against the official sample ballot before they go live. Every status change
          is recorded with your account, a timestamp, and your note.
        </p>
      </header>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <Tabs value={status} onValueChange={(v) => { setStatus(v as Status); setSelected(new Set()); }}>
          <TabsList>
            <TabsTrigger value="unverified">Unverified</TabsTrigger>
            <TabsTrigger value="flagged">Flagged</TabsTrigger>
            <TabsTrigger value="verified">Verified</TabsTrigger>
          </TabsList>
        </Tabs>
        <Input
          placeholder="Search office, measure, district…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
      </div>

      {selected.size > 0 && (
        <Card className="p-3 flex flex-wrap items-center gap-2 sticky top-2 z-10">
          <span className="text-sm font-medium mr-auto">{selected.size} selected</span>
          {status !== "verified" && (
            <Button size="sm" onClick={() => openAction("verified", [...selected])}>
              <ShieldCheck className="w-4 h-4 mr-2" /> Verify
            </Button>
          )}
          {status !== "flagged" && (
            <Button size="sm" variant="destructive" onClick={() => openAction("flagged", [...selected])}>
              <ShieldAlert className="w-4 h-4 mr-2" /> Flag
            </Button>
          )}
          {status !== "unverified" && (
            <Button size="sm" variant="outline" onClick={() => openAction("unverified", [...selected])}>
              <RotateCcw className="w-4 h-4 mr-2" /> Send back
            </Button>
          )}
        </Card>
      )}

      {isLoading ? (
        <Card className="p-6 space-y-3">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-5 w-3/4" />
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No {status} contests.
        </Card>
      ) : (
        <>
          <div className="flex items-center gap-2 px-1">
            <Checkbox
              id="select-all"
              checked={allSelected}
              onCheckedChange={(v) =>
                setSelected(v ? new Set(filtered.map((c) => c.id)) : new Set())
              }
            />
            <Label htmlFor="select-all" className="text-xs text-muted-foreground">
              Select all {filtered.length}
            </Label>
          </div>

          <Accordion type="multiple" className="space-y-2">
            {filtered.map((c) => (
              <Card key={c.id} className="px-3">
                <AccordionItem value={c.id} className="border-0">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      className="mt-4"
                      checked={selected.has(c.id)}
                      onCheckedChange={() => toggle(c.id)}
                      aria-label={`Select ${contestLabel(c)}`}
                    />
                    <AccordionTrigger className="flex-1 hover:no-underline">
                      <div className="text-left space-y-1">
                        <div className="text-sm font-medium text-foreground">{contestLabel(c)}</div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant={STATUS_STYLES[c.verification_status] ?? "secondary"}>
                            {c.verification_status}
                          </Badge>
                          <Badge variant="outline">{c.state}</Badge>
                          <Badge variant="outline">{c.election_date}</Badge>
                          {c.party && <Badge variant="outline">{c.party}</Badge>}
                          {c.contest_type === "candidate_race" && (
                            <span className="text-xs text-muted-foreground">
                              {c.ballot_candidates?.length ?? 0} candidate(s)
                              {(c.ballot_candidates?.length ?? 0) === 0 && " — missing"}
                            </span>
                          )}
                        </div>
                      </div>
                    </AccordionTrigger>
                  </div>

                  <AccordionContent className="space-y-3 pb-4">
                    {c.contest_type === "candidate_race" ? (
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {(c.ballot_candidates ?? []).map((cand) => (
                          <li key={cand.id}>
                            • {cand.name}
                            {cand.party ? ` (${cand.party})` : ""}
                            {cand.is_incumbent ? " — incumbent" : ""}
                          </li>
                        ))}
                        {(c.ballot_candidates ?? []).length === 0 && (
                          <li className="text-destructive">No candidates loaded for this contest.</li>
                        )}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {c.plain_summary || c.measure_summary || "No summary on file."}
                      </p>
                    )}

                    <div className="text-xs text-muted-foreground space-y-1">
                      {c.district_type && (
                        <div>
                          District: {c.district_type} {c.district_id}
                        </div>
                      )}
                      {c.vote_for ? <div>Vote for: {c.vote_for}</div> : null}
                      {c.review_note && <div>Last note: {c.review_note}</div>}
                      {c.verified_at && <div>Verified at: {new Date(c.verified_at).toLocaleString()}</div>}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {c.source_url && (
                        <Button size="sm" variant="outline" asChild>
                          <a href={c.source_url} target="_blank" rel="noreferrer">
                            {c.source_name || "Source"} <ExternalLink className="w-3 h-3 ml-1" />
                          </a>
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => setHistoryFor(c)}>
                        <History className="w-4 h-4 mr-1" /> History
                      </Button>
                      {c.verification_status !== "verified" && (
                        <Button size="sm" onClick={() => openAction("verified", [c.id])}>
                          <ShieldCheck className="w-4 h-4 mr-1" /> Verify
                        </Button>
                      )}
                      {c.verification_status !== "flagged" && (
                        <Button size="sm" variant="destructive" onClick={() => openAction("flagged", [c.id])}>
                          <ShieldAlert className="w-4 h-4 mr-1" /> Flag
                        </Button>
                      )}
                      {c.verification_status !== "unverified" && (
                        <Button size="sm" variant="outline" onClick={() => openAction("unverified", [c.id])}>
                          <RotateCcw className="w-4 h-4 mr-1" /> Send back
                        </Button>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Card>
            ))}
          </Accordion>
        </>
      )}

      <Dialog open={Boolean(pending)} onOpenChange={(o) => !o && setPending(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Mark {pending?.ids.length} contest(s) as {pending?.next}
            </DialogTitle>
            <DialogDescription>
              {pending?.next === "verified"
                ? "Verified contests become visible in the public app. Confirm each matches the official sample ballot."
                : "This change is recorded in the review log with your account and timestamp."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="review-note">Review note {pending?.next === "flagged" ? "(recommended)" : "(optional)"}</Label>
            <Textarea
              id="review-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Checked against 2-Sample Ballot - DEM FINAL PRINT.pdf, page 3"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)}>
              Cancel
            </Button>
            <Button
              disabled={apply.isPending}
              onClick={() =>
                pending && apply.mutate({ ids: pending.ids, next: pending.next, reviewNote: note })
              }
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(historyFor)} onOpenChange={(o) => !o && setHistoryFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review history</DialogTitle>
            <DialogDescription>{historyFor ? contestLabel(historyFor) : ""}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-80 overflow-auto">
            {(history ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No changes recorded yet.</p>
            ) : (
              (history ?? []).map((h) => (
                <div key={h.id} className="text-sm border-b border-border pb-2 last:border-0">
                  <div className="font-medium">
                    {h.old_status ?? "—"} → {h.new_status}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(h.created_at).toLocaleString()} · by {h.actor_id.slice(0, 8)}
                  </div>
                  {h.note && <div className="text-xs text-muted-foreground mt-1">{h.note}</div>}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
