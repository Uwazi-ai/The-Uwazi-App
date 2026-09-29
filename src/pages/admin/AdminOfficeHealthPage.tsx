import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/contexts/ProfileContext";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Check, X, Play, Power, MessageCircle } from "lucide-react";

const db = supabase as any;
const DAY = 86400000;

type Health = "ok" | "blocked" | "unclear" | "broken" | null;
type Source = {
  id: string; geoid: string | null; label: string; source_url: string; jurisdiction_level: string | null;
  check_frequency_hours: number; last_checked_at: string | null; last_changed_at: string | null;
  last_success_at: string | null; last_error: string | null; last_result: any; active: boolean; created_at: string;
  source_health: Health; last_page_text: string | null; read_method: string | null;
  kind: "office" | "candidates"; target_table: string | null; race_id: string | null;
  ballot_state: string | null; ballot_election_date: string | null; is_official: boolean;
};

const FIELD_LABEL: Record<string, string> = {
  current_holder: "Person in office", office_title: "Office name", term_end: "Term", new_office: "New office or person", other: "Something else",
  new_candidate: "New candidate", party: "Party", withdrawn: "Candidate withdrew",
};
const ORIGIN_LABEL: Record<string, string> = { user_reported: "User report", scraper: "Page check", manual: "Added by hand" };
const HEALTH: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  ok: { label: "Healthy", variant: "default" },
  blocked: { label: "Blocked", variant: "destructive" },
  unclear: { label: "Unclear", variant: "secondary" },
  broken: { label: "Broken", variant: "destructive" },
};

function when(d: string | null) {
  return d ? new Date(d).toLocaleString() : "Never";
}
function waited(d: string) {
  const ms = Date.now() - new Date(d).getTime();
  const days = Math.floor(ms / DAY);
  if (days >= 1) return `Waiting ${days} ${days === 1 ? "day" : "days"}`;
  const hours = Math.floor(ms / 3600000);
  return hours >= 1 ? `Waiting ${hours} ${hours === 1 ? "hour" : "hours"}` : "Waiting less than an hour";
}
const isOverdue = (s: Source) => s.active && (!s.last_checked_at || new Date(s.last_checked_at).getTime() + s.check_frequency_hours * 3600000 < Date.now());
const isStale = (s: Source) => s.active && (!s.last_success_at || Date.now() - new Date(s.last_success_at).getTime() > 45 * DAY);
const isBadHealth = (s: Source) => s.source_health === "blocked" || s.source_health === "unclear" || s.source_health === "broken";
const needsAttention = (s: Source) => isBadHealth(s) || isOverdue(s) || isStale(s);

const emptyManual = { office_title: "", current_holder: "", term_end: "", jurisdiction_level: "city", geoid: "", data_source: "", source_url: "", district_type: "", district_code: "" };
const emptyBoundary = { jurisdiction_geoid: "", district_type: "council", geojson_url: "", source_url: "" };
const DISTRICT_TYPE_LABEL: Record<string, string> = { council: "City council", commission: "County commission", school_board: "School board", ward: "Ward" };

