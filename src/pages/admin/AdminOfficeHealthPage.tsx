import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Check, X, Play, Power, MessageCircle } from "lucide-react";

const db = supabase as any;
const DAY = 86400000;

type Source = {
  id: string; geoid: string | null; label: string; source_url: string; jurisdiction_level: string | null;
  check_frequency_hours: number; last_checked_at: string | null; last_changed_at: string | null;
  last_success_at: string | null; last_error: string | null; last_result: any; active: boolean; created_at: string;
};

const FIELD_LABEL: Record<string, string> = {
  current_holder: "Person in office", office_title: "Office name", term_end: "Term", new_office: "New office or person", other: "Something else",
};

function when(d: string | null) {
  return d ? new Date(d).toLocaleString() : "Never";
}
const isOverdue = (s: Source) => s.active && (!s.last_checked_at || new Date(s.last_checked_at).getTime() + s.check_frequency_hours * 3600000 < Date.now());
const isStale = (s: Source) => s.active && (!s.last_success_at || Date.now() - new Date(s.last_success_at).getTime() > 45 * DAY);

export default function AdminOfficeHealthPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ label: "", source_url: "", geoid: "", jurisdiction_level: "city", check_frequency_hours: "168" });
  const [running, setRunning] = useState<string | null>(null);

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
      return data as any[];
    },
  });
  const offices = useQuery({
    queryKey: ["civic-offices-admin"],
    queryFn: async () => {
      const { data } = await db.from("civic_offices").select("*").order("office_title");
      return (data ?? []) as any[];
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["office-sources"] });
    qc.invalidateQueries({ queryKey: ["office-changes"] });
    qc.invalidateQueries({ queryKey: ["civic-offices-admin"] });
  };

  const addSource = useMutation({
    mutationFn: async () => {
      if (!form.label.trim() || !/^https?:\/\//.test(form.source_url.trim())) throw new Error("Add a name and a full web address.");
      const hours = Math.max(1, parseInt(form.check_frequency_hours) || 168);
      const { error } = await db.from("civic_office_sources").insert({
        label: form.label.trim(), source_url: form.source_url.trim(), geoid: form.geoid.trim() || null,
        jurisdiction_level: form.jurisdiction_level.trim() || null, check_frequency_hours: hours, active: false,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Source added. Run a first check next."); setForm({ ...form, label: "", source_url: "", geoid: "" }); refresh(); },
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
    else toast.success(`Check done. Found ${data.offices.length} offices and ${data.changes_found} changes to review.`);
    refresh();
  };

  const setActive = async (s: Source, active: boolean) => {
    if (active && !confirm("Did you compare the first check with the live page? Turn this source on only if it looks right.")) return;
    const { error } = await db.from("civic_office_sources").update({ active }).eq("id", s.id);
    if (error) toast.error(error.message); else { toast.success(active ? "Source is on." : "Source is off."); refresh(); }
  };

  const review = async (id: string, approve: boolean) => {
    const { error } = await db.rpc("review_office_change", { _change_id: id, _approve: approve });
    if (error) toast.error(error.message); else { toast.success(approve ? "Saved to the office list." : "Change closed."); refresh(); }
  };

  const list = sources.data ?? [];
  const active = list.filter((s) => s.active);
  const stats = [
    { label: "Sources checked", value: list.filter((s) => s.last_checked_at).length },
    { label: "Changed", value: list.filter((s) => s.last_changed_at).length },
    { label: "Overdue", value: active.filter(isOverdue).length },
    { label: "Stale, 45 days", value: active.filter(isStale).length },
    { label: "To review", value: changes.data?.length ?? 0 },
  ];

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Office Data Health</h1>
        <p className="text-sm text-muted-foreground">We watch official web pages for changes to who holds each office. Nothing changes the office list until you approve it.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            <div className="text-2xl font-bold text-foreground">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </Card>
        ))}
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Review queue</h2>
        {!changes.data?.length && <Card className="p-4 text-sm text-muted-foreground">Nothing to review right now.</Card>}
        {changes.data?.map((c) => (
          <Card key={c.id} className="p-4 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={c.origin === "user_reported" ? "destructive" : "secondary"}>{c.origin === "user_reported" ? "User report" : "Page check"}</Badge>
              <span className="font-medium text-foreground">{c.civic_offices?.office_title ?? c.proposed?.office_title ?? "New office"}</span>
              <span className="text-xs text-muted-foreground">{FIELD_LABEL[c.field_changed] ?? c.field_changed}</span>
            </div>
            <div className="text-sm grid md:grid-cols-2 gap-2">
              <div><span className="text-muted-foreground">Now: </span>{c.old_value ?? "Not in our list"}</div>
              <div><span className="text-muted-foreground">Proposed: </span>{c.field_changed === "new_office"
                ? `${c.proposed?.office_title}, held by ${c.proposed?.current_holder ?? "no one listed"}${c.proposed?.term_end ? `, term ${c.proposed.term_end}` : ""}`
                : c.new_value ?? "No new value given"}</div>
            </div>
            {c.note && <p className="text-sm text-muted-foreground">Note from user: {c.note}</p>}
            <div className="flex flex-wrap gap-2 items-center">
              <Button size="sm" onClick={() => review(c.id, true)}><Check className="h-4 w-4 mr-1" />Approve</Button>
              <Button size="sm" variant="outline" onClick={() => review(c.id, false)}><X className="h-4 w-4 mr-1" />Reject</Button>
              {c.civic_office_sources?.source_url && (
                <a href={c.civic_office_sources.source_url} target="_blank" rel="noreferrer" className="text-xs text-primary inline-flex items-center gap-1">
                  Check the live page <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </Card>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Sources</h2>
        {list.map((s) => (
          <Card key={s.id} className="p-4 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-foreground">{s.label}</span>
              <Badge variant={s.active ? "default" : "outline"}>{s.active ? "On" : "Off"}</Badge>
              {isOverdue(s) && <Badge variant="secondary">Overdue</Badge>}
              {isStale(s) && <Badge variant="destructive">Stale</Badge>}
            </div>
            <a href={s.source_url} target="_blank" rel="noreferrer" className="text-xs text-primary inline-flex items-center gap-1 break-all">
              {s.source_url} <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
            <div className="text-xs text-muted-foreground">
              Checks every {s.check_frequency_hours} hours. Last check: {when(s.last_checked_at)}. Last change: {when(s.last_changed_at)}.
            </div>
            {s.last_error && <p className="text-xs text-destructive">Last check failed: {s.last_error}</p>}
            {s.last_result && (
              <div className="rounded-lg bg-muted/40 p-3 text-sm space-y-1">
                <div className="text-xs text-muted-foreground">What the last check found</div>
                {s.last_result.unclear && <div className="text-xs">The page was unclear, so nothing was pulled. Enter this office by hand.</div>}
                {(s.last_result.offices ?? []).map((o: any, i: number) => (
                  <div key={i}>{o.office_title}: {o.current_holder ?? "no one listed"}{o.term_end ? `, term ${o.term_end}` : ""}</div>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" disabled={running === s.id} onClick={() => runCheck(s.id)}>
                <Play className="h-4 w-4 mr-1" />{running === s.id ? "Checking…" : s.last_checked_at ? "Check now" : "Run first check"}
              </Button>
              {!s.active ? (
                <Button size="sm" disabled={!s.last_success_at} onClick={() => setActive(s, true)}><Power className="h-4 w-4 mr-1" />Activate</Button>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => setActive(s, false)}>Turn off</Button>
              )}
            </div>
          </Card>
        ))}
      </section>

      <Card className="p-4 space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Add a source</h2>
        <p className="text-sm text-muted-foreground">New sources start off. Run a first check, compare it with the live page, then turn it on. If a page is hard to read, leave it off and enter offices by hand.</p>
        <div className="grid md:grid-cols-2 gap-3">
          <div><Label>Name</Label><Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="KCMO City Council" /></div>
          <div><Label>Web address</Label><Input value={form.source_url} onChange={(e) => setForm({ ...form, source_url: e.target.value })} placeholder="https://" /></div>
          <div><Label>Area code, GEOID</Label><Input value={form.geoid} onChange={(e) => setForm({ ...form, geoid: e.target.value })} placeholder="2938000" /></div>
          <div><Label>Level</Label><Input value={form.jurisdiction_level} onChange={(e) => setForm({ ...form, jurisdiction_level: e.target.value })} placeholder="city" /></div>
          <div><Label>Check every how many hours</Label><Input type="number" value={form.check_frequency_hours} onChange={(e) => setForm({ ...form, check_frequency_hours: e.target.value })} /></div>
        </div>
        <Button onClick={() => addSource.mutate()} disabled={addSource.isPending}>Add source</Button>
      </Card>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground">Office list, {offices.data?.length ?? 0} offices</h2>
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
