import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Users, Send, CalendarClock, Square, Pencil } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { usePersonas } from "@/lib/personas";
import { DIM_ORDER } from "@/lib/compassDims";
import { Q_TYPE_LABEL, type QType, type SurveyQuestion } from "@/hooks/useResearchSurveys";
import { ResearchSurveysPanel } from "@/components/admin/ResearchSurveysPanel";

const db = supabase as any;
const BANNED = /[—–;()]/;

interface Def {
  id?: string; title: string; intro: string; questions: SurveyQuestion[];
  target_dimension_filter: { personas?: string[]; dimensions?: Record<string, { min?: number; max?: number }> } | null;
  delivery_channel: string; starts_at: string | null; ends_at: string | null; active?: boolean;
}
const blank = (): Def => ({ title: "", intro: "", questions: [], target_dimension_filter: { personas: [], dimensions: {} }, delivery_channel: "in_app", starts_at: null, ends_at: null });
const newQ = (): SurveyQuestion => ({ id: `q${Math.random().toString(36).slice(2, 7)}`, prompt: "", type: "single_choice", options: ["", ""] });
const toLocal = (s: string | null) => (s ? new Date(s).toISOString().slice(0, 16) : "");
const fromLocal = (s: string) => (s ? new Date(s).toISOString() : null);

function cleanFilter(f: Def["target_dimension_filter"]) {
  const personas = f?.personas?.filter(Boolean) ?? [];
  const dims: Record<string, { min?: number; max?: number }> = {};
  for (const [k, v] of Object.entries(f?.dimensions ?? {})) {
    const o: { min?: number; max?: number } = {};
    if (v.min !== undefined && !Number.isNaN(v.min)) o.min = v.min;
    if (v.max !== undefined && !Number.isNaN(v.max)) o.max = v.max;
    if (Object.keys(o).length) dims[k] = o;
  }
  return { ...(personas.length ? { personas } : {}), ...(Object.keys(dims).length ? { dimensions: dims } : {}) };
}