export default function AdminOfficeHealthPage() {
  const qc = useQueryClient();
  const { isAdmin } = useProfile();
  const [form, setForm] = useState({ label: "", source_url: "", geoid: "", jurisdiction_level: "city", check_frequency_hours: "168",
    kind: "office", target_table: "ballot_candidates", race_id: "", ballot_state: "MO", ballot_election_date: "2026-11-03", is_official: true });
  const [manual, setManual] = useState(emptyManual);
  const [boundary, setBoundary] = useState(emptyBoundary);
  const [importing, setImporting] = useState(false);
  const [running, setRunning] = useState<string | null>(null);
  const [showText, setShowText] = useState<string | null>(null);

  const sources = useQuery({
    queryKey: ["office-sources"],
    queryFn: async () => {
      const { data, error } = await db.from("civic_office_sources").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Source[];
    },
  });
  const changes = useQuery({
    queryKey: ["office-changes"],
    queryFn: async () => {
      const { data, error } = await db.from("civic_office_pending_changes")
        .select("*, civic_offices(office_title, current_holder), civic_office_sources(label, source_url)")
        .eq("status", "pending").order("extracted_at", { ascending: true });
      if (error) throw error;
      const rows = (data ?? []) as any[];
      return rows.sort((a, b) =>
        (a.origin === "user_reported" ? 0 : 1) - (b.origin === "user_reported" ? 0 : 1) ||
        new Date(a.extracted_at).getTime() - new Date(b.extracted_at).getTime());
    },
  });
  const decisions = useQuery({
    queryKey: ["office-decisions"],
    queryFn: async () => {
      const { data, error } = await db.rpc("office_recent_decisions");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
  const offices = useQuery({
    queryKey: ["civic-offices-admin"],
    queryFn: async () => {
      const { data } = await db.from("civic_offices").select("*").order("office_title");
      return (data ?? []) as any[];
    },
  });

  const races = useQuery({
    queryKey: ["election-races-admin"],
    queryFn: async () => {
      const { data } = await db.from("election_races").select("id, state, office, district, election_date").order("state").order("office");
      return (data ?? []) as any[];
    },
  });

  const batches = useQuery({
    queryKey: ["district-batches"],
    queryFn: async () => {
      const { data, error } = await db.rpc("district_batches");
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: isAdmin,
  });

  const refresh = () => {
    ["office-sources", "office-changes", "office-decisions", "civic-offices-admin", "district-batches"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  };

  const importBoundaries = async () => {
    setImporting(true);
    const { data, error } = await supabase.functions.invoke("district-import", { body: boundary });
    setImporting(false);
    if (error) {
      const d = error instanceof FunctionsHttpError ? await error.context.text() : error.message;
      toast.error(`Import failed. ${d}`);
      return;
    }
    if (data?.error) return toast.error(`Import failed. ${data.error}`);
    toast.success(`Saved ${data.saved} districts. They stay off until you turn them on.`);
    setBoundary({ ...boundary, geojson_url: "" });
    refresh();
  };

  const setBatchActive = async (id: string, on: boolean) => {
    if (on && !confirm("Did you compare these district names with the official page? Turn them on only if they look right.")) return;
    const { error } = await db.rpc("activate_district_batch", { _batch: id, _on: on });
    if (error) toast.error(error.message);
    else { toast.success(on ? "These districts are on." : "These districts are off."); refresh(); }
  };

  const addSource = useMutation({
    mutationFn: async () => {
      if (!form.label.trim() || !/^https?:\/\//.test(form.source_url.trim())) throw new Error("Add a name and a full web address.");
      const hours = Math.max(1, parseInt(form.check_frequency_hours) || 168);
      const { error } = await db.from("civic_office_sources").insert({
        label: form.label.trim(), source_url: form.source_url.trim(), geoid: form.geoid.trim() || null,
        jurisdiction_level: form.jurisdiction_level.trim() || null, check_frequency_hours: hours, active: false,
        kind: form.kind, is_official: form.is_official,
        ...(form.kind === "candidates" ? {
          target_table: form.target_table,
          race_id: form.target_table === "race_candidates" ? form.race_id || null : null,
          ballot_state: form.target_table === "ballot_candidates" ? form.ballot_state.trim().toUpperCase() : null,
          ballot_election_date: form.target_table === "ballot_candidates" ? form.ballot_election_date : null,
        } : {}),
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Source added. Run a first check next."); setForm({ ...form, label: "", source_url: "", geoid: "" }); refresh(); },
    onError: (e: any) => toast.error(e.message),
  });

  const addManual = useMutation({
    mutationFn: async () => {
      if (!manual.office_title.trim()) throw new Error("Add the office name.");
      if (!/^https?:\/\//.test(manual.source_url.trim())) throw new Error("Add the full web address of the official page.");
      const { error } = await db.rpc("add_manual_office", {
        _office_title: manual.office_title, _current_holder: manual.current_holder, _term_end: manual.term_end,
        _jurisdiction_level: manual.jurisdiction_level, _geoid: manual.geoid, _data_source: manual.data_source, _source_url: manual.source_url,
        _district_type: manual.district_type || null, _district_code: manual.district_code || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Sent to the review queue. Another admin or reviewer will approve it."); setManual(emptyManual); refresh(); },
    onError: (e: any) => toast.error(e.message),
  });

  const runCheck = async (id: string) => {
    setRunning(id);
    const { data, error } = await supabase.functions.invoke("office-monitor", { body: { source_id: id } });
    setRunning(null);
    if (error) {
      const d = error instanceof FunctionsHttpError ? await error.context.text() : error.message;
      toast.error(`Check failed. ${d}`);
    } else if (!data?.ok) toast.error(`Check failed. ${data?.error ?? ""}`);
    else toast.success(data.contests
      ? `Check done. Found ${data.candidates_found} candidates and ${data.changes_found} changes to review.`
      : `Check done. Found ${data.offices.length} offices and ${data.changes_found} changes to review.`);
    refresh();
  };

  const setActive = async (s: Source, active: boolean) => {
    if (active && !confirm("Did you compare the first check with the live page? Turn this source on only if it looks right.")) return;
    const { error } = await db.from("civic_office_sources").update({ active }).eq("id", s.id);
    if (error) toast.error(error.message); else { toast.success(active ? "Source is on." : "Source is off."); refresh(); }
  };

  const review = async (id: string, approve: boolean) => {
    const { error } = await db.rpc("review_office_change", { _change_id: id, _approve: approve });
    if (error) toast.error(error.message); else { toast.success(approve ? "Saved. Voters will see it now." : "Change closed."); refresh(); }
  };

  const list = sources.data ?? [];
  const sorted = [...list].sort((a, b) => Number(needsAttention(b)) - Number(needsAttention(a)));
  const pending = changes.data ?? [];
  const oldPending = pending.filter((c) => Date.now() - new Date(c.extracted_at).getTime() > 7 * DAY).length;
  const attention = [
    { label: "Blocked", value: list.filter((s) => s.source_health === "blocked").length },
    { label: "Unclear", value: list.filter((s) => s.source_health === "unclear").length },
    { label: "Broken", value: list.filter((s) => s.source_health === "broken").length },
    { label: "Overdue", value: list.filter(isOverdue).length },
    { label: "Stale, 45 days", value: list.filter(isStale).length },
    { label: "Waiting more than 7 days", value: oldPending },
  ];
  const attentionTotal = list.filter(needsAttention).length + oldPending;
  const stats = [
    { label: "Needs attention", value: attentionTotal },
    { label: "Sources checked", value: list.filter((s) => s.last_checked_at).length },
    { label: "To review", value: pending.length },
    { label: "Offices on file", value: offices.data?.length ?? 0 },
  ];

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Office Data Health</h1>
        <p className="text-sm text-muted-foreground">We watch web pages for changes to offices and candidates. Nothing changes what voters see until someone approves it.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s, i) => (
          <Card key={s.label} className={`p-4 ${i === 0 && s.value > 0 ? "border-destructive" : ""}`}>
            <div className="text-2xl font-bold text-foreground">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </Card>
        ))}
      </div>
      <Card className="p-4">
        <div className="text-sm font-medium text-foreground mb-2">Needs attention</div>
        <div className="flex flex-wrap gap-2">
          {attention.map((a) => (
            <Badge key={a.label} variant={a.value ? "destructive" : "outline"}>{a.label}: {a.value}</Badge>
          ))}
        </div>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Review queue</h2>
        <p className="text-xs text-muted-foreground">User reports come first. Then the oldest changes.</p>
        {!pending.length && <Card className="p-4 text-sm text-muted-foreground">Nothing to review right now.</Card>}
        {pending.map((c) => (
          <Card key={c.id} className="p-4 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={c.origin === "user_reported" ? "destructive" : "secondary"}>{ORIGIN_LABEL[c.origin] ?? c.origin}</Badge>
              <span className="font-medium text-foreground">{c.civic_offices?.office_title ?? c.proposed?.office_title ?? c.proposed?.contest ?? "New office"}</span>
              {c.target_table && <Badge variant="outline">Candidate</Badge>}
              <span className="text-xs text-muted-foreground">{FIELD_LABEL[c.field_changed] ?? c.field_changed}</span>
              <span className={`text-xs ${Date.now() - new Date(c.extracted_at).getTime() > 7 * DAY ? "text-destructive" : "text-muted-foreground"}`}>{waited(c.extracted_at)}</span>
            </div>
            <div className="text-sm grid md:grid-cols-2 gap-2">
              <div><span className="text-muted-foreground">Now: </span>{c.old_value ?? (c.field_changed === "party" ? "No party listed" : "Not in our list")}</div>
              <div><span className="text-muted-foreground">Proposed: </span>{c.field_changed === "new_office"
                ? `${c.proposed?.office_title}, held by ${c.proposed?.current_holder ?? "no one listed"}${c.proposed?.term_end ? `, term ${c.proposed.term_end}` : ""}`
                : c.field_changed === "new_candidate"
                ? `${c.proposed?.name}${c.proposed?.party ? `, ${c.proposed.party}` : ""}${c.proposed?.is_incumbent ? ", in office now" : ""}`
                : c.new_value ?? "No new value given"}</div>
            </div>
            {c.note && <p className="text-sm text-muted-foreground">Note: {c.note}</p>}
            <div className="flex flex-wrap gap-2 items-center">
              <Button size="sm" onClick={() => review(c.id, true)}><Check className="h-4 w-4 mr-1" />Approve</Button>
              <Button size="sm" variant="outline" onClick={() => review(c.id, false)}><X className="h-4 w-4 mr-1" />Reject</Button>
              {(c.proposed?.source_url || c.civic_office_sources?.source_url) && (
                <a href={c.proposed?.source_url ?? c.civic_office_sources.source_url} target="_blank" rel="noreferrer" className="text-xs text-primary inline-flex items-center gap-1">
                  Check the live page <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </Card>
        ))}
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground">Recent decisions</h2>
        {!decisions.data?.length && <Card className="p-4 text-sm text-muted-foreground">No decisions yet.</Card>}
        {decisions.data?.map((d) => (
          <div key={d.id} className="text-sm border-b border-border py-1 flex flex-wrap gap-x-2">
            <Badge variant={d.status === "approved" ? "default" : "outline"}>{d.status === "approved" ? "Approved" : "Rejected"}</Badge>
            <span className="text-foreground">{d.office_title ?? "Office"}: {d.new_value ?? ""}</span>
            <span className="text-xs text-muted-foreground">by {d.reviewer_email ?? "unknown"} on {when(d.reviewed_at)}</span>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Sources</h2>
        {sorted.map((s) => (
          <Card key={s.id} className="p-4 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-foreground">{s.label}</span>
              <Badge variant="outline">{s.kind === "candidates" ? "Candidates" : "Offices"}</Badge>
              {!s.is_official && <Badge variant="secondary">Not official</Badge>}
              <Badge variant={s.active ? "default" : "outline"}>{s.active ? "On" : "Off"}</Badge>
              {s.source_health ? <Badge variant={HEALTH[s.source_health].variant}>{HEALTH[s.source_health].label}</Badge> : <Badge variant="outline">Not checked</Badge>}
              {isOverdue(s) && <Badge variant="secondary">Overdue</Badge>}
              {isStale(s) && <Badge variant="destructive">Stale</Badge>}
            </div>
            <a href={s.source_url} target="_blank" rel="noreferrer" className="text-xs text-primary inline-flex items-center gap-1 break-all">
              {s.source_url} <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
            <div className="text-xs text-muted-foreground">
              Checks every {s.check_frequency_hours} hours. Last check: {when(s.last_checked_at)}. Last change: {when(s.last_changed_at)}.
              {s.read_method && <> Read by: {s.read_method === "firecrawl" ? "web reading service" : "direct read"}.</>}
            </div>

            {s.last_error && <p className="text-xs text-destructive">{s.last_error}</p>}
            {s.last_result && (
              <div className="rounded-lg bg-muted/40 p-3 text-sm space-y-1">
                <div className="text-xs text-muted-foreground">What the last check found</div>
                {s.last_result.unclear && <div className="text-xs">The page was unclear, so nothing was pulled. {s.kind === "candidates" ? "Check the page yourself." : "Enter this office by hand."}</div>}
                {(s.last_result.contests ?? []).map((c: any, i: number) => (
                  <div key={i}><span className="font-medium">{c.contest}:</span> {c.candidates.map((x: any) => `${x.name}${x.party ? `, ${x.party}` : ""}${x.withdrawn ? ", withdrew" : ""}`).join(". ") || "no one listed"}</div>
                ))}
                {!!s.last_result.unmatched?.length && (
                  <div className="text-xs text-muted-foreground">Not on our ballot, so skipped: {s.last_result.unmatched.join(". ")}</div>
                )}
                {(s.last_result.offices ?? []).map((o: any, i: number) => (
                  <div key={i}>{o.office_title}: {o.current_holder ?? "no one listed"}{o.term_end ? `, term ${o.term_end}` : ""}</div>
                ))}
              </div>
            )}
            {s.last_page_text && (
              <div>
                <Button size="sm" variant="ghost" onClick={() => setShowText(showText === s.id ? null : s.id)}>
                  {showText === s.id ? "Hide page text" : "See what the checker read"}
                </Button>
                {showText === s.id && (
                  <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">{s.last_page_text}</pre>
                )}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" disabled={running === s.id} onClick={() => runCheck(s.id)}>
                <Play className="h-4 w-4 mr-1" />{running === s.id ? "Checking…" : s.last_checked_at ? "Check now" : "Run first check"}
              </Button>
              {isAdmin && (!s.active ? (
                <Button size="sm" disabled={!s.last_success_at || /wikipedia\.org/i.test(s.source_url)} onClick={() => setActive(s, true)}><Power className="h-4 w-4 mr-1" />Activate</Button>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => setActive(s, false)}>Turn off</Button>
              ))}
            </div>
          </Card>
        ))}
      </section>

      <Card className="p-4 space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Add office by hand</h2>
        <p className="text-sm text-muted-foreground">Use this when a page blocks our checker or is hard to read. Link the official page you used. It goes to the review queue first.</p>
        <div className="grid md:grid-cols-2 gap-3">
          <div><Label>Office name</Label><Input value={manual.office_title} onChange={(e) => setManual({ ...manual, office_title: e.target.value })} placeholder="City Council District 1" /></div>
          <div><Label>Person in office</Label><Input value={manual.current_holder} onChange={(e) => setManual({ ...manual, current_holder: e.target.value })} /></div>
          <div><Label>Term ends</Label><Input value={manual.term_end} onChange={(e) => setManual({ ...manual, term_end: e.target.value })} placeholder="2027" /></div>
          <div><Label>Level</Label><Input value={manual.jurisdiction_level} onChange={(e) => setManual({ ...manual, jurisdiction_level: e.target.value })} placeholder="city" /></div>
          <div><Label>Area code, GEOID</Label><Input value={manual.geoid} onChange={(e) => setManual({ ...manual, geoid: e.target.value })} placeholder="2938000" /></div>
          <div><Label>Where it came from</Label><Input value={manual.data_source} onChange={(e) => setManual({ ...manual, data_source: e.target.value })} placeholder="KCMO City Clerk" /></div>
          <div className="md:col-span-2"><Label>Official web address, required</Label><Input value={manual.source_url} onChange={(e) => setManual({ ...manual, source_url: e.target.value })} placeholder="https://" /></div>
        </div>
        <Button onClick={() => addManual.mutate()} disabled={addManual.isPending}>Send for review</Button>
      </Card>

      {isAdmin && (
        <Card className="p-4 space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Add a source</h2>
          <p className="text-sm text-muted-foreground">New sources start off. Run a first check, compare it with the live page, then turn it on. If a page is hard to read, leave it off and add offices by hand.</p>
          <div className="grid md:grid-cols-2 gap-3">
            <div><Label>Name</Label><Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="KCMO City Council" /></div>
            <div><Label>Web address</Label><Input value={form.source_url} onChange={(e) => setForm({ ...form, source_url: e.target.value })} placeholder="https://" /></div>
            <div><Label>Area code, GEOID</Label><Input value={form.geoid} onChange={(e) => setForm({ ...form, geoid: e.target.value })} placeholder="2938000" /></div>
            <div><Label>Level</Label><Input value={form.jurisdiction_level} onChange={(e) => setForm({ ...form, jurisdiction_level: e.target.value })} placeholder="city" /></div>
            <div><Label>Check every how many hours</Label><Input type="number" value={form.check_frequency_hours} onChange={(e) => setForm({ ...form, check_frequency_hours: e.target.value })} /></div>
            <div><Label>What this page lists</Label>
              <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                <option value="office">People in office</option>
                <option value="candidates">Candidates</option>
              </select>
            </div>
            {form.kind === "candidates" && (
              <div><Label>Which candidate list to update</Label>
                <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.target_table} onChange={(e) => setForm({ ...form, target_table: e.target.value })}>
                  <option value="ballot_candidates">My Ballot, a whole ballot</option>
                  <option value="race_candidates">Candidates page, one race</option>
                </select>
              </div>
            )}
            {form.kind === "candidates" && form.target_table === "race_candidates" && (
              <div className="md:col-span-2"><Label>Race</Label>
                <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.race_id} onChange={(e) => setForm({ ...form, race_id: e.target.value })}>
                  <option value="">Pick a race</option>
                  {races.data?.map((r) => <option key={r.id} value={r.id}>{r.state}, {r.office}{r.district ? ` District ${r.district}` : ""}</option>)}
                </select>
              </div>
            )}
            {form.kind === "candidates" && form.target_table === "ballot_candidates" && (<>
              <div><Label>State</Label><Input value={form.ballot_state} onChange={(e) => setForm({ ...form, ballot_state: e.target.value })} placeholder="MO" /></div>
              <div><Label>Election date</Label><Input type="date" value={form.ballot_election_date} onChange={(e) => setForm({ ...form, ballot_election_date: e.target.value })} /></div>
            </>)}
            <label className="flex items-center gap-2 text-sm text-foreground md:col-span-2">
              <input type="checkbox" checked={form.is_official} onChange={(e) => setForm({ ...form, is_official: e.target.checked })} />
              This is an official government or election board page
            </label>
          </div>
          <Button onClick={() => addSource.mutate()} disabled={addSource.isPending}>Add source</Button>
        </Card>
      )}

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground">Office list, {offices.data?.length ?? 0} offices</h2>
        {!offices.data?.length && <p className="text-sm text-muted-foreground">No offices yet. Add one by hand above.</p>}
        {offices.data?.map((o) => (
          <div key={o.id} className="text-sm border-b border-border py-1">
            {o.office_title}: {o.current_holder ?? "no one listed"}{o.term_end ? `, term ${o.term_end}` : ""}
            <span className="text-xs text-muted-foreground"> · checked {when(o.last_verified_at)}</span>
          </div>
        ))}
      </section>

      <div className="text-center">
        <Button asChild variant="secondary">
          <Link to={`/app/ask?q=${encodeURIComponent("How do I check who holds a local office right now?")}`}><MessageCircle className="h-4 w-4 mr-1" />Ask UWAZI</Link>
        </Button>
      </div>
    </div>
  );
}