function Editor({ initial, onClose }: { initial: Def; onClose: () => void }) {
  const { user } = useAuth();
  const { list: personas } = usePersonas();
  const qc = useQueryClient();
  const [d, setD] = useState<Def>(initial);
  const [count, setCount] = useState<number | null>(null);
  const [schedule, setSchedule] = useState(toLocal(initial.starts_at));
  const f = d.target_dimension_filter ?? {};
  const setF = (nf: Def["target_dimension_filter"]) => { setD({ ...d, target_dimension_filter: nf }); setCount(null); };
  const setQ = (i: number, q: Partial<SurveyQuestion>) => setD({ ...d, questions: d.questions.map((x, j) => (j === i ? { ...x, ...q } : x)) });

  const problem = () => {
    if (!d.title.trim()) return "Add a title.";
    if (!d.questions.length) return "Add at least one question.";
    const texts = [d.title, d.intro, ...d.questions.flatMap((q) => [q.prompt, ...(q.options ?? [])])];
    if (texts.some((t) => BANNED.test(t ?? ""))) return "Take out dashes, semicolons, and parentheses.";
    for (const q of d.questions) {
      if (!q.prompt.trim()) return "Every question needs words.";
      if ((q.type === "single_choice" || q.type === "multi_choice") && (q.options ?? []).filter((o) => o.trim()).length < 2) return "Choice questions need at least two choices.";
    }
    return null;
  };

  const save = async (): Promise<string | null> => {
    const p = problem(); if (p) { toast.error(p); return null; }
    const row = {
      title: d.title.trim(), intro: d.intro.trim() || null, delivery_channel: "in_app",
      questions: d.questions.map((q) => ({ id: q.id, prompt: q.prompt.trim(), type: q.type,
        ...(q.type === "single_choice" || q.type === "multi_choice" ? { options: (q.options ?? []).map((o) => o.trim()).filter(Boolean) } : {}) })),
      target_dimension_filter: cleanFilter(d.target_dimension_filter), ends_at: d.ends_at,
    };
    const res = d.id
      ? await db.from("survey_definitions").update(row).eq("id", d.id).select("id").single()
      : await db.from("survey_definitions").insert({ ...row, created_by: user?.id }).select("id").single();
    if (res.error) { toast.error("We could not save the survey. Try again."); return null; }
    setD((x) => ({ ...x, id: res.data.id }));
    qc.invalidateQueries({ queryKey: ["research-surveys"] });
    return res.data.id;
  };

  const preview = async () => {
    const { data, error } = await db.rpc("preview_survey_targets", { _filter: cleanFilter(d.target_dimension_filter) });
    if (error) return toast.error("We could not count people. Try again.");
    setCount(data);
  };
  const sendNow = async () => {
    const id = await save(); if (!id) return;
    const { data, error } = await db.rpc("send_research_survey", { _survey_id: id });
    if (error) return toast.error("We could not send it. Try again.");
    toast.success(`Sent to ${data} people.`);
    qc.invalidateQueries({ queryKey: ["research-surveys"] }); qc.invalidateQueries({ queryKey: ["research-survey-stats"] });
    onClose();
  };
  const scheduleSend = async () => {
    if (!schedule || new Date(schedule) <= new Date()) return toast.error("Pick a time in the future.");
    const id = await save(); if (!id) return;
    const { error } = await db.from("survey_definitions").update({ starts_at: fromLocal(schedule), active: true }).eq("id", id);
    if (error) return toast.error("We could not schedule it. Try again.");
    toast.success("Scheduled. It goes out within an hour of that time.");
    qc.invalidateQueries({ queryKey: ["research-surveys"] });
    onClose();
  };

  return (
    <Card className="p-5 space-y-5" data-testid="survey-editor">
      <div className="grid gap-3">
        <div><Label>Title</Label><Input value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} maxLength={120} /></div>
        <div><Label>Intro</Label><Textarea value={d.intro} onChange={(e) => setD({ ...d, intro: e.target.value })} maxLength={400} /></div>
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold text-foreground">Questions</h3>
        {d.questions.map((q, i) => (
          <div key={q.id} className="rounded-xl border border-border p-3 space-y-2">
            <div className="flex gap-2">
              <Input placeholder="Question" value={q.prompt} onChange={(e) => setQ(i, { prompt: e.target.value })} maxLength={200} />
              <select className="rounded-md border border-border bg-background px-2 text-sm" value={q.type} onChange={(e) => setQ(i, { type: e.target.value as QType })} aria-label="Question type">
                {Object.entries(Q_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <Button size="icon" variant="ghost" aria-label="Remove question" onClick={() => setD({ ...d, questions: d.questions.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></Button>
            </div>
            {(q.type === "single_choice" || q.type === "multi_choice") && (
              <div className="space-y-2 pl-2">
                {(q.options ?? []).map((o, k) => (
                  <div key={k} className="flex gap-2">
                    <Input placeholder={`Choice ${k + 1}`} value={o} maxLength={80} onChange={(e) => setQ(i, { options: (q.options ?? []).map((x, m) => (m === k ? e.target.value : x)) })} />
                    <Button size="icon" variant="ghost" aria-label="Remove choice" onClick={() => setQ(i, { options: (q.options ?? []).filter((_, m) => m !== k) })}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
                <Button size="sm" variant="outline" onClick={() => setQ(i, { options: [...(q.options ?? []), ""] })}>Add a choice</Button>
              </div>
            )}
          </div>
        ))}
        <Button size="sm" variant="outline" onClick={() => setD({ ...d, questions: [...d.questions, newQ()] })}><Plus className="h-4 w-4 mr-1" /> Add a question</Button>
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold text-foreground">Who gets it</h3>
        <p className="text-sm text-muted-foreground">Only people who said yes to research can get a survey. Leave everything blank to reach all of them.</p>
        <div className="flex flex-wrap gap-2">
          {personas.map((p) => {
            const on = f.personas?.includes(p.slug);
            return <button key={p.slug} type="button" aria-pressed={on} onClick={() => setF({ ...f, personas: on ? f.personas!.filter((x) => x !== p.slug) : [...(f.personas ?? []), p.slug] })}
              className={`px-3 py-1.5 rounded-full border text-sm ${on ? "border-primary bg-primary/15 text-foreground" : "border-border text-muted-foreground"}`}>{p.name}</button>;
          })}
        </div>
        <div className="grid sm:grid-cols-2 gap-2">
          {DIM_ORDER.map((dim) => {
            const v = f.dimensions?.[dim.slug] ?? {};
            const set = (k: "min" | "max", val: string) => setF({ ...f, dimensions: { ...(f.dimensions ?? {}), [dim.slug]: { ...v, [k]: val === "" ? undefined : Number(val) / 100 } } });
            return (
              <div key={dim.slug} className="flex items-center gap-2 text-sm">
                <span className="flex-1 text-foreground">{dim.short ?? dim.slug}</span>
                <Input className="w-20" type="number" min={0} max={100} placeholder="Min" aria-label={`${dim.slug} lowest score`} value={v.min !== undefined ? Math.round(v.min * 100) : ""} onChange={(e) => set("min", e.target.value)} />
                <Input className="w-20" type="number" min={0} max={100} placeholder="Max" aria-label={`${dim.slug} highest score`} value={v.max !== undefined ? Math.round(v.max * 100) : ""} onChange={(e) => set("max", e.target.value)} />
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-3">
          <Button size="sm" variant="outline" onClick={preview}><Users className="h-4 w-4 mr-1" /> Count who would get it</Button>
          {count !== null && <span className="text-sm text-foreground" data-testid="target-count">{count} people match.</span>}
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold text-foreground">How it goes out</h3>
        <p className="text-sm text-muted-foreground">In the app only. It shows as a card on Home and as the next step on Progress.</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div><Label>Send at</Label><Input type="datetime-local" value={schedule} onChange={(e) => setSchedule(e.target.value)} /></div>
          <div><Label>Ends at</Label><Input type="datetime-local" value={toLocal(d.ends_at)} onChange={(e) => setD({ ...d, ends_at: fromLocal(e.target.value) })} /></div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={sendNow}><Send className="h-4 w-4 mr-1" /> Send now</Button>
        <Button variant="outline" onClick={scheduleSend}><CalendarClock className="h-4 w-4 mr-1" /> Schedule</Button>
        <Button variant="outline" onClick={async () => { if (await save()) { toast.success("Saved as a draft."); onClose(); } }}>Save draft</Button>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
      </div>
    </Card>
  );
}

function Results({ id }: { id: string }) {
  const { data } = useQuery({
    queryKey: ["research-survey-results", id],
    queryFn: async () => { const { data, error } = await db.rpc("research_survey_results", { _survey_id: id }); if (error) throw error; return data; },
  });
  if (!data) return <div className="h-16 rounded-lg bg-muted animate-pulse" />;
  return (
    <div className="space-y-4 pt-2" data-testid="survey-results">
      <p className="text-sm text-muted-foreground">{data.responses} answers. Totals only. No names are ever shown.</p>
      {data.questions.map((q: any) => {
        const entries: [string, number][] = q.type === "short_text" ? [] :
          q.type === "scale" ? ["1", "2", "3", "4", "5"].map((k) => [k, q.counts[k] ?? 0]) :
          (q.options ?? Object.keys(q.counts)).map((o: string) => [o, q.counts[o] ?? 0]);
        const max = Math.max(1, ...entries.map((e) => e[1]));
        return (
          <div key={q.id} className="space-y-1">
            <p className="text-sm font-medium text-foreground">{q.prompt}</p>
            {q.type === "short_text" ? <p className="text-sm text-muted-foreground">{q.counts.answered} people wrote an answer.</p> :
              entries.map(([k, c]) => (
                <div key={k} className="flex items-center gap-2 text-sm">
                  <span className="w-40 truncate text-muted-foreground">{k}</span>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary" style={{ width: `${(c / max) * 100}%` }} /></div>
                  <span className="w-8 text-right text-foreground">{c}</span>
                </div>
              ))}
          </div>
        );
      })}
    </div>
  );
}

export default function AdminResearchSurveysPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Def | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const { data: list = [] } = useQuery({
    queryKey: ["research-surveys"],
    queryFn: async () => { const { data, error } = await db.from("survey_definitions").select("*").order("created_at", { ascending: false }); if (error) throw error; return data; },
  });
  const { data: stats = [] } = useQuery({
    queryKey: ["research-survey-stats"],
    queryFn: async () => { const { data } = await db.rpc("research_survey_stats"); return data ?? []; },
  });
  useEffect(() => { document.title = "Research surveys"; }, []);
  const byId = Object.fromEntries(stats.map((s: any) => [s.id, s]));

  const setActive = async (id: string, active: boolean) => {
    const patch = active ? { active: true } : { active: false, ends_at: new Date().toISOString() };
    const { error } = await db.from("survey_definitions").update(patch).eq("id", id);
    if (error) return toast.error("We could not change it. Try again.");
    if (active) await db.rpc("send_research_survey", { _survey_id: id });
    toast.success(active ? "Survey is on and sent." : "Survey ended.");
    qc.invalidateQueries({ queryKey: ["research-surveys"] }); qc.invalidateQueries({ queryKey: ["research-survey-stats"] });
  };

  const status = (s: any) => {
    const now = Date.now();
    if (s.ends_at && new Date(s.ends_at).getTime() <= now) return "Ended";
    if (!s.active) return "Draft";
    if (s.starts_at && new Date(s.starts_at).getTime() > now) return `Scheduled for ${new Date(s.starts_at).toLocaleString()}`;
    return "Live";
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 overflow-x-hidden">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-axis uppercase text-foreground">Research surveys</h1>
          <p className="text-sm text-muted-foreground">These go only to people who said yes to research. Answers show as totals only.</p>
        </div>
        {!editing && <Button onClick={() => setEditing(blank())}><Plus className="h-4 w-4 mr-1" /> New survey</Button>}
      </div>

      {editing && <Editor initial={editing} onClose={() => setEditing(null)} />}

      <ResearchSurveysPanel />

      <div className="space-y-3">
        {list.map((s: any) => {
          const st = byId[s.id] ?? { sent: 0, responses: 0 };
          const label = status(s);
          return (
            <Card key={s.id} className="p-4 space-y-2" data-testid="survey-row">
              <div className="flex flex-wrap items-center gap-2 justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">{s.title}</p>
                  <p className="text-xs text-muted-foreground">{label}. Sent to {st.sent}. {st.responses} answered.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditing({ ...s, intro: s.intro ?? "", target_dimension_filter: { personas: [], dimensions: {}, ...(s.target_dimension_filter ?? {}) } })}><Pencil className="h-4 w-4 mr-1" /> Edit</Button>
                  {label === "Live" || label.startsWith("Scheduled")
                    ? <Button size="sm" variant="outline" onClick={() => setActive(s.id, false)}><Square className="h-4 w-4 mr-1" /> End</Button>
                    : label === "Draft" && <Button size="sm" onClick={() => setActive(s.id, true)}>Turn on and send</Button>}
                  <Button size="sm" variant="ghost" onClick={() => setOpen(open === s.id ? null : s.id)}>{open === s.id ? "Hide answers" : "See answers"}</Button>
                </div>
              </div>
              {open === s.id && <Results id={s.id} />}
            </Card>
          );
        })}
        {!list.length && !editing && <p className="text-sm text-muted-foreground">No research surveys yet. Start one with New survey.</p>}
      </div>
    </div>
  );
}
